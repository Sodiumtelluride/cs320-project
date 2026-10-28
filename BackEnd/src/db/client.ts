import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import * as bcrypt from "bcrypt";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_KEY in environment");
}
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// npm install express @supabase/supabase-js bcrypt dotenv
// npm install -D typescript tsx @types/express @types/node @types/bcrypt
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

// Shape we send to the frontend
interface UserDetails {
  userId: string;
  username: string;
  passwordHash: string | null; // see the warning on the GET routes
  favoriteFoods: string[];
  allergies: string[];
}

interface UpdateUserBody {
  favoriteFoods?: string[];
  allergies?: string[];
}
interface AuthBody {
  username: string;
  password: string;
}

async function authenticateUser(username: string, password: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("passwords(password_hash)")
    .eq("username", username)
    .maybeSingle();
  if (error) {
    console.error(error);
    return false;
  }
  if (!data?.passwords?.[0]?.password_hash) {
    return false;
  }
  return await bcrypt.compare(password, data.passwords[0].password_hash);
}
async function authorizeUser(req: Request, res: Response, next: NextFunction) {
  const { username, password } = (req.body ?? {}) as Partial<AuthBody>;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  const isAuthenticated = await authenticateUser(username, password);
  if (!isAuthenticated) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  next();
}

const USER_SELECT =
  "user_id, username, passwords(password_hash), favorite_foods(food_name), allergies(allergy_name)";

export const toUserDetails = (row: UserRow): UserDetails => ({
  userId: row.user_id,
  username: row.username,
  passwordHash: row.passwords[0]?.password_hash ?? null,
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
 * WARNING: this includes passwordHash because you asked for it. Even though it is
 * a bcrypt hash, exposing it to a frontend lets anyone who gets it attempt offline
 * cracking. Delete the `passwordHash` field from UserDetails/toUserDetails and the
 * `passwords(...)` part of USER_SELECT once you are done testing, and put real
 * authentication in front of these routes.
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

/** GET /api/users/:id  ->  one user */
app.get(
  "/api/users/:id",
  authorizeUser,
  async (req: Request<{ id: string }>, res: Response<UserDetails | ErrorResponse>) => {
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return res.status(400).json({ error: "id must be a valid UUID" });
    }

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

    return res.json(toUserDetails(data as unknown as UserRow));
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
  async (req: Request<{ id: string }, {}, UpdateUserBody>, res: Response<ErrorResponse>) => {
    const { id } = req.params;
    const { favoriteFoods } = req.body;
    if (!UUID_RE.test(id)) {
      return res.status(400).json({ error: "id must be a valid UUID" });
    }
    if (!Array.isArray(favoriteFoods)) {
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
  async (req: Request<{ id: string }, {}, UpdateUserBody>, res: Response<ErrorResponse>) => {
    const { id } = req.params;
    const { allergies } = req.body;
    if (!UUID_RE.test(id)) {
      return res.status(400).json({ error: "id must be a valid UUID" });
    }
    if (!Array.isArray(allergies)) {
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
  async (req: Request<{ id: string }, {}, { food: string }>, res: Response<ErrorResponse>) => {
    const { id } = req.params;
    const { food } = req.body;
    if (!UUID_RE.test(id)) {
      return res.status(400).json({ error: "id must be a valid UUID" });
    }
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
  async (req: Request<{ id: string }, {}, { allergy: string }>, res: Response<ErrorResponse>) => {
    const { id } = req.params;
    const { allergy } = req.body;
    if (!UUID_RE.test(id)) {
      return res.status(400).json({ error: "id must be a valid UUID" });
    }
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
// Add authentication route
app.post(
  "/api/authenticate",
  async (req: Request<{}, {}, AuthBody>, res: Response<{ success: boolean }>) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false });
    }
    const isAuthenticated = await authenticateUser(username, password);
    if (!isAuthenticated) {
      return res.status(401).json({ success: false });
    }
    return res.json({ success: true });
  }
);


const PORT = Number(process.env.PORT) || 3000;
if (!process.env.VITEST) {
  app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
}