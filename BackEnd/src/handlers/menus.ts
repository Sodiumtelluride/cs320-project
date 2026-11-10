import type { Request, Response } from "express-serve-static-core";
import {supabase} from "../db/supabase.js";
import { cleanDietaryTags } from "../utils/menuUtils.js";

type CarbonRating = "A"|"B"|"C"|"D"|"E"|null;

type meal = {
    id: number;
    meal_type: string
};

type FoodSummary = {
    id: string;
    name: string;
    dietaryTags: string[];
    carbonRating: CarbonRating;
};

type Station = {
    id: string;
    name: string;
    foods: FoodSummary[];
};

type IngredientList = {ingredients: {name:string} | null}
type AllergenList = {allergens: {name:string} | null}

export type MenuItem = {
    id: number;
    name: string;
    clean_diet: string|null;
    healthfulness: string|null;
    carbon_list: string|null;
    serving_size: string;
    calories: number;
    calories_from_fat: number;
    total_fat: string|null;
    total_fat_dv: string|null;
    sat_fat: string|null;
    sat_fat_dv: string|null;
    trans_fat:  string|null;
    cholesterol: string|null;
    cholesterol_dv: string|null;
    sodium: string|null;
    sodium_dv: string|null;
    total_carb: string|null;
    total_carb_dv: string|null;
    dietary_fiber: string|null;
    dietary_fiber_dv: string|null
    sugar: string|null;
    sugar_dv: string|null;
    protein: string|null;
    protein_dv: string|null;
    menu_item_ingredients: IngredientList[];
    menu_item_allergens: AllergenList[];
}

type MealItem = {
    meal_id: number;
    station: string|null;
    menu_items: MenuItem|null;
}

export function validDate(date: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        !Number.isNaN(Date.parse(date)) &&
        new Date(date).toISOString().slice(0, 10) === date; 
}

//Refactored function from Max's snapshot code
export function locationSlug(name: string): string {
  const slug = name.toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug === "peets-coffee-and-tea" ? "peets-coffee-tea" : slug;
}

const locationCache = new Map<string, number>();

async function getLocation(slug: string){
    const cached = locationCache.get(slug);
    if(cached !== undefined) return cached;

    const {data, error} = await supabase
        .from("locations")
        .select("id, name")
    
    if(error){
        throw error;
    }
    for(const location of data ?? []){
        locationCache.set(locationSlug(location.name), location.id);
    }
    return locationCache.get(slug) ?? null;
    
};

type MealWithItems = meal & {
    meal_items: {
        station: string | null;
        menu_items: MenuItem | null;
    }[];
};

async function getDayData(locationId: number, date: string) {
    const { data, error } = await supabase
        .from("meals")
        .select(`
            id,
            meal_type,
            meal_items (
                station,
                menu_items (
                    *,
                    menu_item_ingredients (
                        ingredients (name)
                    ),
                    menu_item_allergens (
                        allergens (name)
                    )
                )
            )
        `)
        .eq("location_id", locationId)
        .eq("date", date);

    if (error) throw error;

    const results = (data ?? []) as unknown as MealWithItems[];

    const meals: meal[] = results.map(row => ({
        id: row.id,
        meal_type: row.meal_type
    }));

    const items: MealItem[] = results.flatMap(row =>
        row.meal_items.map(item => ({
            meal_id: row.id,
            station: item.station,
            menu_items: item.menu_items
        }))
    );

    return { meals, items };
}

//Refactored function from Max's snapshot code
function number(value: unknown): number | null {
  if (value == null || value === "") return null;
  const result = parseFloat(String(value));
  return Number.isFinite(result) && result >= 0 ? result : null;
}

//Refactored function from Max's snapshot code
function nutrient(amount: unknown, dailyValue: unknown, unit: "g" | "mg") {
  const value = number(amount);
  return value === null ? null : { amount: value, unit, dailyValue: number(dailyValue) };
}

