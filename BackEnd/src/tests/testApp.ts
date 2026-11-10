import express from "express";
import cors from "cors";

import menuRouter from "../routes/menus.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/menus", menuRouter);

export default app;