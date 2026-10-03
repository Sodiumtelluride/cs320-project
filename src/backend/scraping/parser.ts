import { parse } from 'node-html-parser';

/* INSANE
    Chat so this is kinda fucked up
    BERKSHIRE DOESNT HAVE A BREAKFAST MENU
    Need to keep track of what locations have what items
*/

const menuItemAttributes = [
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
    "data-dish-name"
];


export class Parser {

    // https://www.npmjs.com/package/node-html-parser
    // Tutorial for parser lib
    public root;
    constructor(html: string) {
        this.root = parse(html);
    }

    getMenu() {
        // Get the lunch menu div
        const menuDiv = this.root.querySelector('#lunch_menu');

        if(menuDiv === null) // Make sure it exists
            throw new Error(`Page doesn't contain a valid menu.`);

        const menuList = menuDiv.querySelector('#content_text');

        if(menuList === null) // Every menu has a context menu div
            throw new Error(`Error grabbing menu`);

        // Each child is classed either as:
        // h2 : menu_category_name
        // li: lightbox-nutrition
        for(const child of menuList.children) {
            // Handle menu categories
            if(child.classNames.includes("menu_category_name")) {
                //console.log(child.text);
            }
            // Handle food items
            else {
                for(const element of child.children) {

                    // element.getAttribute("");
                }
            }
        }
    }
}