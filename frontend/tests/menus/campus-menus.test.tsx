import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Home from "@/app/page";
import MenusRoute from "@/app/menus/page";
import { DiningCategoryPage } from "@/menus/category-page";
import { MenuPage } from "@/menus/menu-page";
import { CAMPUS_LOCATIONS, getCategoryLocations } from "@/lib/menus/campus-locations";
import { createHttpMenuDataSource } from "@/lib/menus/http-menu-data-source";
import { parseFoodDetails, parseMenuResponse } from "@/lib/menus/validation";
import { GET as pendingMenu } from "@/app/api/menu-pending/menus/route";
import { GET as pendingFood } from "@/app/api/menu-pending/foods/[foodId]/route";
import type { MenuQuery, MenuResponse } from "@/lib/menus/types";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("Campus dining navigation", () => {
  it("adds two category links without listing individual cafés on Home", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: "Browse Grab ’n Go locations" }).getAttribute("href")).toBe("/menus?category=grab-n-go");
    expect(screen.getByRole("link", { name: "Browse Around Campus locations" }).getAttribute("href")).toBe("/menus?category=around-campus");
    expect(screen.queryByRole("link", { name: "View Whitmore Café menu" })).toBeNull();
    expect(screen.getAllByRole("link", { name: /^View .+ menu$/ })).toHaveLength(4);
  });

  it("shows four Grab ’n Go locations and sixteen campus cafés in their own categories", () => {
    const view = render(<DiningCategoryPage categoryId="grab-n-go" />);
    expect(screen.getAllByRole("link", { name: /^View .+ menu$/ })).toHaveLength(4);
    expect(screen.queryByRole("link", { name: "View Whitmore Café menu" })).toBeNull();
    view.unmount();
    render(<DiningCategoryPage categoryId="around-campus" />);
    expect(screen.getAllByRole("link", { name: /^View .+ menu$/ })).toHaveLength(16);
    expect(screen.getByRole("link", { name: "View Whitmore Café menu" }).getAttribute("href")).toBe("/menus?hall=whitmore-cafe");
  });

  it("routes category links to directories and every location to the shared menu", async () => {
    for (const category of ["grab-n-go", "around-campus"]) {
      const page = await MenusRoute({ searchParams: Promise.resolve({ category }) });
      expect(page.type).toBe(DiningCategoryPage);
      expect(page.props.categoryId).toBe(category);
    }
    for (const location of CAMPUS_LOCATIONS) {
      const page = await MenusRoute({ searchParams: Promise.resolve({ hall: location.id, date: "2026-10-27" }) });
      expect(page.type).toBe(MenuPage);
      expect(page.props.initialHallId).toBe(location.id);
      expect(location.meals).toContain(page.props.initialMeal);
    }
    const page = await MenusRoute({ searchParams: Promise.resolve({ hall: "whitmore-cafe", date: "2026-10-27", meal: "daily-offerings" }) });
    expect(page.props.initialMeal).toBe("daily-offerings");
  });

  it("rejects unknown categories and mismatched category/location links", async () => {
    const unknown = await MenusRoute({ searchParams: Promise.resolve({ category: "unknown" }) });
    expect(unknown.props.notice).toContain("category is not available");
    const mismatch = await MenusRoute({ searchParams: Promise.resolve({ category: "grab-n-go", hall: "whitmore-cafe" }) });
    expect(mismatch.type).toBe(DiningCategoryPage);
    expect(mismatch.props.categoryId).toBe("grab-n-go");
    expect(mismatch.props.notice).toContain("location is not available");
  });
});

