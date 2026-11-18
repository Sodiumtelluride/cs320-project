import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Home from "@/app/page";
import MenusRoute from "@/app/menus/page";
import { DiningCategoryPage } from "@/menus/category-page";
import { MenuPage } from "@/menus/menu-page";

const today = "2026-11-13";
const outlets = [
  ["Tavola", "tavola"], ["Green Fields", "green-fields"], ["Tamales", "tamales"],
  ["Wasabi", "wasabi"], ["Deli Delish", "deli-delish"], ["Star Ginger", "star-ginger"], ["The Grill", "the-grill"],
] as const;
const destinations = [
  ["Harvest Market", "harvest-market"], ["People’s Organic Coffee", "peoples-organic-coffee"], ...outlets,
] as const;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-13T17:00:00Z"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("Campus Center directories", () => {
  it("offers Campus Center on Home and the Menus directory without exposing its child cards there", async () => {
    for (const page of [<Home key="home" />, await MenusRoute({ searchParams: Promise.resolve({}) })]) {
      const view = render(page);
      expect(screen.getByRole("link", { name: "Browse Campus Center locations" }).getAttribute("href")).toBe("/menus?category=campus-center");
      expect(screen.queryByRole("link", { name: "Browse Blue Wall locations" })).toBeNull();
      expect(screen.queryByRole("link", { name: "View Harvest Market menu" })).toBeNull();
      view.unmount();
    }
  });

  it("opens exactly Blue Wall, Harvest and People’s Organic cards without loading their menus", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    render(await MenusRoute({ searchParams: Promise.resolve({ category: "campus-center" }) }));
    const directory = within(screen.getByRole("region", { name: "Campus Center locations" }));
    expect(directory.getAllByRole("link")).toHaveLength(3);
    expect(directory.getByRole("link", { name: "Browse Blue Wall locations" }).getAttribute("href")).toBe("/menus?category=blue-wall");
    expect(directory.getByRole("link", { name: "View Harvest Market menu" }).getAttribute("href")).toBe("/menus?hall=harvest-market");
    expect(directory.getByRole("link", { name: "View People’s Organic Coffee menu" }).getAttribute("href")).toBe("/menus?hall=peoples-organic-coffee");
    expect(screen.queryByRole("button", { name: "Lunch" })).toBeNull();
    expect(screen.queryByRole("link", { name: "View Tavola menu" })).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("opens seven Blue Wall outlet cards and returns to the Campus Center directory", async () => {
    render(await MenusRoute({ searchParams: Promise.resolve({ category: "blue-wall" }) }));
    const directory = within(screen.getByRole("region", { name: "Blue Wall locations" }));
    expect(directory.getAllByRole("link")).toHaveLength(7);
    for (const [name, id] of outlets) {
      expect(directory.getByRole("link", { name: `View ${name} menu` }).getAttribute("href")).toBe(`/menus?hall=${id}`);
    }
    expect(directory.queryByText(/Harvest|Organic|Yum|Paciugo/)).toBeNull();
    expect(screen.getByRole("link", { name: "All Campus Center locations" }).getAttribute("href")).toBe("/menus?category=campus-center");
  });

  it("accepts the parent category for a Blue Wall menu and rejects unrelated category links", async () => {
    for (const category of ["campus-center", "blue-wall"]) {
      const page = await MenusRoute({ searchParams: Promise.resolve({ category, hall: "the-grill", date: today }) });
      expect(page.type).toBe(MenuPage);
      expect(page.props.initialHallId).toBe("the-grill");
    }
    for (const [category, hall] of [["blue-wall", "harvest-market"], ["campus-center", "whitmore-cafe"]]) {
      const page = await MenusRoute({ searchParams: Promise.resolve({ category, hall }) });
      expect(page.type).toBe(DiningCategoryPage);
      expect(page.props.notice).toContain("location is not available");
    }
    const groupAsMenu = await MenusRoute({ searchParams: Promise.resolve({ hall: "blue-wall" }) });
    expect(groupAsMenu.props.notice).toContain("location is not available");
  });
});

describe("Campus Center backend menu contract", () => {
  it.each(destinations)("loads %s with its backend location ID and reuses the day response for details", async (name, id) => {
    const food = { id: "701", name: "Backend contract test item", ingredients: "Contract test ingredients", allergens: ["Milk"], nutrition: { calories: 150 } };
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({
      location: id,
      date: today,
      menus: Object.fromEntries(["breakfast", "lunch", "dinner", "grab-n-go", "daily-offerings"].map((meal) => [meal, [{ id: "station", name: "Returned station", foods: [food] }]])),
      foods: { [food.id]: food },
      updatedAt: null,
    }));
    vi.stubGlobal("fetch", fetcher);
    const page = await MenusRoute({ searchParams: Promise.resolve({ hall: id, date: today }) });
    render(page);
    fireEvent.click(await screen.findByRole("button", { name: food.name }));
    const dialog = await screen.findByRole("dialog", { name: food.name });
    await within(dialog).findByText("Contract test ingredients");
    expect(within(dialog).getByText("Milk")).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetcher.mock.calls[0][0]), "http://localhost");
    expect(url.pathname).toBe("/api/menus");
    expect(Object.fromEntries(url.searchParams)).toEqual({ location: id, date: today });
    fireEvent.click(within(dialog).getByRole("button", { name: "Close food details" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByText("Sample menu")).toBeNull();

    const parent = id === "harvest-market" || id === "peoples-organic-coffee" ? "Campus Center" : "Blue Wall";
    expect(screen.getByRole("link", { name: `All ${parent} locations` }).getAttribute("href")).toBe(`/menus?category=${parent === "Blue Wall" ? "blue-wall" : "campus-center"}`);
    expect(screen.getByRole("heading", { name: `${name} Menu` })).toBeTruthy();
    const labels = screen.getAllByRole("button").filter((button) => button.hasAttribute("aria-pressed") && !button.getAttribute("aria-label")?.startsWith("Select ")).map((button) => button.textContent);
    expect(labels).toEqual(id === "harvest-market" ? ["Breakfast", "Lunch", "Dinner", "Grab n' Go"] : id === "peoples-organic-coffee" ? ["Grab n' Go", "Daily Offerings"] : ["Lunch", "Dinner"]);
  });

  it("keeps an unpopulated Campus Center menu empty and normalizes invalid date and section selections", async () => {
    const nextDay = "2026-11-14";
    vi.setSystemTime(new Date("2026-11-14T17:00:00Z"));
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ location: "harvest-market", date: nextDay, menus: {}, foods: {} }));
    vi.stubGlobal("fetch", fetcher);
    const page = await MenusRoute({ searchParams: Promise.resolve({ hall: "harvest-market", date: "2020-01-01", meal: "late-night" }) });
    expect(page.props.initialDate).toBe(nextDay);
    expect(page.props.initialMeal).toBe("lunch");
    render(page);
    await screen.findByText("No menu published for this selection.");
    expect(screen.queryByRole("button", { name: "Backend contract test item" })).toBeNull();
  });
});
