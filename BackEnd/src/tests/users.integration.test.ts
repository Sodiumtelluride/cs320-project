/**
 * Integration tests for the user routes in src/routes/users.ts.
 *
 * These talk to a REAL Supabase database (the one in .env.test), so:
 *   - ownership enforcement (403 cross-user access) is verified end-to-end
 *   - malformed array elements are rejected before any DB write
 *   - the create_user_with_details, update_user_details and delete_user_details
 *     RPCs are exercised for real, including the ownership guard added by
 *     20261110000000_verify_profile_ownership.sql
 *   - the same writes are attempted straight through PostgREST, the way a caller
 *     holding the publishable key would make them, to show the database refuses
 *     them without the Express middleware
 *
 * Skipped automatically when SUPABASE_URL is not configured.
 *
 * IMPORTANT: this file must NOT be imported in the same process as
 * routes/users.test.ts. That file mocks @supabase/supabase-js, which would
 * leak into the real client here. Vitest runs each test file in its own
 * worker, so this is safe in practice.
 *
 * The publishable key in .env.test is an anon-class key. update_user_details and
 * delete_user_details are SECURITY DEFINER and granted to anon, but they call
 * require_profile_owner() first, so a write needs the caller's id to match the
 * profile's owner — that is what the p_caller_id the handlers send from
 * req.authUserId is for. The direct-PostgREST tests below skip themselves if the
 * migration has not been applied to this database yet.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";

const supabaseUrl = (process.env.SUPABASE_URL ?? "").trim();
const supabaseKey = (process.env.SUPABASE_KEY ?? "").trim();
const hasDatabase = Boolean(supabaseUrl && supabaseKey);

const run = hasDatabase ? it : it.skip;
const runAll = hasDatabase ? beforeAll : beforeAll.skip;
const runAfter = hasDatabase ? afterAll : afterAll.skip;

// Import AFTER the env check so the module can read the real env vars
// (src/app.ts -> src/db/client.ts read process.env at import time).
const { app } = hasDatabase
  ? await import("../app.js")
  : { app: null as unknown as Parameters<typeof request>[0] };

const OTHER_UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeffff0000";

/** One of the two statuses PostgREST answers a refused call with. */
const REFUSED = [401, 403];

