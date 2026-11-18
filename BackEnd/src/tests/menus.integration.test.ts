import {describe, it, expect, beforeAll, afterAll} from "vitest";
import request from "supertest";
import app from "./testApp.js";
import { supabase } from "../db/supabase.js";

describe("GET /api/menus for menu api", () =>{
    let locationId: number;
    let mealId: number;
    let menuItemIds: number[] = [];

    const testDate = "2026-10-27";

    beforeAll(async () =>{

        const{data: location, error: locationError} = await supabase
            .from("locations")
            .insert({
                name: "test-worcester",
                location_type: "dining_hall"
            })
            .select("id")
            .single()
        
        if(locationError){
            throw locationError;
        }

        locationId = location.id;

        const {data: items, error: itemsError} = await supabase
            .from("menu_items")
            .insert([
                {
                    name: "Test Chicken",
                    clean_diet: "halal,local",
                    carbon_list: "B"
                },
                {
                    name: "Test Pasta",
                    clean_diet: "vegetarian",
                    carbon_list: "C"
                }
            ])
            .select("id")
                
        if(itemsError){
            throw itemsError;
        }

        menuItemIds = items.map(item => item.id);

        const {data: meal, error: mealError} = await supabase
            .from("meals")
            .insert({
                location_id: locationId,
                date: testDate,
                meal_type: "lunch"
            })
            .select("id")
            .single();
        
        if(mealError){
            throw mealError;
        }

        mealId = meal.id;

        const {error: relationError} = await supabase
            .from("meal_items")
            .insert([
                {
                    meal_id: mealId,
                    menu_item_id: menuItemIds[0],
                    station: "Grill"
                },
                {
                    meal_id: mealId,
                    menu_item_id: menuItemIds[1], 
                    station: "Pasta"
                }
            ]);
        
        if(relationError){
            throw relationError;
        }
    });

    afterAll(async () =>{
        if(mealId){
            await supabase
                .from("meal_items")
                .delete()
                .eq("meal_id", mealId);

             await supabase
                .from("meals")
                .delete()
                .eq("id", mealId);
        }
        if(menuItemIds.length > 0){
            await supabase 
                .from("menu_items")
                .delete()
                .in("id", menuItemIds);
        }
        if(locationId){
            await supabase
                .from("locations")
                .delete()
                .eq("id", locationId);
        }
    });
    
    it("returns the mock data in the test db for test-worcester lunch", async () =>{
        const response = await request(app)
            .get("/api/menus")
            .query({
                location: "test-worcester",
                date: "2026-10-27",
            });
        expect(response.status).toBe(200);
        expect(response.body.location).toBe("test-worcester")
        expect(response.body.date).toBe("2026-10-27");

        const lunch = response.body.menus.lunch;

        expect(lunch).toHaveLength(2);
        //Based on Mock Data: stations[0] = grill and stations[1] = pasta
        
        const grill = lunch.find((station:any) => station.name === "Grill");
        expect(grill).toBeDefined();
        expect(grill.foods).toHaveLength(1);

        expect(grill.foods[0]).toEqual({
            id: String(menuItemIds[0]),
            name: "Test Chicken",
            dietaryTags: ["halal", "local"],
            carbonRating: "B"
        });

        const pasta = lunch.find((station:any) => station.name === "Pasta");
        expect(pasta).toBeDefined();
        expect(pasta.foods).toHaveLength(1);
        
        expect(pasta.foods[0]).toEqual({
            id: String(menuItemIds[1]),
            name: "Test Pasta",
            dietaryTags: ["vegetarian"],
            carbonRating: "C"
        });
        expect(response.body.foods[String(menuItemIds[0])].name).toBe("Test Chicken");
        expect(response.body.foods[String(menuItemIds[1])].name).toBe("Test Pasta");

    });

    it("returns a 400 error when required inputs are missing", async () =>{
        const response = await request(app)
            .get("/api/menus")
            .query({
                location: "test-worcester"
            });
        
        expect(response.status).toBe(400);
    });

    it("returns a 404 error when location doesn't exist", async () =>{
        const response = await request(app)
            .get("/api/menus")
            .query({
                location: "fake-location",
                date: "2026-10-27",
            });

        expect(response.status).toBe(404)
    })
})