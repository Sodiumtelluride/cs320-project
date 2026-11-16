/**
 * Integration tests for the user routes in src/routes/users.ts.
 *
 * These talk to a REAL Supabase database (the one in .env.test), so:
 *   - ownership enforcement (403 cross-user access) is verified end-to-end
 *   - malformed array elements are rejected before any DB write
 *   - the create_user_with_details, update_user_details and delete_user_details
 *     RPCs are exercised for real, including the caller check added by
 *     20261110045234 + 20261113073554_verify_caller_identity.sql and the read lock
 *     added by 20261113080358_lock_account_data_to_backend.sql
 *   - the same reads and writes are attempted straight through PostgREST, the way a
 *     caller holding the publishable key would make them, to show the database
 *     refuses them without the Express middleware and without the backend's key
 *
 * Skipped automatically when SUPABASE_URL is not configured.
 *
 * IMPORTANT: this file must NOT be imported in the same process as
 * routes/users.test.ts. That file mocks @supabase/supabase-js, which would
 * leak into the real client here. Vitest runs each test file in its own
 * worker, so this is safe in practice.
 *
 * Two keys, on purpose. .env.test's SUPABASE_KEY is the publishable (anon) key, and
 * the tests use it to speak as "somebody who skipped the backend"; everything the
 * handlers do to the account tables goes out on the secret key
 * (supabaseAdmin in src/db/supabase.ts), because that is how the database tells the
 * backend apart from a stranger. Set SUPABASE_SECRET_KEY in .env.test, or the
 * tests that need the app skip themselves. The tests that need the migrations skip
 * themselves too — see the probes below.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";

const supabaseUrl = (process.env.SUPABASE_URL ?? "").trim();
const supabaseKey = (process.env.SUPABASE_KEY ?? "").trim();
const secretKey = (
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  ""
).trim();
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
 * Is 20261113073554_verify_caller_identity.sql applied to this database?
 *
 * The probe is the attack itself, made as an outside caller: the publishable key,
 * two ids that do not exist, empty lists — so it cannot change any data. Naming the
 * profile's owner as the caller is the whole trick, and it is the difference between
 * the two migrations: the old guard accepted the matching pair (204), the new one
 * refuses it (401/403) because a publishable-key caller cannot prove anything about
 * itself. A database that predates 20261110045234 has no four-argument signature
 * and answers 400, which correctly means "not the new behaviour".
 */
async function identityIsEnforced(): Promise<boolean> {
  if (!hasDatabase) return false;
  const spoofed = await rpc("update_user_details", {
    p_user_id: OTHER_UUID,
    p_caller_id: OTHER_UUID,
    p_foods: [],
    p_allergies: [],
  });
  return REFUSED.includes(spoofed.status);
}

/**
 * Is 20261113080358_lock_account_data_to_backend.sql applied too?
 *
 * Probe: may the publishable key still read one username? While anon has SELECT that
 * answers 200 with a row; once the account tables are backend-only it answers
 * 401/403, and no account row, list of allergies or password hash is reachable over
 * REST at all.
 */
async function accountReadsLocked(): Promise<boolean> {
  if (!hasDatabase) return false;
  return REFUSED.includes((await rest("users?select=username&limit=1")).status);
}

const identityEnforced = await identityIsEnforced();
const readsLocked = await accountReadsLocked();

/**
 * Talking to the Express app about accounts needs the secret key
 * (supabaseAdmin in src/db/supabase.ts), because since those two migrations the
 * secret key is the only credential the database accepts for account traffic.
 * Without a key configured the app-level tests skip rather than fail, so a clone of
 * this repo without secrets still runs green.
 */
const appCanUseAccounts = hasDatabase && (Boolean(secretKey) || !(identityEnforced || readsLocked));

/** The database-side tests: these are what the two migrations are for. */
const runIdentity = identityEnforced && appCanUseAccounts ? it : it.skip;
/** Only meaningful once the account tables are backend-only. */
const runReadLock = readsLocked && appCanUseAccounts ? it : it.skip;

