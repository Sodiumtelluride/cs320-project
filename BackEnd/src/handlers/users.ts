import type { Request, Response } from "express";
import * as bcrypt from "bcrypt";
import type { PostgrestError } from "@supabase/supabase-js";
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

/** Which of the two lists a PUT or DELETE acts on. */
type ListColumn = "favoriteFoods" | "allergies";

/** The write routes answer with a status code plus either {} or { error }. */
type DetailsResponse = Response<ErrorResponse>;

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
 * GET /api/users  ->  the caller's own account, in a one-element array.
 *
 * This used to return every account, which let any signed-in user read everyone
 * else's email, allergies and favorite foods. There is no admin role yet, so the
 * route is scoped to the caller's row; a real admin listing needs one first
 * (tracked as a follow-up). Password hashes stay out of the projection.
 */
export async function getOwnProfile(
  req: Request,
  res: Response<UserDetails[] | ErrorResponse>
) {
  const caller = callerId(req);
  if (!caller) {
    return res.status(401).json({ error: "authentication required" });
  }

  const { data, error } = await supabase
    .from("users")
    .select(USER_SELECT)
    .eq("user_id", caller);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: "database error" });
  }

  // The query is already scoped to the caller; the filter is here so a row for
  // somebody else can never slip into the response.
  const rows = ((data ?? []) as unknown as UserRow[]).filter(
    (row) => row.user_id.toLowerCase() === caller.toLowerCase()
  );
  return res.json(rows.map(toUserDetails));
}

/** GET /api/users/:id  ->  one user (requireOwnership has proved it is the caller's) */
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
 * The id authorizeUser proved for this request.
 *
 * It comes from the session (or from credentials authorizeUser verified), never
 * from a client-supplied id, which is what makes it usable as the caller's
 * identity in the database. requireOwnership already checks it matches the :id in
 * the path, so the only way it is missing is a route mounted without
 * authorizeUser.
 */
function callerId(req: Request): string | null {
  return typeof req.authUserId === "string" && req.authUserId !== "" ? req.authUserId : null;
}

/**
 * require_profile_owner() (supabase/migrations/
 * 20261110000000_verify_profile_ownership.sql) raises 42501 when the caller is
 * not the profile's owner, so the database gets the last word even if a route
 * forgets its middleware.
 */
function detailsErrorResponse(error: PostgrestError, res: DetailsResponse) {
  if (error.code === "42501") {
    return res.status(403).json({ error: "not authorized to access this user" });
  }
  console.error(error);
  return res.status(500).json({ error: "database error" });
}

/**
 * PUT body -> update_user_details.
 *
 * The RPC replaces only the lists it is given a non-empty array for, so the list
 * this route is not touching is sent as an empty array ("leave it alone").
 */
async function replaceList(
  req: Request<{ id: string }>,
  res: DetailsResponse,
  column: ListColumn,
  values: string[]
) {
  const caller = callerId(req);
  if (!caller) {
    return res.status(401).json({ error: "authentication required" });
  }

  try {
    const { error } = await supabase.rpc("update_user_details", {
      p_user_id: req.params.id,
      p_caller_id: caller,
      p_foods: column === "favoriteFoods" ? values : [],
      p_allergies: column === "allergies" ? values : [],
    });
    if (error) {
      return detailsErrorResponse(error, res);
    }
    return res.status(200).json();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "database error" });
  }
}

/** DELETE body -> delete_user_details, for one entry of one list. */
async function removeEntry(
  req: Request<{ id: string }>,
  res: DetailsResponse,
  column: ListColumn,
  value: string
) {
  const caller = callerId(req);
  if (!caller) {
    return res.status(401).json({ error: "authentication required" });
  }

  try {
    const { error } = await supabase.rpc("delete_user_details", {
      p_user_id: req.params.id,
      p_caller_id: caller,
      p_food_to_delete: column === "favoriteFoods" ? value : null,
      p_allergy_to_delete: column === "allergies" ? value : null,
    });
    if (error) {
      return detailsErrorResponse(error, res);
    }
    return res.status(200).json();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "database error" });
  }
}

/**
 * PUT /api/users/:id/favorite-foods  { "favoriteFoods": ["pizza"] }
 *
 * Replaces the whole list. An empty array means "leave it alone" to the
 * update_user_details RPC, so removing the last item goes through DELETE instead.
 */
export async function replaceFavoriteFoods(
  req: Request<{ id: string }, {}, { favoriteFoods?: unknown }>,
  res: DetailsResponse
) {
  const { favoriteFoods } = req.body;
  if (!isStringList(favoriteFoods)) {
    return res.status(400).json({ error: "favoriteFoods must be an array of strings" });
  }
  return replaceList(req, res, "favoriteFoods", favoriteFoods);
}

/** PUT /api/users/:id/allergies  { "allergies": ["peanuts"] } — replaces the list. */
export async function replaceAllergies(
  req: Request<{ id: string }, {}, { allergies?: unknown }>,
  res: DetailsResponse
) {
  const { allergies } = req.body;
  if (!isStringList(allergies)) {
    return res.status(400).json({ error: "allergies must be an array of strings" });
  }
  return replaceList(req, res, "allergies", allergies);
}

/** DELETE /api/users/:id/favorite-foods  { "food": "pizza" } */
export async function deleteFavoriteFood(
  req: Request<{ id: string }, {}, { food?: string }>,
  res: DetailsResponse
) {
  const { food } = req.body ?? {};
  if (!food || typeof food !== "string") {
    return res.status(400).json({ error: "food must be a string" });
  }
  return removeEntry(req, res, "favoriteFoods", food);
}

/** DELETE /api/users/:id/allergies  { "allergy": "peanuts" } */
export async function deleteAllergy(
  req: Request<{ id: string }, {}, { allergy?: string }>,
  res: DetailsResponse
) {
  const { allergy } = req.body ?? {};
  if (!allergy || typeof allergy !== "string") {
    return res.status(400).json({ error: "allergy must be a string" });
  }
  return removeEntry(req, res, "allergies", allergy);
}
