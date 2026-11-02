import {describe, it, expect} from "vitest";
import {buildStation} from "../menus.js"

describe("buildStations", () =>{
    it("correctly groups foods by their stations", () =>{
        const mealItems = [
            {
                station: "Grill",
                menu_items: {
                    id: 1, 
                    name: "Chicken Breast",
                    clean_diet: "Local",
                    carbon_list: "A"
                }
            },
            {
                station: "Grill",
                menu_items: {
                    id: 2,
                    name: "Black Bean Patty",
                    clean_diet: "Vegetarian",
                    carbon_list: "B"
                }
            },
            {
                station: "Pizza",
                menu_items: {
                    id: 3,
                    name: "Pepperoni Pizza",
                    clean_diet: null,
                    carbon_list: "C"
                }
            }

        ];

        const stations = buildStation(mealItems);

        expect(stations).toHaveLength(2);
        expect(stations[0]!.name).toBe("Grill");
        expect(stations[0]!.foods).toHaveLength(2);

        expect(stations[0]!.foods[0]).toEqual({
            id: "1",
            name: "Chicken Breast",
            dietaryTags: ["local"],
            carbonRating: "A"
        });

        expect(stations[0]!.foods[1]).toEqual({
            id: "2",
            name: "Black Bean Patty",
            dietaryTags: ["vegetarian"],
            carbonRating: "B"
        });
        
        expect(stations[1]!.foods[0]).toEqual({
            id: "3",
            name: "Pepperoni Pizza",
            dietaryTags: [],
            carbonRating: "C"
        });

    })
})