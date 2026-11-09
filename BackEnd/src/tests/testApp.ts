import express from "express";
import cors from "cors";

import menuRouter from "../routes/menus.js";
import foodRouter from "../routes/foods.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/menus", menuRouter);
app.use("/api/foods", foodRouter);

export default app;