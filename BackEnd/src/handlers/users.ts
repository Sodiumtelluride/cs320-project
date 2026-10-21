import type { Request, Response } from "express";
import * as bcrypt from "bcrypt";
import { supabase } from "../db/supabase.js";
import {
  isStringList,
  parseCreateUserBody,
  toUserDetails,
  USER_SELECT,
} from "../db/client.js";
import type {
  CreateUserResponse,
  ErrorResponse,
  UserDetails,
  UserRow,
} from "../db/client.js";

/**
 * POST /api/users
 *
 * Expected body:
 * {
 *   "username": "alice",
 *   "password": "s3cret-pass",
 *   "favoriteFoods": ["pizza", "sushi"],
 *   "allergies": ["peanuts", "shellfish"]
 * }
 * favoriteFoods and allergies may be omitted.
 */
export async function createUser(
  req: Request,
  res: Response<CreateUserResponse | ErrorResponse>
) {
  const parsed = parseCreateUserBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error });
  }
  const { username, password, favoriteFoods, allergies } = parsed.value;

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    // One atomic call: user + password + foods + allergies
    const { data, error } = await supabase.rpc("create_user_with_details", {
      p_username: username,
      p_password_hash: passwordHash,
      p_foods: favoriteFoods,
      p_allergies: allergies,
    });

    if (error) {
      if (error.code === "23505") {
        // unique_violation on users.username
        return res.status(409).json({ error: "username already taken" });
      }
      console.error(error);
      return res.status(500).json({ error: "database error" });
    }

    if (typeof data !== "string") {
      console.error("Unexpected rpc result:", data);
      return res.status(500).json({ error: "unexpected database response" });
    }

    return res.status(201).json({ userId: data, username });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal server error" });
  }
}

/**
 * GET /api/users  ->  all users with their foods and allergies
 *
 * The response intentionally omits password hashes.
 */
export async function listUsers(
  _req: Request,
  res: Response<UserDetails[] | ErrorResponse>
) {
  const { data, error } = await supabase.from("users").select(USER_SELECT);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: "database error" });
  }

  const rows = data as unknown as UserRow[];
  return res.json(rows.map(toUserDetails));
}

/** GET /api/users/:id  ->  one user (only the authenticated user's own record) */
export async function getUserById(
  req: Request<{ id: string }>,
  res: Response<UserDetails | ErrorResponse>
) {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("users")
    .select(USER_SELECT)
    .eq("user_id", id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: "database error" });
  }
  if (!data) {
    return res.status(404).json({ error: "user not found" });
  }

  return res.json(toUserDetails(data as unknown as UserRow));
}

/** GET /api/users/username/:username  ->  one user (only their own record) */
export async function getUserByUsername(
  req: Request<{ username: string }>,
  res: Response<UserDetails | ErrorResponse>
) {
  const { username } = req.params;

  const { data, error } = await supabase
    .from("users")
    .select(USER_SELECT)
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: "database error" });
  }
  if (!data) {
    return res.status(404).json({ error: "user not found" });
  }

  const row = data as unknown as UserRow;
  if (row.user_id.toLowerCase() !== req.authUserId?.toLowerCase()) {
    return res.status(403).json({ error: "not authorized to access this user" });
  }

  return res.json(toUserDetails(row));
}

/**
 * PUT /api/users/:id/favorite-foods  { "favoriteFoods": ["pizza"] }
 *
 * Replaces the whole list. An empty array means "leave it alone" to the
 * update_user_details RPC, so removing the last item goes through DELETE instead.
 */
export async function replaceFavoriteFoods(
  req: Request<{ id: string }, {}, { favoriteFoods?: unknown }>,
  res: Response<ErrorResponse>
) {
  const { id } = req.params;
  const { favoriteFoods } = req.body;
  if (!isStringList(favoriteFoods)) {
    return res.status(400).json({ error: "favoriteFoods must be an array of strings" });
  }
  const { error } = await supabase.rpc("update_user_details", {
    p_user_id: id,
    p_foods: favoriteFoods,
    p_allergies: [] // Empty array to indicate no change to allergies
  });
  if (error) {
    console.error(error);
    return res.status(500).json({ error: "database error" });
  }
  return res.status(200).json();
}

/** PUT /api/users/:id/allergies  { "allergies": ["peanuts"] } — replaces the list. */
export async function replaceAllergies(
  req: Request<{ id: string }, {}, { allergies?: unknown }>,
  res: Response<ErrorResponse>
) {
  const { id } = req.params;
  const { allergies } = req.body;
  if (!isStringList(allergies)) {
    return res.status(400).json({ error: "allergies must be an array of strings" });
  }
  const { error } = await supabase.rpc("update_user_details", {
    p_user_id: id,
    p_foods: [], // Empty array to indicate no change to favorite foods
    p_allergies: allergies
  });
  if (error) {
    console.error(error);
    return res.status(500).json({ error: "database error" });
  }
  return res.status(200).json();
}

/** DELETE /api/users/:id/favorite-foods  { "food": "pizza" } */
export async function deleteFavoriteFood(
  req: Request<{ id: string }, {}, { food?: string }>,
  res: Response<ErrorResponse>
) {
  const { id } = req.params;
  const { food } = req.body ?? {};
  if (!food || typeof food !== "string") {
    return res.status(400).json({ error: "food must be a string" });
  }
  const { error } = await supabase.rpc("delete_user_details", {
    p_user_id: id,
    p_food_to_delete: food,
    p_allergy_to_delete: null
  });
  if (error) {
    console.error(error);
    return res.status(500).json({ error: "database error" });
  }
  return res.status(200).json();
}

/** DELETE /api/users/:id/allergies  { "allergy": "peanuts" } */
export async function deleteAllergy(
  req: Request<{ id: string }, {}, { allergy?: string }>,
  res: Response<ErrorResponse>
) {
  const { id } = req.params;
  const { allergy } = req.body ?? {};
  if (!allergy || typeof allergy !== "string") {
    return res.status(400).json({ error: "allergy must be a string" });
  }
  const { error } = await supabase.rpc("delete_user_details", {
    p_user_id: id,
    p_food_to_delete: null,
    p_allergy_to_delete: allergy
  });
  if (error) {
    console.error(error);
    return res.status(500).json({ error: "database error" });
  }
  return res.status(200).json();
}

