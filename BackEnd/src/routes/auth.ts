import { Router } from "express";
import { currentUser, logout } from "../handlers/auth.js";

const router = Router();

/* ---------- Get requests ---------- */
// GET /api/auth/me     who am I? ([] when the visitor is a guest)
router.get("/me", currentUser);

/* ---------- Post requests ---------- */
// POST /api/auth/logout  end the session
router.post("/logout", logout);

// Signing in is POST /api/authenticate, wired up in src/app.ts, because that is
// the endpoint frontend/lib/login-request.ts calls.

export default router; // Make router visible
