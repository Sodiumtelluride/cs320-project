import { Router } from "express";
import { getAllLocationData } from "../handlers/map.js";

const router = Router();

/* ---------- POST requests ---------- */
// POST /api/map/locations     get all locations and their information
// This is a post request because it can contain user's geo location
router.post("/locations", getAllLocationData);

// POST /api/map/distanceFrom/:location  use GPS data from user to calculate distance from a given location
// router.post("/distanceFrom/:location", getDistanceFromLocation);     

export default router; // Make router visible