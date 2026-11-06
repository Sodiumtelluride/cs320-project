import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import * as bcrypt from "bcrypt";
import { supabase } from "./supabase.js";

// npm install express express-session @supabase/supabase-js bcrypt dotenv
// npm install -D typescript tsx @types/express @types/express-session @types/node @types/bcrypt
// ---------- Types ----------

interface CreateUserBody {
  username: string;
  password: string;
  favoriteFoods: string[];
  allergies: string[];
}

interface CreateUserResponse {
  userId: string;
  username: string;
}

interface ErrorResponse {
  error: string;
}

// Shape of the nested rows PostgREST returns for the GET query
interface UserRow {
  user_id: string;
  username: string;
  passwords: { password_hash: string }[];
  favorite_foods: { food_name: string }[];
  allergies: { allergy_name: string }[];
}

// Shape we send to the frontend.
// NOTE: password hashes are deliberately NOT exposed here.
interface UserDetails {
  userId: string;
  username: string;
  favoriteFoods: string[];
  allergies: string[];
}

interface UpdateUserBody {
  favoriteFoods?: unknown;
  allergies?: unknown;
}
interface AuthBody {
  username: string;
  password: string;
}

/**
 * The authenticated user's id, set on `req` by `authorizeUser` after a
 * successful credential check.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUserId?: string;
    }
  }
}

/** Data stored in the server-side session (set by POST /api/authenticate). */
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

async function authenticateUser(username: string, password: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("user_id, passwords(password_hash)")
    .eq("username", username)
    .maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  const hash = data?.passwords?.[0]?.password_hash;
  if (!hash) {
    return null;
  }
  const matches = await bcrypt.compare(password, hash);
  return matches ? (data as { user_id: string }).user_id : null;
}

/**
 * Middleware for protected routes.
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
async function authorizeUser(req: Request, res: Response, next: NextFunction) {
  // 1. Session cookie (preferred — works on GET)
  const sessionUserId = req.session?.userId;
  if (sessionUserId) {
    req.authUserId = sessionUserId;
    return next();
  }

  // 2. Body-based credentials (fallback)
  const { username, password } = (req.body ?? {}) as Partial<AuthBody>;
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
function requireOwnership(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  if (!id || !UUID_RE.test(id)) {
    return res.status(400).json({ error: "id must be a valid UUID" });
  }
  if (id.toLowerCase() !== req.authUserId?.toLowerCase()) {
    return res.status(403).json({ error: "not authorized to access this user" });
  }
  next();
}

// Password hashes stay out of every API response.
const USER_SELECT =
  "user_id, username, favorite_foods(food_name), allergies(allergy_name)";

export const toUserDetails = (row: UserRow): UserDetails => ({
  userId: row.user_id,
  username: row.username,
  favoriteFoods: row.favorite_foods.map((f) => f.food_name),
  allergies: row.allergies.map((a) => a.allergy_name),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- Validation ----------

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every((s) => typeof s === "string" && s.length > 0 && s.length <= 100);

/**
 * req.body is untrusted, so we accept `unknown` and narrow it.
 * Returns the validated body, or an error message.
 */
export function parseCreateUserBody(
  body: unknown
): { ok: true; value: CreateUserBody } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "request body must be a JSON object" };
  }

  const {
    username,
    password,
    favoriteFoods = [],
    allergies = [],
  } = body as Record<string, unknown>;

  if (typeof username !== "string" || username.length < 1 || username.length > 50) {
    return { ok: false, error: "username must be 1-50 characters" };
  }
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, error: "password must be at least 8 characters" };
  }
  if (!isStringList(favoriteFoods) || !isStringList(allergies)) {
    return {
      ok: false,
      error: "favoriteFoods and allergies must be arrays of 1-100 character strings",
    };
  }

  return { ok: true, value: { username, password, favoriteFoods, allergies } };
}

// ---------- App ----------

export const app = express();
app.use(express.json());

// The session secret signs the cookie, so it must come from the environment.
// Tests get a fixed fallback so they don't need a .env entry.
const sessionSecret =
  process.env.SESSION_SECRET ?? (process.env.VITEST ? "test-only-session-secret" : undefined);
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required");
}

// Session cookie: set on successful /api/authenticate, read by authorizeUser
// on subsequent requests. The cookie carries an opaque session id; the server
// stores the authenticated user's id in the session object.
app.use(
  session({
    secret: sessionSecret,
    saveUninitialized: false,
    resave: false,
    cookie: {
      httpOnly: true, // not readable from frontend JavaScript
      sameSite: "lax", // not sent on cross-site POST/PUT/DELETE
      secure: process.env.NODE_ENV === "production", // HTTPS-only in production
      maxAge: 60_000 * 60, // 1 hour
    },
  })
);

/**
 * Expected POST body:
 * {
 *   "username": "alice",
 *   "password": "s3cret-pass",
 *   "favoriteFoods": ["pizza", "sushi"],
 *   "allergies": ["peanuts", "shellfish"]
 * }
 */
app.post(
  "/api/users",
  async (req: Request, res: Response<CreateUserResponse | ErrorResponse>) => {
    const parsed = parseCreateUserBody(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: parsed.error });
    }
    const { username, password, favoriteFoods, allergies } = parsed.value;

    try {
      const passwordHash = await bcrypt.hash(password, 12);

      // One atomic call: user + password + foods + allergies
      const { data, error } = await supabase.rpc("create_user_with_details", {
        p_username: username,
        p_password_hash: passwordHash,
        p_foods: favoriteFoods,
        p_allergies: allergies,
      });

      if (error) {
        if (error.code === "23505") {
          // unique_violation on users.username
          return res.status(409).json({ error: "username already taken" });
        }
        console.error(error);
        return res.status(500).json({ error: "database error" });
      }

      if (typeof data !== "string") {
        console.error("Unexpected rpc result:", data);
        return res.status(500).json({ error: "unexpected database response" });
      }

      return res.status(201).json({ userId: data, username });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "internal server error" });
    }
  }
);

