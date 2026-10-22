import { describe, expect, it, vi } from "vitest";
import { createHttpMenuDataSource } from "@/lib/menus/http-menu-data-source";
import { createMockMenuDataSource } from "@/lib/menus/mock-menu-data-source";
import { DEMO_DINING_HALLS } from "@/lib/menus/dining-halls";
import { getCampusDate, isMenuDate, shiftMenuDate } from "@/lib/menus/date";
import { parseFoodDetails, parseMenuResponse } from "@/lib/menus/validation";
import { GET as getMenuRoute } from "@/app/api/menu-demo/menus/route";
import { GET as getFoodRoute } from "@/app/api/menu-demo/foods/[foodId]/route";
import type { MenuQuery } from "@/lib/menus/types";

const query: MenuQuery = { diningHallId: "berkshire", date: "2026-10-19", meal: "lunch" };
const mock = createMockMenuDataSource({ latencyMs: 0 });

describe("menu data sources", () => {
  it("provides contract-valid menus and details for every advertised hall and meal", async () => {
    for (const hall of DEMO_DINING_HALLS) {
      for (const meal of hall.meals!) {
        const selection = { ...query, diningHallId: hall.id, meal };
        const menu = parseMenuResponse(await mock.getMenu(selection));
        expect(menu.diningHallId).toBe(hall.id);
        expect(menu.meal).toBe(meal);
        for (const station of menu.stations) {
          for (const food of station.foods) {
            expect(parseFoodDetails(await mock.getFoodDetails({ ...selection, foodId: food.id })).id).toBe(food.id);
          }
        }
      }
    }
  });

  it("changes fixtures by date and hall and provides an empty meal", async () => {
    const first = await mock.getMenu(query);
    const next = await mock.getMenu({ ...query, date: "2026-10-20" });
    const other = await mock.getMenu({ ...query, diningHallId: "worcester" });
    expect(first.stations).not.toEqual(next.stations);
    expect(first.stations).not.toEqual(other.stations);
    expect((await mock.getMenu({ ...query, date: "2026-10-25", meal: "late-night" })).stations).toEqual([]);
  });

  it("rejects a food that does not belong to the selected menu", async () => {
    await expect(mock.getFoodDetails({ ...query, meal: "breakfast", foodId: "cheddar-bisque" })).rejects.toThrow();
  });

  it("honors cancellation", async () => {
    const controller = new AbortController();
    const request = createMockMenuDataSource({ latencyMs: 500 }).getMenu(query, controller.signal);
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });

  it("sends the full selection, cookies, and cancellation signal to the HTTP API", async () => {
    const payload = await mock.getMenu(query);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(payload));
    const source = createHttpMenuDataSource({ baseUrl: "https://api.example.test/api/", fetcher });
    const controller = new AbortController();
    await source.getMenu(query, controller.signal);
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).toBe("https://api.example.test/api/menus?diningHallId=berkshire&date=2026-10-19&meal=lunch");
    expect(options).toMatchObject({ signal: controller.signal, credentials: "include", cache: "no-store" });
  });

  it("encodes a food ID in its details request", async () => {
    const payload = { ...(await mock.getFoodDetails({ ...query, foodId: "cheddar-bisque" })), id: "recipe/one & two" };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(payload));
    const source = createHttpMenuDataSource({ baseUrl: "/api", fetcher });
    await source.getFoodDetails({ ...query, foodId: payload.id });
    expect(fetcher.mock.calls[0][0]).toBe("/api/foods/recipe%2Fone%20%26%20two?diningHallId=berkshire&date=2026-10-19&meal=lunch");
  });

  it("rejects HTTP failures, invalid values, and mismatched selection responses", async () => {
    const payload = await mock.getMenu(query);
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ ...payload, meal: "dinner" }))
      .mockResolvedValueOnce(Response.json({ ...payload, stations: "invalid" }));
    const source = createHttpMenuDataSource({ baseUrl: "/api", fetcher });
    await expect(source.getMenu(query)).rejects.toThrow("unavailable");
    await expect(source.getMenu(query)).rejects.toThrow("different menu");
    await expect(source.getMenu(query)).rejects.toThrow("invalid response");
  });

  it("preserves missing information and legitimate zero values", () => {
    const food = parseFoodDetails({ id: "fruit", name: "Fruit", nutrition: { calories: 0, totalFat: { amount: 0, unit: "g", dailyValue: 0 } }, healthfulnessScore: 0 });
    expect(food.allergens).toBeNull();
    expect(food.nutrition?.calories).toBe(0);
    expect(food.nutrition?.totalFat?.dailyValue).toBe(0);
    expect(food.healthfulnessScore).toBe(0);
    expect(() => parseFoodDetails({ ...food, healthfulnessScore: 70 })).toThrow();
    expect(() => parseFoodDetails({ ...food, sourceUrl: "javascript:alert(1)" })).toThrow();
  });
});

describe("fixture API routes", () => {
  it("serves menus and food details and rejects invalid requests", async () => {
    const search = new URLSearchParams({ ...query });
    const response = await getMenuRoute(new Request(`http://localhost/api/menu-demo/menus?${search}`));
    expect(response.status).toBe(200);
    const menu = parseMenuResponse(await response.json());
    const foodId = menu.stations[0].foods[0].id;
    const details = await getFoodRoute(new Request(`http://localhost/api/menu-demo/foods/${foodId}?${search}`), { params: Promise.resolve({ foodId }) });
    expect(details.status).toBe(200);
    expect(parseFoodDetails(await details.json()).id).toBe(foodId);
    expect((await getMenuRoute(new Request("http://localhost/api/menu-demo/menus"))).status).toBe(400);
    expect((await getFoodRoute(new Request(`http://localhost/api/menu-demo/foods/missing?${search}`), { params: Promise.resolve({ foodId: "missing" }) })).status).toBe(404);
  });
});

describe("menu dates", () => {
  it("uses the campus date across midnight and handles month and year boundaries", () => {
    expect(getCampusDate(new Date("2026-10-20T02:00:00Z"))).toBe("2026-10-19");
    expect(shiftMenuDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftMenuDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(isMenuDate("2026-02-30")).toBe(false);
    expect(shiftMenuDate("9999-12-31", 1)).toBe("9999-12-31");
  });
});
