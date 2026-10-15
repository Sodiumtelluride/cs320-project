import { Router } from "express";
import { getUsers, getUserById, createUser } from "../handlers/users.js";

const router = Router();

// /api/users
router.get("/", getUsers);

// /api/users/123
router.get("/:id", getUserById);

// Post request
// /api/users
router.post('/', createUser);

export default router;