/**
 * GET /api/users  ->  all users with their foods and allergies
 *
 * The response intentionally omits password hashes.
 */
app.get(
  "/api/users",
  authorizeUser,
  async (_req: Request, res: Response<UserDetails[] | ErrorResponse>) => {
    const { data, error } = await supabase.from("users").select(USER_SELECT);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "database error" });
    }

    const rows = data as unknown as UserRow[];
    return res.json(rows.map(toUserDetails));
  }
);

/** GET /api/users/:id  ->  one user (only the authenticated user's own record) */
app.get(
  "/api/users/:id",
  authorizeUser,
  requireOwnership,
  async (req: Request<{ id: string }>, res: Response<UserDetails | ErrorResponse>) => {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select(USER_SELECT)
      .eq("user_id", id)
      .maybeSingle();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "database error" });
    }
    if (!data) {
      return res.status(404).json({ error: "user not found" });
    }

    return res.json(toUserDetails(data as unknown as UserRow));
  }
);

/** GET /api/users/username/:username  ->  one user (only the authenticated user's own record) */
app.get(
  "/api/users/username/:username",
  authorizeUser,
  async (req: Request<{ username: string }>, res: Response<UserDetails | ErrorResponse>) => {
    const { username } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select(USER_SELECT)
      .eq("username", username)
      .maybeSingle();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "database error" });
    }
    if (!data) {
      return res.status(404).json({ error: "user not found" });
    }

    const row = data as unknown as UserRow;
    if (row.user_id.toLowerCase() !== req.authUserId?.toLowerCase()) {
      return res.status(403).json({ error: "not authorized to access this user" });
    }

    return res.json(toUserDetails(row));
  }
);
/*
Test:
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"s3cret-pass","favoriteFoods":["pizza","sushi"],"allergies":["peanuts"]}'

curl http://localhost:3000/api/users
curl http://localhost:3000/api/users/<user-uuid>
*/

// PUT routes
app.put(
  "/api/users/:id/favorite-foods",
  authorizeUser,
  requireOwnership,
  async (req: Request<{ id: string }, {}, UpdateUserBody>, res: Response<ErrorResponse>) => {
    const { id } = req.params;
    const { favoriteFoods } = req.body;
    if (!isStringList(favoriteFoods)) {
      return res.status(400).json({ error: "favoriteFoods must be an array of strings" });
    }
    const { data, error } = await supabase.rpc("update_user_details", {
      p_user_id: id,
      p_foods: favoriteFoods,
      p_allergies: [] // Empty array to indicate no change to allergies
    });
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "database error" });
    }
    return res.status(200).json();
  }
);
app.put(
  "/api/users/:id/allergies",
  authorizeUser,
  requireOwnership,
  async (req: Request<{ id: string }, {}, UpdateUserBody>, res: Response<ErrorResponse>) => {
    const { id } = req.params;
    const { allergies } = req.body;
    if (!isStringList(allergies)) {
      return res.status(400).json({ error: "allergies must be an array of strings" });
    }
    const { data, error } = await supabase.rpc("update_user_details", {
      p_user_id: id,
      p_foods: [], // Empty array to indicate no change to favorite foods
      p_allergies: allergies
    });
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "database error" });
    }
    return res.status(200).json();
  }
);
// DELETE routes
app.delete(
  "/api/users/:id/favorite-foods",
  authorizeUser,
  requireOwnership,
  async (req: Request<{ id: string }, {}, { food: string }>, res: Response<ErrorResponse>) => {
    const { id } = req.params;
    const { food } = req.body;
    if (!food || typeof food !== "string") {
      return res.status(400).json({ error: "food must be a string" });
    }
    const { data, error } = await supabase.rpc("delete_user_details", {
      p_user_id: id,
      p_food_to_delete: food,
      p_allergy_to_delete: null
    });
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "database error" });
    }
    return res.status(200).json();
  }
);
app.delete(
  "/api/users/:id/allergies",
  authorizeUser,
  requireOwnership,
  async (req: Request<{ id: string }, {}, { allergy: string }>, res: Response<ErrorResponse>) => {
    const { id } = req.params;
    const { allergy } = req.body;
    if (!allergy || typeof allergy !== "string") {
      return res.status(400).json({ error: "allergy must be a string" });
    }
    const { data, error } = await supabase.rpc("delete_user_details", {
      p_user_id: id,
      p_food_to_delete: null,
      p_allergy_to_delete: allergy
    });
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "database error" });
    }
    return res.status(200).json();
  }
);
// Add authentication route — sets the session cookie on success
app.post(
  "/api/authenticate",
  async (req: Request<{}, {}, AuthBody>, res: Response<{ success: boolean }>) => {
    const { username, password } = (req.body ?? {}) as Partial<AuthBody>;
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
);

// POST /api/logout — destroys the session (clears the cookie)
app.post(
  "/api/logout",
  (req: Request, res: Response<{ success: boolean }>) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  }
);


const PORT = Number(process.env.PORT) || 3000;
if (!process.env.VITEST) {
  app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
}