/** PostgREST as anon, i.e. a caller that skipped the Express app entirely. */
async function rest(
  path: string,
  init: { method?: string; body?: Record<string, unknown> } = {}
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const text = await response.text();
  return { status: response.status, text, json: safeJson(text) };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function rpc(name: string, args: Record<string, unknown>) {
  return rest(`rpc/${name}`, { method: "POST", body: args });
}

/**
 * Is 20261110000000_verify_profile_ownership.sql applied to this database?
 *
 * Probed with two ids that do not exist, and lists that are empty, so the probe
 * itself cannot change any data. Before the migration the four-argument
 * signature does not exist (400/404); after it the guard answers
 * "not authorized" (401/403) or accepts a matching pair (204).
 */
async function guardIsDeployed(): Promise<boolean> {
  if (!hasDatabase) return false;
  const mismatched = await rpc("update_user_details", {
    p_user_id: OTHER_UUID,
    p_caller_id: "ffffffff-aaaa-4bbb-8ccc-dddddddddddd",
    p_foods: [],
    p_allergies: [],
  });
  if (REFUSED.includes(mismatched.status)) return true;

  const matched = await rpc("update_user_details", {
    p_user_id: OTHER_UUID,
    p_caller_id: OTHER_UUID,
    p_foods: [],
    p_allergies: [],
  });
  return matched.status === 204 || matched.status === 200;
}

const guardDeployed = await guardIsDeployed();
const runGuard = guardDeployed ? it : it.skip;

// Unique per run so repeated runs don't collide on the username unique index
const suffix = Date.now().toString(36);
const alice = {
  username: `itest-alice-${suffix}`,
  password: "alice-pass-123",
};
const bob = {
  username: `itest-bob-${suffix}`,
  password: "bob-pass-4567",
};

let aliceId: string;
let bobId: string;

async function createUser(username: string, password: string, foods: string[] = [], allergies: string[] = []) {
  const res = await request(app)
    .post("/api/users")
    .send({ username, password, favoriteFoods: foods, allergies });
  if (res.status !== 201) {
    throw new Error(`setup: could not create ${username}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.userId as string;
}

runAll(async () => {
  aliceId = await createUser(alice.username, alice.password, ["pizza"], ["peanuts"]);
  bobId = await createUser(bob.username, bob.password, ["tacos"]);
  expect(aliceId).toMatch(/^[0-9a-f-]{36}$/i);
  expect(bobId).toMatch(/^[0-9a-f-]{36}$/i);
});

runAfter(() => {
  // Leave test users in the DB (no delete-user route exists yet);
  // they are unique per run, so this is harmless.
});

/** A cookie session for one of the two test accounts. */
async function signIn(account: { username: string; password: string }) {
  const agent = request.agent(app);
  const res = await agent.post("/api/authenticate").send(account);
  if (res.status !== 200) {
    throw new Error(`setup: could not sign in ${account.username}: ${res.status}`);
  }
  return agent;
}

describe("real database: user routes", () => {
  it("creates users that can then authenticate", async () => {
    const res = await request(app)
      .post("/api/authenticate")
      .send({ username: alice.username, password: alice.password });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("rejects wrong passwords", async () => {
    const res = await request(app)
      .post("/api/authenticate")
      .send({ username: alice.username, password: "not-the-password" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false });
  });

  it("GET /api/users/:id returns the authenticated user's own record without a password hash", async () => {
    const res = await request(app)
      .get(`/api/users/${aliceId}`)
      .send({ username: alice.username, password: alice.password });

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(aliceId);
    expect(res.body.username).toBe(alice.username);
    expect(res.body.favoriteFoods).toEqual(["pizza"]);
    expect(res.body.allergies).toEqual(["peanuts"]);
    // Password hashes must never be exposed
    expect(res.body).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
  });

  it("returns 403 when a user targets another user's id (cross-user access)", async () => {
    const res = await request(app)
      .get(`/api/users/${bobId}`)
      .send({ username: alice.username, password: alice.password });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "not authorized to access this user" });
  });

  it("returns 403 when a user looks another user up by username", async () => {
    const res = await request(app)
      .get(`/api/users/username/${bob.username}`)
      .send({ username: alice.username, password: alice.password });

    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain(bob.username);
  });

  it("GET /api/users answers with only the caller's own account", async () => {
    const res = await request(app)
      .get("/api/users")
      .send({ username: alice.username, password: alice.password });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // bob is a real account in this database and must not appear
    expect(res.body).toHaveLength(1);
    expect(res.body[0].userId).toBe(aliceId);
    expect(JSON.stringify(res.body)).not.toContain(bob.username);
    expect(JSON.stringify(res.body)).not.toContain("tacos");
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
  });

  it("rejects an anonymous read of the account list", async () => {
    const res = await request(app).get("/api/users").send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Username and password are required" });
  });
});

describe("real database: profile edits through the RPCs", () => {
  run("the owner's allergy and favorite-food edits persist and can be removed again", async () => {
    const agent = await signIn(alice);

    const put = await agent.put(`/api/users/${aliceId}/allergies`).send({ allergies: ["peanuts", "soy"] });
    expect(put.status).toBe(200);

    const saved = await agent.get(`/api/users/${aliceId}`);
    expect(saved.status).toBe(200);
    expect([...saved.body.allergies].sort()).toEqual(["peanuts", "soy"]);
    expect(saved.body.favoriteFoods).toEqual(["pizza"]); // the other list was left alone

    // Removing entries one at a time, down to and including the last one.
    expect((await agent.delete(`/api/users/${aliceId}/allergies`).send({ allergy: "peanuts" })).status).toBe(200);
    expect((await agent.delete(`/api/users/${aliceId}/allergies`).send({ allergy: "soy" })).status).toBe(200);
    expect((await agent.delete(`/api/users/${aliceId}/favorite-foods`).send({ food: "pizza" })).status).toBe(200);

    const cleared = await agent.get(`/api/users/${aliceId}`);
    expect(cleared.body.allergies).toEqual([]);
    expect(cleared.body.favoriteFoods).toEqual([]);

    // A fresh session sees the same (now empty) state, which is what the frontend
    // relies on after a page refresh or a log-out/log-in cycle.
    const again = await signIn(alice);
    expect((await again.get(`/api/users/${aliceId}`)).body).toMatchObject({
      userId: aliceId,
      allergies: [],
      favoriteFoods: [],
    });
  });

  run("refuses a cross-user edit and leaves the other account untouched", async () => {
    const aliceAgent = await signIn(alice);

    const crossEdit = await aliceAgent
      .put(`/api/users/${bobId}/allergies`)
      .send({ allergies: ["moved-by-alice"] });
    expect(crossEdit.status).toBe(403);

    const bobAgent = await signIn(bob);
    const bobRow = await bobAgent.get(`/api/users/${bobId}`);
    expect(bobRow.status).toBe(200);
    expect(bobRow.body.allergies).toEqual([]);
    expect(bobRow.body.favoriteFoods).toEqual(["tacos"]);
  });

  run("refuses a profile edit with no session and no credentials", async () => {
    const put = await request(app).put(`/api/users/${aliceId}/allergies`).send({ allergies: ["nobody"] });
    expect(put.status).toBe(400);

    const del = await request(app).delete(`/api/users/${aliceId}/allergies`).send({ allergy: "nobody" });
    expect(del.status).toBe(400);

    const allergies = await rest(`allergies?select=allergy_name&user_id=eq.${aliceId}`);
    expect(allergies.status).toBe(200);
    expect(JSON.stringify(allergies.text)).not.toContain("nobody");
  });
});

describe("real database: a caller holding only the publishable key", () => {
  // These go straight to PostgREST, so nothing in src/middleware/auth.ts is
  // involved: they are what 20261110000000_verify_profile_ownership.sql is for.

  runGuard("cannot update another account's details", async () => {
    const res = await rpc("update_user_details", {
      p_user_id: aliceId,
      p_caller_id: bobId,
      p_allergies: ["ghost-allergen"],
    });

    expect(REFUSED).toContain(res.status);
    expect(res.text).toContain("not authorized");
    const allergies = await rest(`allergies?select=allergy_name&user_id=eq.${aliceId}`);
    expect(JSON.stringify(allergies.json)).not.toContain("ghost-allergen");
  });

  runGuard("cannot delete from another account's details", async () => {
    const res = await rpc("delete_user_details", {
      p_user_id: aliceId,
      p_caller_id: bobId,
      p_allergy_to_delete: "peanuts",
    });

    expect(REFUSED).toContain(res.status);
    expect(res.text).toContain("not authorized");
  });

  runGuard("cannot write without naming a caller at all", async () => {
    const res = await rpc("update_user_details", {
      p_user_id: aliceId,
      p_allergies: ["ghost-allergen"],
    });

    expect(REFUSED).toContain(res.status);
    const allergies = await rest(`allergies?select=allergy_name&user_id=eq.${aliceId}`);
    expect(JSON.stringify(allergies.json)).not.toContain("ghost-allergen");
  });

  runGuard("cannot bypass the RPCs and write the account tables directly", async () => {
    const patch = await rest(`allergies?user_id=eq.${aliceId}`, {
      method: "PATCH",
      body: { allergy_name: "direct-write" },
    });
    expect(REFUSED).toContain(patch.status);

    const insert = await rest("favorite_foods", {
      method: "POST",
      body: { user_id: bobId, food_name: "inserted-by-stranger" },
    });
    expect(REFUSED).toContain(insert.status);

    const remove = await rest(`users?user_id=eq.${aliceId}`, { method: "DELETE" });
    expect(REFUSED).toContain(remove.status);

    // Reads still work: the backend's GET handlers and login lookup use them.
    const read = await rest(`users?select=username&user_id=eq.${aliceId}`);
    expect(read.status).toBe(200);
    expect(read.json).toEqual([{ username: alice.username }]);
  });

  runGuard("keeps the ownership guard itself out of reach through /rpc/", async () => {
    const res = await rpc("require_profile_owner", { p_user_id: aliceId, p_caller_id: aliceId });
    expect(REFUSED).toContain(res.status);
  });

  // What the guard cannot do yet: a caller with the publishable key can name the
  // owner as its own caller, p_caller_id = p_user_id. Proving identity needs a
  // secret the anon role cannot see (a service-role key for these RPCs, or a
  // per-request token whose subject PostgREST exposes) - see the migration header.
  it("documents that the caller id is a cross-user guard, not proof of identity", () => {
    expect(guardDeployed).toBe(true);
  });
});
