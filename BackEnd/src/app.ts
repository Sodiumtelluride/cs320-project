import "dotenv/config";
import express from "express";
import session from "express-session";
import authRouter from "./routes/auth.js";
import { login } from "./handlers/auth.js";
import { app as userDatabaseApp } from "./db/client.js";
import menuRouter from "./routes/menu.js";
import menusRouter from "./routes/menus.js";
import foodsRouter from "./routes/foods.js";
import searchRouter from "./routes/search.js";

export function createApp(secret: string, store?: session.Store) {
  if (!secret) throw new Error("SESSION_SECRET is required");
  const app = express();
  app.disable("x-powered-by");
  if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
  app.use(express.json({ limit: "16kb" }));
  app.use(session({ name: "sessionID", secret, resave: false, saveUninitialized: false,
    ...(store ? { store } : {}),
    cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 3600000 } }));
  app.use("/api/auth", authRouter);
  app.post("/api/authenticate", login);
  // Reuse the existing atomic registration handler. Do not expose legacy
  // user-list routes, which include password hashes and lack ownership checks.
  app.post("/api/users", (req, res, next) => userDatabaseApp(req, res, next));
  app.use("/api/menu", menuRouter);
  app.use("/api/menus", menusRouter);
  app.use("/api/foods", foodsRouter);
  app.use("/api/search", searchRouter);
  return app;
}
