import { describe, it, expect } from "vitest";

import {
    cleanString,
    buildIngredients,
    buildAllergies,
    buildNutritionalInfo
} from "../menuData.js";

import {DataNode} from "../../scraper/parser.js";

describe("cleanString", () => {

    it("removes an extra )", () =>{
        expect(cleanString("hello)")).toBe("hello");
    });

    it("doesn't remove a ) if there is a (", () =>{
        expect(cleanString("(hello)")).toBe("(hello)");
    })
    it ("removes an extra ]", () =>{
        expect(cleanString("hello]")).toBe("hello");
    });
    it ("doesn't remove a ] if there is a [", () =>{
        expect(cleanString("[hello]")).toBe("[hello]");
    });
    it ("removes a comma",() =>{
        expect(cleanString("hello,")).toBe("hello");
    })
})

describe("buildIngredients", () => {
    it("builds and cleans ingredient list from DataNode", () =>{
        const ingredientNode = new DataNode();
        ingredientNode.data.set("Ingredient1", "Salt,");
        ingredientNode.data.set("Ingredient2", "Pepper)");
        ingredientNode.data.set("Ingredient3", "[Chicken]");

        const itemNode = new DataNode();
        itemNode.data.set("data-ingredient-list", ingredientNode);

        const ingredients = buildIngredients(itemNode);
        expect(ingredients).toEqual(["Salt", "Pepper", "[Chicken]"]);
    })

})

describe("buildAllergies", () => {
    it("builds and cleans allergy list from DataNode", () =>{

        const allergyNode = new DataNode();
        allergyNode.data.set("Allergy1", "Peanuts,");
        allergyNode.data.set("Allergy2", "Dairy)");
        allergyNode.data.set("Allergy3", "Gluten");
        allergyNode.data.set("Allergy4", "");

        const itemNode = new DataNode();
        itemNode.data.set("data-allergens", allergyNode);

        const allergies = buildAllergies(itemNode);
        expect(allergies).toEqual(["Peanuts", "Dairy", "Gluten"]);
    })
})

describe("buildNutritionalInfo", () => {

    it("builds nutritional info from DataNode", () =>{
        const itemNode = new DataNode();
        itemNode.data.set("data-dish-name", "Pepperoni  Pizza");
        itemNode.data.set("data-calories", "250");
        itemNode.data.set("data-total-fat", "10g");
        itemNode.data.set("data-protein", "5g");

        const menuItem = buildNutritionalInfo(itemNode);

        expect(menuItem.name).toBe("Pepperoni  Pizza");
        expect(menuItem.calories).toBe("250");
        expect(menuItem.total_fat).toBe("10g");
        expect(menuItem.protein).toBe("5g");

    })
})
