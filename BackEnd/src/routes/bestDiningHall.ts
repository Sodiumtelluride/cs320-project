import { Router } from "express";
import { authorizeUser } from "../middleware/auth.js";
import { getBestDiningHall } from "../handlers/bestDiningHall.js";

const router = Router();

/*  ---------- Get requests ---------- */
// GET /api/search/best-dining-hall
//
// Ranked with the caller's own favoriteFoods and allergies, so it goes through the
// same authorizeUser as /api/users: the session decides whose profile is read, and
// there is no id for a client to guess at. The meal is picked from the clock, so
// this route takes no query parameters.
router.get("/", authorizeUser, getBestDiningHall);

export default router; // Make router visible
