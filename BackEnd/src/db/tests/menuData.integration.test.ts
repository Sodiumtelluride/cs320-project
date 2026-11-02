import {describe, it, expect, afterAll} from "vitest";
import {DataNode} from "../../scraper/parser.js";
import {supabase} from "../supabase.js";

import {
    insertMenuData,
    insertIngredients,
    insertAllergies,
    insertMeals,
} from "../menuData.js";

describe("Menu Population Database Integration Tests", () =>{

     let menuItemId: number;

    let mealId: number;

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

        const menuData = await insertMenuData(itemNode);
        expect(menuData).not.toBeNull();

        menuItemId = menuData![0]!.id;
        expect(menuItemId).toBeGreaterThan(0);

        await insertIngredients(itemNode, menuItemId);
        await insertAllergies(itemNode, menuItemId);

        const { data: location} = await supabase
            .from("locations")
            .select("id")
            .eq("name", "worcester")
            .single();
        
        expect(location).not.toBeNull();
    

        await insertMeals(location!.id, "10-21-2026", "Test Lunch", menuItemId, "Test Station");;

        const { data: meal } = await supabase
            .from("meals")
            .select("*")
            .eq("location_id", location!.id)
            .eq("date", "10-21-2026")
            .eq("meal_type", "Test Lunch")
            .single();
        
        
        expect(meal).not.toBeNull();
        mealId = meal!.id;

        expect(mealId).toBeGreaterThan(0);
        expect(meal!.meal_type).toBe("Test Lunch");
        expect(meal!.date).toBe("2026-10-21");


        const {data: mealItem} = await supabase
            .from("meal_items")
            .select("*")
            .eq("meal_id", meal!.id)
            .eq("menu_item_id", menuItemId)
            .eq("station", "Test Station")
            .single()
        
        expect(mealItem).not.toBeNull();
        expect(mealItem!.station).toBe("Test Station");

    });

    afterAll(async () => {
        if(mealId){
            await supabase
                .from("meals")
                .delete()
                .eq("id", mealId);
        }
        if(menuItemId){
            await supabase 
                .from("menu_items")
                .delete()
                .eq("id", menuItemId)
        }
        await supabase 
            .from("ingredients")
            .delete()
            .in("name", ["Test Salt", "Test Breaded Chicken", "Test BBQ Sauce"])
        
        await supabase 
            .from("allergens")
            .delete()
            .eq("name", "Test Gluten")
    })
})