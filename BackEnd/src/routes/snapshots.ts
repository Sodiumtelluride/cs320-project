import { Router } from "express";
import { getSnapshot } from "../handlers/snapshot.js";
const router = Router();
router.get("/", getSnapshot);
export default router;
