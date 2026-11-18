import {describe, it, expect} from "vitest";

import{
    cleanDate,
    cleanMealType,
    findDate
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

describe("findDate", () =>{ 
    const defaultDate = "2026-11-18";
    const sevenDate = "2026-11-17";
    const sixDate = "2026-11-16";

    it("correctly uses a default date for dining halls", () => { 
        expect(findDate(defaultDate, sevenDate, sixDate, "Worcester")).toBe(defaultDate);
        expect(findDate(defaultDate, sevenDate, sixDate, "Berkshire")).toBe(defaultDate);
    })

    it("correctly uses a seven day date for seve day locations", () =>{
        expect(findDate(defaultDate, sevenDate, sixDate, "Terrace")).toBe(sevenDate);
        expect(findDate(defaultDate, sevenDate, sixDate, "Procrastination Station")).toBe(sevenDate);
    })

    it("correctly uses a six day date for six day locations", () =>{
        expect(findDate(defaultDate, sevenDate, sixDate, "Snack Overflow")).toBe(sixDate);
        expect(findDate(defaultDate, sevenDate, sixDate, "The Hub")).toBe(sixDate);
    })
})

