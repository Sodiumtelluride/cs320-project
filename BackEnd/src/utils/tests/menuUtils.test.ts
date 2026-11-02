import { describe, it, expect} from "vitest";
import { cleanDietaryTags} from "../menuUtils.js";

describe("cleanDietaryTags", () =>{
    
    it("returns and empty array if dietary tags are null", () =>{
        expect(cleanDietaryTags(null)).toEqual([]);
    });

    it("maps multiple tags into an array", () =>{
        expect(cleanDietaryTags("local, halal")).toEqual(["local", "halal"]);
    });

    it("lowercases and removes invalid dietary tag options", () =>{
        expect(cleanDietaryTags("Local, Vegetarian, XYZ")).toEqual(["local", "vegetarian"]);
    });

    it("correctly converts Plant Based to plant-based", () =>{
        expect(cleanDietaryTags("Plant Based")).toEqual(["plant-based"]);
    });

    it("removes duplicate dietary tags", () =>{
        expect(cleanDietaryTags("Local, Vegetarian, Halal, Local")).toEqual(["local", "vegetarian", "halal"]);
    });

    it("trims spaces around tags", () =>{
        expect(cleanDietaryTags("  local, Halal ")).toEqual(["local", "halal"])
    })
})