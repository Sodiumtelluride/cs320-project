import { Router } from "express";
import { login, logout } from "../handlers/auth.js";

const router = Router();

/*  ---------- Get requests ---------- */


/*  ---------- Post requests ---------- */

// /api/users/login
router.post('/login', login);

// /api/users/logout
router.post('/logout', logout);

export default router; // Make router visible