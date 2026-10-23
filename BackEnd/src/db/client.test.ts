import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Mocks (hoisted so env vars + mocks exist before client.ts is imported)
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
  process.env.SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_KEY = "test-key";
  return {
    rpc: vi.fn(),
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    hash: vi.fn(),
  };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ rpc: mocks.rpc, from: mocks.from })),
}));

vi.mock("bcrypt", () => ({ hash: mocks.hash }));

import { app, parseCreateUserBody, toUserDetails } from "./client";

// ---------------------------------------------------------------------------
// Fixtures / helpers
// ---------------------------------------------------------------------------

const VALID_UUID = "123e4567-e89b-42d3-a456-426614174000";

const dbRow = {
  user_id: VALID_UUID,
  username: "alice",
  passwords: [{ password_hash: "$2b$12$hashed" }],
  favorite_foods: [{ food_name: "pizza" }, { food_name: "sushi" }],
  allergies: [{ allergy_name: "peanuts" }],
};

const apiUser = {
  userId: VALID_UUID,
  username: "alice",
  passwordHash: "$2b$12$hashed",
  favoriteFoods: ["pizza", "sushi"],
  allergies: ["peanuts"],
};

const validBody = {
  username: "alice",
  password: "s3cret-pass",
  favoriteFoods: ["pizza", "sushi"],
  allergies: ["peanuts"],
};

beforeEach(() => {
  vi.resetAllMocks();
  // from("users").select(...).eq(...).maybeSingle()
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.hash.mockResolvedValue("hashed-password");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// ---------------------------------------------------------------------------
// parseCreateUserBody
// ---------------------------------------------------------------------------

describe("parseCreateUserBody", () => {
  it("accepts a valid body", () => {
    expect(parseCreateUserBody(validBody)).toEqual({ ok: true, value: validBody });
  });

  it("defaults favoriteFoods and allergies to empty arrays when omitted", () => {
    const result = parseCreateUserBody({ username: "bob", password: "12345678" });
    expect(result).toEqual({
      ok: true,
      value: { username: "bob", password: "12345678", favoriteFoods: [], allergies: [] },
    });
  });

  it("accepts boundary values (50-char username, 8-char password, 100-char item)", () => {
    const result = parseCreateUserBody({
      username: "a".repeat(50),
      password: "p".repeat(8),
      favoriteFoods: ["f".repeat(100)],
      allergies: [],
    });
    expect(result.ok).toBe(true);
  });

  it.each([null, undefined, "a string", 42, true])(
    "rejects non-object body: %s",
    (body) => {
      expect(parseCreateUserBody(body)).toEqual({
        ok: false,
        error: "request body must be a JSON object",
      });
    }
  );

  it("rejects an array body (no username)", () => {
    const result = parseCreateUserBody([]);
    expect(result).toEqual({ ok: false, error: "username must be 1-50 characters" });
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["too long", "a".repeat(51)],
    ["not a string", 123],
  ])("rejects invalid username (%s)", (_label, username) => {
    const result = parseCreateUserBody({ ...validBody, username });
    expect(result).toEqual({ ok: false, error: "username must be 1-50 characters" });
  });

  it.each([
    ["missing", undefined],
    ["too short", "1234567"],
    ["not a string", 12345678],
  ])("rejects invalid password (%s)", (_label, password) => {
    const result = parseCreateUserBody({ ...validBody, password });
    expect(result).toEqual({
      ok: false,
      error: "password must be at least 8 characters",
    });
  });

  it.each([
    ["not an array", "pizza"],
    ["null", null],
    ["contains empty string", ["pizza", ""]],
    ["contains non-string", ["pizza", 5]],
    ["contains too-long string", ["x".repeat(101)]],
  ])("rejects invalid favoriteFoods (%s)", (_label, favoriteFoods) => {
    const result = parseCreateUserBody({ ...validBody, favoriteFoods });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/favoriteFoods and allergies/);
  });

  it("rejects invalid allergies", () => {
    const result = parseCreateUserBody({ ...validBody, allergies: [""] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/favoriteFoods and allergies/);
  });
});

// ---------------------------------------------------------------------------
// toUserDetails
// ---------------------------------------------------------------------------

describe("toUserDetails", () => {
  it("maps a DB row to the API shape", () => {
    expect(toUserDetails(dbRow)).toEqual(apiUser);
  });

  it("returns passwordHash: null when the user has no password row", () => {
    expect(toUserDetails({ ...dbRow, passwords: [] }).passwordHash).toBeNull();
  });

  it("returns empty arrays when there are no foods or allergies", () => {
    const result = toUserDetails({ ...dbRow, favorite_foods: [], allergies: [] });
    expect(result.favoriteFoods).toEqual([]);
    expect(result.allergies).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST /api/users
// ---------------------------------------------------------------------------

describe("POST /api/users", () => {
  it("creates a user and returns 201 with userId + username", async () => {
    mocks.rpc.mockResolvedValue({ data: VALID_UUID, error: null });

    const res = await request(app).post("/api/users").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ userId: VALID_UUID, username: "alice" });
  });

  it("hashes the password with cost 12 and never sends the plaintext to the DB", async () => {
    mocks.rpc.mockResolvedValue({ data: VALID_UUID, error: null });

    await request(app).post("/api/users").send(validBody);

    expect(mocks.hash).toHaveBeenCalledWith("s3cret-pass", 12);
    expect(mocks.rpc).toHaveBeenCalledWith("create_user_with_details", {
      p_username: "alice",
      p_password_hash: "hashed-password",
      p_foods: ["pizza", "sushi"],
      p_allergies: ["peanuts"],
    });
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain("s3cret-pass");
  });

  it("passes empty arrays to the RPC when foods/allergies are omitted", async () => {
    mocks.rpc.mockResolvedValue({ data: VALID_UUID, error: null });

    await request(app)
      .post("/api/users")
      .send({ username: "bob", password: "12345678" });

    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_user_with_details",
      expect.objectContaining({ p_foods: [], p_allergies: [] })
    );
  });

  it("returns 400 for an invalid body without hashing or hitting the DB", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ ...validBody, password: "short" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "password must be at least 8 characters" });
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns 409 when the username is already taken (Postgres 23505)", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "23505", message: "dup" } });

    const res = await request(app).post("/api/users").send(validBody);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "username already taken" });
  });

  it("returns 500 'database error' for other DB errors without leaking details", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "secret internal detail" },
    });

    const res = await request(app).post("/api/users").send(validBody);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "database error" });
    expect(JSON.stringify(res.body)).not.toContain("secret internal detail");
  });

  it("returns 500 when the RPC returns a non-string result", async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 1 }, error: null });

    const res = await request(app).post("/api/users").send(validBody);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "unexpected database response" });
  });

  it("returns 500 when bcrypt throws", async () => {
    mocks.hash.mockRejectedValue(new Error("bcrypt exploded"));

    const res = await request(app).post("/api/users").send(validBody);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal server error" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns 500 when the RPC call itself rejects", async () => {
    mocks.rpc.mockRejectedValue(new Error("network down"));

    const res = await request(app).post("/api/users").send(validBody);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal server error" });
  });
});

