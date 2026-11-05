import {Router} from "express";
import {getMenus} from "../handlers/menus.js";

const router = Router();

router.get("/", getMenus);

export default router;