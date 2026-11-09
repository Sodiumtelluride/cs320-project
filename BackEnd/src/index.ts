// Server entry point.
//
// The user + auth routes (and the session middleware they depend on) all live in
// src/db/client.ts, which starts the server itself on PORT (default 3001) unless
// it is being run under vitest. This file only bolts on the non-user routers.
import { app } from "./db/client.js";
import menuRouter from "./routes/menu.js";
import menusRouter from "./routes/menus.js";
import foodsRouter from "./routes/foods.js";
import searchRouter from "./routes/search.js";

app.use("/api/menu", menuRouter);
app.use("/api/menus", menusRouter);
app.use("/api/foods", foodsRouter);
app.use("/api/search", searchRouter);
