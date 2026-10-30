import type { Request, Response } from "express-serve-static-core";
import type { MenuQueryDto } from "../dtos/MenuQuery.dto.js";
import { cleanDietaryTags } from "../utils/menuUtils.js";
import { supabase } from "../db/supabase.js";

type MealResponse = {
    id: string;
    name: string;
    dietaryTags: string[];
    carbonRating: "A"| "B"| "C"| "D"| "E"| null;
};

type MenuStationResponse = {
    id: string;
    name: string;
    foods: MealResponse[];
};

type MenuResponse = {
    diningHallId: string;
    date: string;
    meal: string;
    stations: MenuStationResponse[];
    updatedAt: string|null;
};

type MealItemQueryResult = {
  station : string;
  menu_items: {
    id: number;
    name: string;
    clean_diet: string|null;
    carbon_list: string|null;
  };
};

async function getLocation(diningHallId: string){
    const {data: location, error: locationError} = await supabase
        .from("locations")
        .select("id, name")
        .eq("name", diningHallId.toLowerCase())
        .maybeSingle();
    
    if(locationError){
        throw locationError;
    }
    return location;
    
};

export async function getMeals(locationId: number, date:string, meal:string){
    const {data, error} = await supabase
        .from("meals")
        .select("id, meal_type, date")
        .eq("location_id", locationId)
        .eq("date", date)
        .eq("meal_type", meal)
        .maybeSingle();
    
    if(error){
        throw error;
    }
    return data;
};

async function getMealItems(mealId: number){
    const {data, error} = await supabase
        .from("meal_items")
        .select(`
            station,
            menu_items(
                id,
                name,
                clean_diet,
                carbon_list
            )
        `)
        .eq("meal_id", mealId);
    
    if(error) {throw error};

    return data as unknown as MealItemQueryResult[];
}

export function buildStation(mealItems: MealItemQueryResult[]){
    const stationMap = new Map<string, MenuStationResponse>();

    for(const row of mealItems){
      const item = row.menu_items;

      const stationName = row.station;

      if(!stationMap.has(stationName)){
        stationMap.set(stationName, {
          id: stationName,
          name: stationName,
          foods: []
        });
      }

      stationMap.get(stationName)!.foods.push({
        id: String(item.id),
        name: item.name,
        dietaryTags: cleanDietaryTags(item.clean_diet),
        carbonRating: item.carbon_list as "A"| "B"| "C"| "D"| "E"| null
      });
    }
    return Array.from(stationMap.values());
}

export async function getMenu(
    request: Request<{},{},{}, MenuQueryDto>,
    response: Response<MenuResponse|{ error: string}>
){
    const{diningHallId, date, meal} = request.query;

    if(!diningHallId||!date||!meal){
        return response.status(404).send({
            error: "diningHallID, data, or meal not sent"
        });
    }

    const location = await getLocation(diningHallId);

    if(!location){
        return response.status(404).send({
            error: "no location found"
        });
    }
    const meals = await getMeals(location.id, date, meal);

    if(!meals){
        return response.status(404).send({
            error: "Menu not found"
        });
    }

    const mealItems = await getMealItems(meals.id);

    if(mealItems.length===0){
        return response.status(404).send({
            error: "No meal info found"
        });
    }

    const stations = buildStation(mealItems);
    

    return response.status(200).send({
      diningHallId,
      date,
      meal,
      stations,
      updatedAt: null,
    });

}


