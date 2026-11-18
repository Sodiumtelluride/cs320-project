import { describe, it, expect, vi, beforeAll} from "vitest"

vi.mock("../db/supabase.js", () => ({ supabase : { from : vi.fn(),}}));

import { Searcher, SearchResult } from "./searcher";
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

    it("Should find misspelling matches at top", async () =>{
        const searcher = Searcher.getInstance();

        const result1 = (await searcher.advancedSearch("chficken sandich"))[0];
        expect(result1.mealName).toEqual("chicken sandwich");

        const result2 = (await searcher.advancedSearch("trkey lgs"))[0];
        expect(result2.mealName).toEqual("turkey legs");

        const result3 = (await searcher.advancedSearch("ice cveam sandich"))[0];
        expect(result3.mealName).toEqual("ice cream sandwich");
    });

    it("should find close matches with partial inputs", async () => {
        const searcher = Searcher.getInstance();

        const result1 = (await searcher.advancedSearch("ice cream"))[0];
        expect(result1.mealName).toEqual("ice cream sandwich");
    });

    it("Should find exact matches to have equal name at top for partial search", async ()=>{
        const searcher = Searcher.getInstance();

        const result1 = (await searcher.partialInputSearch("chicken sandwich"))[0];
        expect(result1.mealName).toEqual("chicken sandwich");

        const result2 = (await searcher.partialInputSearch("turkey legs"))[0];
        expect(result2.mealName).toEqual("turkey legs");

        const result3 = (await searcher.partialInputSearch("ice cream sandwich"))[0];
        expect(result3.mealName).toEqual("ice cream sandwich");
    });

    it("Should find misspelling matches at top for partial search", async () =>{
        const searcher = Searcher.getInstance();

        const result1 = (await searcher.partialInputSearch("chficken sandich"))[0];
        expect(result1.mealName).toEqual("chicken sandwich");

        const result2 = (await searcher.partialInputSearch("trkey lgs"))[0];
        expect(result2.mealName).toEqual("turkey legs");

        const result3 = (await searcher.partialInputSearch("ice cveam sandich"))[0];
        expect(result3.mealName).toEqual("ice cream sandwich");
    });

    it("should find close matches with partial inputs for partial search", async () => {
        const searcher = Searcher.getInstance();

        const result1 = (await searcher.partialInputSearch("ice cream"))[0];
        expect(result1.mealName).toEqual("ice cream sandwich");
    });

    it("should not find any duplicate matches", async () => {
        const searcher = Searcher.getInstance();

        const set = new Set<string>();
        const result = await searcher.advancedSearch("easter egg");

        for(const item of result){
            expect(set.has(item.mealName)).toBeFalsy();
            set.add(item.mealName);
        }
    });

    it("should not find any duplicate matches for partial searches", async () => {
        const searcher = Searcher.getInstance();

        const set = new Set<string>();
        const result = await searcher.partialInputSearch("easter egg");

        for(const item of result){
            expect(set.has(item.mealName)).toBeFalsy();
            set.add(item.mealName);
        }
    });

    it("should filter out allergens in filter", async () => {
        const searcher = Searcher.getInstance();

        const set = new Set<string>();
        const result = await searcher.partialInputSearch("easter egg", ["Milk"]);

        for(const item of result){
            set.add(item.mealName);
        }
        expect(set.has("ice cream sandwich")).toBeFalsy();
    });

    it("should filter out allergens in filter for partial input", async () => {
        const searcher = Searcher.getInstance();

        const set = new Set<string>();
        const result = await searcher.partialInputSearch("easter egg", ["Wheat"]);

        for(const item of result){
            set.add(item.mealName);
        }
        expect(set.has("chicken sandwich")).toBeFalsy();
    });

    it("should enforce clean diet", async () => {
        const searcher = Searcher.getInstance();

        const set = new Set<string>();
        const result = await searcher.partialInputSearch("easter egg", ["Vegetarian"]);

        expect(result.length).toBe(1);
        expect(result[0].mealName === "veggie pork shoulder")
    })

    it("should prefix match well", async ()=>{
        const searcher = Searcher.getInstance();
        expect((await searcher.partialInputSearch("i"))[0].mealName).toEqual("ice cream sandwich");
        expect((await searcher.partialInputSearch("t"))[0].mealName).toEqual("turkey legs");
        expect((await searcher.partialInputSearch("v"))[0].mealName).toEqual("veggie pork shoulder");
        expect((await searcher.partialInputSearch("ve"))[0].mealName).toEqual("veggie pork shoulder");
        expect((await searcher.partialInputSearch("veg"))[0].mealName).toEqual("veggie pork shoulder");
    })

});