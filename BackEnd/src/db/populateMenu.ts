import {Scraper} from "../scraper/scraper.js";
import {DataNode} from "../scraper/parser.js";
import {AllLocationParser} from "../scraper/parsers/allLocationParser.js";
import {supabase} from "./supabase.js";

import {
    insertMenuData,
    insertIngredients,
    insertAllergies,
    insertMeals
} from "./menuData.js";

function cleanMealType(meal_type:string){
    if(meal_type === "grabngo"){
        return "grab-n-go";
    }
    if(meal_type === "late night"){
        return "late-night";
    }
    return meal_type;
}

export async function populateMenu(){
    const scraper = new Scraper();
    const html = await scraper.runScraper("locations-menus/");
    const parser = new AllLocationParser(html);
    const allLocation = await parser.getData();

    for(const [locationName, locationValue] of allLocation.data){
        const locationNode = locationValue as DataNode;

        const menusNode = locationNode.data.get("Menus") as DataNode;
        if(menusNode === undefined) continue;


        const {data : location} = await supabase
            .from("locations")
            .select("id")
            .eq("name",locationName)
            .single();
        
        const locationId = location!.id;


        for(const [date, dateNode] of menusNode.data){

            for(const [mealType, mealNodeValue] of (dateNode as DataNode).data){

                const mealNode = mealNodeValue as DataNode;

                for(const [stationName, stationNodeValue] of mealNode.data){

                    const stationNode = stationNodeValue as DataNode;
                
                    for(const [itemName, itemNodeValue] of stationNode.data){

                        const itemNode = itemNodeValue as DataNode;

                        itemNode.data.set("data-dish-name", itemName);

                        const menuData = await insertMenuData(itemNode)
                        const menuItemId = menuData![0]!.id;

                        await insertIngredients(itemNode, menuItemId);
                        await insertAllergies(itemNode, menuItemId);
                        await insertMeals(locationId, date, cleanMealType(mealType), menuItemId, stationName);
                    }
                }
            }
        }
    }
}