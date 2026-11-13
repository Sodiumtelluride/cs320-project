import "dotenv/config";
import * as bcrypt from "bcrypt";
import { supabaseAdmin } from "./supabase.js";

// npm install @supabase/supabase-js bcrypt dotenv
// npm install -D typescript tsx @types/node @types/bcrypt
//
// Account data layer. The HTTP routes for this data live in src/routes/users.ts,
// src/routes/auth.ts and src/handlers/; this file only knows about Supabase, the
// row shapes PostgREST returns, and how to validate what comes in from a request.
//
// Schema (supabase/migrations/20261012190538_users.sql):
//   users(user_id, username) + passwords(password_hash, user_id)
//   + favorite_foods(food_name, user_id) + allergies(allergy_name, user_id)
// There is no email column — "email" in the API is just the username.
//
// Access control: the account tables are reachable by this process and nobody else.
// anon has no SELECT, INSERT, UPDATE or DELETE on them and no execute on the account
// RPCs, so nothing — not even a read — can skip the Express app
// (supabase/migrations/20261113080358_lock_account_data_to_backend.sql). Writes that
// need a specific profile go through the two SECURITY DEFINER RPCs, which take the
// caller's id as p_caller_id and check it, along with the key the request carried, in
// require_profile_owner() (20261110045234, 20261113073554). Everything here
// therefore runs on supabaseAdmin, the secret-key client.

// ---------- Types ----------

export interface CreateUserBody {
  username: string;
  password: string;
  favoriteFoods: string[];
  allergies: string[];
}

export interface CreateUserResponse {
  userId: string;
  username: string;
}

export interface ErrorResponse {
  error: string;
}

// Shape of the nested rows PostgREST returns for the GET queries
export interface UserRow {
  user_id: string;
  username: string;
  passwords: { password_hash: string }[];
  favorite_foods: { food_name: string }[];
  allergies: { allergy_name: string }[];
}

// Shape we send to the frontend.
// NOTE: password hashes are deliberately NOT exposed here.
export interface UserDetails {
  userId: string;
  username: string;
  favoriteFoods: string[];
  allergies: string[];
}

export interface AuthBody {
  username: string;
  password: string;
}

/**
 * Shape GET /api/auth/me returns (wrapped in an array): user_id and username
 * renamed to the id / email names frontend/lib/auth.ts expects.
 */
export interface AuthMeUser {
  id: string;
  email: string;
  favoriteFoods: string[];
  allergies: string[];
}

/** Password hashes stay out of every API response. */
export const USER_SELECT =
  "user_id, username, favorite_foods(food_name), allergies(allergy_name)";

/** The hash is only ever read here, for credential checks. */
const AUTH_SELECT = "user_id, passwords(password_hash)";

export const toUserDetails = (row: UserRow): UserDetails => ({
  userId: row.user_id,
  username: row.username,
  favoriteFoods: row.favorite_foods.map((f) => f.food_name),
  allergies: row.allergies.map((a) => a.allergy_name),
});

export const toAuthMeUser = (row: UserRow): AuthMeUser => ({
  id: row.user_id,
  email: row.username,
  favoriteFoods: row.favorite_foods.map((f) => f.food_name),
  allergies: row.allergies.map((a) => a.allergy_name),
});

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- Validation ----------

export const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every((s) => typeof s === "string" && s.length > 0 && s.length <= 100);

/**
 * req.body is untrusted, so we accept `unknown` and narrow it.
 * Returns the validated body, or an error message.
 */
export function parseCreateUserBody(
  body: unknown
): { ok: true; value: CreateUserBody } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "request body must be a JSON object" };
  }

  const {
    username,
    password,
    favoriteFoods = [],
    allergies = [],
  } = body as Record<string, unknown>;

  if (typeof username !== "string" || username.length < 1 || username.length > 50) {
    return { ok: false, error: "username must be 1-50 characters" };
  }
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, error: "password must be at least 8 characters" };
  }
  if (!isStringList(favoriteFoods) || !isStringList(allergies)) {
    return {
      ok: false,
      error: "favoriteFoods and allergies must be arrays of 1-100 character strings",
    };
  }

  return { ok: true, value: { username, password, favoriteFoods, allergies } };
}

// ---------- Credential check ----------

/**
 * Compares a password with the bcrypt hash stored for that username.
 * Returns the user's id on success and null on any failure (including an unknown
 * username), so a caller can never tell which half of the credentials was wrong.
 */
export async function authenticateUser(username: string, password: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(AUTH_SELECT)
    .eq("username", username)
    .maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  const hash = data?.passwords?.[0]?.password_hash;
  if (!hash) {
    return null;
  }
  const matches = await bcrypt.compare(password, hash);
  return matches ? (data as { user_id: string }).user_id : null;
}
