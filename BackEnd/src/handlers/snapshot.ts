import type { Request, Response } from "express";
import { supabase } from "../db/supabase.js";
import { cleanDietaryTags } from "../utils/menuUtils.js";

export function locationSlug(name: string): string {
  const slug = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug === "peets-coffee-and-tea" ? "peets-coffee-tea" : slug;
}
function number(value: unknown): number | null {
  if (value == null || value === "") return null;
  const result = parseFloat(String(value));
  return Number.isFinite(result) && result >= 0 ? result : null;
}
function nutrient(amount: unknown, dailyValue: unknown, unit: "g" | "mg") {
  const value = number(amount);
  return value === null ? null : { amount: value, unit, dailyValue: number(dailyValue) };
}
export function formatSnapshotFood(item: any) {
  const score = number(item.healthfulness);
  return {
    id: String(item.id), name: item.name, dietaryTags: cleanDietaryTags(item.clean_diet),
    carbonRating: ["A", "B", "C", "D", "E"].includes(item.carbon_list) ? item.carbon_list : null,
    nutrition: {
      servingSize: item.serving_size || null, calories: number(item.calories), caloriesFromFat: number(item.calories_from_fat),
      totalFat: nutrient(item.total_fat, item.total_fat_dv, "g"), saturatedFat: nutrient(item.sat_fat, item.sat_fat_dv, "g"),
      transFat: nutrient(item.trans_fat, null, "g"), cholesterol: nutrient(item.cholesterol, item.cholesterol_dv, "mg"),
      sodium: nutrient(item.sodium, item.sodium_dv, "mg"), totalCarbohydrate: nutrient(item.total_carb, item.total_carb_dv, "g"),
      dietaryFiber: nutrient(item.dietary_fiber, item.dietary_fiber_dv, "g"), totalSugars: nutrient(item.sugar, item.sugar_dv, "g"),
      addedSugars: null, protein: nutrient(item.protein, item.protein_dv, "g"),
    },
    healthfulnessScore: score !== null && score <= 70 ? score / 10 : null,
    allergens: item.menu_item_allergens?.length ? item.menu_item_allergens.map((r: any) => r.allergens?.name).filter(Boolean) : null,
    ingredients: item.menu_item_ingredients?.map((r: any) => r.ingredients?.name).filter(Boolean).join(", ") || null,
    sourceUrl: null, updatedAt: null,
  };
}
export async function getSnapshot(req: Request, res: Response) {
  const { location, date } = req.query;
  if (typeof location !== "string" || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) return res.status(400).json({ error: "A location and valid date are required" });
  try {
    if (process.env.LOCAL_MENU_PREVIEW === "1") {
      const { getLocalSnapshot } = await import("../db/localSnapshotStore.js");
      const result = await getLocalSnapshot(location, date);
      return res.json({ ...result.payload, updatedAt: result.updated_at });
    }
    const result = await supabase.from("menu_snapshots").select("payload, updated_at").eq("location", location).eq("date", date).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return res.status(404).json({ error: "Menu snapshot not available" });
    return res.json({ ...result.data.payload, updatedAt: result.data.updated_at });
  } catch (error) {
    console.error("Snapshot query failed", error);
    return res.status(500).json({ error: "Menu service unavailable" });
  }
}
