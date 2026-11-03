import { createHash } from "node:crypto";
import { MenuConstructor } from "../scraper/MenuConstructor.js";
import { DataNode } from "../scraper/parser.js";
import { buildAllergies, buildIngredients, buildNutritionalInfo } from "./menuData.js";
import { formatSnapshotFood } from "../handlers/snapshot.js";
import { supabase } from "./supabase.js";

// These IDs are the foodpro IDs used by the existing scraper. Locations with
// image or external menus have no machine-readable foodpro feed.
export const FEEDS = [
  ["berkshire", 4], ["worcester", 1], ["franklin", 2], ["hampshire", 3],
  ["berkshire-grab-n-go", 10666], ["worcester-grab-n-go", 10667], ["hampshire-grab-n-go", 10715], ["franklin-grab-n-go", 10716],
  ["whitmore-cafe", 14], ["procrastination-station", 17], ["courtside-cafe", 18], ["worcester-cafe", 647],
  ["isb-cafe", 883], ["hampshire-cafe", 1723], ["roots-cafe", 1724], ["morrill-cafe", 2061],
  ["peets-coffee-tea", 4311], ["the-hub", 9150], ["newman-cafe", 9980], ["snack-overflow", 9981],
  ["post-and-bean-cafe", 10293], ["carney-cafe", 10392],
] as const;

export function campusDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
function dayOffset(date: string, offset: number): string {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10);
}
function mealId(name: string): string {
  const id = name.trim().toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (id === "grabngo" || id === "grab-n-go") return "grab-n-go";
  if (id === "daily-offering") return "daily-offerings";
  return id;
}

export async function buildSnapshot(location: string, date: string, menu: DataNode) {
  const menus: Record<string, { id: string; name: string; foods: object[] }[]> = {};
  const foods: Record<string, ReturnType<typeof formatSnapshotFood>> = {};
  const validMeals = new Set(["breakfast", "lunch", "dinner", "grab-n-go", "late-night", "daily-offerings"]);
  for (const [period, periodNode] of menu.data) {
    if (!(periodNode instanceof DataNode)) throw new Error("Invalid meal node");
    const meal = mealId(period);
    if (!validMeals.has(meal)) throw new Error(`Unknown meal period: ${period}`);
    const stations = menus[meal] ||= [];
    for (const [stationName, stationNode] of periodNode.data) {
      if (!(stationNode instanceof DataNode) || !stationName.trim()) throw new Error("Invalid station");
      const station = { id: stationName, name: stationName, foods: [] as object[] };
      for (const [name, node] of stationNode.data) {
        if (!(node instanceof DataNode) || !name.trim()) throw new Error("Invalid food");
        node.data.set("data-dish-name", name);
        const id = createHash("sha256").update(JSON.stringify([location, date, meal, stationName, name])).digest("hex");
        const item = buildNutritionalInfo(node);
        const food = formatSnapshotFood({ ...item, id,
          menu_item_ingredients: buildIngredients(node).map((value) => ({ ingredients: { name: value } })),
          menu_item_allergens: buildAllergies(node).map((value) => ({ allergens: { name: value } })),
        });
        foods[id] = food;
        station.foods.push({ id, name, dietaryTags: food.dietaryTags, carbonRating: food.carbonRating, price: node.data.get("price") || null });
      }
      stations.push(station);
    }
  }
  return { location, date, menus, foods };
}

export async function refreshMenus(options: {
  today?: string;
  days?: number;
  feeds?: ReadonlyArray<readonly [string, number]>;
  scrape?: (url: string) => Promise<DataNode>;
  save?: (snapshot: Awaited<ReturnType<typeof buildSnapshot>>) => Promise<void>;
} = {}) {
  const today = options.today ?? campusDate();
  const feeds = options.feeds ?? FEEDS;
  const scrape = options.scrape ?? MenuConstructor.constructMenuDataFromLink;
  const save = options.save ?? (async (snapshot) => {
    const { error } = await supabase.from("menu_snapshots").upsert({ location: snapshot.location, date: snapshot.date, payload: snapshot, updated_at: new Date().toISOString() }, { onConflict: "location,date" });
    if (error) throw error;
  });
  const failures: string[] = [];
  for (let offset = 0; offset < (options.days ?? 14); offset++) {
    const date = dayOffset(today, offset);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(4, feeds.length) }, async () => {
      while (next < feeds.length) {
        const [location, id] = feeds[next++]!;
        const [year, month, day] = date.split("-");
        const url = `https://www.umassdining.com/foodpro-menu-ajax?${new URLSearchParams({ tid: String(id), date: `${Number(month)}/${Number(day)}/${year}` })}`;
        try { await save(await buildSnapshot(location, date, await scrape(url))); }
        catch (error) { failures.push(`${location} ${date}: ${String(error)}`); }
      }
    }));
  }
  return failures;
}
