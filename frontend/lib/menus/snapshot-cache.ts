import { getCampusDate, shiftMenuDate } from "./date";
import { CAMPUS_LOCATIONS } from "./campus-locations";
import { DEMO_DINING_HALLS } from "./dining-halls";
import { parseFoodDetails, parseMenuResponse } from "./validation";
import type { FoodDetails, MenuDataSource, MenuResponse } from "./types";

type Snapshot = { menus: Record<string, MenuResponse>; foods: Record<string, FoodDetails> };
const liveBase = "/api";
const base = liveBase || "/api/menu-demo";
const cache = new Map<string, { promise: Promise<Snapshot>; expires: number }>();
const ttl = 5 * 60 * 1000;
// These locations do not have a supported machine-readable feed yet.
const unavailableFeeds = new Set(["argo-tea", "terrace"]);
const ids = [...DEMO_DINING_HALLS, ...(liveBase ? CAMPUS_LOCATIONS : [])].filter((location) => !unavailableFeeds.has(location.id)).map((location) => location.id);
let preloadDate = "";

function allowNearbyPreload(): boolean {
  if (typeof navigator === "undefined") return true;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !connection?.saveData && connection?.effectiveType !== "slow-2g" && connection?.effectiveType !== "2g";
}

function load(location: string, date: string): Promise<Snapshot> {
  const key = `${location}:${date}`;
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing.promise;
  const promise = (async () => {
    const response = await fetch(`${base}/menus?${new URLSearchParams({ location, date })}`, { credentials: "include", cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error("The menu service is unavailable. Please try again.");
    const data = await response.json();
    if (data.location !== location || data.date !== date || !data.menus || typeof data.menus !== "object" || !data.foods || typeof data.foods !== "object") throw new Error("Invalid menu snapshot.");
    const menus: Record<string, MenuResponse> = {};
    for (const [meal, stations] of Object.entries(data.menus)) menus[meal] = parseMenuResponse({ diningHallId: location, date, meal, stations, updatedAt: data.updatedAt ?? null });
    const foods: Record<string, FoodDetails> = {};
    for (const [id, value] of Object.entries(data.foods)) {
      const food = parseFoodDetails(value);
      if (food.id !== id) throw new Error("Invalid food in snapshot.");
      foods[id] = food;
    }
    for (const menu of Object.values(menus)) for (const station of menu.stations) for (const food of station.foods) if (!foods[food.id]) throw new Error("Incomplete menu snapshot.");
    return { menus, foods };
  })();
  for (const [cachedKey, entry] of cache) if (entry.expires <= Date.now()) cache.delete(cachedKey);
  cache.set(key, { promise, expires: Infinity });
  promise.then(() => {
    const entry = cache.get(key);
    if (entry?.promise === promise) entry.expires = Date.now() + ttl;
  }, () => {});
  promise.catch(() => { if (cache.get(key)?.promise === promise) cache.delete(key); });
  return promise;
}

function withSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

export const snapshotDataSource: MenuDataSource = {
  mode: liveBase ? "live" : "demo",
  async getMenu(query, signal) {
    const snapshot = await withSignal(load(query.diningHallId, query.date), signal);
    return snapshot.menus[query.meal] ?? { ...query, stations: [], updatedAt: null };
  },
  async getFoodDetails(query, signal) {
    const snapshot = await withSignal(load(query.diningHallId, query.date), signal);
    const food = snapshot.foods[query.foodId];
    if (!food || !snapshot.menus[query.meal]?.stations.some((station) => station.foods.some((item) => item.id === query.foodId))) throw new Error("Food not found in menu.");
    return food;
  },
};

export async function preloadMenus(today = getCampusDate()) {
  if (preloadDate === today) return;
  preloadDate = today;
  // The current scraper gathers today and the following 13 days, not past dates.
  for (let offset = 0; offset < 2 && getCampusDate() === today; offset++) {
    // Today's selections remain available; defer speculative days on limited connections.
    if (offset > 0 && !allowNearbyPreload()) break;
    const date = shiftMenuDate(today, offset);
    let next = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < ids.length) {
        const id = ids[next++];
        try { await load(id, date); } catch { /* A failed location can be retried on selection. */ }
      }
    }));
  }
}
