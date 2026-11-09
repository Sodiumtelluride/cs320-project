
import {describe, it, expect} from "vitest";
import request from "supertest";
import app from "./testApp.js";
import {supabase} from "../db/supabase.js";

describe("Get /api/foods/:foodId for food details api", () =>{

    it("returns the mock food details (nutrition, ingredients, allergens) for Test Chicken", async () =>{
        const{data: food, error} = await supabase 
            .from("menu_items")
            .select("id")
            .eq("name", "Test Chicken")
            .single()
        
        expect(error).toBeNull();
        expect(food).not.toBeNull();

        const response = await request(app)
            .get(`/api/foods/${food!.id}`)
            .query({
                diningHallId: "worcester",
                date: "2026-10-27",
                meal: "lunch"
            });
        
        expect(response.status).toBe(200);
        expect(response.body.name).toBe("Test Chicken");
        expect(response.body.carbonRating).toBe("B");

        expect(response.body.dietaryTags).toEqual(["halal", "local"]);
        expect(response.body.nutrition.calories).toBe(250);

        expect(response.body.nutrition.totalFat).toEqual({
            amount: 10,
            unit: "g",
            dailyValue: 13
        });

        expect(response.body.allergens).toContain("Soy");
        expect(response.body.ingredients).toContain("Chicken")
        
    });

    it("returns the mock food details (nutrition, ingredients, allergens) for Test Pasta", async () =>{
        const{data: food, error} = await supabase 
            .from("menu_items")
            .select("id")
            .eq("name", "Test Pasta")
            .single()
        
        expect(error).toBeNull();
        expect(food).not.toBeNull();

        const response = await request(app)
            .get(`/api/foods/${food!.id}`)
            .query({
                diningHallId: "worcester",
                date: "2026-10-27",
                meal: "lunch"
            });
        
        expect(response.status).toBe(200);
        expect(response.body.name).toBe("Test Pasta");
        expect(response.body.carbonRating).toBe("C");

        expect(response.body.dietaryTags).toEqual(["vegetarian"]);
        expect(response.body.nutrition.calories).toBe(300);

        expect(response.body.nutrition.totalFat).toEqual({
            amount: 9,
            unit: "g",
            dailyValue: 12
        });

        expect(response.body.allergens).toContain("Wheat");
        expect(response.body.allergens).toContain("Milk");

        expect(response.body.ingredients).toContain("Pasta")
        expect(response.body.ingredients).toContain("Cheese")

        
    });

    it("returns a 404 error when a food item isn't returned", async () =>{
        const response = await request(app)
            .get("/api/foods/1000")
            .query({
                diningHallId: "worcester",
                date: "2026-10-27",
                meal: "lunch"
            });
        
        expect(response.status).toBe(404);
    });

    it("returns a 404 error when inputs are missing", async () =>{
        const {data: food} = await supabase
            .from("menu_items")
            .select("id")
            .eq("name", "Test Pasta")
            .single()
        
        const response = await request(app)
            .get(`/api/foods/${food!.id}`);
        
        expect(response.status).toBe(404);

    });
})



