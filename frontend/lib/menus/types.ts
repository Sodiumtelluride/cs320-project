export const MEALS = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "grab-n-go", label: "Grab n' Go" },
  { id: "late-night", label: "Late Night" },
] as const;

export type MealId = (typeof MEALS)[number]["id"];
export type DietaryTag = "vegetarian" | "local" | "halal" | "plant-based";
export type CarbonRating = "A" | "B" | "C" | "D" | "E";

export interface DiningHall {
  id: string;
  name: string;
  meals?: readonly MealId[];
}

export interface MenuQuery {
  diningHallId: string;
  date: string;
  meal: MealId;
}

export interface MenuFood {
  id: string;
  name: string;
  dietaryTags: readonly DietaryTag[];
  carbonRating: CarbonRating | null;
}

export interface MenuStation {
  id: string;
  name: string;
  foods: readonly MenuFood[];
}

export interface MenuResponse extends MenuQuery {
  stations: readonly MenuStation[];
  updatedAt: string | null;
}

export interface Nutrient {
  amount: number;
  unit: "g" | "mg" | "mcg";
  dailyValue?: number | null;
}

export interface NutritionFacts {
  servingSize?: string | null;
  calories?: number | null;
  caloriesFromFat?: number | null;
  totalFat?: Nutrient | null;
  saturatedFat?: Nutrient | null;
  transFat?: Nutrient | null;
  cholesterol?: Nutrient | null;
  sodium?: Nutrient | null;
  totalCarbohydrate?: Nutrient | null;
  dietaryFiber?: Nutrient | null;
  totalSugars?: Nutrient | null;
  addedSugars?: Nutrient | null;
  protein?: Nutrient | null;
}

export interface FoodDetails extends MenuFood {
  nutrition: NutritionFacts | null;
  healthfulnessScore: number | null;
  allergens: readonly string[] | null;
  ingredients: string | null;
  sourceUrl: string | null;
  updatedAt: string | null;
}

export interface FoodQuery extends MenuQuery {
  foodId: string;
}

export interface MenuDataSource {
  mode: "demo" | "live";
  getMenu(query: MenuQuery, signal?: AbortSignal): Promise<MenuResponse>;
  getFoodDetails(query: FoodQuery, signal?: AbortSignal): Promise<FoodDetails>;
}
