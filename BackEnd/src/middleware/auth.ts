import type { NextFunction, Request, Response } from "express";
import { authenticateUser, UUID_RE } from "../db/client.js";

/**
 * The authenticated user's id, set on `req` by `authorizeUser`.
 * Also where the session's `userId` field is declared for TypeScript.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUserId?: string;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

/**
 * Middleware for the protected user routes.
 *
 * Auth order:
 *   1. Session cookie (set by POST /api/authenticate) — works on GET requests
 *      because the browser sends the cookie automatically.
 *   2. Username/password in the JSON body — fallback for clients that don't
 *      persist cookies (e.g. supertest without a cookie jar).
 *
 * On success, stores the authenticated user's id on `req.authUserId` so
 * downstream handlers can enforce ownership.
 */
export async function authorizeUser(req: Request, res: Response, next: NextFunction) {
  // 1. Session cookie (preferred — works on GET)
  const sessionUserId = req.session?.userId;
  if (sessionUserId) {
    req.authUserId = sessionUserId;
    return next();
  }

  // 2. Body-based credentials (fallback)
  const { username, password } = (req.body ?? {}) as { username?: string; password?: string };
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  const authUserId = await authenticateUser(username, password);
  if (!authUserId) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  req.authUserId = authUserId;
  next();
}

/**
 * Middleware that must run AFTER `authorizeUser`. Rejects requests where the
 * `:id` path parameter does not belong to the authenticated user.
 * GET /api/users (list all users) skips this; the username lookup route
 * checks ownership after it finds the user.
 */
export function requireOwnership(req: Request, res: Response, next: NextFunction) {
  // Express 5 types allow repeated params to arrive as an array; only a single
  // string id can be ours.
  const rawId = req.params.id;
  const id = typeof rawId === "string" ? rawId : undefined;
  if (!id || !UUID_RE.test(id)) {
    return res.status(400).json({ error: "id must be a valid UUID" });
  }
  const authUserId = req.authUserId;
  if (!authUserId || id.toLowerCase() !== authUserId.toLowerCase()) {
    return res.status(403).json({ error: "not authorized to access this user" });
  }
  next();
}
