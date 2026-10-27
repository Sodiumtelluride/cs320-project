import { DataNode } from "../scraper/parser.js";
import { AllLocationParser } from "../scraper/parsers/allLocationParser.js";
import { Scraper } from "../scraper/scraper.js";
import { supabase } from "./client.js";

import {
  insertAllergies,
  insertIngredients,
  insertMealItems,
  insertMeals,
  insertMenuData,
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

export async function populateMenu() {
  const scraper = new Scraper();
  const html = await scraper.runScraper("locations-menus/");
  const parser = new AllLocationParser(html);
  const allLocation = await parser.getData();

  for (const [locationName, locationValue] of allLocation.data) {
    const locationNode = locationValue as DataNode;

    const menusNode = locationNode.data.get("Menus") as DataNode;
    if (menusNode === undefined) continue;

    const { data: location } = await supabase
      .from("locations")
      .select("id")
      .eq("name", locationName)
      .single();

    const locationId = location!.id;

    for (const [date, dateNode] of menusNode.data) {
      for (const [mealType, mealNodeValue] of (dateNode as DataNode).data) {
        const mealNode = mealNodeValue as DataNode;

        const mealId = await insertMeals(locationId, date, cleanMealType(mealType));

        for (const [stationName, stationNodeValue] of mealNode.data) {
          const stationNode = stationNodeValue as DataNode;

          const items = [...stationNode.data];
          const batchSize = 2;

          for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);

            await Promise.all(
                batch.map(async ([itemName, itemNodeValue]) => {
                    const itemNode = itemNodeValue as DataNode;
                    itemNode.data.set("data-dish-name", itemName);

                    const menuData = await insertMenuData(itemNode);
                    const menuItemId = menuData![0]!.id;

                    await insertMealItems(mealId, menuItemId, stationName);

                    await insertIngredients(itemNode, menuItemId);
                    await insertAllergies(itemNode, menuItemId);
                }
              ),
            );
          }
        }
      }
    }
  }
}
