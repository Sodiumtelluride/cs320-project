import { Router } from "express";
import { authorizeUser, requireOwnership } from "../middleware/auth.js";
import {
  createUser,
  deleteAllergy,
  deleteFavoriteFood,
  getOwnProfile,
  getUserById,
  getUserByUsername,
  replaceAllergies,
  replaceFavoriteFoods,
} from "../handlers/users.js";

const router = Router();

/* ---------- Account ---------- */
// POST /api/users                       create (public, no session needed)
router.post("/", createUser);

/* ---------- Read ---------- */
// GET  /api/users                       the caller's own account (authenticated)
router.get("/", authorizeUser, getOwnProfile);
// GET  /api/users/username/:username    look one up by name (own record only)
router.get("/username/:username", authorizeUser, getUserByUsername);
// GET  /api/users/:id                   one user (own record only)
router.get("/:id", authorizeUser, requireOwnership, getUserById);

/* ---------- Replace a whole list ---------- */
// PUT  /api/users/:id/favorite-foods    { "favoriteFoods": ["pizza", ...] }
router.put("/:id/favorite-foods", authorizeUser, requireOwnership, replaceFavoriteFoods);
// PUT  /api/users/:id/allergies         { "allergies": ["peanuts", ...] }
router.put("/:id/allergies", authorizeUser, requireOwnership, replaceAllergies);

/* ---------- Remove one entry ---------- */
// DELETE /api/users/:id/favorite-foods  { "food": "pizza" }
router.delete("/:id/favorite-foods", authorizeUser, requireOwnership, deleteFavoriteFood);
// DELETE /api/users/:id/allergies       { "allergy": "peanuts" }
router.delete("/:id/allergies", authorizeUser, requireOwnership, deleteAllergy);

// The writes above hand the session-proved id to the RPC as p_caller_id, so
// require_profile_owner() in the database repeats the ownership check even if a
// route is mounted without requireOwnership.

export default router; // Make router visible
