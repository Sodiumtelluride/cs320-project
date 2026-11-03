import { FEEDS, buildSnapshot, campusDate } from "./refreshMenus.js";
import { MenuConstructor } from "../scraper/MenuConstructor.js";

type Snapshot = Awaited<ReturnType<typeof buildSnapshot>>;
type Entry = { payload: Snapshot; updated_at: string; expires: number };
const entries = new Map<string, Entry>();
const pending = new Map<string, Promise<Entry>>();
const ttl = 30 * 60_000;

// Local preview only. Production reads snapshots saved by the refresh worker.
export function getLocalSnapshot(location: string, date: string): Promise<Entry> {
  const key = `${location}:${date}`;
  const existing = entries.get(key);
  if (existing && existing.expires > Date.now()) return Promise.resolve(existing);
  const running = pending.get(key);
  if (running) return running;
  const feed = FEEDS.find(([id]) => id === location);
  if (!feed) return Promise.reject(new Error("Unsupported location"));
  const [year, month, day] = date.split("-");
  const params = new URLSearchParams({ tid: String(feed[1]), date: `${Number(month)}/${Number(day)}/${year}` });
  const request = (async () => {
    const menu = await MenuConstructor.constructMenuDataFromLink(`https://www.umassdining.com/foodpro-menu-ajax?${params}`);
    const entry = { payload: await buildSnapshot(location, date, menu), updated_at: new Date().toISOString(), expires: Date.now() + ttl };
    entries.set(key, entry);
    return entry;
  })();
  pending.set(key, request);
  void request.then(() => pending.delete(key), () => pending.delete(key));
  return request;
}

export async function warmLocalToday() {
  const date = campusDate();
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < FEEDS.length) {
      const [location] = FEEDS[next++]!;
      try { await getLocalSnapshot(location, date); }
      catch (error) { console.error(`Local menu refresh failed for ${location}`, error); }
    }
  }));
}
