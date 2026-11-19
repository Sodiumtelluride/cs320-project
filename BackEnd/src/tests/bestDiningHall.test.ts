/**
 * Tests for the best-dining-hall route (src/routes/bestDiningHall.ts +
 * src/handlers/bestDiningHall.ts).
 *
 * Nothing here touches a real database or the real searcher: src/db/supabase.js is
 * mocked with a chainable stub that records which table, columns and filters were
 * asked for, and src/searching/searcher.js is mocked so the ranked result list each
 * favorite search "returns" is written by the test. That keeps the interesting parts
 * under test — which ranked item the algorithm settles on, how it turns scores into
 * points, and how it decides the meal — instead of testing Supabase's query builder.
 *
 * The meal the route ranks is chosen from the clock, so the route tests compare the
 * response against currentService() rather than against a hard-coded meal; and the
 * stub ignores the date and meal filters, so they hold whatever time of day they run.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

const state = vi.hoisted(() => ({
  data: {} as Record<string, unknown[]>,
  errors: {} as Record<string, { message: string } | null>,
  calls: [] as {
    table: string;
    columns: string | undefined;
    filters: [string, string | string[]][];
  }[],
  searches: [] as { query: string; filter: string[] }[],
  results: {} as Record<string, { mealName: string; id: number; score: number }[]>,
}));

vi.mock("../db/supabase.js", () => {
  const response = (table: string, single: boolean) => {
    const rows = (state.data[table] ?? []) as Record<string, unknown>[];
    return {
      data: single ? (rows[0] ?? null) : rows,
      error: state.errors[table] ?? null,
    };
  };

  const makeClient = () => ({
    from: (table: string) => {
      const call = {
        table,
        columns: undefined as string | undefined,
        filters: [] as [string, string | string[]][],
      };
      state.calls.push(call);

      // Every builder method hands back itself, so the awaited chain resolves
      // through `then`, which is how supabase-js finishes a query. `any` because a
      // builder that returns itself has no nameable type.
      const chain: any = {
        select: (columns: string) => {
          call.columns = columns;
          return chain;
        },
        eq: (column: string, value: string) => {
          call.filters.push([column, value]);
          return chain;
        },
        in: (column: string, values: string[]) => {
          call.filters.push([column, values]);
          return chain;
        },
        order: () => chain,
        maybeSingle: async () => response(table, true),
        single: async () => response(table, true),
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve(response(table, false)).then(resolve),
      };
      return chain;
    },
  });

  return { supabase: makeClient(), supabaseAdmin: makeClient() };
});

vi.mock("../searching/searcher.js", () => ({
  Searcher: {
    getInstance: () => ({
      advancedSearch: async (query: string, filter: string[]) => {
        state.searches.push({ query, filter });
        return state.results[query] ?? [];
      },
    }),
  },
}));

import {
  MAX_FAVORITES,
  TOP_MATCH_POINTS,
  createBestDiningHallHandler,
  matchAllergens,
  pointsFor,
  rankDiningHalls,
  serviceSnapshot,
} from "../handlers/bestDiningHall.js";
import type { DiningHall, ServiceSnapshot, TodayItem } from "../handlers/bestDiningHall.js";
import { authorizeUser } from "../middleware/auth.js";
import bestDiningHallRouter from "../routes/bestDiningHall.js";

const KNOWN_ALLERGENS = [
  "Corn",
  "Gluten",
  "Soy",
  "Wheat",
  "Milk",
  "Eggs",
  "Sesame",
  "Fish",
  "Shellfish",
  "Tree Nuts",
  "Peanuts",
];

const HALLS: DiningHall[] = [
  { id: 2, name: "worcester" },
  { id: 3, name: "hampshire" },
  { id: 4, name: "franklin" },
  { id: 5, name: "berkshire" },
];

/** The searcher's own output shape: best first, the top one scored Infinity. */
function results(
  entries: [name: string, id: number, score: number][]
): { mealName: string; id: number; score: number }[] {
  return entries.map(([mealName, id, score]) => ({ mealName, id, score }));
}

