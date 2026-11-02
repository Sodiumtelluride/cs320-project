import {describe, it, expect} from "vitest";
import request from "supertest";
import app from "./testApp.js";

describe("GET /api/menu for menu api", () =>{
    
    it("returns the mock data in the test db for woo lunch", async () =>{
        const response = await request(app)
            .get("/api/menus")
            .query({
                diningHallId: "worcester",
                date: "2026-10-27",
                meal: "lunch"
            });
        expect(response.status).toBe(200);
        expect(response.body.diningHallId).toBe("worcester")
        expect(response.body.date).toBe("2026-10-27");
        expect(response.body.meal).toBe("lunch");

        expect(response.body.stations).toHaveLength(2);

        //Based on Mock Data: stations[0] = grill and stations[1] = pasta

        expect(response.body.stations[0].name).toBe("Grill");
        const grill = response.body.stations[0];
        expect(grill.foods).toHaveLength(1);

        expect(grill.foods[0]).toEqual({
            id: "1",
            name: "Test Chicken",
            dietaryTags: ["halal", "local"],
            carbonRating: "B"
        });

        expect(response.body.stations[1].name).toBe("Pasta")
        const pasta = response.body.stations[1];
        expect(pasta.foods).toHaveLength(1);
        
        expect(pasta.foods[0]).toEqual({
            id: "2",
            name: "Test Pasta",
            dietaryTags: ["vegetarian"],
            carbonRating: "C"
        });
    });

    it("returns a 404 error when required inputs are missing", async () =>{
        const response = await request(app)
            .get("/api/menus")
            .query({
                diningHallId: "worcester"
            });
        
        expect(response.status).toBe(404);
    });

    it("returns a 404 error when location doesn't exist", async () =>{
        const response = await request(app)
            .get("/api/menus")
            .query({
                diningHallId: "fake-location",
                date: "2026-10-27",
                meal: "lunch"
            });

        expect(response.status).toBe(404)
    })
})