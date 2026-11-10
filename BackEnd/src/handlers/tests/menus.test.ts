import {describe, it, expect} from "vitest";
import {
    buildDayMenu,
    getMenus,
    is_grabNGo,
    locationSlug,
    validDate,
    formatFood
} from "../menus.js"

import type { MenuItem } from "../menus.js";


function makeMockFood(id: number, name: string){
    return{
        id,
        name,
        clean_diet: null,
        carbon_list: "A",
        healthfulness: null,
        serving_size: "1 serving",
        calories: 200,
        calories_from_fat: 20,
        total_fat: null,
        total_fat_dv: null,
        sat_fat: null,
        sat_fat_dv: null,
        trans_fat: null,
        cholesterol: null,
        cholesterol_dv: null,
        sodium: null,
        sodium_dv: null,
        total_carb: null,
        total_carb_dv: null,
        dietary_fiber: null,
        dietary_fiber_dv: null,
        sugar: null,
        sugar_dv: null,
        protein: null,
        protein_dv: null,
        menu_item_ingredients: [],
        menu_item_allergens: []
    };
};

describe("buildDayMenu", () =>{
    it("correctly groups foods by their stations", () =>{
        const meals = [{id: 1, meal_type: "lunch"}];
        
        const items = [
            {
                meal_id: 1, 
                station: "Grill",
                menu_items: makeMockFood(1, "Chicken Breast")
            },
            {
                meal_id: 1, 
                station: "Pizza",
                menu_items: makeMockFood(2, "Pepperoni Pizza")
            },
            {
                meal_id: 1, 
                station: "Grill",
                menu_items: makeMockFood(3, "Beef Patty")
            },
        ];

        const {menus, foods} = buildDayMenu(meals, items, false);

        expect(menus.lunch).toHaveLength(2);
        expect(menus.lunch[0]!.name).toBe("Grill");
        expect(menus.lunch[0]!.foods).toHaveLength(2);
        expect(menus.lunch![1]!.name).toBe("Pizza");
        expect(menus.lunch![1]!.foods).toHaveLength(1);

        expect(menus.lunch[0].foods[0]).toEqual({
            id: "1",
            name: "Chicken Breast",
            dietaryTags: [],
            carbonRating: "A"
        });

        expect(foods["3"]!.name).toBe("Beef Patty");
        expect(foods["3"]!.nutrition.calories).toBe(200);

    })

    it("Correctly seperates different meal types", () =>{
         const meals = [
            {id: 1, meal_type: "lunch"},
            {id: 2, meal_type: "dinner"}
        ];

        const items = [
            {
                meal_id: 1, 
                station: "Grill",
                menu_items: makeMockFood(1, "Chicken Breast")
            },
            {
                meal_id: 2, 
                station: "Pizza",
                menu_items: makeMockFood(2, "Pepperoni Pizza")
            },
            {
                meal_id: 2, 
                station: "Grill",
                menu_items: makeMockFood(3, "Beef Patty")
            },
        ];

        const {menus, foods} = buildDayMenu(meals, items, false);

        expect(menus.lunch![0]!.foods[0]!.name).toBe("Chicken Breast");
        expect(menus.lunch![0]!.name).toBe("Grill")

        expect(menus.dinner![0]!.name).toBe("Pizza")
        expect(menus.dinner![0]!.foods[0]!.name).toBe("Pepperoni Pizza");
        expect(menus.dinner![1]!.foods[0]!.name).toBe("Beef Patty");

    })

    it("Correctly seperates Grab n Go from other meal types", () =>{
        const meals = [
            {id: 1, meal_type: "grab-n-go"}
        ];

        const items = [
            {
                meal_id: 1,
                station: "Grab n'Go Breakfast",
                menu_items: makeMockFood(1, "Egg and Sausage Sandwich")
            },
            {
                meal_id: 1,
                station: "Grab n'Go Hot",
                menu_items: makeMockFood(2, "Chicken wrap")
            },
        ];

        const {menus} = buildDayMenu(meals, items, true);

        expect(menus.breakfast![0]!.foods[0]!.name).toBe("Egg and Sausage Sandwich");
        expect(menus.lunch![0]!.foods[0]!.name).toBe("Chicken wrap");
        expect(menus["grab-n-go"]).toBeUndefined();

        
    });
});

describe("validDate", () =>{
    it("correctly accepts a valid date", () =>{
        expect(validDate("2026-11-04")).toBe(true);
    });

    it("correctly rejects an incorrectly formatted date", () =>{
        expect(validDate("11-04-2026")).toBe(false);
        expect(validDate("11/4/26")).toBe(false);
    });

    it("rejects dates that don't exist", () =>{
        expect(validDate("2026-10-32")).toBe(false);
        expect(validDate("2026-02-29")).toBe(false);
    })
});

describe("locationSlug", () =>{
    it("converts location names into lowercase", () =>{
        expect(locationSlug("Worcester")).toBe("worcester");
        expect(locationSlug("Frank")).toBe("frank");
    })

    it("correctly adds - and handles special characters", () =>{
        expect(locationSlug("Peet's Coffee & Tea")).toBe("peets-coffee-tea");
        expect(locationSlug("Post & Bean")).toBe("post-and-bean");
    })
})


describe("formatFood", () =>{

    const item: MenuItem ={
            ...makeMockFood(1, "Chicken Sandwich"),
            calories: 250,
            protein: "30g",
            protein_dv: "60%",
            total_fat: "10g",
            total_fat_dv: "15%",
            sodium: null,
            cholesterol: null,

            menu_item_ingredients: [
                {ingredients: {name: "Chicken"}},
                {ingredients: {name: "Bread"}},
            ],

            menu_item_allergens: [
                {allergens: {name: "Wheat"}}
            ]
        }
    it("correctly formats nutrition, ingredients, and allergens", () =>{
        

        const food = formatFood(item);

        expect(food.id).toBe("1");
        expect(food.name).toBe("Chicken Sandwich")
        expect(food.carbonRating).toBe("A");

        expect(food.nutrition.calories).toBe(250);

        expect(food.nutrition.protein).toEqual({
            amount: 30,
            unit: "g",
            dailyValue: 60
        });

        expect(food.nutrition.totalFat).toEqual({
            amount: 10,
            unit: "g",
            dailyValue: 15
        });

        expect(food.ingredients).toBe("Chicken, Bread");

        expect(food.allergens).toEqual(["Wheat"]);
    })

    it("correctly handles null values", () =>{
        const food = formatFood(item);
        
        expect(food.nutrition.sodium).toBeNull();
        expect(food.nutrition.cholesterol).toBeNull();
    })
})

describe("is_grabNGo", () => {
    it("correctly identifies grab n go", () =>{
        expect(is_grabNGo("Grab n'Go Breakfast")).toBe("breakfast");
        expect(is_grabNGo("Grab n'Go Hot")).toBe("lunch");
        expect(is_grabNGo("Grab n'Go Cold")).toBe("lunch");


    })
})