function rankedFor(input: {
  favorites: string[];
  allergies?: string[];
  halls?: DiningHall[];
  items?: TodayItem[];
  byQuery: Record<string, { mealName: string; id: number; score: number }[]>;
}) {
  return rankDiningHalls({
    favorites: input.favorites,
    allergies: input.allergies ?? [],
    halls: input.halls ?? HALLS,
    items: input.items ?? [],
    knownAllergens: KNOWN_ALLERGENS,
    search: async (query, filter) => {
      state.searches.push({ query, filter });
      return input.byQuery[query] ?? [];
    },
  });
}

// Recorded calls belong to one test, not to the file: the ranking tests and the
// route tests both push into the same hoisted state.
beforeEach(() => {
  state.calls.length = 0;
  state.searches.length = 0;
});

// ---------------------------------------------------------------------------
// The meal it is right now
// ---------------------------------------------------------------------------

const at = (iso: string): ServiceSnapshot => serviceSnapshot(HALLS, new Date(iso));
const groups = (iso: string): string[] =>
  at(iso).open.map((group) => `${group.label}=${group.halls.map((h) => h.name).join("+")}`);
const closedNames = (iso: string): string[] => at(iso).closed.map((hall) => hall.name);
const ALL_FOUR = "worcester+hampshire+franklin+berkshire";

describe("serviceSnapshot applies the posted commons hours", () => {
  it("weekday breakfast 07:00-11:00 is worcester, hampshire and franklin only", () => {
    expect(at("2026-11-19T07:00:00-05:00").date).toBe("2026-11-19");
    expect(groups("2026-11-19T07:00:00-05:00")).toEqual(["breakfast=worcester+hampshire+franklin"]);
    expect(at("2026-11-19T07:00:00-05:00").open[0]?.mealType).toBe("breakfast");
    expect(groups("2026-11-19T10:59:00-05:00")).toEqual(["breakfast=worcester+hampshire+franklin"]);
    // Berkshire serves no breakfast on any day.
    expect(closedNames("2026-11-19T07:00:00-05:00")).toEqual(["berkshire"]);
  });

  it("lunch is 11:00-16:30 and dinner 16:30-21:00, all four halls", () => {
    expect(groups("2026-11-19T11:00:00-05:00")).toEqual([`lunch=${ALL_FOUR}`]);
    expect(groups("2026-11-19T16:29:00-05:00")).toEqual([`lunch=${ALL_FOUR}`]);
    expect(groups("2026-11-19T16:30:00-05:00")).toEqual([`dinner=${ALL_FOUR}`]);
    expect(groups("2026-11-19T20:59:00-05:00")).toEqual([`dinner=${ALL_FOUR}`]);
  });

  it("late-night 21:00-24:00 exists only at worcester and berkshire", () => {
    expect(groups("2026-11-19T21:00:00-05:00")).toEqual(["late-night=worcester+berkshire"]);
    expect(groups("2026-11-19T23:59:00-05:00")).toEqual(["late-night=worcester+berkshire"]);
    expect(closedNames("2026-11-19T22:00:00-05:00")).toEqual(["hampshire", "franklin"]);
  });

  it("nothing is serving between midnight and 07:00, and says when that changes", () => {
    expect(at("2026-11-19T00:04:00-05:00").open).toEqual([]);
    expect(at("2026-11-19T06:59:00-05:00").open).toEqual([]);
    expect(closedNames("2026-11-19T00:04:00-05:00")).toEqual(HALLS.map((hall) => hall.name));
    expect(at("2026-11-19T03:00:00-05:00").nextOpen).toBe("07:00");
  });

  it("berkshire stays closed until 11:00 on weekends too", () => {
    expect(closedNames("2026-11-21T10:30:00-05:00")).toEqual(["berkshire"]);
    expect(groups("2026-11-21T11:00:00-05:00")).toEqual([`lunch=${ALL_FOUR}`]);
  });

  it("weekend brunch at franklin and hampshire is labelled brunch, read from lunch rows", () => {
    // Saturday 08:00: brunch at two halls, Worcester still on breakfast, Berkshire closed.
    expect(groups("2026-11-21T08:00:00-05:00").sort()).toEqual([
      "breakfast=worcester",
      "brunch=hampshire+franklin",
    ]);
    const brunch = at("2026-11-21T08:00:00-05:00").open.find((group) => group.label === "brunch");
    // meals.meal_type has no "brunch" value, and no weekend breakfast rows for these
    // two halls, so their brunch food is stored under lunch.
    expect(brunch?.mealType).toBe("lunch");
    expect(at("2026-11-21T08:00:00-05:00").isWeekend).toBe(true);
  });

  it("weekend midday reads one lunch query but labels each hall by its own service", () => {
    const s = at("2026-11-21T12:00:00-05:00");
    // Brunch and lunch share meals.meal_type = 'lunch', so all four halls come out of
    // the database in a single query...
    expect(groups("2026-11-21T12:00:00-05:00")).toEqual([`lunch=${ALL_FOUR}`]);
    expect(s.open).toHaveLength(1);
    // ...while each hall is still described by the service it is really running.
    expect(s.labels.get(2)).toBe("lunch");
    expect(s.labels.get(5)).toBe("lunch");
    expect(s.labels.get(3)).toBe("brunch");
    expect(s.labels.get(4)).toBe("brunch");

    expect(groups("2026-11-21T17:00:00-05:00")).toEqual([`dinner=${ALL_FOUR}`]);
    expect(groups("2026-11-21T22:00:00-05:00")).toEqual(["late-night=worcester+berkshire"]);
  });

  it("reads the clock in campus time, not the server's zone", () => {
    // 19 Nov 14:00 UTC is 09:00 Thursday in Amherst.
    expect(at("2026-11-19T14:00:00Z").date).toBe("2026-11-19");
    expect(groups("2026-11-19T14:00:00Z")).toEqual(["breakfast=worcester+hampshire+franklin"]);
    // 19 Nov 04:00 UTC is 23:00 on the 18th, so two halls are still in late-night.
    expect(at("2026-11-19T04:00:00Z").date).toBe("2026-11-18");
    expect(groups("2026-11-19T04:00:00Z")).toEqual(["late-night=worcester+berkshire"]);
    // 21 Nov 13:00 UTC is 08:00 Saturday.
    expect(at("2026-11-21T13:00:00Z").isWeekend).toBe(true);
    // 15 Mar 2026 16:30 UTC is 13:30 EDT, after the DST switch, and it is a Sunday,
    // so Franklin is in brunch even though the rows are stored under lunch.
    expect(at("2026-03-15T16:30:00Z").date).toBe("2026-03-15");
    expect(at("2026-03-15T16:30:00Z").isWeekend).toBe(true);
    expect(at("2026-03-15T16:30:00Z").labels.get(4)).toBe("brunch");
    expect(at("2026-03-15T16:30:00Z").open[0]?.mealType).toBe("lunch");
  });
});