describe("Unpopulated campus menu endpoints", () => {
  it("returns a valid empty menu for every configured location and menu section", async () => {
    for (const location of CAMPUS_LOCATIONS) {
      for (const meal of location.meals ?? []) {
        const query = { diningHallId: location.id, date: "2026-10-27", meal };
        const response = await pendingMenu(new Request(`http://localhost/api/menu-pending/menus?${new URLSearchParams(query)}`));
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(parseMenuResponse(await response.json())).toEqual({ ...query, stations: [], updatedAt: null });
      }
    }
  });

  it("rejects invalid selections and provides no fabricated food details", async () => {
    expect((await pendingMenu(new Request("http://localhost/api/menu-pending/menus"))).status).toBe(400);
    const unknown = "diningHallId=unknown&date=2026-10-27&meal=lunch";
    expect((await pendingMenu(new Request(`http://localhost/api/menu-pending/menus?${unknown}`))).status).toBe(404);
    const unavailable = "diningHallId=hampshire-grab-n-go&date=2026-10-27&meal=dinner";
    expect((await pendingMenu(new Request(`http://localhost/api/menu-pending/menus?${unavailable}`))).status).toBe(404);
    expect((await pendingFood(new Request("http://localhost/api/menu-pending/foods/unknown"))).status).toBe(400);
    expect((await pendingFood(new Request(`http://localhost/api/menu-pending/foods/unknown?${unknown}`))).status).toBe(404);
  });

  it("fetches blank menus on location and date changes and updates location information", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => pendingMenu(new Request(String(input))));
    const source = createHttpMenuDataSource({ baseUrl: "http://localhost/api/menu-pending", mode: "pending", fetcher });
    render(<MenuPage initialHallId="berkshire-grab-n-go" initialDate="2026-10-27" initialMeal="lunch" dataSource={source} />);
    await screen.findByText("Menu information is not available yet.");
    expect(screen.queryByText("Sample menu")).toBeNull();
    expect(within(screen.getByRole("region", { name: "About this location" })).getByRole("heading", { name: "Berkshire Grab ’n Go" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Select Hampshire Grab ’n Go" }));
    await screen.findByText("Menu information is not available yet.");
    expect(fetcher.mock.calls.at(-1)?.[0]).toContain("diningHallId=hampshire-grab-n-go");
    expect(fetcher.mock.calls.at(-1)?.[0]).toContain("meal=breakfast");
    expect(within(screen.getByRole("region", { name: "About this location" })).getByRole("heading", { name: "Hampshire Grab ’n Go" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    await screen.findByText("Menu information is not available yet.");
    expect(fetcher.mock.calls.at(-1)?.[0]).toContain("date=2026-10-28");
    expect(new URLSearchParams(window.location.search).get("hall")).toBe("hampshire-grab-n-go");
  });
});

describe("Campus backend responses", () => {
  it("displays returned café items, prices, tags and details through the HTTP adapter", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.includes("/foods/")) {
        return Response.json({ id: "integration-item", name: "Integration test item", dietaryTags: ["vegetarian"], carbonRating: "B", nutrition: { servingSize: "1 item", calories: 120 }, healthfulnessScore: null, allergens: ["Milk"], ingredients: "Test ingredients", sourceUrl: null, updatedAt: null });
      }
      const query = Object.fromEntries(url.searchParams) as unknown as MenuQuery;
      return Response.json({ ...query, updatedAt: null, stations: [{ id: "daily", name: "Daily items", foods: [{ id: "integration-item", name: "Integration test item", price: "$4.50", dietaryTags: ["vegetarian"], carbonRating: "B" }] }] } satisfies MenuResponse);
    });
    const source = createHttpMenuDataSource({ baseUrl: "http://localhost/api", fetcher });
    render(<MenuPage initialHallId="whitmore-cafe" initialDate="2026-10-27" initialMeal="daily-offerings" dataSource={source} />);
    const food = await screen.findByRole("button", { name: "Integration test item" });
    expect(screen.getByText("$4.50")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Daily Offerings" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(food);
    const dialog = await screen.findByRole("dialog", { name: "Integration test item" });
    await within(dialog).findByRole("heading", { name: "Nutrition Facts" });
    expect(within(dialog).getByText("Test ingredients")).toBeTruthy();
    expect(within(dialog).getByText("Milk")).toBeTruthy();
    expect(fetcher.mock.calls.at(-1)?.[0]).toContain("/foods/integration-item?diningHallId=whitmore-cafe&date=2026-10-27&meal=daily-offerings");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(food));
  });

  it("accepts optional display prices while rejecting invalid price values", () => {
    const details = { id: "item", name: "Item", price: "$0.00" };
    expect(parseFoodDetails(details).price).toBe("$0.00");
    expect(parseFoodDetails({ ...details, price: undefined }).price).toBeNull();
    expect(() => parseFoodDetails({ ...details, price: 4.5 })).toThrow("invalid response");
    expect(getCategoryLocations("grab-n-go")).toHaveLength(4);
    expect(getCategoryLocations("around-campus")).toHaveLength(16);
  });
});
