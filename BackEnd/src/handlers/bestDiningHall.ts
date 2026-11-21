import type { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../db/supabase.js";
import { USER_SELECT, toUserDetails } from "../db/client.js";
import type { UserRow } from "../db/client.js";
import { Searcher } from "../searching/searcher.js";
import type { SearchResult } from "../searching/searcher.js";

/**
 * GET /api/search/best-dining-hall
 *
 * "Which dining commons should I go to right now?" answered from the caller's own
 * profile (favoriteFoods + allergies) and the menu of the service that is open at
 * this moment, using the menu-item search in src/searching/searcher.ts.
 *
 * For every favorite food the search runs with the user's allergens as its filter,
 * and the ranked results are walked from the top until one of them is actually on
 * the open menu and free of their allergens — the search ranks the whole
 * historical menu, so the best match is often a dish that is not being served
 * today, and the searcher also filters allergens itself, so the allergen check
 * here is the same rule double-checked against the row the hall is really serving.
 * That item's relevance score is added to every hall serving it, once per favorite,
 * and the hall with the most points wins. Ties go to the hall with the lower
 * locations.id, because the halls are ranked in that order and Array.prototype.sort
 * is stable.
 *
 * Only halls whose posted hours cover this moment are candidates at all, so
 * Berkshire never wins breakfast and nobody ranks a café. When every commons is
 * closed the route says so rather than guessing.
 */

// ---------- Types ----------

/** What we call a service to the caller. */
export type ServiceLabel = "breakfast" | "brunch" | "lunch" | "dinner" | "late-night";

/** One of the dining commons, as stored in locations. */
export interface DiningHall {
  id: number;
  name: string;
}

/** A dish on the open menu at one commons, flattened to what the ranking needs. */
export interface TodayItem {
  itemId: number;
  name: string;
  hallId: number;
  allergens: string[];
}

export interface RankedHall extends DiningHall {
  points: number;
}

type FoodRow = {
  id: number;
  name: string;
  menu_item_allergens: { allergens: { name: string } | null }[] | null;
};

type MealRow = {
  location_id: number;
  meal_items: { menu_items: FoodRow | null }[] | null;
};

export interface RankInput {
  favorites: string[];
  allergies: string[];
  /** The halls to rank, in the order ties should resolve to. */
  halls: DiningHall[];
  /** The open menu for those halls. */
  items: TodayItem[];
  /** Allergen names as the allergens table spells them, e.g. "Tree Nuts". */
  knownAllergens: string[];
  /** Injected so the ranking can be tested without the real searcher. */
  search: (query: string, filter: string[]) => Promise<SearchResult[]>;
}

// ---------- Constants ----------

/**
 * advancedSearch gives its single best result the score Infinity so nothing can
 * overtake it, which would make every total containing it Infinity. The largest
 * real score a search can hand out is well under 1e5 (an exact name match is
 * worth 1e5), so a fixed 1e6 keeps "this hall serves your #1 match" worth more
 * than anything else can add up to across a handful of favorites.
 */
export const TOP_MATCH_POINTS = 1_000_000;

/** Favorites are searched one at a time, and one search costs about as much as
 *  the whole route should spend, so anything past the first few is ignored. */
export const MAX_FAVORITES = 10;

/** Campus dining runs on Eastern time; the machine serving this may not. */
const CAMPUS_TIME_ZONE = "America/New_York";

/**
 * The posted dining commons hours, in minutes from campus midnight, half-open.
 *
 * The database stores no opening hours at all — locations, meals and meal_items
 * have no time columns and there is no schedules table — so this table is the
 * route's one hardcoded input, and the only thing to edit when the commons change
 * their hours. Everything else (what halls exist, what is on the menu, what
 * allergens a dish carries) still comes from the database, and a hall that is open
 * by these hours but has no published menu is still skipped, because it simply has
 * no items to rank.
 */
/** One service a hall runs, half-open in minutes from campus midnight. */
interface ServiceWindow {
  label: ServiceLabel;
  /** What meals.meal_type stores for this service. */
  mealType: string;
  start: number;
  end: number;
}

const WEEKDAY: ServiceWindow[] = [
  { label: "breakfast", mealType: "breakfast", start: 7 * 60, end: 11 * 60 },
  { label: "lunch", mealType: "lunch", start: 11 * 60, end: 16 * 60 + 30 },
  { label: "dinner", mealType: "dinner", start: 16 * 60 + 30, end: 21 * 60 },
];

const LATE_NIGHT: ServiceWindow = {
  label: "late-night",
  mealType: "late-night",
  start: 21 * 60,
  end: 24 * 60,
};

/**
 * Franklin and Hampshire serve brunch at 7:00-16:30 on weekends, but the database
 * has no "brunch" in meals.meal_type and publishes no breakfast rows for them that
 * day — the brunch food is stored under lunch. So the label says brunch (what the
 * caller is told) and the query asks for lunch (what the rows actually say).
 */
const WEEKEND_BRUNCH: ServiceWindow[] = [
  { label: "brunch", mealType: "lunch", start: 7 * 60, end: 16 * 60 + 30 },
  WEEKDAY[2]!,
];

const OPEN_LATE: ServiceWindow[] = [...WEEKDAY, LATE_NIGHT];
const NO_BREAKFAST: ServiceWindow[] = [...WEEKDAY.slice(1), LATE_NIGHT];

/**
 * keyed by locations.name (which is lowercase). A commons not listed here falls
 * back to the ordinary breakfast/lunch/dinner day, so a fifth dining hall is
 * ranked sensibly instead of being silently invisible.
 */
const HALL_HOURS: Record<string, { weekday: typeof WEEKDAY; weekend: typeof WEEKDAY }> = {
  worcester: { weekday: OPEN_LATE, weekend: OPEN_LATE },
  berkshire: { weekday: NO_BREAKFAST, weekend: NO_BREAKFAST },
  franklin: { weekday: WEEKDAY, weekend: WEEKEND_BRUNCH },
  hampshire: { weekday: WEEKDAY, weekend: WEEKEND_BRUNCH },
};

/**
 * Common ways people write an allergy that the allergens table does not spell
 * that way. Everything else is matched by name (see matchAllergens).
 */
const ALLERGY_SYNONYMS: Record<string, string[]> = {
  dairy: ["Milk"],
  lactose: ["Milk"],
  celiac: ["Gluten"],
  "gluten free": ["Gluten"],
  "gluten-free": ["Gluten"],
  soya: ["Soy"],
  seafood: ["Shellfish", "Fish"],
  "shell fish": ["Shellfish"],
  shellfish: ["Shellfish"],
  crustacean: ["Shellfish"],
  mollusk: ["Shellfish"],
  "tree nut": ["Tree Nuts"],
  "tree nuts": ["Tree Nuts"],
};

// ---------- The service it is right now ----------

export interface OpenService {
  label: ServiceLabel;
  /** What meals.meal_type stores for this service. */
  mealType: string;
  date: string;
  halls: DiningHall[];
}

export interface ServiceSnapshot {
  date: string;
  /** Minutes since campus midnight. */
  minutes: number;
  isWeekend: boolean;
  /** Open halls, grouped by meal_type so each group costs exactly one menu query. */
  open: OpenService[];
  /** Every open hall, lowest id first: the only halls the route may rank. */
  halls: DiningHall[];
  /**
   * What each open hall is actually serving, which is not the same for all of them:
   * Saturday midday is brunch at Franklin and Hampshire and lunch at Worcester and
   * Berkshire, even though both are stored under meals.meal_type = 'lunch'. The
   * groups above are for querying; this is for telling the caller the truth.
   */
  labels: Map<number, ServiceLabel>;
  closed: DiningHall[];
  /** "HH:MM" campus time of the next service to open, when everything is closed. */
  nextOpen: string | null;
}

/** Today's date, minutes since midnight and day of week, in campus time. */
function campusClock(now: Date): { date: string; minutes: number; weekday: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CAMPUS_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const value = new Map<string, string>();
  for (const part of parts) value.set(part.type, part.value);

  const date = `${value.get("year")}-${value.get("month")}-${value.get("day")}`;
  const rawHour = Number(value.get("hour"));
  // % 24 because a 2-digit hour can come back as "24" at midnight for some
  // locales' hour cycle.
  const hour = Number.isFinite(rawHour) ? rawHour % 24 : 12;
  const minute = Number(value.get("minute"));

  return {
    date,
    minutes: hour * 60 + (Number.isFinite(minute) ? minute : 0),
    weekday: value.get("weekday") ?? "",
  };
}

const clockAt = (now: Date, dayOffset: number): { date: string; minutes: number; weekday: string } =>
  campusClock(new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000));