// ---------------------------------------------------------------------------
// Profile allergies -> allergen table names
// ---------------------------------------------------------------------------

describe("matchAllergens turns profile text into allergen names", () => {
  const sorted = (allergies: string[]) => matchAllergens(allergies, KNOWN_ALLERGENS).sort();

  it("matches the table's own names whatever the casing", () => {
    expect(sorted(["peanuts"])).toEqual(["Peanuts"]);
    expect(sorted(["Wheat", "wheat"])).toEqual(["Wheat"]);
    expect(sorted(["Tree Nuts"])).toEqual(["Tree Nuts"]);
  });

  it("matches a prefix of a name, so singular still works", () => {
    expect(sorted(["peanut"])).toEqual(["Peanuts"]);
    expect(sorted(["egg"])).toEqual(["Eggs"]);
    expect(sorted(["soy sauce"])).toEqual(["Soy"]);
  });

  it("knows the spellings the table does not use", () => {
    expect(sorted(["dairy"])).toEqual(["Milk"]);
    expect(sorted(["lactose intolerance"])).toEqual(["Milk"]);
    expect(sorted(["gluten free"])).toEqual(["Gluten"]);
    expect(sorted(["celiac"])).toEqual(["Gluten"]);
    expect(sorted(["soya"])).toEqual(["Soy"]);
    expect(sorted(["seafood"])).toEqual(["Fish", "Shellfish"]);
  });

  it("errs towards blocking more food when the entry is not a name the table has", () => {
    expect(sorted(["nuts"])).toEqual(["Peanuts", "Tree Nuts"]);
    expect(sorted(["nut allergies"])).toEqual(["Peanuts", "Tree Nuts"]);
  });

  it("does not stretch an exact name into a related one", () => {
    expect(sorted(["fish"])).toEqual(["Fish"]);
    expect(sorted(["shellfish"])).toEqual(["Shellfish"]);
    expect(sorted(["tree nuts"])).toEqual(["Tree Nuts"]);
  });

  it("drops anything the allergen table has no name for", () => {
    expect(sorted(["avocado intolerance"])).toEqual([]);
    expect(sorted([])).toEqual([]);
    expect(sorted(["", "   "])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Scores -> points
// ---------------------------------------------------------------------------

describe("pointsFor", () => {
  it("keeps real scores and caps the searcher's Infinity", () => {
    expect(pointsFor(330)).toBe(330);
    expect(pointsFor(Infinity)).toBe(TOP_MATCH_POINTS);
  });

  it("is worth more than a whole ranking of real scores", () => {
    // An exact dish-name match scores 100000 inside the searcher, so one capped
    // top match must outweigh several of those added together.
    expect(TOP_MATCH_POINTS).toBeGreaterThan(5 * 100000);
  });
});

// ---------------------------------------------------------------------------
// The ranking itself
// ---------------------------------------------------------------------------

describe("rankDiningHalls", () => {
  it("takes the next ranked item when the best one is not on today's menu", async () => {
    const ranked = await rankedFor({
      favorites: ["chicken kebab"],
      items: [{ itemId: 101, name: "Chicken Kebab", hallId: 2, allergens: [] }],
      byQuery: {
        "chicken kebab": results([
          ["Chicken Kebab Soup", 9999, Infinity],
          ["Chicken Kebab", 101, 500],
        ]),
      },
    });

    expect(ranked[0]?.id).toBe(2);
    expect(ranked[0]?.points).toBe(500);
    expect(ranked[1]?.points).toBe(0);
  });

  it("takes the next ranked item when the one on the menu carries the allergy", async () => {
    const items: TodayItem[] = [
      { itemId: 201, name: "Chicken Caesar", hallId: 2, allergens: ["Wheat"] },
      { itemId: 202, name: "Chicken Kebab", hallId: 3, allergens: [] },
    ];

    const byQuery = {
      chicken: results([
        ["Chicken Caesar", 201, Infinity],
        ["Chicken Kebab", 202, 900],
      ]),
    };

    const byName = await rankedFor({ favorites: ["chicken"], allergies: ["wheat"], items, byQuery });
    expect(byName[0]?.id).toBe(3);
    expect(byName[0]?.points).toBe(900);

    // "dairy" is not how the table spells it, but it still blocks the Milk row.
    const bySynonym = await rankedFor({ favorites: ["chicken"], allergies: ["dairy"], items: [
      { itemId: 201, name: "Chicken Caesar", hallId: 2, allergens: ["Milk"] },
      { itemId: 202, name: "Chicken Kebab", hallId: 3, allergens: [] },
    ], byQuery });
    expect(bySynonym[0]?.id).toBe(3);

    // With no allergies the first item wins and the allergy rule stays out of the way.
    const noAllergies = await rankedFor({ favorites: ["chicken"], items, byQuery });
    expect(noAllergies[0]?.id).toBe(2);
    expect(noAllergies[0]?.points).toBe(TOP_MATCH_POINTS);
  });

  it("falls back to the dish name because the searcher returns one row per name", async () => {
    // The searcher keeps the first row it found for a dish name, which is often a
    // different row from the one this hall is serving today.
    const ranked = await rankedFor({
      favorites: ["pulmuone tofu"],
      items: [{ itemId: 800, name: "Pulmuone Tofu", hallId: 5, allergens: [] }],
      byQuery: { "pulmuone tofu": results([["Pulmuone Tofu", 819, 400]]) },
    });

    expect(ranked[0]?.id).toBe(5);
    expect(ranked[0]?.points).toBe(400);
  });

  it("gives the points to every hall serving that dish", async () => {
    const ranked = await rankedFor({
      favorites: ["pizza"],
      items: [
        { itemId: 303, name: "Pizza", hallId: 2, allergens: [] },
        { itemId: 304, name: "Pizza", hallId: 4, allergens: [] },
        { itemId: 305, name: "Pizza", hallId: 4, allergens: [] },
      ],
      byQuery: { pizza: results([["Pizza", 9001, 250]]) },
    });

    expect(ranked.find((hall) => hall.id === 2)?.points).toBe(250);
    expect(ranked.find((hall) => hall.id === 4)?.points).toBe(250);
  });

  it("adds up every favorite and ranks on the total", async () => {
    const items: TodayItem[] = [
      { itemId: 301, name: "Chicken Tenders", hallId: 4, allergens: [] },
      { itemId: 302, name: "Chicken Burger", hallId: 2, allergens: [] },
      { itemId: 303, name: "Pizza", hallId: 2, allergens: [] },
      { itemId: 304, name: "Pizza", hallId: 4, allergens: [] },
    ];

    const ranked = await rankedFor({
      favorites: ["chicken tenders", "chicken burger", "pizza"],
      allergies: ["peanuts"],
      items,
      byQuery: {
        "chicken tenders": results([["Chicken Tenders", 301, Infinity]]),
        "chicken burger": results([["Chicken Burger", 302, 900000]]),
        pizza: results([["Pizza", 9001, 200000]]),
      },
    });

    // franklin: 1000000 (top match) + 200000, worcester: 900000 + 200000
    expect(ranked[0]?.name).toBe("franklin");
    expect(ranked[0]?.points).toBe(1200000);
    expect(ranked[1]?.name).toBe("worcester");
    expect(ranked[1]?.points).toBe(1100000);
    expect(ranked[2]?.points).toBe(0);

    expect(state.searches.every((call) => call.filter.length === 0)).toBe(false);
    expect(state.searches[0]?.filter).toEqual(["Peanuts"]);
  });

  it("breaks a tie with the lower location id", async () => {
    const ranked = await rankedFor({
      favorites: ["kebab", "wrap"],
      halls: [
        { id: 2, name: "worcester" },
        { id: 4, name: "franklin" },
      ],
      items: [
        { itemId: 401, name: "Chicken Kebab", hallId: 2, allergens: [] },
        { itemId: 402, name: "Chicken Wrap", hallId: 4, allergens: [] },
      ],
      byQuery: {
        kebab: results([["Chicken Kebab", 401, 1000]]),
        wrap: results([["Chicken Wrap", 402, 1000]]),
      },
    });

    expect(ranked[0]?.id).toBe(2);
    expect(ranked[1]?.id).toBe(4);
  });

  it("contributes nothing when a favorite matches no dish at all", async () => {
    const ranked = await rankedFor({
      favorites: ["something absurd"],
      halls: [
        { id: 2, name: "worcester" },
        { id: 4, name: "franklin" },
      ],
      items: [{ itemId: 401, name: "Chicken Kebab", hallId: 2, allergens: [] }],
      byQuery: { "something absurd": [] },
    });

    expect(ranked).toHaveLength(2);
    expect(ranked.every((hall) => hall.points === 0)).toBe(true);
  });

  it("searches each favorite once and stops at MAX_FAVORITES", async () => {
    const many = Array.from({ length: 12 }, (_unused, index) => `dish number ${index}`);
    await rankedFor({ favorites: [...many, "dish number 0"], byQuery: {} });

    expect(state.searches).toHaveLength(MAX_FAVORITES);
    expect(state.searches.map((call) => call.query)).toEqual(many.slice(0, MAX_FAVORITES));

    state.searches.length = 0;
    await rankedFor({ favorites: ["pizza", " Pizza ", "PIZZA"], byQuery: {} });
    expect(state.searches).toHaveLength(1);
    expect(state.searches[0]?.query).toBe("pizza");
  });
});

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

const USER_ID = "123e4567-e89b-42d3-a456-426614174000";

const USER_ROW = {
  user_id: USER_ID,
  username: "alice",
  favorite_foods: [{ food_name: "pizza" }],
  allergies: [{ allergy_name: "dairy" }],
};

// The clock is injected so the route tests do not depend on when they run. 18:30 on
// Wednesday 18 Nov is dinner with all four halls open; the others pick a closed
// hour, a late-night hour, and a Saturday morning.
const DINNER_AT = "2026-11-18T18:30:00-05:00";
const LATE_NIGHT_AT = "2026-11-18T22:00:00-05:00";
const CLOSED_AT = "2026-11-19T03:00:00-05:00";
const BRUNCH_AT = "2026-11-21T08:00:00-05:00";

/**
 * The same chain routes/bestDiningHall.ts mounts — authorizeUser then the handler —
 * with a pinned clock. The handler comes from its factory because Express hands
 * every handler a third argument of its own.
 */
function makeApp(sessionUserId: string | null, at: string = DINNER_AT) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (sessionUserId) {
      // authorizeUser only reads req.session.userId; a full express-session
      // object would need the session store this test does not have.
      (req as unknown as { session?: { userId?: string } }).session = { userId: sessionUserId };
    }
    next();
  });
  app.use(
    "/api/search/best-dining-hall",
    authorizeUser,
    createBestDiningHallHandler(() => new Date(at))
  );
  return app;
}

/** The filters the stub was asked for on a table, one entry per query. */
function allFiltersFor(table: string): [string, string | string[]][][] {
  return state.calls.filter((call) => call.table === table).map((call) => call.filters);
}

function filtersFor(table: string): [string, string | string[]][] {
  return allFiltersFor(table)[0] ?? [];
}

/** The menu query that asked for exactly these halls, so each service can be checked. */
function menuFiltersFor(hallIds: number[]): [string, string | string[]][] {
  const want = hallIds.join(",");
  return (
    allFiltersFor("meals").find(
      (filters) =>
        filters.find(([column]) => column === "location_id")?.[1]?.toString() === want
    ) ?? []
  );
}

describe("GET /api/search/best-dining-hall", () => {
  beforeEach(() => {
    state.calls.length = 0;
    state.searches.length = 0;
    state.errors = {};
    state.results = {
      // Worcester's 303 carries Milk and the user is allergic to dairy, so the route
      // has to walk past it. At dinner it settles on Franklin's 304; at 22:00
      // Franklin is closed, so the walk continues to Worcester's 305.
      pizza: results([
        ["Pizza", 303, Infinity],
        ["Pizza", 304, 100],
        ["Pizza", 305, 80],
      ]),
    };
    state.data = {
      users: [USER_ROW],
      allergens: KNOWN_ALLERGENS.map((name) => ({ name })),
      locations: HALLS.map((hall) => ({ ...hall, location_type: "on-campus" })),
      meals: [
        {
          location_id: 4,
          meal_items: [
            { menu_items: { id: 304, name: "Pizza", menu_item_allergens: [] } },
          ],
        },
        {
          location_id: 2,
          meal_items: [
            {
              menu_items: {
                id: 303,
                name: "Pizza",
                menu_item_allergens: [{ allergens: { name: "Milk" } }],
              },
            },
            { menu_items: { id: 305, name: "Pizza", menu_item_allergens: [] } },
          ],
        },
      ],
    };
  });

  it("asks the database for exactly the service that is open right now", async () => {
    const response = await request(makeApp(USER_ID)).get("/api/search/best-dining-hall");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      date: "2026-11-18",
      meal: "dinner",
      diningHall: { id: "franklin", name: "Franklin" },
    });
    // Same URL all day, a different answer at 11:00, so it must not be cacheable.
    expect(response.headers["cache-control"]).toBe("no-store");

    expect(filtersFor("meals")).toEqual([
      ["date", "2026-11-18"],
      ["meal_type", "dinner"],
      ["location_id", [2, 3, 4, 5]],
    ]);
    expect(filtersFor("locations")).toEqual([["location_type", "on-campus"]]);
  });

  it("searches with the profile's allergies translated into allergen names", async () => {
    await request(makeApp(USER_ID)).get("/api/search/best-dining-hall");

    expect(state.searches).toEqual([{ query: "pizza", filter: ["Milk"] }]);
  });

  it("returns 404 when the profile has no favorite foods to rank", async () => {
    state.data = {
      ...state.data,
      users: [{ ...USER_ROW, favorite_foods: [] }],
    };

    const response = await request(makeApp(USER_ID)).get("/api/search/best-dining-hall");

    expect(response.status).toBe(404);
    expect(response.body.error).toContain("favorite foods");
    expect(state.searches).toHaveLength(0);
  });

  it("returns 404 when nothing on that menu matches", async () => {
    state.results = { pizza: results([["Pizza Bagel", 9001, Infinity]]) };

    const response = await request(makeApp(USER_ID)).get("/api/search/best-dining-hall");

    expect(response.status).toBe(404);
    expect(response.body.error).toContain("matches your favorite foods");
  });

  it("returns 404 when the menu for this meal has not been published", async () => {
    state.data = { ...state.data, meals: [] };

    const response = await request(makeApp(USER_ID)).get("/api/search/best-dining-hall");

    expect(response.status).toBe(404);
    expect(response.body.error).toContain("menu published");
    // Nothing is searched until a menu exists to rank.
    expect(state.searches).toHaveLength(0);
  });

  it("only ranks the four commons", async () => {
    state.data = {
      ...state.data,
      meals: [
        ...((state.data.meals as unknown[]) ?? []),
        {
          location_id: 19,
          meal_items: [
            { menu_items: { id: 303, name: "Pizza", menu_item_allergens: [] } },
          ],
        },
      ],
    };

    const response = await request(makeApp(USER_ID)).get("/api/search/best-dining-hall");

    expect(response.status).toBe(200);
    // The cafés are not halls, so they are filtered out in the query rather than
    // being allowed to win.
    expect(filtersFor("meals")[2]).toEqual(["location_id", [2, 3, 4, 5]]);
    expect(response.body.diningHall.id).toBe("franklin");
  });

  it("needs the same session as /api/users, and the mounted router enforces it", async () => {
    // This one goes through routes/bestDiningHall.ts itself rather than the pinned
    // -clock copy, so it is the proof that the router mounts authorizeUser.
    const app = express();
    app.use(express.json());
    app.use("/api/search/best-dining-hall", bestDiningHallRouter);

    const response = await request(app)
      .get("/api/search/best-dining-hall")
      .query({ userID: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeffff0000" });

    // authorizeUser asks for credentials when there is no session, and only
    // credentials: the userID in the query is not read by anything downstream.
    expect(response.status).toBe(400);
    expect(state.calls).toHaveLength(0);
  });

  it("returns 500 when the database refuses the menu read", async () => {
    state.errors = { meals: { message: "boom" } };

    const response = await request(makeApp(USER_ID)).get("/api/search/best-dining-hall");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "internal server error" });
  });

  it("says so when every commons is closed, instead of ranking a closed menu", async () => {
    const response = await request(makeApp(USER_ID, CLOSED_AT)).get("/api/search/best-dining-hall");

    expect(response.status).toBe(404);
    expect(response.body.error).toContain("closed right now");
    expect(response.body.error).toContain("opens at 07:00");
    // Nothing past the profile is read when there is no service to rank.
    expect(allFiltersFor("meals")).toHaveLength(0);
    expect(state.searches).toHaveLength(0);
  });

  it("switches to late-night at 21:00, for only the two halls that have it", async () => {
    const response = await request(makeApp(USER_ID, LATE_NIGHT_AT)).get("/api/search/best-dining-hall");

    expect(response.status).toBe(200);
    expect(response.body.meal).toBe("late-night");
    // Franklin is closed, so its clean pizza cannot win even though it is the best
    // match: the walk moves on to Worcester's other pizza.
    expect(response.body.diningHall).toEqual({ id: "worcester", name: "Worcester" });
    expect(menuFiltersFor([2, 5])).toEqual([
      ["date", "2026-11-18"],
      ["meal_type", "late-night"],
      ["location_id", [2, 5]],
    ]);
  });

  it("calls Saturday brunch brunch while reading the lunch rows it lives under", async () => {
    const response = await request(makeApp(USER_ID, BRUNCH_AT)).get("/api/search/best-dining-hall");

    expect(response.status).toBe(200);
    expect(response.body.date).toBe("2026-11-21");
    expect(response.body.meal).toBe("brunch");
    expect(response.body.diningHall.id).toBe("franklin");

    // Two services are open at once, so two menu queries go out: Worcester's
    // breakfast, and the brunch the database stores as lunch. Berkshire is closed
    // and is not queried for at all.
    expect(menuFiltersFor([2])).toEqual([
      ["date", "2026-11-21"],
      ["meal_type", "breakfast"],
      ["location_id", [2]],
    ]);
    expect(menuFiltersFor([3, 4])).toEqual([
      ["date", "2026-11-21"],
      ["meal_type", "lunch"],
      ["location_id", [3, 4]],
    ]);
  });
});
