import { beforeEach, expect, it, vi } from "vitest";
import request from "supertest";
import * as bcrypt from "bcrypt";
vi.mock("../db/supabase.js", () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
import { supabase } from "../db/supabase.js";
import { createApp } from "../app.js";
const id = "00000000-0000-4000-8000-000000000001";
beforeEach(async () => {
 const hash = await bcrypt.hash("password123", 4);
 vi.mocked(supabase.from).mockImplementation(() => {
   const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: vi.fn(async () => ({ data: { user_id: id, username: "student@umass.edu", passwords: [{ password_hash: hash }], favorite_foods: [{ food_name: "Pizza" }], allergies: [] }, error: null })) };
   return query;
 });
 vi.mocked(supabase.rpc).mockResolvedValue({ data: id, error: null } as any);
});
it("creates a database account, establishes a session, restores safe arrays and logs out", async () => {
 const agent = request.agent(createApp("test-secret"));
 expect((await agent.get("/api/auth/me")).body).toEqual([]);
 expect((await agent.post("/api/users").send({ username: "student@umass.edu", password: "password123", favoriteFoods: [], allergies: [] })).status).toBe(201);
 expect(supabase.rpc).toHaveBeenCalledWith("create_user_with_details", expect.objectContaining({ p_username: "student@umass.edu", p_foods: [], p_allergies: [] }));
 expect((await agent.post("/api/authenticate").send({ username: "student@umass.edu", password: "wrong" })).status).toBe(401);
 expect((await agent.get("/api/auth/me")).body).toEqual([]);
 expect((await agent.post("/api/authenticate").send({ username: "student@umass.edu", password: "password123" })).body).toEqual({ success: true });
 const profile = await agent.get("/api/auth/me");
 expect(profile.body).toEqual([{ id, email: "student@umass.edu", favoriteFoods: ["Pizza"], allergies: [] }]);
 expect(JSON.stringify(profile.body)).not.toContain("password");
 expect((await agent.post("/api/auth/logout")).status).toBe(200);
 expect((await agent.get("/api/auth/me")).body).toEqual([]);
 expect((await agent.get("/api/users")).status).toBe(404);
});
it("rejects missing credentials and fails closed for database errors", async () => {
 const app = createApp("test-secret");
 expect((await request(app).post("/api/authenticate").send({})).status).toBe(400);
 vi.mocked(supabase.from).mockImplementation(() => { throw new Error("offline"); });
 expect((await request(app).post("/api/authenticate").send({ username: "student@umass.edu", password: "password123" })).status).toBe(503);
});
