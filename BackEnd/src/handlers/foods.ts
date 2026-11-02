import type { Request, Response } from "express-serve-static-core";
import type { FoodQueryDto } from "../dtos/FoodQuery.dtos.js";
import {cleanDietaryTags} from "../utils/menuUtils.js";
import { supabase } from "../db/supabase.js";


const nutritionCols = 
` serving_size,
  calories,
  calories_from_fat,
  total_fat,
  total_fat_dv,
  sat_fat,
  sat_fat_dv,
  trans_fat,
  cholesterol,
  cholesterol_dv,
  sodium,
  sodium_dv,
  total_carb,
  total_carb_dv,
  dietary_fiber,
  dietary_fiber_dv,
  sugar,
  sugar_dv,
  protein,
  protein_dv`;

type Nutrient = {
  amount: number;
  unit: "g" | "mg",
  dailyValue?: number|null
}

type Nutrition = {
  servingSize: string;
  calories: number;
  caloriesFromFat: number;
  totalFat: Nutrient;
  saturatedFat: Nutrient;
  transFat:  Nutrient;
  cholesterol: Nutrient;
  sodium: Nutrient;
  totalCarbohydrate: Nutrient;
  dietaryFiber: Nutrient;
  totalSugars: Nutrient;
  addedSugars: null;
  protein: Nutrient;
}
type IngredientQueryResult = {
  ingredients : {
    name:string
  }
}

type AllergenQueryResult = {
  allergens: {
    name: string;
  }
}

type FoodResponse = {
  id: string;
  name: string;
  dietaryTags: string[];
  carbonRating: "A"|"B"|"C"|"D"|"E"|null;
  nutrition: Nutrition;
  healthfulnessScore: number|null;
  allergens: string[]|null;
  ingredients: string|null;
  sourceUrl: string|null;
  updatedAt: string|null;
}



export function buildNutrition(food:any) : Nutrition{
  return{
    servingSize: food.serving_size,
    calories: Number(food.calories),
    caloriesFromFat: Number(food.calories_from_fat),
    totalFat: {
      amount: parseFloat(food.total_fat),
      unit: "g" as const,
      dailyValue: Number(food.total_fat_dv)
    },
    saturatedFat: {
      amount: parseFloat(food.sat_fat),
      unit: "g" as const,
      dailyValue: Number(food.sat_fat_dv)
    },
    transFat: {
      amount: parseFloat(food.trans_fat),
      unit: "g" as const
    },
    cholesterol: {
      amount: parseFloat(food.cholesterol),
      unit: "mg" as const,
      dailyValue: Number(food.cholesterol_dv)
    },
    sodium: {
      amount: parseFloat(food.sodium),
      unit: "mg" as const,
      dailyValue: Number(food.sodium_dv)
    },
    totalCarbohydrate: {
      amount: parseFloat(food.total_carb),
      unit: "g" as const,
      dailyValue: Number(food.total_carb_dv)
    },
    dietaryFiber: {
      amount: parseFloat(food.dietary_fiber),
      unit: "g" as const,
      dailyValue: Number(food.dietary_fiber_dv)
    },
    totalSugars: {
      amount: parseFloat(food.sugar),
      unit: "g" as const
    },
    addedSugars: null,
    protein: {
      amount: parseFloat(food.protein),
      unit: "g" as const,
      dailyValue: Number(food.protein_dv)
    }
  }
}

async function getFood(foodId: number){
  const {data, error} = await supabase
    .from("menu_items")
    .select(`
      id,
      name,
      clean_diet,
      carbon_list,
      healthfulness,
      recipe_url,
      ${nutritionCols}`)
    .eq("id", foodId)
    .maybeSingle();
  
  if(error){
    throw error;
  }

  return data
}

async function getIngredients(foodId: number){
  const {data, error} = await supabase
    .from("menu_item_ingredients")
    .select(`
      ingredients(name)`)
    .eq("menu_item_id", foodId);
  
  if(error){
    throw error;
  }

  const ingredients = data as unknown as IngredientQueryResult[]

  return ingredients.map(ingredient => ingredient.ingredients.name);
}

async function getAllergens(foodId: number){
  const {data, error} = await supabase
    .from("menu_item_allergens")
    .select(`
      allergens(name)`)
    .eq("menu_item_id", foodId)
  
  if(error){
    throw error;
  }

  const allergens = data as unknown as AllergenQueryResult[];

  return allergens.map(allergy => allergy.allergens.name);
}

export async function getFoodInfo(
  request: Request<{foodId: string},{},{}, FoodQueryDto>,
  response: Response<FoodResponse|{ error: string}>
){
  const {foodId} = request.params;
  const {diningHallId, date, meal} = request.query;

  if(!foodId||!diningHallId||!date||!meal){
    return response.status(404).send({
      error: "Missing required inputs"
    })
  }

  const fId = Number(foodId);

  const food = await getFood(fId);

  if(!food){
    return response.status(404).send({
      error: "No food found"
    })
  }

  const ingredients = await getIngredients(fId);
  const allergens = await getAllergens(fId);

  return response.status(200).send({
    id: String(food.id),
    name: food.name,
    dietaryTags: cleanDietaryTags(food.clean_diet),
    carbonRating: food.carbon_list as "A"| "B"| "C"| "D"| "E"| null,
    nutrition: buildNutrition(food),
    healthfulnessScore: Number(food.healthfulness) /10,
    allergens: allergens,
    ingredients: ingredients.join(", "),
    sourceUrl: null,
    updatedAt: null

  });
}