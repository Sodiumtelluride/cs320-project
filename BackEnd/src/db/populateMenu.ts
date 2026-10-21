import {Scraper} from "../scraper/scraper.js";
import {DataNode} from "../scraper/parser.js";
import {AllLocationParser} from "../scraper/parsers/allLocationParser.js";
import {supabase} from "./client.js";

import {
    insertMenuData,
    insertIngredients,
    insertAllergies,
    insertMeals
} from "./menuData.js";

export async function populateMenu(){
    const scraper = new Scraper();
    const html = await scraper.runScraper("locations-menus/");
    const parser = new AllLocationParser(html);
    const allLocation = await parser.getData();

    const diningHalls = ["berkshire", "worcester", "franklin", "hampshire"];
    for(const diningHallName of diningHalls){
        const diningNode = allLocation.data.get(diningHallName) as DataNode;

        const {data : diningHall} = await supabase
            .from("dining_halls")
            .select("id")
            .eq(
                "name",
                diningHallName.charAt(0).toUpperCase() + diningHallName.slice(1)
            )
            .single();
        
        const diningHallId = diningHall!.id;

        const menusNode = diningNode.data.get("Menus") as DataNode;

        for(const [date, dateNode] of menusNode.data){

            for(const [mealType, mealNodeValue] of (dateNode as DataNode).data){

                const mealNode = mealNodeValue as DataNode;

                for(const [, stationNodeValue] of mealNode.data){

                    const stationNode = stationNodeValue as DataNode;
                

                    for(const [itemName, itemNodeValue] of stationNode.data){
                        const itemNode = itemNodeValue as DataNode;

                        itemNode.data.set("data-dish-name", itemName);

                        const menuData = await insertMenuData(itemNode)
                        const menuItemId = menuData![0]!.id;

                        await insertIngredients(itemNode, menuItemId);
                        await insertAllergies(itemNode, menuItemId);
                        await insertMeals(diningHallId, date, mealType, menuItemId);
                    }
                }
            }
        }
    }
}