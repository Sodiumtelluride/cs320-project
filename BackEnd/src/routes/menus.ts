import {Router} from "express";
import {getMenu} from "../handlers/menus.js";

const router = Router();

router.get("/", getMenu);

export default router;