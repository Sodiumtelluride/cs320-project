import { describe, it, expect, vi, beforeAll} from "vitest"

vi.mock("../db/supabase.js", () => ({ supabase : { from : vi.fn(),}}));

import { Searcher } from "./searcher";
import { supabase } from "../db/supabase";

const fakeDB : Record<string, any[]> = {
    menu_items : [
        {id: 1, name : "chicken sandwich", clean_diet : "None"},
        {id: 2, name : "chicken kebab", clean_diet : "None"},
        {id: 3, name : "veggie pork shoulder", clean_diet : "Vegetarian"},
        {id: 4, name : "turkey legs", clean_diet : "None"},
        {id: 5, name : "ice cream sandwich", clean_diet : "None"}
    ],
    ingredients : [
        {id: 1, name : "chicken"},
        {id: 2, name : "bread"},
        {id: 3, name : "fake pork"},
        {id: 4, name : "onion"},
        {id: 5, name : "milk"},
        {id: 6, name : "turkey"}
    ],
    menu_item_ingredients : [
        {menu_item_id: 1, ingredient_id: 1},
        {menu_item_id: 1, ingredient_id: 2},
        {menu_item_id: 2, ingredient_id: 1},
        {menu_item_id: 2, ingredient_id: 4},
        {menu_item_id: 3, ingredient_id: 3},
        {menu_item_id: 3, ingredient_id: 4},
        {menu_item_id: 4, ingredient_id: 6},
        {menu_item_id: 5, ingredient_id: 5}
    ],
    allergens : [
        {id: 1, name: "Milk"},
        {id: 2, name: "Wheat"},
        {id: 3, name: "Gluten"}
    ],
    menu_item_allergens: [
        {menu_item_id: 1, allergen_id: 2},
        {menu_item_id: 1, allergen_id: 3},
        {menu_item_id: 5, allergen_id: 1},
    ]
}

describe("Searcher maintains data correctness, filters, and picks obvious best results", ()=>{

    beforeAll(()=>{
        (Searcher as any).instance = null;
        vi.clearAllMocks();
        (supabase.from as any).mockImplementation((tableName: string)=>{
            return {
                select : ()=>({
                    limit : async () => ({
                        data : fakeDB[tableName] ?? [],
                        error : null,
                    })
                })
            }
        });
    });

    it("Should find exact matches to have equal name at top", async ()=>{
        const searcher = Searcher.getInstance();

        const result1 = (await searcher.advancedSearch("chicken sandwich"))[0];
        expect(result1.mealName).toEqual("chicken sandwich");

        const result2 = (await searcher.advancedSearch("turkey legs"))[0];
        expect(result2.mealName).toEqual("turkey legs");

        const result3 = (await searcher.advancedSearch("ice cream sandwich"))[0];
        expect(result3.mealName).toEqual("ice cream sandwich");
    });

});