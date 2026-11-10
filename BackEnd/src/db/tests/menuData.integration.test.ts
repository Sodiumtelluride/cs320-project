import {describe, it, expect, afterAll} from "vitest";
import {DataNode} from "../../scraper/parser.js";
import {supabase} from "../supabase.js";

import {
    insertMenuData,
    insertFoodInfoBatch,
    buildNutritionalInfo,
    insertMeals,
    insertMealItems,
} from "../menuData.js";

describe("Menu Population Database Integration Tests", () =>{

    let menuItemId: number;
    let mealId: number;
    let locationId: number;

    it("should insert one meal, and all of its corresponding relationships in the db", async() =>{

       
        const ingredientNode = new DataNode();
        ingredientNode.data.set("Ingredient1", "Test Salt");
        ingredientNode.data.set("Ingredient2", "Test Breaded Chicken)");
        ingredientNode.data.set("Ingredient3", "Test BBQ Sauce");

        const allergyNode = new DataNode();
        allergyNode.data.set("Allergy1", "Test Gluten");

        const itemNode = new DataNode();
        itemNode.data.set("data-dish-name", "Test Breaded Chicken");
        itemNode.data.set("data-calories", "500");
        itemNode.data.set("data-protein", "30g");
        itemNode.data.set("data-ingredient-list", ingredientNode);
        itemNode.data.set("data-allergens", allergyNode);

        const menuRows = [buildNutritionalInfo(itemNode)];
        const insertedItems = await insertMenuData(menuRows);
        expect(insertedItems).toHaveLength(1);

        menuItemId = insertedItems[0]!.id;
        expect(menuItemId).toBeGreaterThan(0);

        const {data: menuItem, error: menuItemError} = await supabase
            .from("menu_items")
            .select("name,calories,protein")
            .eq("id", menuItemId)
            .single();

        if(menuItemError){
            throw menuItemError;
        }

        expect(menuItem.name).toBe("Test Breaded Chicken");
        expect(menuItem.calories).toBe(500);
        expect(menuItem.protein).toBe("30g");

        await insertFoodInfoBatch([
            {
                menuItemId,
                itemNode
            }
        ]);

        const { data: location, error: locationError} = await supabase
            .from("locations")
            .insert({
                name: "test-berkshire",
                location_type: "dining_hall"
            })
            .select("id")
            .single();
        
        if(locationError){
            throw locationError;
        }

        expect(location).not.toBeNull();
        locationId = location.id;
    
        const insertedMeals = await insertMeals([
            {
                location_id: locationId,
                date: "2026-11-05",
                meal_type: "test-lunch"
            }
        ]);

        expect(insertedMeals).toHaveLength(1);
        mealId = insertedMeals[0]!.id;
        expect(mealId).toBeGreaterThan(0);

        await insertMealItems([
            {
                meal_id: mealId,
                menu_item_id: menuItemId,
                station: "Test Station"
            }
        ])

        const { data: meal, error: mealError } = await supabase
            .from("meals")
            .select("*")
            .eq("id", mealId)
            .single();
        
        if(mealError){
            throw mealError;
        }

        expect(meal!.meal_type).toBe("test-lunch");
        expect(meal!.date).toBe("2026-11-05");


        const {data: mealItem, error: mealItemError} = await supabase
            .from("meal_items")
            .select("*")
            .eq("meal_id", mealId)
            .eq("menu_item_id", menuItemId)
            .single()
        
        if(mealItemError){
            throw mealItemError;
        }

        expect(mealItem!.station).toBe("Test Station");


        const {data: ingredients, error: ingredientsError} = await supabase
            .from("menu_item_ingredients")
            .select("ingredients(name)")
            .eq("menu_item_id", menuItemId);
        
        if(ingredientsError){
            throw ingredientsError;
        }

        const ingredientNames = ingredients.map((row: any) => row.ingredients?.name)

        expect(ingredientNames).toHaveLength(3);

        expect(ingredientNames).toEqual(
            expect.arrayContaining([
                "Test Salt",
                "Test Breaded Chicken",
                "Test BBQ Sauce"
            ])
        );

        const {data: allergens, error: allergensError} = await supabase
        .from("menu_item_allergens")
        .select("allergens(name)")
        .eq("menu_item_id", menuItemId);

        if(allergensError){
            throw allergensError;
        }

        const allergenNames = allergens.map((row: any) => row.allergens?.name);

        expect(allergenNames).toEqual(["Test Gluten"]);
    }, 30000);

    afterAll(async () => {
        if(mealId){
            await supabase
                .from("meal_items")
                .delete()
                .eq("meal_id", mealId);
        }
        if(menuItemId){
            await supabase 
                .from("menu_item_ingredients")
                .delete()
                .eq("menu_item_id", menuItemId)
        
            await supabase 
                .from("menu_item_allergens")
                .delete()
                .eq("menu_item_id", menuItemId)
        }
        if(mealId){
            await supabase
                .from("meals")
                .delete()
                .eq("id",mealId);
        }
        if(menuItemId){
            await supabase
                .from("menu_items")
                .delete()
                .eq("id", menuItemId);
        }
        if(locationId){
            await supabase
                .from("locations")
                .delete()
                .eq("id", locationId);
        }
        await supabase 
            .from("ingredients")
            .delete()
            .in("name", [ "Test Salt", "Test Breaded Chicken", "Test BBQ Sauce"]);
        
        await supabase 
            .from("allergens")
            .delete()
            .eq("name", "Test Gluten")
    });
});