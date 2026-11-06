import { Router } from "express";
import { getFoodInfo } from "../handlers/foods.js";

const router = Router();

router.get("/:foodId", getFoodInfo);

export default router;
