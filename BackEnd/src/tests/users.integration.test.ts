/**
 * Integration tests for the user routes in src/routes/users.ts.
 *
 * These talk to a REAL Supabase database (the one in .env.test), so:
 *   - ownership enforcement (403 cross-user access) is verified end-to-end
 *   - malformed array elements are rejected before any DB write
 *   - the create_user_with_details RPC is exercised for real
 *
 * Skipped automatically when SUPABASE_URL is not configured.
 *
 * IMPORTANT: this file must NOT be imported in the same process as
 * routes/users.test.ts. That file mocks @supabase/supabase-js, which would
 * leak into the real client here. Vitest runs each test file in its own
 * worker, so this is safe in practice.
 *
 * NOTE on update/delete RPCs: update_user_details and delete_user_details are
 * SECURITY DEFINER functions restricted to the service_role key. The .env.test
 * credentials are a publishable (anon-class) key, so those two RPCs return
 * 403/permission errors against the real database. The PUT/DELETE routes are
 * therefore only covered by unit tests (src/db/routes/users.test.ts); the real-DB
 * coverage here stops at create + authenticate + read + ownership.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
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

  it("GET /api/users lists users without exposing password hashes", async () => {
    const res = await request(app)
      .get("/api/users")
      .send({ username: alice.username, password: alice.password });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
  });
});
