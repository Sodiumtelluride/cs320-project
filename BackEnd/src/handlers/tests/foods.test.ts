import { describe, it, expect } from "vitest";
import { buildNutrition } from "../foods.js";

describe("buildNutrition", () =>{

    it("converts db string nutrition values into the frotend numeric format", () =>{

        const food = {
            serving_size: "5 oz",
            calories: "250",
            calories_from_fat: "90",
            total_fat: "10g",
            total_fat_dv: "10",
            sat_fat: "2g",
            sat_fat_dv: "10",
            trans_fat: "0g",
            cholesterol: "50 mg",
            cholesterol_dv: "0",
            sodium: "100 mg",
            sodium_dv: "5",
            total_carb: "15g",
            total_carb_dv: "5",
            dietary_fiber: "1",
            dietary_fiber_dv: "5",
            sugar: "2g", 
            protein: "15g",
            protein_dv: "5"
        };

        const nutrition = buildNutrition(food);

        expect(nutrition.servingSize).toBe("5 oz");
        expect(nutrition.calories).toBe(250);
        expect(nutrition.caloriesFromFat).toBe(90);
        expect(nutrition.totalSugars.amount).toBe(2);
        expect(nutrition.sodium.amount).toBe(100);
        expect(nutrition.saturatedFat.amount).toBe(2);

        expect(nutrition.totalFat).toEqual({
            amount: 10,
            unit: "g",
            dailyValue: 10
        });
        expect(nutrition.cholesterol).toEqual({
            amount: 50,
            unit: "mg",
            dailyValue: 0
        });
        expect(nutrition.protein).toEqual({
            amount: 15,
            unit: "g",
            dailyValue: 5
        });
    })
})