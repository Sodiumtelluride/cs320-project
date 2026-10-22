import { isMenuDate } from "./date";
import { MEALS, type CarbonRating, type DietaryTag, type FoodDetails, type MenuFood, type MenuQuery, type MenuResponse, type NutritionFacts, type Nutrient } from "./types";

function invalid(): never {
  throw new Error("The menu service returned an invalid response.");
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) invalid();
  return value;
}

function nullableText(value: unknown): string | null {
  if (value == null || value === "") return null;
  return text(value);
}

function nonnegative(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) invalid();
  return value;
}

function timestamp(value: unknown): string | null {
  const result = nullableText(value);
  if (result && (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(result) || !Number.isFinite(Date.parse(result)))) invalid();
  return result;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) invalid();
  return value.map(text);
}

function food(value: unknown): MenuFood {
  const data = object(value);
  const tags = data.dietaryTags == null ? [] : strings(data.dietaryTags);
  const allowed = ["halal", "local", "vegetarian", "plant-based"];
  if (tags.some((tag) => !allowed.includes(tag))) invalid();
  const carbon = nullableText(data.carbonRating);
  if (carbon && !["A", "B", "C", "D", "E"].includes(carbon)) invalid();
  return {
    id: text(data.id), name: text(data.name),
    dietaryTags: [...new Set(tags)] as DietaryTag[],
    carbonRating: carbon as CarbonRating | null,
  };
}

function nutrient(value: unknown): Nutrient | null {
  if (value == null) return null;
  const data = object(value);
  if (data.unit !== "g" && data.unit !== "mg" && data.unit !== "mcg") invalid();
  return {
    amount: nonnegative(data.amount), unit: data.unit,
    dailyValue: data.dailyValue == null ? null : nonnegative(data.dailyValue),
  };
}

function nutrition(value: unknown): NutritionFacts | null {
  if (value == null) return null;
  const data = object(value);
  const result: NutritionFacts = {
    servingSize: nullableText(data.servingSize),
    calories: data.calories == null ? null : nonnegative(data.calories),
    caloriesFromFat: data.caloriesFromFat == null ? null : nonnegative(data.caloriesFromFat),
  };
  const fields = ["totalFat", "saturatedFat", "transFat", "cholesterol", "sodium", "totalCarbohydrate", "dietaryFiber", "totalSugars", "addedSugars", "protein"] as const;
  for (const key of fields) result[key] = nutrient(data[key]);
  return result;
}

export function parseMenuResponse(value: unknown): MenuResponse {
  const data = object(value);
  const date = text(data.date);
  if (!isMenuDate(date)) invalid();
  const meal = MEALS.find((entry) => entry.id === data.meal)?.id;
  if (!meal || !Array.isArray(data.stations)) invalid();
  const stationIds = new Set<string>();
  const stations = data.stations.map((value) => {
    const station = object(value);
    const id = text(station.id);
    if (stationIds.has(id) || !Array.isArray(station.foods)) invalid();
    stationIds.add(id);
    const foods = station.foods.map(food);
    if (new Set(foods.map((item) => item.id)).size !== foods.length) invalid();
    return { id, name: text(station.name), foods };
  });
  return { diningHallId: text(data.diningHallId), date, meal, stations, updatedAt: timestamp(data.updatedAt) };
}

export function parseMenuQuery(params: URLSearchParams): MenuQuery {
  const diningHallId = params.get("diningHallId");
  const date = params.get("date");
  const meal = MEALS.find((entry) => entry.id === params.get("meal"))?.id;
  if (!diningHallId?.trim() || !date || !isMenuDate(date) || !meal) {
    throw new Error("A dining hall, ISO date, and valid meal are required.");
  }
  return { diningHallId, date, meal };
}

export function parseFoodDetails(value: unknown): FoodDetails {
  const data = object(value);
  const score = data.healthfulnessScore == null ? null : nonnegative(data.healthfulnessScore);
  if (score !== null && score > 7) invalid();
  const sourceUrl = nullableText(data.sourceUrl);
  if (sourceUrl) {
    let url: URL;
    try { url = new URL(sourceUrl); } catch { invalid(); }
    if (url.protocol !== "https:" && url.protocol !== "http:") invalid();
  }
  return {
    ...food(data), nutrition: nutrition(data.nutrition), healthfulnessScore: score,
    allergens: data.allergens == null ? null : strings(data.allergens),
    ingredients: nullableText(data.ingredients), sourceUrl, updatedAt: timestamp(data.updatedAt),
  };
}
