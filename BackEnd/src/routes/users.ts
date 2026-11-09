import { Router } from "express";
import { authorizeUser, requireOwnership } from "../middleware/auth.js";
import {
  createUser,
  deleteAllergy,
  deleteFavoriteFood,
  getUserById,
  getUserByUsername,
  listUsers,
  replaceAllergies,
  replaceFavoriteFoods,
} from "../handlers/users.js";

const router = Router();

/* ---------- Account ---------- */
// POST /api/users                       create (public, no session needed)
router.post("/", createUser);

/* ---------- Read ---------- */
// GET  /api/users                       every user (authenticated)
router.get("/", authorizeUser, listUsers);
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

export default router; // Make router visible
