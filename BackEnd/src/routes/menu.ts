import { Router } from "express";
import { getMenu } from "../handlers/menu.js";

const router = Router();

/*  ---------- Get requests ---------- */

// /api/menu
// router.get("/", getUsers);

// /api/menu/:location/:type/:day
router.get("/:location/:type/:day", getMenu);

/*  ---------- Post requests ---------- */

export default router; // Make router visible