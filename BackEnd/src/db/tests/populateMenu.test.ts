import {describe, it, expect, vi, beforeEach} from "vitest";

import{
    cleanDate,
    cleanMealType,
} from "../populateMenu.js";

describe("cleanDate", () =>{
    it("correctly converts dates to the correct format", () =>{
        expect(cleanDate("11/05/2026")).toBe("2026-11-05");
    })
})

describe("cleanMealType", () =>{
    it("converts scraped meal types to the correct format for frontend", () =>{
        expect(cleanMealType("grabngo")).toBe("grab-n-go");
        expect(cleanMealType("late night")).toBe("late-night");
        expect(cleanMealType("daily offerings")).toBe("daily-offerings");
        expect(cleanMealType("daily offering")).toBe("daily-offerings");
    })

    it("correctly keeps formatted meals that are correct", () =>{
        expect(cleanMealType("breakfast")).toBe("breakfast");
        expect(cleanMealType("lunch")).toBe("lunch");
        expect(cleanMealType("dinner")).toBe("dinner");
    })
})

