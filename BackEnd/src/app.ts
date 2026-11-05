import "dotenv/config";
import express from "express";
import session from "express-session";

import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import menuRouter from "./routes/menus.js";
import menusRouter from "./routes/menus.js";
import searchRouter from "./routes/search.js";
import { login } from "./handlers/auth.js";

// The session secret signs the cookie, so it must come from the environment.
// Tests get a fixed fallback so they don't need a .env entry.
const sessionSecret =
  process.env.SESSION_SECRET ?? (process.env.VITEST ? "test-only-session-secret" : undefined);
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required");
}

export const app = express();

app.use(express.json());

// Session cookie: set on successful /api/authenticate, read by authorizeUser on
// every later request. The cookie carries an opaque session id; the server keeps
// the authenticated user's id in the session object.
// Setup session before routes are configured.
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

/* ---------- User + auth routes ---------- */
app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
// The endpoint frontend/lib/login-request.ts posts { username, password } to.
app.post("/api/authenticate", login);

/* ---------- Menu, food and search routes ---------- */
app.use("/api/menu", menuRouter);
app.use("/api/menus", menusRouter);
app.use("/api/search", searchRouter);

// Ensure doesn't run on same port as Front End (Front End runs on 3000)
const PORT = Number(process.env.PORT) || 3001;

if (!process.env.VITEST) {
  app.listen(PORT, () => {
    console.log(`UMass Dining Common backend is listening on http://localhost:${PORT}`);
    // An automated scrape call would go here — find some way to do that once in
    // the morning or something later.
  });
}
