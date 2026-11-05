import {Scraper} from "../scraper/scraper.js";
import {DataNode} from "../scraper/parser.js";
import {AllLocationParser} from "../scraper/parsers/allLocationParser.js";
import {supabase} from "./supabase.js";

import {
    insertMenuData,
    insertMeals,
    insertFoodInfoBatch,
    insertMealItems,
    buildNutritionalInfo
} from "./menuData.js";

type populateMeal = {
    date: string;
    mealType: string;
    mealNode: DataNode;
};
type itemJob = {
    itemNode: DataNode;
    stationName: string;
}

function cleanDate(date: string){
    const cleaned = new Date(date);
    return cleaned.toISOString().split("T")[0]!;

}
function cleanMealType(meal_type:string){
    if(meal_type === "grabngo"){
        return "grab-n-go";
    }
    if(meal_type === "late night"){
        return "late-night";
    }
    if(meal_type === "daily offerings" || meal_type === "daily offering"){
        return "daily-offerings";
    }
    return meal_type;
}

async function getLocationId(locationName: string){
    const {data:location, error} = await supabase 
        .from("locations")
        .select("id")
        .eq("name", locationName)
        .single();
    
    if(error || !location){
        return null
    }
    return location.id;
}

export async function populateMenuLocations(locationId: number, menusNode: DataNode){
    const mealJobs : populateMeal[] = [];

    
    for(const [date, dateNodeValue] of menusNode.data){

        if(!(dateNodeValue instanceof DataNode)){
            continue;
        }
        const dateNode = dateNodeValue

        for(const [mealType, mealNodeValue] of (dateNode as DataNode).data){
            if(!(mealNodeValue instanceof DataNode)){
                continue;
            }
            mealJobs.push({
                date: cleanDate(date),
                mealType: cleanMealType(mealType),
                mealNode: mealNodeValue
            });
        }
    }

    const meals = mealJobs.map(job => ({
        location_id: locationId,
        date: job.date,
        meal_type: job.mealType
    }));

    const insertedMeals = await insertMeals(meals);

    const mealIdMap = new Map<string, number>();

    for(const meal of insertedMeals){
        const key = `${meal.date}-${meal.meal_type}`;
        mealIdMap.set(key, meal.id);
    }

    for(const job of mealJobs){
        const key = `${job.date}-${job.mealType}`;
        const mealId = mealIdMap.get(key);

        if(mealId === undefined){
            continue;
        }

        const itemJobs: itemJob[] = [];

        for(const [stationName, stationNodeValue] of job.mealNode.data){

            if(!(stationNodeValue instanceof DataNode)){
                continue;
            }
            const stationNode = stationNodeValue as DataNode;
        
            for(const [itemName, itemNodeValue] of stationNode.data){

                if(!(itemNodeValue instanceof DataNode)){
                    continue;
                }

                const itemNode = itemNodeValue;

                itemNode.data.set("data-dish-name", itemName);

                itemJobs.push({itemNode, stationName});
            }
            
        }
        const menuRows = itemJobs.map(item => buildNutritionalInfo(item.itemNode));

        const insertedItems = await insertMenuData(menuRows);

        const mealItems = [];
        const foodInfoJob = [];

        for(let i = 0; i< insertedItems.length; i++){
            const menuId = insertedItems[i].id;
            const itemJob = itemJobs[i]!;

            foodInfoJob.push({ 
                menuItemId: menuId,
                itemNode: itemJob.itemNode
        });

            mealItems.push({
                meal_id: mealId,
                menu_item_id: menuId,
                station: itemJob.stationName
            });
        }
        await Promise.all([
            insertFoodInfoBatch(foodInfoJob),
            insertMealItems(mealItems)
        ]);
    }
}

export async function populateDiningHalls(locationName: string, locationNode: DataNode){

    const menusValue = locationNode.data.get("Menus");

    if(!(menusValue instanceof DataNode)){
        return;
    }

    const locationId = await getLocationId(locationName);

    if(locationId === null){
        return;
    };

    await populateMenuLocations(locationId, menusValue);
}

async function populateLocationGroup(groupNode: DataNode){
    for(const [locationName, locationValue] of groupNode.data){
        if(!(locationValue instanceof DataNode)){
            continue;
        }
        const locationNode = locationValue;

        const menusValue = locationNode.data.get("menus");

        if(!(menusValue instanceof DataNode)){
            continue;
        }
    
        const locationId = await getLocationId(locationName);

        if(locationId === null){
            continue;
        }

        await populateMenuLocations(locationId, menusValue);
    }
}

export async function populateMenu(){
    const scraper = new Scraper();
    const html = await scraper.runScraper("locations-menus/");
    const parser = new AllLocationParser(html);
    const allLocation = await parser.getData();

    const location_groups = new Set([
        "campus-center",
        "campus",
        "student-businesses",
        "around-campus"
    ]);

    for(const [name, value] of allLocation.data){
        if(!(value instanceof DataNode)){
            continue;
        }

        if(name === "page_content"){
            continue;
        }

        if(location_groups.has(name)){
            await populateLocationGroup(value);
            continue;
        }
        await populateDiningHalls(name, value);
    }
}