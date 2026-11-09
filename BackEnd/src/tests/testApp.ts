import express from "express";

// No cors() here: supertest calls this app in-process, and `cors` is not a
// dependency of this package (it was imported without ever being installed,
// which made every test file that imports testApp fail to load).
import menuRouter from "../routes/menus.js";
import foodRouter from "../routes/foods.js";

const app = express();

app.use(express.json());

app.use("/api/menus", menuRouter);
app.use("/api/foods", foodRouter);

export default app;