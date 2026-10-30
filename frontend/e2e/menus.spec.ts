import { test, expect, type Page } from "@playwright/test";

// Pin the date so fixtures do not change with the day the tests run.
const menuUrl = "/menus?hall=berkshire&date=2026-10-19&meal=lunch";
const bisque = "Aged Cheddar & Cauliflower Bisque";

async function openMenu(page: Page) {
  await page.goto(menuUrl);
  await expect(page.getByRole("button", { name: bisque, exact: true })).toBeVisible();
}

test("a guest can choose a dining hall from the homepage and return", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Choose your dining hall" })).toBeVisible();
  for (const hall of ["Berkshire", "Worcester", "Franklin", "Hampshire"]) {
    await expect(page.getByRole("link", { name: `View ${hall} menu` })).toBeVisible();
  }
  await page.getByRole("link", { name: "View Berkshire menu" }).click();
  await expect(page).toHaveURL(/\/menus\?hall=berkshire/);
  await expect(page.getByRole("heading", { name: "Berkshire Menu", exact: true })).toBeVisible();
  await expect(page.getByText("Development data, not a current dining menu.", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "All dining halls" }).click();
  await expect(page).toHaveURL("/");
});

test("changing meal, day, and dining hall updates both menu and URL", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Dinner", exact: true }).click();
  await expect(page.getByRole("region", { name: "Dinner menu", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "BBQ Chicken", exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/meal=dinner/);
  await page.getByRole("button", { name: "Next day", exact: true }).click();
  await expect(page.getByLabel("Menu date", { exact: true })).toHaveValue("2026-10-20");
  await expect(page).toHaveURL(/date=2026-10-20/);
  await page.getByRole("button", { name: "Select Worcester" }).click();
  await expect(page.getByRole("heading", { name: "Worcester Menu", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Select Worcester" })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/hall=worcester/);
  await page.reload();
  await expect(page.getByRole("region", { name: "Dinner menu", exact: true })).toBeVisible();
  await expect(page.getByLabel("Menu date", { exact: true })).toHaveValue("2026-10-20");
});

test("switching halls falls back when the selected meal is unavailable", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Grab n' Go", exact: true }).click();
  await expect(page.getByRole("button", { name: "Vegetable Wrap", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Select Hampshire" }).click();
  await expect(page.getByRole("region", { name: "Lunch menu", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Grab n' Go", exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/meal=lunch/);
});

test("food details show nutrition and reported allergens and restore focus", async ({ page }) => {
  await openMenu(page);
  const trigger = page.getByRole("button", { name: bisque, exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: bisque, exact: true });
  await expect(dialog.getByRole("heading", { name: "Nutrition Facts" })).toBeVisible();
  await expect(dialog.getByText("Milk, Eggs, Wheat, Soy", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Serving size 5 oz", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Close food details" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("missing food information is not presented as allergy-free", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Hot Sausage, Onions & Peppers", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Nutrition information has not been provided for this item.")).toBeVisible();
  await expect(dialog.getByText("Allergen information has not been provided.")).toBeVisible();
  await expect(dialog.getByText("No allergens reported.", { exact: true })).toHaveCount(0);
});

test("an unpublished meal shows an empty state", async ({ page }) => {
  await page.goto("/menus?hall=berkshire&date=2026-10-25&meal=late-night");
  await expect(page.getByText("No menu published for this selection.")).toBeVisible();
  await page.getByRole("button", { name: "Lunch", exact: true }).click();
  await expect(page.getByRole("button", { name: bisque, exact: true })).toBeVisible();
});

test("a failed menu request can be retried", async ({ page }) => {
  let fail = true;
  await page.route("**/api/menu-demo/menus?**", async (route) => {
    if (fail) {
      fail = false;
      await route.fulfill({ status: 503, json: { error: "Temporary test failure" } });
    } else {
      await route.continue();
    }
  });
  await page.goto(menuUrl);
  await expect(page.getByRole("heading", { name: "Menu unavailable" })).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: bisque, exact: true })).toBeVisible();
});

test("a failed food-details request can be retried", async ({ page }) => {
  await openMenu(page);
  let fail = true;
  await page.route("**/api/menu-demo/foods/**", async (route) => {
    if (fail) {
      fail = false;
      await route.fulfill({ status: 503, json: { error: "Temporary test failure" } });
    } else {
      await route.continue();
    }
  });
  await page.getByRole("button", { name: bisque, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Food details could not be loaded.")).toBeVisible();
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Nutrition Facts" })).toBeVisible();
});

test("an unknown dining hall returns the visitor to the directory", async ({ page }) => {
  await page.goto("/menus?hall=not-a-hall");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("That dining hall is not available");
  await expect(page.getByRole("link", { name: "View Berkshire menu" })).toBeVisible();
});

test("menu and food dialog fit the viewport", async ({ page }) => {
  await openMenu(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: bisque, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Nutrition Facts" })).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
});