const isWeekendDay = (weekday: string): boolean => weekday === "Sat" || weekday === "Sun";

const hoursFor = (name: string, weekend: boolean): typeof WEEKDAY => {
  const schedule = HALL_HOURS[name];
  if (!schedule) return WEEKDAY;
  return weekend ? schedule.weekend : schedule.weekday;
};

const toClock = (minutes: number): string => {
  const hour = Math.floor(minutes / 60) % 24;
  return `${String(hour).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};

/**
 * Which halls are serving right now, and under which meal_type their menu is
 * stored. Halls can be serving different services at the same moment — Saturday
 * 08:00 is brunch at Franklin and Hampshire while Worcester is still on breakfast
 * and Berkshire is closed — so this is a list of services, not one meal.
 */
export function serviceSnapshot(halls: DiningHall[], now: Date = new Date()): ServiceSnapshot {
  const today = clockAt(now, 0);
  const weekend = isWeekendDay(today.weekday);

  const open = new Map<string, OpenService>();
  const labels = new Map<number, ServiceLabel>();
  const openHalls: DiningHall[] = [];
  const closed: DiningHall[] = [];
  let nextOpen: number | null = null;

  for (const hall of halls) {
    const windows = hoursFor(hall.name, weekend);
    const window = windows.find((w) => today.minutes >= w.start && today.minutes < w.end);

    if (!window) {
      closed.push(hall);
      // The next service this hall opens today, or tomorrow if it is done for the day.
      const later = windows.filter((w) => w.start > today.minutes).map((w) => w.start);
      const tomorrow = isWeekendDay(clockAt(now, 1).weekday)
        ? hoursFor(hall.name, true)
        : hoursFor(hall.name, false);
      const firstTomorrow = tomorrow.length ? Math.min(...tomorrow.map((w) => w.start)) : null;
      const next = later.length ? Math.min(...later) : firstTomorrow;
      if (next !== null && (nextOpen === null || next < nextOpen)) nextOpen = next;
      continue;
    }

    labels.set(hall.id, window.label);
    openHalls.push(hall);

    // Halls serving the same meals.meal_type share one query even when they are
    // called different services, which is why labels exists.
    const group = open.get(window.mealType);
    if (group) {
      group.halls.push(hall);
    } else {
      open.set(window.mealType, {
        label: window.label,
        mealType: window.mealType,
        date: today.date,
        halls: [hall],
      });
    }
  }

  // Keep the halls inside each group in the same id order the caller passed, so the
  // tie-break stays "lowest locations.id" no matter how the groups come out.
  const ordered = [...open.values()]
    .map((group) => ({ ...group, halls: [...group.halls].sort((a, b) => a.id - b.id) }))
    .sort((a, b) => a.halls[0]!.id - b.halls[0]!.id);

  return {
    date: today.date,
    minutes: today.minutes,
    isWeekend: weekend,
    open: ordered,
    halls: openHalls.sort((a, b) => a.id - b.id),
    labels,
    closed: closed.sort((a, b) => a.id - b.id),
    nextOpen: nextOpen === null ? null : toClock(nextOpen),
  };
}

// ---------- Allergens ----------

/**
 * Turns what the user typed in their profile into allergen names the searcher and
 * the allergens table recognise.
 *
 * The profile stores free text ("peanuts", "dairy") while the searcher compares
 * its filter against the allergens table case-sensitively, so every entry is
 * matched against the real names: whole string, each of its words, and the
 * synonym table above. The table's own spelling is what comes back, because that
 * is what the searcher can actually filter on.
 *
 * An entry that already spells an allergen the way the table does is used as-is,
 * so "fish" means Fish and not Shellfish. Only entries that are not a table name
 * are matched loosely, and that matching is deliberately loose in the direction
 * that excludes more food: "nuts" blocks both Peanuts and Tree Nuts. An entry that
 * matches nothing (an avocado intolerance, say) is dropped — the database has no
 * allergen by that name, so there is nothing to filter on.
 */
export function matchAllergens(rawAllergies: string[], knownAllergens: string[]): string[] {
  const matched = new Set<string>();
  const known = knownAllergens.map((name) => ({ name, low: name.toLowerCase() }));

  for (const entry of rawAllergies) {
    const text = entry.trim().toLowerCase();
    if (!text) continue;

    // The whole entry plus its words, so "peanut allergies" and "lactose
    // intolerance" still reach the allergen they name.
    const terms = new Set<string>([text, ...text.split(/[^a-z0-9]+/).filter(Boolean)]);

    const synonyms = new Set<string>();
    for (const term of terms) {
      for (const name of ALLERGY_SYNONYMS[term] ?? []) synonyms.add(name.toLowerCase());
    }

    // An entry that spells an allergen the way the table does, or that the synonym
    // table resolves, is settled there. The loose matching below only runs for the
    // rest, so "Tree Nuts" does not drag in Peanuts just because both end in "nuts".
    const exact = known.filter((allergen) => allergen.low === text);
    const settled = exact.length ? exact : known.filter((allergen) => synonyms.has(allergen.low));
    if (settled.length) {
      for (const allergen of settled) matched.add(allergen.name);
      continue;
    }

    for (const allergen of known) {
      for (const term of terms) {
        if (term.length < 3) continue;
        if (allergen.low === term || allergen.low.includes(term) || term.includes(allergen.low)) {
          matched.add(allergen.name);
          break;
        }
      }
    }
  }

  return [...matched];
}

// ---------- Ranking ----------

/** The score a search result is worth as points, with the searcher's Infinity capped. */
export function pointsFor(score: number): number {
  return Number.isFinite(score) ? score : TOP_MATCH_POINTS;
}

/**
 * The whole algorithm, with the search injected. Returns every hall ranked,
 * most points first, with ties in the order the halls were passed in.
 */
export async function rankDiningHalls(input: RankInput): Promise<RankedHall[]> {
  const { favorites, allergies, halls, items, knownAllergens, search } = input;

  const allergenFilter = matchAllergens(allergies, knownAllergens);
  // The searcher already filters on these; checking them again here against the
  // row the hall is actually serving is the "take the second item" rule.
  const blocked = new Set<string>(allergenFilter.map((a) => a.toLowerCase()));
  for (const allergy of allergies) blocked.add(allergy.trim().toLowerCase());

  // Two indexes of the menu because the searcher keeps only one row per dish name
  // (its own global de-duplication), so the id it returns is often not the row a
  // hall is serving today even when that exact dish is on that hall's menu.
  const byId = new Map<string, TodayItem[]>();
  const byName = new Map<string, TodayItem[]>();
  const addTo = (map: Map<string, TodayItem[]>, key: string, item: TodayItem) => {
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  };
  for (const item of items) {
    addTo(byId, String(item.itemId), item);
    addTo(byName, item.name.toLowerCase(), item);
  }

  const names = new Map<number, string>();
  const points = new Map<number, number>();
  for (const hall of halls) {
    names.set(hall.id, hall.name);
    points.set(hall.id, 0);
  }

  const searched = new Set<string>();
  for (const favorite of favorites) {
    if (searched.size >= MAX_FAVORITES) break;

    const term = favorite.trim();
    if (!term) continue;

    const key = term.toLowerCase();
    if (searched.has(key)) continue;
    searched.add(key);

    const results = await search(term, allergenFilter);

    for (const result of results) {
      const idMatches = byId.get(String(result.id)) ?? [];
      const candidates = idMatches.length ? idMatches : byName.get(result.mealName.toLowerCase()) ?? [];
      // A closed hall, a dish only on offer at a café, or one blocked by an
      // allergy is not a pick for any of the halls, so the walk just keeps going
      // down the ranking.
      const served = candidates.filter(
        (item) =>
          points.has(item.hallId) && !item.allergens.some((a) => blocked.has(a.toLowerCase()))
      );
      if (!served.length) continue;

      const award = pointsFor(result.score);
      const awarded = new Set<number>();
      for (const item of served) {
        // One dish can be on the menu at several commons the same day; each of
        // them genuinely serves it, so each of them gets the points.
        if (awarded.has(item.hallId) || !points.has(item.hallId)) continue;
        awarded.add(item.hallId);
        points.set(item.hallId, (points.get(item.hallId) ?? 0) + award);
      }

      // One award per favorite: the first result that is on the open menu and
      // safe to eat, which is exactly the "otherwise take the second" rule.
      break;
    }
  }

  return [...points.entries()]
    .map(([id, score]) => ({ id, name: names.get(id) ?? "", points: score }))
    .sort((a, b) => b.points - a.points);
}

// ---------- Database reads ----------

/** The dining commons. Cafés and around-campus stores are not halls. */
async function getDiningHalls(): Promise<DiningHall[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, name")
    .eq("location_type", "on-campus");

  if (error) throw error;

  return ((data ?? []) as DiningHall[]).sort((a, b) => a.id - b.id);
}

async function getMenuItems(
  date: string,
  mealType: string,
  hallIds: number[]
): Promise<TodayItem[]> {
  const { data, error } = await supabase
    .from("meals")
    .select(
      `location_id,
       meal_items(
        menu_items(
          id,
          name,
          menu_item_allergens(allergens(name))
        )
       )`
    )
    .eq("date", date)
    .eq("meal_type", mealType)
    .in("location_id", hallIds);

  if (error) throw error;

  const items: TodayItem[] = [];
  for (const row of (data ?? []) as unknown as MealRow[]) {
    for (const mealItem of row.meal_items ?? []) {
      const food = mealItem.menu_items;
      if (!food) continue;
      items.push({
        itemId: food.id,
        name: food.name,
        hallId: row.location_id,
        allergens: (food.menu_item_allergens ?? [])
          .map((row) => row.allergens?.name)
          .filter((name): name is string => typeof name === "string"),
      });
    }
  }
  return items;
}

/** The allergen names the database knows, so the profile's free text can be
 *  matched against them instead of being guessed at. */
async function getKnownAllergens(): Promise<string[]> {
  const { data, error } = await supabase.from("allergens").select("name");
  if (error) throw error;
  return ((data ?? []) as { name: string }[]).map((row) => row.name);
}

// ---------- Route handler ----------

function displayName(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/**
 * `now` is injectable so the tests can pin the clock; the route itself always uses
 * the moment the request arrives. It is a factory rather than a third argument
 * because Express hands every handler a third argument of its own.
 */
export function createBestDiningHallHandler(
  now: () => Date = () => new Date()
): (req: Request, res: Response) => Promise<Response> {
  return async function getBestDiningHall(req: Request, res: Response) {
    // The answer depends on the hour, and the URL never changes, so nothing in the
    // chain should be free to hand back last lunch's winner.
    res.set("Cache-Control", "no-store");

    const callerId =
      typeof req.authUserId === "string" && req.authUserId !== "" ? req.authUserId : null;
    if (!callerId) {
      return res.status(401).json({ error: "authentication required" });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select(USER_SELECT)
        .eq("user_id", callerId)
        .maybeSingle();

      if (error) {
        console.error(error);
        return res.status(500).json({ error: "database error" });
      }
      if (!data) {
        return res.status(404).json({ error: "user not found" });
      }

      const profile = toUserDetails(data as unknown as UserRow);
      if (!profile.favoriteFoods.length) {
        return res.status(404).json({ error: "no favorite foods on this profile" });
      }

      const allHalls = await getDiningHalls();
      if (!allHalls.length) {
        return res.status(404).json({ error: "no dining halls configured" });
      }

      // Which commons are actually serving at this moment. Everything downstream
      // only ever sees those halls, which is what keeps Berkshire out of breakfast
      // and late-night out of Franklin.
      const service = serviceSnapshot(allHalls, now());
      if (!service.open.length) {
        return res.status(404).json({
          error: `every dining commons is closed right now; the next one opens at ${service.nextOpen}`,
        });
      }

      // Only open halls are ever candidates, and each is described by the service it
      // is actually running, so Saturday 08:00 can honestly answer "brunch at
      // Franklin" while calling Worcester's offering breakfast.
      const halls = service.halls;
      const serving = [...new Set(service.open.map((group) => group.label))].join(" or ");

      // One query per meals.meal_type, never one per hall.
      const menus = await Promise.all(
        service.open.map((group) =>
          getMenuItems(group.date, group.mealType, group.halls.map((hall) => hall.id))
        )
      );

      const items = menus.flat();
      if (!items.length) {
        return res.status(404).json({
          error: `no ${serving} menu published for ${service.date}`,
        });
      }

      const knownAllergens = await getKnownAllergens();

      const ranked = await rankDiningHalls({
        favorites: profile.favoriteFoods,
        allergies: profile.allergies,
        halls,
        items,
        knownAllergens,
        search: (query, filter) => Searcher.getInstance().advancedSearch(query, filter),
      });

      const best = ranked[0];
      if (!best || best.points <= 0) {
        return res.status(404).json({
          error: `nothing on the ${serving} menu today matches your favorite foods`,
        });
      }

      return res.status(200).json({
        date: service.date,
        // The winner's own service, not whichever group happened to be first.
        meal: service.labels.get(best.id) ?? service.open[0]!.label,
        diningHall: { id: best.name, name: displayName(best.name) },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "internal server error" });
    }
  };
}

export const getBestDiningHall = createBestDiningHallHandler();