// ---------------------------------------------------------------------------
// GET /api/users
// ---------------------------------------------------------------------------

describe("GET /api/users", () => {
  it("returns all users mapped to the API shape", async () => {
    mocks.select.mockResolvedValue({ data: [dbRow], error: null });

    const res = await request(app).get("/api/users");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([apiUser]);
    expect(mocks.from).toHaveBeenCalledWith("users");
    expect(mocks.select).toHaveBeenCalledWith(
      "user_id, username, passwords(password_hash), favorite_foods(food_name), allergies(allergy_name)"
    );
  });

  it("returns an empty array when there are no users", async () => {
    mocks.select.mockResolvedValue({ data: [], error: null });

    const res = await request(app).get("/api/users");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    mocks.select.mockResolvedValue({ data: null, error: { message: "boom" } });

    const res = await request(app).get("/api/users");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "database error" });
  });

  // Documents current behavior. Delete/flip this test when you remove
  // passwordHash from the response (you should; see the WARNING in client.ts).
  it("currently includes passwordHash in the response", async () => {
    mocks.select.mockResolvedValue({ data: [dbRow], error: null });

    const res = await request(app).get("/api/users");

    expect(res.body[0]).toHaveProperty("passwordHash", "$2b$12$hashed");
  });
});

// ---------------------------------------------------------------------------
// GET /api/users/:id
// ---------------------------------------------------------------------------

describe("GET /api/users/:id", () => {
  it("returns the user when found", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: dbRow, error: null });

    const res = await request(app).get(`/api/users/${VALID_UUID}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(apiUser);
    expect(mocks.eq).toHaveBeenCalledWith("user_id", VALID_UUID);
  });

  it("accepts an uppercase UUID", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: dbRow, error: null });

    const res = await request(app).get(`/api/users/${VALID_UUID.toUpperCase()}`);

    expect(res.status).toBe(200);
  });

  it.each(["not-a-uuid", "123", "123e4567-e89b-42d3-a456-42661417400"])(
    "returns 400 for invalid id %s without querying the DB",
    async (id) => {
      const res = await request(app).get(`/api/users/${id}`);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "id must be a valid UUID" });
      expect(mocks.from).not.toHaveBeenCalled();
    }
  );

  it("returns 404 when the user does not exist", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await request(app).get(`/api/users/${VALID_UUID}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "user not found" });
  });

  it("returns 500 on DB error", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });

    const res = await request(app).get(`/api/users/${VALID_UUID}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "database error" });
  });
});

// ---------------------------------------------------------------------------
// GET /api/users/username/:username
// ---------------------------------------------------------------------------

describe("GET /api/users/username/:username", () => {
  it("returns the user when found", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: dbRow, error: null });

    const res = await request(app).get("/api/users/username/alice");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(apiUser);
    expect(mocks.eq).toHaveBeenCalledWith("username", "alice");
  });

  it("decodes URL-encoded usernames", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: dbRow, error: null });

    await request(app).get("/api/users/username/john%20doe");

    expect(mocks.eq).toHaveBeenCalledWith("username", "john doe");
  });

  it("returns 404 when the user does not exist", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await request(app).get("/api/users/username/ghost");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "user not found" });
  });

  it("returns 500 on DB error", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });

    const res = await request(app).get("/api/users/username/alice");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "database error" });
  });

  it("is not swallowed by the /api/users/:id route", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: dbRow, error: null });

    const res = await request(app).get("/api/users/username/alice");

    // If it had hit :id, we'd get a 400 "id must be a valid UUID"
    expect(res.status).not.toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Module startup
// ---------------------------------------------------------------------------

describe("environment validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws on import when SUPABASE_URL is missing", async () => {
    vi.resetModules();
    vi.stubEnv("SUPABASE_URL", "");

    await expect(import("./client")).rejects.toThrow(
      "Missing SUPABASE_URL or SUPABASE_KEY in environment"
    );
  });

  it("throws on import when SUPABASE_KEY is missing", async () => {
    vi.resetModules();
    vi.stubEnv("SUPABASE_KEY", "");

    await expect(import("./client")).rejects.toThrow(
      "Missing SUPABASE_URL or SUPABASE_KEY in environment"
    );
  });
});