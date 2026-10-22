import { Router } from "express";
import { getUsers, getUserById, createUser, login, logout } from "../handlers/users.js";

const router = Router();

/*  ---------- Get requests ---------- */
// /api/users
router.get("/", getUsers);

// /api/users/:id
router.get("/:id", getUserById);

/*  ---------- Post requests ---------- */
// /api/users
router.post('/create', createUser);

// /api/users/login
router.post('/login', login);

// /api/users/logout
router.post('/login', logout);

export default router; // Make router visible