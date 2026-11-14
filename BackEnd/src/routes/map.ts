import { Router } from "express";
import { getAllLocationData } from "../handlers/map.js";

const router = Router();

/* ---------- Get requests ---------- */
// POST /api/map/locations     get all locations and their information
// This is a post request because it can contain user's geo location
router.get("/locations", getAllLocationData);

export default router; // Make router visible
