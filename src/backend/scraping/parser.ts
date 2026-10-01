import { parse } from 'node-html-parser';

/* INSANE
    Chat so this is kinda fucked up
    BERKSHIRE DOESNT HAVE A BREAKFAST MENU
    Need to keep track of what locations have what items
*/

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

        // Then get this 'context_text' div
        // Every menu has one
        if(menuDiv !== null) {
            const menuList = menuDiv.querySelector('#content_text');

            if(menuList !== null) {
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
                        // Food items have 
                        for(const element of child.children) {
                            // element.text -> meal name
                            // element.getAttribute("data-ingredient-list")
                        }
                    }
                }
            }
        }
        
    }
}