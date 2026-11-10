import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MenuPage } from "@/menus/menu-page";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-09T16:00:00Z"));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.history.replaceState(null, "", "/");
});

function dayMenu(location: string, date: string) {
  const food = {
    id: `${location}-${date}`,
    name: "API test item",
    dietaryTags: ["vegetarian"],
    carbonRating: "B",
    allergens: ["Milk"],
    ingredients: "API test ingredients",
    nutrition: {
      servingSize: "1 item",
      calories: 120,
      totalSugars: { amount: 3, unit: "g", dailyValue: null },
      addedSugars: { amount: 2, unit: "g", dailyValue: null },
    },
  };
  const station = { id: "daily", name: "Daily items", foods: [food] };
  return {
    location,
    date,
    menus: { lunch: [station], dinner: [station], "daily-offerings": [station] },
    foods: { [food.id]: food },
    updatedAt: null,
  };
}

describe("Menu page API integration", () => {
  it("loads a hall and its food details through the shared /api/menus response", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.pathname).toBe("/api/menus");
      return Response.json(dayMenu(url.searchParams.get("location")!, url.searchParams.get("date")!));
    });
    vi.stubGlobal("fetch", fetcher);
    render(<MenuPage initialHallId="berkshire" initialDate="2026-11-09" />);

    fireEvent.click(await screen.findByRole("button", { name: "API test item" }));
    const dialog = await screen.findByRole("dialog", { name: "API test item" });
    await within(dialog).findByText("API test ingredients");
    expect(within(dialog).getByRole("rowheader", { name: /^Total Sugars/ })).toBeTruthy();
    expect(within(dialog).queryByRole("rowheader", { name: /^Added Sugars/ })).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole("button", { name: "Close food details" }));
    fireEvent.click(screen.getByRole("button", { name: "Dinner" }));
    await screen.findByRole("region", { name: "Dinner menu" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetcher.mock.calls[0][0]), "http://localhost");
    expect(Object.fromEntries(url.searchParams)).toEqual({ location: "berkshire", date: "2026-11-09" });
  });

  it("uses the same endpoint for a café and fetches the selected date", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.pathname).toBe("/api/menus");
      return Response.json(dayMenu(url.searchParams.get("location")!, url.searchParams.get("date")!));
    });
    vi.stubGlobal("fetch", fetcher);
    render(<MenuPage initialHallId="whitmore-cafe" initialDate="2026-11-09" initialMeal="daily-offerings" />);
    await screen.findByRole("button", { name: "API test item" });
    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    await screen.findByRole("button", { name: "API test item" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const url = new URL(String(fetcher.mock.calls[1][0]), "http://localhost");
    expect(Object.fromEntries(url.searchParams)).toEqual({ location: "whitmore-cafe", date: "2026-11-10" });
    expect(new URLSearchParams(window.location.search).get("date")).toBe("2026-11-10");
  });
});
