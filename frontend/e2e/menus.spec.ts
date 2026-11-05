import { test, expect, type Page } from "@playwright/test";
import { getCampusDate, formatMenuDate, shiftMenuDate } from "../lib/menus/date";
import { DEMO_DINING_HALLS } from "../lib/menus/dining-halls";
import { CAMPUS_LOCATIONS } from "../lib/menus/campus-locations";
import { createMockMenuDataSource } from "../lib/menus/mock-menu-data-source";
import { MEALS, type FoodDetails, type MenuStation } from "../lib/menus/types";

const today = getCampusDate();
const tomorrow = shiftMenuDate(today, 1);
const menuUrl = `/menus?hall=berkshire&date=${today}&meal=lunch`;
const bisque = "Aged Cheddar & Cauliflower Bisque";
const fixtureSource = createMockMenuDataSource({ latencyMs: 0 });

async function dayMenu(location: string, date: string) {
  const menus: Record<string, readonly MenuStation[]> = {};
  const foods: Record<string, FoodDetails> = {};
  const hall = DEMO_DINING_HALLS.find((entry) => entry.id === location);
  if (hall) {
    for (const meal of MEALS.filter((entry) => !hall.meals || hall.meals.includes(entry.id))) {
      const query = { diningHallId: location, date, meal: meal.id };
      const menu = await fixtureSource.getMenu(query);
      menus[meal.id] = menu.stations;
      for (const station of menu.stations) {
        for (const food of station.foods) {
          foods[food.id] = await fixtureSource.getFoodDetails({ ...query, foodId: food.id });
        }
      }
    }
  }
  return { location, date, menus, foods, updatedAt: null };
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/menus?**", async (route) => {
    const url = new URL(route.request().url());
    const location = url.searchParams.get("location") ?? "";
    const date = url.searchParams.get("date") ?? "";
    const known = [...DEMO_DINING_HALLS, ...CAMPUS_LOCATIONS].some((entry) => entry.id === location);
    if (!known || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      await route.fulfill({ status: 400, json: { error: "Invalid test selection" } });
      return;
    }
    await route.fulfill({ json: await dayMenu(location, date) });
  });
});

async function openMenu(page: Page) {
  await page.goto(menuUrl);
  await expect(page.getByRole("button", { name: bisque, exact: true })).toBeVisible();
}

test("a guest can choose a dining hall from the homepage and return", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Choose where to eat" })).toBeVisible();
  for (const hall of DEMO_DINING_HALLS) {
    await expect(page.getByRole("link", { name: `View ${hall.name} menu` })).toBeVisible();
  }
  await page.getByRole("link", { name: "View Berkshire menu" }).click();
  await expect(page.getByRole("heading", { name: "Berkshire Menu", exact: true })).toBeVisible();
  await expect(page.getByText("Sample menu", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "All dining locations" }).click();
  await expect(page).toHaveURL("/");
});

test("changing meal, day, and hall updates the menu and URL", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Dinner", exact: true }).click();
  await expect(page.getByRole("region", { name: "Dinner menu", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous day" })).toBeDisabled();
  await page.getByRole("button", { name: /^Menu date:/ }).click();
  const calendar = page.getByRole("dialog", { name: "Choose a menu date" });
  await calendar.getByRole("button", { name: formatMenuDate(tomorrow), exact: true }).click();
  await expect(calendar).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`date=${tomorrow}`));
  await page.getByRole("button", { name: "Select Worcester" }).click();
  await expect(page.getByRole("heading", { name: "Worcester Menu", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/hall=worcester/);
  await page.reload();
  await expect(page.getByRole("region", { name: "Dinner menu", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Menu date:/ })).toHaveText(tomorrow);
});

test("switching halls falls back when late night is unavailable", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Late Night", exact: true }).click();
  await page.getByRole("button", { name: "Select Hampshire" }).click();
  await expect(page.getByRole("region", { name: "Lunch menu", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Late Night", exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/meal=lunch/);
});

test("food details and meal changes reuse the combined menu response", async ({ page }) => {
  let selectedRequests = 0;
  const legacyRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/menus" && url.searchParams.get("location") === "berkshire" && url.searchParams.get("date") === today) selectedRequests++;
    if (url.pathname.includes("menu-snapshots") || url.pathname.startsWith("/api/foods/")) legacyRequests.push(url.pathname);
  });
  await openMenu(page);
  const trigger = page.getByRole("button", { name: bisque, exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: bisque, exact: true });
  await expect(dialog.getByRole("heading", { name: "Nutrition Facts" })).toBeVisible();
  await expect(dialog.getByRole("rowheader", { name: /^Total Sugars/ })).toBeVisible();
  await expect(dialog.getByRole("rowheader", { name: /^Added Sugars/ })).toHaveCount(0);
  await expect(dialog.getByText("Milk, Eggs, Wheat, Soy", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "Dinner", exact: true }).click();
  await expect(page.getByRole("region", { name: "Dinner menu", exact: true })).toBeVisible();
  expect(selectedRequests).toBe(1);
  expect(legacyRequests).toEqual([]);
});

test("missing food information stays unknown", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Hot Sausage, Onions & Peppers", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Nutrition information has not been provided for this item.")).toBeVisible();
  await expect(dialog.getByText("Allergen information has not been provided.")).toBeVisible();
});

