/**
 * Contract tests for the endpoints the Next frontend actually calls.
 *
 *   POST /api/users          -> sign up   (handled by src/db/client.ts)
 *   POST /api/authenticate   -> log in, sets the session cookie
 *   GET  /api/auth/me        -> restore the session on page load ([] == guest)
 *   POST /api/auth/logout    -> clear the session
 *   GET/PUT/DELETE /api/users/:id/** -> profile edits (own record only)
 *
 * The frontend adapter never sends credentials except on login/logout, so every
 * request here runs on the cookie alone. Supabase is mocked; bcrypt is real.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import * as bcrypt from "bcrypt";

// One fake client behind both exports: the profile-write handlers use supabaseAdmin,
// the secret-key client (src/db/supabase.ts), and the assertions below do not care
// which key a mocked request claims to have carried — only that the right RPC was
// called with the right arguments.
const fakeDb = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));

vi.mock("../db/supabase.js", () => ({ supabase: fakeDb, supabaseAdmin: fakeDb }));
import { supabase } from "../db/supabase.js";
import { app } from "../app.js";

const id = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";

let row = {
  user_id: id,
  username: "student@umass.edu",
  passwords: [{ password_hash: "" }],
  favorite_foods: [{ food_name: "Pizza" }],
  allergies: [{ allergy_name: "Milk" }],
};

/**
 * The fake PostgREST the handlers talk to.
 *
 * maybeSingle() answers the single-record reads; awaiting the builder answers the
 * list read (GET /api/users), and a real supabase-js builder is thenable, so this
 * fake has to be as well. extraRows are rows for other accounts, used by the test
 * that proves they are withheld.
 */
function fakeTables(extraRows: Array<typeof row> = []) {
  return () => {
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: row, error: null })),
      then: (resolve: (value: unknown) => void) =>
        resolve({ data: [row, ...extraRows], error: null }),
    };
    return query;
  };
}

beforeEach(async () => {
  const hash = await bcrypt.hash("password123", 4);
  row = { ...row, passwords: [{ password_hash: hash }] };

  vi.mocked(supabase.from).mockClear();
  vi.mocked(supabase.rpc).mockClear();
  vi.mocked(supabase.from).mockImplementation(fakeTables());
  vi.mocked(supabase.rpc).mockResolvedValue({ data: id, error: null } as any);
});

describe("the session flow the frontend depends on", () => {
  it("registers, logs in, restores the account and logs out", async () => {
    const agent = request.agent(app);

    expect((await agent.get("/api/auth/me")).body).toEqual([]);

    const created = await agent
      .post("/api/users")
      .send({ username: "student@umass.edu", password: "password123", favoriteFoods: [], allergies: [] });
    expect(created.status).toBe(201);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_user_with_details",
      expect.objectContaining({ p_username: "student@umass.edu", p_foods: [], p_allergies: [] }),
    );

    expect((await agent.post("/api/authenticate").send({ username: "student@umass.edu", password: "wrong" })).status).toBe(401);
    expect((await agent.get("/api/auth/me")).body).toEqual([]);

    expect((await agent.post("/api/authenticate").send({ username: "student@umass.edu", password: "password123" })).body)
      .toEqual({ success: true });

    const profile = await agent.get("/api/auth/me");
    expect(profile.body).toEqual([{ id, email: "student@umass.edu", favoriteFoods: ["Pizza"], allergies: ["Milk"] }]);
    expect(JSON.stringify(profile.body)).not.toContain("password");

    expect((await agent.post("/api/auth/logout")).status).toBe(200);
    expect((await agent.get("/api/auth/me")).body).toEqual([]);
  });

  it("rejects missing credentials and fails closed when the database errors", async () => {
    expect((await request(app).post("/api/authenticate").send({})).status).toBe(400);

    // Supabase reports failures as { data, error } rather than throwing.
    vi.mocked(supabase.from).mockImplementation(() => {
      const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({ data: null, error: { code: "42P01", message: "boom" } })),
      };
      return query;
    });
    const down = request.agent(app);
    expect((await down.post("/api/authenticate").send({ username: "student@umass.edu", password: "password123" })).body)
      .toEqual({ success: false });
    expect((await down.get("/api/auth/me")).body).toEqual([]);
    // No session and no body credentials: the guard asks for them (400).
    expect((await down.get(`/api/users/${id}`)).status).toBe(400);
  });

  it("keeps profile edits to the signed-in user's own record", async () => {
    const agent = request.agent(app);
    await agent.post("/api/authenticate").send({ username: "student@umass.edu", password: "password123" }).expect(200);

    await agent.get(`/api/users/${id}`).expect(200);
    await agent.put(`/api/users/${id}/allergies`).send({ allergies: ["Milk", "Peanuts"] }).expect(200);
    await agent.delete(`/api/users/${id}/favorite-foods`).send({ food: "Pizza" }).expect(200);
    expect(supabase.rpc).toHaveBeenCalledWith("update_user_details", expect.objectContaining({ p_user_id: id }));
    expect(supabase.rpc).toHaveBeenCalledWith("delete_user_details", expect.objectContaining({ p_food_to_delete: "Pizza" }));

    // Someone else's row, same cookie.
    await agent.get(`/api/users/${otherId}`).expect(403);
    await agent.put(`/api/users/${otherId}/allergies`).send({ allergies: ["Milk"] }).expect(403);

    // And no cookie at all on a body without credentials.
    await request(app).get(`/api/users/${id}`).expect(400);
  });
});

