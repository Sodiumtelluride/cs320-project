import { Router } from "express";
import { login, logout, currentUser } from "../handlers/auth.js";
const router = Router();
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", currentUser);
export default router;
