import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

describe("snapshot cache", () => {
  it("builds a sample snapshot with menu items and their details", async () => {
    const { GET } = await import("@/app/api/menu-demo/menu-snapshots/route");
    const response = await GET(new Request("http://localhost/api/menu-demo/menu-snapshots?location=berkshire&date=2026-11-02"));
    expect(response.status).toBe(200);
    const snapshot = await response.json();
    const food = snapshot.menus.lunch[0].foods[0];
    expect(snapshot.foods[food.id].nutrition).toBeDefined();
    expect(snapshot.foods[food.id].id).toBe(food.id);
  });
  it("shares a pending request, reuses food details, and retries a failed request", async () => {
    vi.stubEnv("NEXT_PUBLIC_MENU_API_BASE_URL", "/api");
    let finish!: (response: Response) => void;
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve; }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ location: "worcester", date: "2026-11-02", menus: {}, foods: {} }));
    vi.stubGlobal("fetch", fetcher);
    const { snapshotDataSource } = await import("@/lib/menus/snapshot-cache");
    const query = { diningHallId: "berkshire", date: "2026-11-02", meal: "lunch" as const };
    const first = snapshotDataSource.getMenu(query);
    const second = snapshotDataSource.getMenu(query);
    expect(fetcher).toHaveBeenCalledTimes(1);
    finish(Response.json({ location: "berkshire", date: query.date, menus: { lunch: [{ id: "grill", name: "Grill", foods: [{ id: "1", name: "Food" }] }] }, foods: { "1": { id: "1", name: "Food" } } }));
    expect((await first).stations).toHaveLength(1);
    await second;
    expect((await snapshotDataSource.getFoodDetails({ ...query, foodId: "1" })).name).toBe("Food");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const other = { ...query, diningHallId: "worcester" };
    await expect(snapshotDataSource.getMenu(other)).rejects.toThrow();
    expect((await snapshotDataSource.getMenu(other)).stations).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("finishes today across locations before prefetching future dates", async () => {
    vi.stubEnv("NEXT_PUBLIC_MENU_API_BASE_URL", "/api");
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetcher);
    const { preloadMenus } = await import("@/lib/menus/snapshot-cache");
    const { getCampusDate, shiftMenuDate } = await import("@/lib/menus/date");
    const { CAMPUS_LOCATIONS } = await import("@/lib/menus/campus-locations");
    const { DEMO_DINING_HALLS } = await import("@/lib/menus/dining-halls");
    const count = CAMPUS_LOCATIONS.filter((location) => !["argo-tea", "terrace"].includes(location.id)).length + DEMO_DINING_HALLS.length;
    const today = getCampusDate();
    await preloadMenus(today);
    const dates = fetcher.mock.calls.map(([url]) => new URL(String(url), "http://localhost").searchParams.get("date"));
    expect(dates.slice(0, count)).toEqual(Array(count).fill(today));
    expect(dates.slice(count, count * 2)).toEqual(Array(count).fill(shiftMenuDate(today, 1)));
  });
  it("limits background downloads to today when data saver is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_MENU_API_BASE_URL", "/api");
    vi.stubGlobal("navigator", { connection: { saveData: true } });
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetcher);
    const { preloadMenus } = await import("@/lib/menus/snapshot-cache");
    const { getCampusDate } = await import("@/lib/menus/date");
    await preloadMenus();
    const dates = fetcher.mock.calls.map(([url]) => new URL(String(url), "http://localhost").searchParams.get("date"));
    expect(dates.length).toBe(22);
    expect(new Set(dates)).toEqual(new Set([getCampusDate()]));
  });
});
