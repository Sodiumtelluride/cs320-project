import type { Request, Response } from "express";
import { supabaseAdmin } from "../db/supabase.js";
import { authenticateUser, toAuthMeUser, USER_SELECT } from "../db/client.js";
import type { AuthBody, AuthMeUser, ErrorResponse, UserRow } from "../db/client.js";

/**
 * POST /api/authenticate — verify credentials and start a session.
 *
 * The session object only ever holds the user's id; the browser gets an opaque
 * session id cookie, never the id itself or a token.
 */
export async function login(
  req: Request<{}, {}, Partial<AuthBody>>,
  res: Response<{ success: boolean }>
) {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ success: false });
  }
  const authUserId = await authenticateUser(username, password);
  if (!authUserId) {
    return res.status(401).json({ success: false });
  }
  // Issue a fresh session id on login to prevent session fixation.
  req.session.regenerate((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }
    req.session.userId = authUserId;
    res.json({ success: true });
  });
}

/**
 * GET /api/auth/me — the frontend's "am I logged in?" endpoint.
 *
 * Session-only on purpose: unlike the /api/users routes it never falls back to
 * credentials in the request body, so a guest gets an empty array (200) instead
 * of a 400. The response is an array to match the adapter in
 * frontend/lib/auth.ts; `email` is the users.username column, because the
 * database has no email column.
 */
export async function currentUser(
  req: Request,
  res: Response<AuthMeUser[] | ErrorResponse>
) {
  res.set("Cache-Control", "no-store");
  const sessionUserId = req.session?.userId;
  if (!sessionUserId) {
    return res.json([]);
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select(USER_SELECT)
    .eq("user_id", sessionUserId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: "database error" });
  }
  if (!data) {
    // Session points at a user that no longer exists — treat as signed out.
    return res.status(401).json([]);
  }

  return res.json([toAuthMeUser(data as unknown as UserRow)]);
}

/** POST /api/auth/logout — destroys the session (clears the cookie). */
export function logout(req: Request, res: Response<{ success: boolean }>) {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
}
