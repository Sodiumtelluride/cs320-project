import type { Request, Response } from "express";
import { supabase } from "../db/supabase.js";
import * as bcrypt from "bcrypt";

export async function login(req: Request, res: Response) {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) return res.status(400).json({ success: false });
  try {
    const { data, error } = await supabase.from("users").select("user_id, passwords(password_hash)").eq("username", username.trim()).maybeSingle();
    if (error) return res.status(503).json({ success: false });
    const hash = data?.passwords?.[0]?.password_hash;
    if (!hash || !(await bcrypt.compare(password, hash))) return res.status(401).json({ success: false });
    await new Promise<void>((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
    req.session.userId = data.user_id;
    await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
    return res.json({ success: true });
  } catch { return res.status(503).json({ success: false }); }
}

export async function currentUser(req: Request, res: Response) {
  res.set("Cache-Control", "no-store");
  if (!req.session.userId) return res.json([]);
  try {
    const { data, error } = await supabase.from("users")
      .select("user_id, username, favorite_foods(food_name), allergies(allergy_name)")
      .eq("user_id", req.session.userId).maybeSingle();
    if (error) return res.status(503).json({ error: "Unable to load account" });
    if (!data) return res.status(401).json([]);
    return res.json([{ id: data.user_id, email: data.username,
      favoriteFoods: data.favorite_foods.map(f => f.food_name), allergies: data.allergies.map(a => a.allergy_name) }]);
  } catch { return res.status(503).json({ error: "Unable to load account" }); }
}

export function logout(req: Request, res: Response) {
  req.session.destroy(err => {
    if (err) return res.status(503).json({ error: "Unable to log out" });
    res.clearCookie("sessionID", { path: "/" });
    return res.json([]);
  });
}
