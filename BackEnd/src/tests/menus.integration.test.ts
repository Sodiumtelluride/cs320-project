import {describe, it, expect} from "vitest";
import request from "supertest";
import app from "./testApp.js";

describe("GET /api/menus for menu api", () =>{
    
    it("returns the mock data in the test db for woo lunch", async () =>{
        const response = await request(app)
            .get("/api/menus")
            .query({
                location: "worcester",
                date: "2026-10-27",
            });
        expect(response.status).toBe(200);
        expect(response.body.location).toBe("worcester")
        expect(response.body.date).toBe("2026-10-27");

        const lunch = response.body.menus.lunch;

        expect(lunch).toHaveLength(2);
        //Based on Mock Data: stations[0] = grill and stations[1] = pasta
        
        const grill = lunch.find((station:any) => station.name === "Grill");
        expect(grill).toBeDefined();
        expect(grill.foods).toHaveLength(1);

        expect(grill.foods[0]).toEqual({
            id: "1",
            name: "Test Chicken",
            dietaryTags: ["halal", "local"],
            carbonRating: "B"
        });

        const pasta = lunch.find((station:any) => station.name === "Pasta");
        expect(pasta).toBeDefined();
        expect(pasta.foods).toHaveLength(1);
        
        expect(pasta.foods[0]).toEqual({
            id: "2",
            name: "Test Pasta",
            dietaryTags: ["vegetarian"],
            carbonRating: "C"
        });
        expect(response.body.foods["1"].name).toBe("Test Chicken");
        expect(response.body.foods["2"].name).toBe("Test Pasta");

    });

    it("returns a 404 error when required inputs are missing", async () =>{
        const response = await request(app)
            .get("/api/menus")
            .query({
                location: "worcester"
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