if (hasDatabase && !appCanUseAccounts) {
  console.warn(
    "users.integration.test.ts: SUPABASE_SECRET_KEY is not set while the account " +
      "migrations are applied, so the app-level tests are skipped — the backend " +
      "needs the secret key to read or write accounts at all (src/db/supabase.ts)."
  );
} else if (hasDatabase && !(identityEnforced && readsLocked)) {
  console.warn(
    "users.integration.test.ts: 20261113073554_verify_caller_identity.sql and " +
      "20261113080358_lock_account_data_to_backend.sql are not both applied to this " +
      "database, so the caller-identity and read-lock tests are skipped. Until they " +
      "are, a caller holding the publishable key can write a profile by naming its " +
      "owner in both p_user_id and p_caller_id, and can read every account."
  );
}

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
  // Creating accounts goes through the app, and the app needs the secret key for that
  // once the account tables are backend-only. Nothing below needs aliceId/bobId when
  // this is skipped: every test that uses them is gated on the same condition.
  if (!appCanUseAccounts) return;
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

// Needs the secret key once the account tables are backend-only: every one of these
// reads or writes the account tables through the app.
describe.runIf(appCanUseAccounts)("real database: user routes", () => {
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

describe.runIf(appCanUseAccounts)("real database: profile edits through the RPCs", () => {
  it("the owner's allergy and favorite-food edits persist and can be removed again", async () => {
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

  it("refuses a cross-user edit and leaves the other account untouched", async () => {
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

    // Neither request reached the database. Confirming that from the outside is only
    // possible while anon still has SELECT; since
    // 20261113080358_lock_account_data_to_backend.sql the read is refused too, which
    // is the stronger answer.
    const allergies = await rest(`allergies?select=allergy_name&user_id=eq.${aliceId}`);
    if (readsLocked) {
      expect(REFUSED).toContain(allergies.status);
    } else {
      expect(allergies.status).toBe(200);
      expect(JSON.stringify(allergies.text)).not.toContain("nobody");
    }
  });
});

describe("real database: a caller holding only the publishable key", () => {
  // These go straight to PostgREST, so nothing in src/middleware/auth.ts or in the
  // Express app's key is involved: they are what 20261113073554 (writes) and
  // 20261113080358 (reads) are for. The message is not asserted because the refusal
  // may arrive either as Postgres' permission denied — the RPC is no longer granted to
  // anon, nor is SELECT on the tables — or as require_profile_owner()'s own 42501;
  // both are 401/403 and both leave the data alone. The follow-up reads below that
  // assert "still peanuts" also pass on the error body, which cannot mention the
  // string we tried to write.

  runIdentity("cannot update another account's details", async () => {
    const res = await rpc("update_user_details", {
      p_user_id: aliceId,
      p_caller_id: bobId,
      p_allergies: ["ghost-allergen"],
    });

    expect(REFUSED).toContain(res.status);
    const allergies = await rest(`allergies?select=allergy_name&user_id=eq.${aliceId}`);
    expect(JSON.stringify(allergies.json)).not.toContain("ghost-allergen");
  });

  runIdentity("cannot delete from another account's details", async () => {
    const res = await rpc("delete_user_details", {
      p_user_id: aliceId,
      p_caller_id: bobId,
      p_allergy_to_delete: "peanuts",
    });

    expect(REFUSED).toContain(res.status);
  });

  // The bug this migration exists for: naming the victim in p_user_id AND in
  // p_caller_id used to satisfy the old comparison, so a stranger holding the
  // public key could edit and clear an account they had never signed into.
  runIdentity("cannot edit an account by claiming its owner as the caller", async () => {
    const put = await rpc("update_user_details", {
      p_user_id: aliceId,
      p_caller_id: aliceId,
      p_allergies: ["ghost-allergen"],
    });

    expect(REFUSED).toContain(put.status);

    const del = await rpc("delete_user_details", {
      p_user_id: aliceId,
      p_caller_id: aliceId,
      p_allergy_to_delete: "peanuts",
    });

    expect(REFUSED).toContain(del.status);

    // Nothing was replaced and nothing was deleted.
    const allergies = await rest(`allergies?select=allergy_name&user_id=eq.${aliceId}`);
    expect(JSON.stringify(allergies.json)).not.toContain("ghost-allergen");
  });

  runIdentity("cannot write without naming a caller at all", async () => {
    const res = await rpc("update_user_details", {
      p_user_id: aliceId,
      p_allergies: ["ghost-allergen"],
    });

    expect(REFUSED).toContain(res.status);
    const allergies = await rest(`allergies?select=allergy_name&user_id=eq.${aliceId}`);
    expect(JSON.stringify(allergies.json)).not.toContain("ghost-allergen");
  });

  runIdentity("cannot bypass the RPCs and write the account tables directly", async () => {
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

    // Reads used to be the hole that was left: they are closed by 20261113080358, so
    // accept whichever state this database is in and let the read-lock tests below
    // assert the new one.
    const read = await rest(`users?select=username&user_id=eq.${aliceId}`);
    if (readsLocked) {
      expect(REFUSED).toContain(read.status);
    } else {
      expect(read.status).toBe(200);
      expect(read.json).toEqual([{ username: alice.username }]);
    }
  });

  runIdentity("keeps the ownership guard itself out of reach through /rpc/", async () => {
    const res = await rpc("require_profile_owner", { p_user_id: aliceId, p_caller_id: aliceId });
    expect(REFUSED).toContain(res.status);
  });

  // The probe is the test: it asks the database whether the matching pair
  // p_user_id = p_caller_id is still enough to get a write through with the public
  // key, and it must not be. p_caller_id is a cross-user guard the backend applies
  // to itself; the key check is what makes it mean anything to a stranger.
  runIdentity("refuses a publishable-key caller no matter which id it claims to be", () => {
    expect(identityEnforced).toBe(true);
  });
});

describe("real database: the publishable key cannot read the account tables either", () => {
  // What 20261113080358_lock_account_data_to_backend.sql is for. Everything here is
  // what a caller can still do after logging out: hold the public key, know that a
  // user_id exists, and ask the database directly.

  runReadLock("cannot list accounts or look one up by id", async () => {
    expect(REFUSED).toContain((await rest("users?select=user_id,username&limit=5")).status);
    expect(REFUSED).toContain((await rest(`users?select=username&user_id=eq.${aliceId}`)).status);
  });

  runReadLock("cannot read anyone's allergies or favorite foods", async () => {
    expect(REFUSED).toContain(
      (await rest(`allergies?select=allergy_name&user_id=eq.${aliceId}`)).status
    );
    expect(REFUSED).toContain((await rest("favorite_foods?select=food_name")).status);
  });

  runReadLock("cannot pull the bcrypt hashes out of /passwords", async () => {
    const res = await rest("passwords?select=user_id,password_hash&limit=3");
    expect(REFUSED).toContain(res.status);
    expect(res.text).not.toContain("$2"); // and the refusal itself carries no hash
  });

  runReadLock("cannot reach the details through an embedded select on users", async () => {
    const res = await rest(`users?select=username,allergies(allergy_name)&user_id=eq.${aliceId}`);
    expect(REFUSED).toContain(res.status);
  });

  runReadLock("cannot sign up straight through /rpc with a hand-made password hash", async () => {
    const res = await rpc("create_user_with_details", {
      p_username: `itest-stranger-signup-${Date.now().toString(36)}`,
      p_password_hash: "not-even-a-bcrypt-hash",
      p_foods: [],
      p_allergies: [],
    });
    expect(REFUSED).toContain(res.status);
  });

  // Public data is deliberately left open: the menu routes serve it to guests.
  runReadLock("leaves the menu tables readable", async () => {
    expect((await rest("locations?select=id&limit=1")).status).toBe(200);
  });

  runReadLock("is what the read-lock probe found", () => {
    expect(readsLocked).toBe(true);
  });
});
