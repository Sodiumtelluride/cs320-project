import { parse } from 'node-html-parser';
import { Parser, DataNode } from '../parser';

export class MenuParser extends Parser{
    constructor(html : string){
        super(html);
    }

    
    getData(){
        const diningHall : DataNode = new DataNode();
        
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

        return diningHall;  
    }
}