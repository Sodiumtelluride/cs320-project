import {describe, it, expect, beforeAll, afterAll} from "vitest";
import {DataNode} from "../../scraper/parser.js";
import {supabase} from "../supabase.js";
import {populateMenuLocations} from "../populateMenu.js";

describe("populateMenuLocations", () =>{
    let locationId: number;
    let locationId2: number;
    let menusNode: DataNode;
    let foodOne: string;
    let foodTwo: string;

    beforeAll(async () =>{
        foodOne = "Test Chicken";
        foodTwo = "Test Beef";

        const {data: locations, error} = await supabase
            .from("locations")
            .insert([
                {name: "Test Location", location_type: "dining_hall"},
                {name: "Test Location 2", location_type: "dining_hall"}
            ])
            .select("id");

        if(error){
            throw error;
        }

        locationId = locations[0]!.id;
        locationId2 = locations[1]!.id;

        menusNode = new DataNode();
        
        const chicken = new DataNode();
        chicken.data.set("data-calories", "500");
        chicken.data.set("data-serving-size", "1 each");
        chicken.data.set("data-protein", "30g");

        const grill = new DataNode();
        grill.data.set(foodOne, chicken);

        const lunch = new DataNode();
        lunch.data.set("Grill", grill);

        const november18 = new DataNode();
        november18.data.set("lunch", lunch);

        menusNode.data.set("11/18/2026", november18);

        const beef = new DataNode();
        beef.data.set("data-calories", "600");
        beef.data.set("data-serving-size", "1 each");
        beef.data.set("data-protein", "40g");

        const grill2 = new DataNode();
        grill2.data.set(foodTwo, beef);

        const lunch2 = new DataNode();
        lunch2.data.set("Grill", grill2);

        const november19 = new DataNode();
        november19.data.set("lunch", lunch2);

        menusNode.data.set("11/19/2026", november19);
    })

    it("correctly only populates the requested date", async () =>{
        await populateMenuLocations(locationId, menusNode, "2026-11-18");

        const {data: meals, error} = await supabase
            .from("meals")
            .select("date, meal_type")
            .eq("location_id", locationId);

        if(error){
            throw error;
        }
        
        expect(meals).toHaveLength(1);
        expect(meals[0]!.date).toBe("2026-11-18");
        expect(meals[0]!.meal_type).toBe("lunch");
    })

    it("populates all dates when no target date is given", async () =>{
        await populateMenuLocations(locationId2, menusNode);

        const {data: meals, error} = await supabase
            .from("meals")
            .select("date")
            .eq("location_id", locationId2);

        if(error){
            throw error;
        }
        
        expect(meals).toHaveLength(2);
        expect(meals[0]!.date).toBe("2026-11-18");
        expect(meals[1]!.date).toBe("2026-11-19");
    })

    afterAll(async () =>{
        const {data: meals, error} = await supabase
            .from("meals")
            .select("id")
            .in("location_id", [locationId, locationId2]);
        
        if(error){
            throw error;
        }

        const mealIds = meals.map(meal => meal.id);

        if(mealIds.length > 0){
            await supabase
                .from("meal_items")
                .delete()
                .in("meal_id", mealIds);
            
            await supabase
                .from("meals")
                .delete()
                .in("id", mealIds);
        }

        await supabase
            .from("locations")
            .delete()
            .in("id", [locationId, locationId2]);
    })
})