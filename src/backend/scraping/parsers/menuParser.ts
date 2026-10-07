import { parse } from 'node-html-parser';
import { Parser, DataNode } from '../parser.ts';

export class MenuParser extends Parser{
    constructor(html : string){
        super(html);
    }

    menuItemAttributes = [
        "data-dish-name",
        "data-healthfulness",
        "data-carbon-list",
        "data-ingredient-list",
        "data-allergens",
        "data-recipe-webcode",
        "data-clean-diet-str",
        "data-serving-size",
        "data-calories",
        "data-calories-from-fat",
        "data-total-fat",
        "data-total-fat-dv",
        "data-sat-fat",
        "data-sat-fat-dv",
        "data-trans-fat",
        "data-cholesterol",
        "data-cholesterol_dv",
        "data-sodium",
        "data-sodium-dv",
        "data-total-carb",
        "data-total-carb-dv",
        "data-dietary-fiber",
        "data-dietary-fiber-dv",
        "data-sugars",
        "data-sugars-dv",
        "data-protein",
        "data-protein-dv",
    ];

    menuNames = [
        // "breakfast_menu",
        "lunch_menu",
        // "dinner_menu",
    ];
    
    getData() {
        const diningHall = new DataNode();
        
        for(const menuName of this.menuNames) {
            const menu = new DataNode();
            diningHall.data.set(menuName, menu);
            this.generateMenu(menu, menuName);
        }

        return diningHall;
    }

    generateMenu(menu: DataNode, menuName: string) {
        // Get the menu div
        const menuDiv = this.root.querySelector('#' + menuName);

        if(menuDiv === null) // Make sure it exists
            throw new Error(`Page doesn't contain a valid menu.`);

        const menuList = menuDiv.querySelector('#content_text');

        if(menuList === null) // Every menu has a context menu div
            throw new Error(`Error grabbing menu`);

        // Each child is classed either as:
        // h2 : menu_category_name
        // li: lightbox-nutrition
        // keep track of current category
        let currCategoryID = "";
        let currCategory = undefined;
        for(const child of menuList.children) {
            // Handle menu categories
            if(child.classNames.includes("menu_category_name")) {
                currCategoryID = child.text;
                if(menu && typeof menu !== "string") {
                    currCategory = new DataNode();
                    menu.data.set(currCategoryID, currCategory);
                }
            }
            // Handle food items
            else {
                for(const element of child.children) {
                    // Add meal to menu
                    const itemName = element.getAttribute(this.menuItemAttributes[0]);
                    if(currCategory && itemName) {
                        const currMeal = new DataNode();
                        currCategory.data.set(itemName, currMeal)

                        // Add all attributes to meal item
                        for(const attribute of this.menuItemAttributes) {
                            if(attribute === "data-ingredient-list"){
                                const ingredients = element.getAttribute(attribute)?.split(", ");
                                const ingredientNode = new DataNode();
                                if(ingredients !== undefined){
                                    let ingredientN = 0;
                                    for(const ingredient of ingredients){
                                        ingredientN ++;
                                        ingredientNode.data.set("ingredient " + ingredientN,ingredient);
                                    }
                                }
                                currMeal.data.set(attribute, ingredientNode);
                            } else {
                                const attributeValue = element.getAttribute(attribute);
                                currMeal.data.set(attribute, attributeValue ? attributeValue : "");
                            }
                        }
                    }
                }
            }
        }
    }
}