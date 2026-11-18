import { supabase } from "../db/supabase.js";


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
type DiningHallQueryResult = {
    meals: {
        locations: {
            name: string;
        }
    }
}

type Food = {
    id: number;
    name: string;
};

type FoodLookup = {
  id: number;
  name: string;
  diningHalls: string[];
  allergens: string[];
  ingredients: string[];
}

/* ID function for when favorite foods gets migrated to id system
async function getFood(foodId: number){
  const {data, error} = await supabase
    .from("menu_items")
        .select("id, name")
        .ilike("name", `%${foodName}%`)
}
*/

async function getFood(foodName: string){
    const {data, error} = await supabase
        .from("menu_items")
        .select("id, name")
        .ilike("name", `%${foodName}%`)
    
    if(error){
        throw error;
    }
    return data ?? [];
}


async function getIngredients(foodId: number){
  const {data, error} = await supabase
    .from("menu_item_ingredients")
    .select(`ingredients(name)`)
    .eq("menu_item_id", foodId)
    .order("order", {ascending: true});
  
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

async function getDiningHalls(foodId: number, date: string){
    const {data, error} = await supabase
        .from("meal_items")
        .select(`
            meals!inner(
                locations!inner(name)
                )
            `)
        .eq("menu_item_id", foodId)
        .eq("meals.date", date)
        .in("meals.locations.name", [
            "worcester",
            "franklin",
            "hampshire",
            "berkshire"
        ]);
    
    if(error){
        throw error;
    }
    const rows = data as unknown as DiningHallQueryResult[];

    const diningHalls = rows
        .map(row => row.meals.locations.name)
    
    return [...new Set(diningHalls)];
}

async function buildFoodInfo(food: Food, date: string){
    const diningHalls = await getDiningHalls(food.id, date);

    if(diningHalls.length === 0){
        return null;
    }

    const ingredients = await getIngredients(food.id);
    const allergens = await getAllergens(food.id);

    return {
        id: food.id,
        name: food.name,
        diningHalls: diningHalls,
        ingredients: ingredients,
        allergens: allergens
    }
}


export async function getFoodInfo(foodName: string, date: string){

    const foods = await getFood(foodName.trim());

    const items: FoodLookup[] = [];

    for(const food of foods){
        const foodInfo = await buildFoodInfo(food, date);

        if(foodInfo){
            items.push(foodInfo);
        }
    }

    return{
        date: date,
        items: items
    }
}

 

 