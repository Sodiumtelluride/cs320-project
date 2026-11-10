import {supabase} from "./supabase.js";

import {DataNode} from "../scraper/parser.js";

const ingredientCache = new Map <string, number>();
const allergyCache = new Map <string, number>();

type Meal = {
    location_id: number;
    date: string;
    meal_type: string;
};

type FoodInfoJob = {
    menuItemId: number;
    itemNode: DataNode;
}

function getString(itemNode: DataNode, attribute:string) {
    const value = itemNode.data.get(attribute);
    return value;
}

export function cleanString(str: string): string {
    let cleaned = str;
    if(!cleaned.includes("(")){
        cleaned = cleaned.replaceAll(")", "");
    }
    if(!cleaned.includes("[")){
        cleaned = cleaned.replaceAll("]", "");
    }

    cleaned = cleaned.replaceAll(",", "");
                 
    return cleaned.trim()
}

export function buildNutritionalInfo(itemNode: DataNode) {

    const nutritonalInfo = {
        name: getString(itemNode, "data-dish-name"),
        healthfulness: getString(itemNode, "data-healthfulness"),
        carbon_list: getString(itemNode, "data-carbon-list"),
        recipe_url: getString(itemNode,"data-recipe-webcode"),
        clean_diet: getString(itemNode, "data-clean-diet-str"),
        serving_size: getString(itemNode, "data-serving-size"),
        calories: getString(itemNode, "data-calories"),
        calories_from_fat: getString(itemNode, "data-calories-from-fat"),
        total_fat: getString(itemNode, "data-total-fat"),
        total_fat_dv: getString(itemNode, "data-total-fat-dv"),
        sat_fat: getString(itemNode, "data-sat-fat"),
        sat_fat_dv: getString(itemNode, "data-sat-fat-dv"),
        trans_fat: getString(itemNode, "data-trans-fat"),
        cholesterol: getString(itemNode, "data-cholesterol"),
        cholesterol_dv: getString(itemNode, "data-cholesterol_dv"),
        sodium: getString(itemNode, "data-sodium"),
        sodium_dv: getString(itemNode, "data-sodium-dv"),
        total_carb: getString(itemNode, "data-total-carb"),
        total_carb_dv: getString(itemNode, "data-total-carb-dv"),
        dietary_fiber: getString(itemNode, "data-dietary-fiber"),
        dietary_fiber_dv: getString(itemNode, "data-dietary-fiber-dv"),
        sugar: getString(itemNode, "data-sugars"),
        sugar_dv: getString(itemNode, "data-sugars-dv"),
        protein: getString(itemNode, "data-protein"),
        protein_dv: getString(itemNode, "data-protein-dv"),

        //price: getString(itemNode, "price"),
    }
    return nutritonalInfo;
}

async function getIds(table: "ingredients"|"allergens", names: Set<string>, cache: Map<string,number>){
    const missing = [...names].filter(name => !cache.has(name));

    if(missing.length>0){
        const {data, error} = await supabase  
            .from(table)
            .upsert(
                missing.map(name => ({name})),
                {onConflict : "name"}
            )
            .select("id,name");
        if(error){
            throw error;
        }
        for(const row of data ?? []){
            cache.set(row.name, row.id);
        }
    }
    return cache;
}

export function buildIngredients(itemNode: DataNode):Set<string> {
    const ingredientNode = itemNode.data.get("data-ingredient-list") as DataNode;
    const ingredients = new Set<string>();

    if(!(ingredientNode instanceof DataNode)){
        return ingredients;
    }

    for(const[,value] of ingredientNode.data){
        if (value === undefined|| value === "") continue;

        ingredients.add(cleanString(value as string));
    }
    
    return ingredients;
}


export function buildAllergies(itemNode: DataNode): Set<string> {
    const allergyNode = itemNode.data.get("data-allergens") as DataNode;
    const allergies = new Set<string>();

    if(!(allergyNode instanceof DataNode)){
        return allergies;
    }

    for(const[,value] of allergyNode.data){
        if (value === undefined|| value === "") continue;

        allergies.add(cleanString(value as string));
    }
    return allergies;
}  

export async function insertMenuData(menuItems: any[]){
    if(menuItems.length === 0){
        return [];
    }
    const { data, error } = await supabase
        .from("menu_items")
        .upsert(menuItems, {
            onConflict: "name,calories,serving_size",
        })
        .select();
    
    if (error) {
        throw error;
    }
    return data;
}

export async function insertRelations(
    table: "menu_item_ingredients"|"menu_item_allergens",
    rows: {menu_item_id: number; [key:string]: number}[],
    onConflict:string
){
    const batchSize = 500;

    for(let i=0; i<rows.length; i+=batchSize){
        const {error} = await supabase
            .from(table)
            .upsert(rows.slice(i,i+batchSize),{
                onConflict
            });
        
        if(error){
            throw error;
        }
    }
}

export async function insertFoodInfoBatch(jobs: FoodInfoJob[]){
    if(!jobs.length){
        return;
    }

    const ingredients = new Set<string>();
    const allergens = new Set<string>();

    const foods = jobs.map(job =>{
        const foodIngredients = buildIngredients(job.itemNode);
        const foodAllergens = buildAllergies(job.itemNode);

        foodIngredients.forEach(name => ingredients.add(name));
        foodAllergens.forEach(name => allergens.add(name));

        return {...job, foodIngredients, foodAllergens};
    });

    await Promise.all([
        getIds("ingredients", ingredients, ingredientCache),
        getIds("allergens", allergens,allergyCache)
    ]);

    const ingredientRelations = foods.flatMap(food =>
        [...food.foodIngredients].map(name => ({
            menu_item_id: food.menuItemId,
            ingredient_id: ingredientCache.get(name)!
        }))
    );

    const allergyRelations = foods.flatMap(food =>
        [...food.foodAllergens].map(name => ({
            menu_item_id: food.menuItemId,
            allergen_id: allergyCache.get(name)!
        }))
    );

    await Promise.all([
        insertRelations(
            "menu_item_ingredients",
            ingredientRelations,
            "menu_item_id, ingredient_id"
        ),

        insertRelations(
            "menu_item_allergens",
            allergyRelations,
            "menu_item_id, allergen_id"
        )
    ]);
}


export async function insertMeals(meals: Meal[]){
    if(meals.length === 0){
        return [];
    }

    const {data, error} = await supabase
        .from("meals")
        .upsert(
            meals,
            {
                onConflict: "location_id, date, meal_type"
            }
        )
        .select("id, location_id, date, meal_type");
    
    if(error){
        throw error
    }
    return data;
}

export async function insertMealItems(mealItems: any[]){
    if(mealItems.length === 0){
        return;
    }
    const {error} = await supabase
        .from("meal_items")
        .upsert(
                mealItems,
            {
                onConflict: "meal_id, menu_item_id, station"
            }
        );
    
    if(error){
        throw error;
    }
}