test("an unpublished meal shows an empty state", async ({ page }) => {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const sunday = shiftMenuDate(today, (7 - weekday) % 7);
  await page.goto(`/menus?hall=berkshire&date=${sunday}&meal=late-night`);
  await expect(page.getByText("No menu published for this selection.")).toBeVisible();
  await page.getByRole("button", { name: "Lunch", exact: true }).click();
  await expect(page.getByRole("button", { name: bisque, exact: true })).toBeVisible();
});

test("a failed combined menu request can be retried", async ({ page }) => {
  let fail = true;
  await page.route("**/api/menus?**", async (route) => {
    const url = new URL(route.request().url());
    if (fail && url.searchParams.get("location") === "berkshire" && url.searchParams.get("date") === today) {
      await route.fulfill({ status: 503, json: { error: "Temporary test failure" } });
    } else {
      await route.fallback();
    }
  });
  await page.goto(menuUrl);
  await expect(page.getByRole("heading", { name: "Menu unavailable" })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: bisque, exact: true })).toBeVisible();
});

test("the calendar enables exactly fourteen days", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: /^Menu date:/ }).click();
  const calendar = page.getByRole("dialog", { name: "Choose a menu date" });
  const enabledDays = calendar.getByRole("button", { name: /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat),/ }).and(calendar.locator("button:enabled"));
  await expect(enabledDays).toHaveCount(14);
  await calendar.getByRole("button", { name: formatMenuDate(shiftMenuDate(today, 13)), exact: true }).click();
  await expect(page.getByRole("button", { name: "Next day" })).toBeDisabled();
});

test("an old date link resolves to today", async ({ page }) => {
  await page.goto("/menus?hall=berkshire&date=2020-01-01&meal=lunch");
  await expect(page.getByRole("button", { name: /^Menu date:/ })).toHaveText(`${today} (Today)`);
  await expect(page.getByRole("button", { name: bisque, exact: true })).toBeVisible();
});

test("a café loads through the combined endpoint", async ({ page }) => {
  await page.route("**/api/menus?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("location") !== "whitmore-cafe") return route.fallback();
    const food = { id: "cafe-test", name: "Café API test item", nutrition: { servingSize: "1 item", calories: 120 }, ingredients: "Café test ingredients", allergens: [] };
    await route.fulfill({ json: { location: "whitmore-cafe", date: url.searchParams.get("date"), menus: { "daily-offerings": [{ id: "daily", name: "Daily items", foods: [food] }] }, foods: { [food.id]: food }, updatedAt: null } });
  });
  await page.goto(`/menus?hall=whitmore-cafe&date=${today}&meal=daily-offerings`);
  await page.getByRole("button", { name: "Café API test item" }).click();
  await expect(page.getByRole("dialog").getByText("Café test ingredients")).toBeVisible();
});

test("Argo Tea shows today without a date selector", async ({ page }) => {
  await page.goto(`/menus?hall=argo-tea&date=${tomorrow}`);
  await expect(page.getByText(`Today’s menu · ${formatMenuDate(today)}`)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Menu date:|^Next day$|^Previous day$/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View today’s menu on UMass Dining" })).toHaveAttribute("href", "https://www.umassdining.com/menu/argo-tea-menu");
});

test("an unknown location returns to the directory", async ({ page }) => {
  await page.goto("/menus?hall=not-a-hall");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("That dining location is not available");
});

test("the menu and food dialog fit the viewport", async ({ page }) => {
  await openMenu(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: bisque, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Nutrition Facts" })).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
});