//refactored function from Max's snapshot code
export function formatFood(item: MenuItem) {
  const score = number(item.healthfulness);
  const carbonRating : CarbonRating = item.carbon_list === "A" || item.carbon_list === "B" ||item.carbon_list === "C" || item.carbon_list === "D" ||item.carbon_list === "E" ? item.carbon_list : null;
  return {
    id: String(item.id), 
    name: item.name, 
    dietaryTags: cleanDietaryTags(item.clean_diet),
    carbonRating,
    nutrition: {
        servingSize: item.serving_size || null, 
        calories: number(item.calories), 
        caloriesFromFat: number(item.calories_from_fat),
        totalFat: nutrient(item.total_fat, item.total_fat_dv, "g"), 
        saturatedFat: nutrient(item.sat_fat, item.sat_fat_dv, "g"),
        transFat: nutrient(item.trans_fat, null, "g"), 
        cholesterol: nutrient(item.cholesterol, item.cholesterol_dv, "mg"),
        sodium: nutrient(item.sodium, item.sodium_dv, "mg"), 
        totalCarbohydrate: nutrient(item.total_carb, item.total_carb_dv, "g"),
        dietaryFiber: nutrient(item.dietary_fiber, item.dietary_fiber_dv, "g"), 
        totalSugars: nutrient(item.sugar, item.sugar_dv, "g"),
        addedSugars: null,
        protein: nutrient(item.protein, item.protein_dv, "g"),
    },
    healthfulnessScore: score !== null && score <= 70 ? score / 10 : null,
    allergens: item.menu_item_allergens?.length ? item.menu_item_allergens.map((r: any) => r.allergens?.name).filter(Boolean) : null,
    ingredients: item.menu_item_ingredients
        .map((r: any) => r.ingredients?.name)
        .filter(Boolean)
        .join(", ") || null,
    sourceUrl: null, 
    updatedAt: null,
  };
}

export function is_grabNGo(stationName: string){
    return stationName.toLowerCase().includes("breakfast") ? "breakfast" : "lunch";
}


export function buildDayMenu(meals: meal[], items: MealItem[], grabngo: boolean){
    const menus: Record<string, Station[]> = {}
    const foods: Record<string, ReturnType<typeof formatFood>> = {};

    for(const meal of meals){

        const mealItems = items.filter(item => item.meal_id === meal.id);

        for(const row of mealItems){
            if(!row.menu_items){
                continue;
            }

            const food = formatFood(row.menu_items);
            const stationName = row.station ?? "Other";

            const mealType = grabngo ? is_grabNGo(stationName) : meal.meal_type

            if(!menus[mealType]){
                menus[mealType] = [];
            }

            let station = menus[mealType].find(station => station.name === stationName);

            if(!station){
                station = {
                    id: stationName,
                    name: stationName,
                    foods: []
                }

                menus[mealType].push(station);
            }

            station.foods.push({
                id: food.id,
                name: food.name,
                dietaryTags: food.dietaryTags,
                carbonRating: food.carbonRating
            });
            foods[food.id] = food;
        }
    }
    return {menus, foods};
}

export async function getMenus(req: Request, res: Response){
    const{location, date} = req.query;

    if (typeof location !== "string" || typeof date !== "string" || !validDate(date)){
        return res.status(400).json({
            error: "error"
        })
    }

    const grabngo: boolean = location.endsWith("-grab-n-go");

    const dbLocation = grabngo ? location.replace(/-grab-n-go$/, "") : location;

    const locationId = await getLocation(dbLocation);
    if(locationId === null){
        return res.status(404).json({
            error: "error"
        });
    }
    
    const dayData = await getDayData(locationId, date);

    const meals = grabngo
        ? dayData.meals.filter(meal => meal.meal_type === "grab-n-go")
        : ["berkshire", "worcester", "hampshire", "franklin"].includes(dbLocation)
            ? dayData.meals.filter(meal => meal.meal_type !== "grab-n-go")
            : dayData.meals;


    const { menus, foods } = buildDayMenu(meals, dayData.items, grabngo);

    return res.json({
    location,
    date,
    menus,
    foods,
    updatedAt: null
});

}