describe("who may read and edit which account", () => {
  const signIn = async (agent: request.Agent) => {
    await agent
      .post("/api/authenticate")
      .send({ username: "student@umass.edu", password: "password123" })
      .expect(200);
    return agent;
  };

  it("answers GET /api/users with the signed-in user's account only", async () => {
    const agent = await signIn(request.agent(app));
    // Even if the database hands back somebody else's row, it must not leak out.
    vi.mocked(supabase.from).mockImplementation(
      fakeTables([
        {
          user_id: otherId,
          username: "someone.else@umass.edu",
          passwords: [{ password_hash: "hash-of-someone-else" }],
          favorite_foods: [{ food_name: "Tacos" }],
          allergies: [{ allergy_name: "Egg" }],
        },
      ])
    );

    const res = await agent.get("/api/users");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        userId: id,
        username: "student@umass.edu",
        favoriteFoods: ["Pizza"],
        allergies: ["Milk"],
      },
    ]);
    expect(JSON.stringify(res.body)).not.toContain("someone.else");
    expect(JSON.stringify(res.body)).not.toContain("Tacos");
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
    // The read is scoped in the database rather than filtered after the fact
    expect(supabase.from).toHaveBeenCalledWith("users");
  });

  it("tells the database whose profile a write is editing", async () => {
    const agent = await signIn(request.agent(app));
    vi.mocked(supabase.rpc).mockClear();

    await agent.put(`/api/users/${id}/allergies`).send({ allergies: ["Milk", "Peanuts"] }).expect(200);
    await agent.delete(`/api/users/${id}/favorite-foods`).send({ food: "Pizza" }).expect(200);

    expect(supabase.rpc).toHaveBeenCalledWith(
      "update_user_details",
      expect.objectContaining({ p_user_id: id, p_caller_id: id }),
    );
    expect(supabase.rpc).toHaveBeenCalledWith(
      "delete_user_details",
      expect.objectContaining({ p_user_id: id, p_caller_id: id, p_food_to_delete: "Pizza" }),
    );
  });

  it("refuses a profile edit from a visitor with no session and no credentials", async () => {
    vi.mocked(supabase.rpc).mockClear();

    const put = await request(app).put(`/api/users/${id}/allergies`).send({ allergies: ["Milk"] });
    expect(put.status).toBe(400);
    expect(put.body).toEqual({ error: "Username and password are required" });

    const del = await request(app).delete(`/api/users/${id}/favorite-foods`).send({ food: "Pizza" });
    expect(del.status).toBe(400);

    // A visitor who signs in as somebody else still cannot reach this record.
    const other = request.agent(app);
    vi.mocked(supabase.from).mockImplementation(() => {
      const stranger: typeof row = {
        user_id: otherId,
        username: "student@umass.edu",
        passwords: row.passwords,
        favorite_foods: [],
        allergies: [],
      };
      const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({ data: stranger, error: null })),
        then: (resolve: (value: unknown) => void) => resolve({ data: [stranger], error: null }),
      };
      return query;
    });
    await other.post("/api/authenticate").send({ username: "student@umass.edu", password: "password123" }).expect(200);
    expect((await other.put(`/api/users/${id}/allergies`).send({ allergies: ["Milk"] })).status).toBe(403);
    expect((await other.get(`/api/users/${id}`)).status).toBe(403);
    // ...and their own list answer is their own row, not the one they asked about.
    expect((await other.get("/api/users")).body).toEqual([
      { userId: otherId, username: "student@umass.edu", favoriteFoods: [], allergies: [] },
    ]);

    expect(supabase.rpc).not.toHaveBeenCalledWith(
      "update_user_details",
      expect.objectContaining({ p_user_id: id, p_caller_id: otherId }),
    );
  });

  it("surfaces the database's ownership rejection as 403, not 500", async () => {
    const agent = await signIn(request.agent(app));
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: "42501", message: "not authorized to access this user" },
    } as any);

    const res = await agent.put(`/api/users/${id}/allergies`).send({ allergies: ["Milk"] });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "not authorized to access this user" });
  });
});
