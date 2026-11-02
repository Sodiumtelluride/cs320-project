import {supabase} from "./supabase.js";

import {DataNode} from "../scraper/parser.js";

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
    }
    return nutritonalInfo;
}

export function buildIngredients(itemNode: DataNode):string[] {
    const ingredientNode = itemNode.data.get("data-ingredient-list") as DataNode;
    const ingredients:string[] = [];
    for(const[,value] of ingredientNode.data){
        if (value === undefined|| value === "") continue;

        ingredients.push(cleanString(value as string));
    }
    
    return ingredients;
}


export function buildAllergies(itemNode: DataNode): string[] {
    const allergyNode = itemNode.data.get("data-allergens") as DataNode;
    const allergies:string[] = [];
    for(const[,value] of allergyNode.data){
        if (value === undefined|| value === "") continue;

        allergies.push(cleanString(value as string));
    }
    return allergies;
}  

export async function insertMenuData(itemNode: DataNode){
    const nutritionalInfo = buildNutritionalInfo(itemNode);
    const { data, error } = await supabase
        .from("menu_items")
        .insert([nutritionalInfo])
        .select();
    
    if (error) {
        console.error("Error inserting menu item:", error);
    }
    return data;
}

export async function insertIngredients(itemNode: DataNode, menuItemId: number) {
    const ingredients= buildIngredients(itemNode);

    for (const ingredient of ingredients) {
        const { data, error} = await supabase
            .from("ingredients")
            .upsert(
                {name: ingredient},
                {onConflict: "name"}
            )
            .select()
            .single();

        if (error) {
            console.error("Error inserting ingredient:", error);
            continue;
        }

        const {error: relationError} = await supabase
            .from("menu_item_ingredients")
            .upsert({
                menu_item_id: menuItemId,
                ingredient_id: data.id
            });
        
        if(relationError){
            console.error("Error inserting menu item ingredient relation:", relationError);
        }
    }   
}

export async function insertAllergies(ItemNode: DataNode, menuItemId: number) {
    const allergies = buildAllergies(ItemNode);
    for(const allergy of allergies){
        const {data, error} = await supabase
            .from("allergens")
            .upsert(
                {name: allergy},
                {onConflict: "name"}
            )
            .select()
            .single();
        
        if(error){
            console.error("Error inserting allergen:", error);
            continue;
        }

        const {error: relationError} = await supabase
            .from("menu_item_allergens")
            .upsert({
                menu_item_id: menuItemId,
                allergen_id: data.id
            });

        if(relationError){
            console.error("Error inserting menu item allergen relation:", relationError);
        }
    }
}

export async function insertMeals(locationId: number, date: string, mealType: string, menuItemId: number, stationName: string) {
    const {data, error} = await supabase
        .from("meals")
        .upsert(
            {
                location_id: locationId,
                date: date,
                meal_type: mealType
            },
            {
                onConflict: "location_id, date, meal_type"
            
            }
        )
        .select()
        .single();
    
    if(error){
        console.error("Error inserting meal:", error);
    }

    const {error: relationError} = await supabase
        .from("meal_items")
        .upsert(
            {
                meal_id: data.id,
                menu_item_id: menuItemId,
                station: stationName
            },
            {
                onConflict: "meal_id, menu_item_id, station"
            }
        )
    
    if(relationError){
        console.error("Error inserting meal item relation:", relationError);
    }
}
        
