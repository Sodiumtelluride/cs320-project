import { afterEach, describe, expect, it, vi } from "vitest";
const database = vi.hoisted(() => ({ rows: new Map<string, any>() }));
vi.mock("../supabase.js", () => ({ supabase: { from: () => ({
  upsert: async (row: any) => { database.rows.set(`${row.location}:${row.date}`, row); return { error: null }; },
  select: () => {
    let location = ""; let date = "";
    const query = { eq: (key: string, value: string) => { if (key === "location") location = value; else date = value; return query; },
      maybeSingle: async () => ({ data: database.rows.get(`${location}:${date}`) ?? null, error: null }) };
    return query;
  },
}) } }));
import { refreshMenus } from "../refreshMenus.js";
import { getSnapshot } from "../../handlers/snapshot.js";

afterEach(() => vi.unstubAllGlobals());

describe("menu refresh", () => {
  it("parses a real feed shape, replaces repeated snapshots, and preserves good data on failure", async () => {
    const html = '<li class="lightbox-nutrition"><a data-dish-name="Soup" data-calories="100" data-allergens="Milk" data-ingredient-list="Milk, Salt"></a></li>';
    const fetcher = vi.fn().mockImplementation(async () => Response.json({ Lunch: { Grill: html } }));
    vi.stubGlobal("fetch", fetcher);
    const rows = new Map<string, any>();
    const save = async (snapshot: any) => { rows.set(`${snapshot.location}:${snapshot.date}`, snapshot); };
    const options = { today: "2026-11-02", days: 1, feeds: [["berkshire", 4]] as const, save };
    expect(await refreshMenus(options)).toEqual([]);
    const first = rows.get("berkshire:2026-11-02");
    const food = Object.values(first.foods)[0] as any;
    expect(food.nutrition.calories).toBe(100);
    expect(food.allergens).toEqual(["Milk"]);
    expect(await refreshMenus(options)).toEqual([]);
    expect(rows.size).toBe(1);
    expect(rows.get("berkshire:2026-11-02")).toEqual(first);
    fetcher.mockResolvedValue(Response.json({ Lunch: { Grill: '<li class="lightbox-nutrition"></li>' } }));
    expect(await refreshMenus(options)).toHaveLength(1);
    expect(rows.get("berkshire:2026-11-02")).toEqual(first);
  });

  it("processes today before tomorrow and keeps other locations running after a failure", async () => {
    const seen: string[] = [];
    const save = async (snapshot: any) => { seen.push(`${snapshot.location}:${snapshot.date}`); };
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("tid=1")) throw new Error("offline");
      return Response.json({ Lunch: {} });
    }));
    const failures = await refreshMenus({ today: "2026-11-02", days: 2, feeds: [["a", 1], ["b", 2]], save });
    expect(failures).toHaveLength(2);
    expect(seen).toEqual(["b:2026-11-02", "b:2026-11-03"]);
  });
  it("serves a saved refresh through the snapshot handler", async () => {
    database.rows.clear();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ Lunch: { Grill: '<li class="lightbox-nutrition"><a data-dish-name="Soup" data-calories="100"></a></li>' } })));
    expect(await refreshMenus({ today: "2026-11-02", days: 1, feeds: [["berkshire", 4]] })).toEqual([]);
    const json = vi.fn();
    await getSnapshot({ query: { location: "berkshire", date: "2026-11-02" } } as any, { json, status: vi.fn() } as any);
    const response = json.mock.calls[0]![0];
    const item = response.menus.lunch[0].foods[0];
    expect(response.foods[item.id].nutrition.calories).toBe(100);
    expect(response.updatedAt).toBeTruthy();
  });
  it("normalizes the singular daily offering label used by the live feed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ "daily offering": { Grill: '<li class="lightbox-nutrition"><a data-dish-name="Soup"></a></li>' } })));
    let snapshot: any;
    expect(await refreshMenus({ today: "2026-11-02", days: 1, feeds: [["cafe", 1]], save: async (value) => { snapshot = value; } })).toEqual([]);
    expect(snapshot.menus["daily-offerings"]).toHaveLength(1);
  });
  it("saves a valid empty feed as unpublished, but retains the previous snapshot on malformed data", async () => {
    let row: any;
    const save = async (value: any) => { row = value; };
    const options = { today: "2026-11-03", days: 1, feeds: [["worcester-grab-n-go", 10667]] as const, save };
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json([])));
    expect(await refreshMenus(options)).toEqual([]);
    expect(row.menus).toEqual({});
    expect(row.foods).toEqual({});
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json(["unexpected"])));
    expect(await refreshMenus(options)).toHaveLength(1);
    expect(row.menus).toEqual({});
  });
});
