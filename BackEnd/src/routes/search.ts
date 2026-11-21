import { Router } from "express";
import { search, partialSearch } from "../handlers/search.js";

const router = Router();

/*  ---------- Get requests ---------- */
// /api/search
router.get("/", search);

// GET /api/search/partial
router.get("/partial", partialSearch);
/*  ---------- Post requests ---------- */
// Probably shouldn't post any requests to search

export default router; // Make router visible


