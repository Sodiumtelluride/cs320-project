import { describe, it, expect, vi } from "vitest";
vi.mock("../supabase.js", () => ({ supabase: {} }));
import { DataNode } from "../../scraper/parser.js";
import { MenuConstructor } from "../../scraper/MenuConstructor.js";
import { getLocalSnapshot } from "../localSnapshotStore.js";

describe("local live snapshot store", () => {
  it("shares in-flight work and caches complete results", async () => {
    const menu = new DataNode();
    menu.data.set("lunch", new DataNode());
    const scrape = vi.spyOn(MenuConstructor, "constructMenuDataFromLink").mockResolvedValue(menu);
    const a = getLocalSnapshot("berkshire", "2026-11-02");
    const b = getLocalSnapshot("berkshire", "2026-11-02");
    expect(a).toBe(b);
    expect((await a).payload.menus.lunch).toEqual([]);
    await getLocalSnapshot("berkshire", "2026-11-02");
    expect(scrape).toHaveBeenCalledTimes(1);
    scrape.mockRestore();
  });
});
