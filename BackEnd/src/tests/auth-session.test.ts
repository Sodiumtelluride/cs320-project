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

vi.mock("../db/supabase.js", () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
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

beforeEach(async () => {
  const hash = await bcrypt.hash("password123", 4);
  row = { ...row, passwords: [{ password_hash: hash }] };

  vi.mocked(supabase.from).mockImplementation(() => {
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: row, error: null })),
    };
    return query;
  });
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
