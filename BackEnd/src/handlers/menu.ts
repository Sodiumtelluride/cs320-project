import type { Request, Response } from "express-serve-static-core";
import { supabase } from "../db/client.js";

export async function getMenu(request: Request, response: Response) {
    /*
        Takes in paramters:
            location - ex: berk, worcester etc
            type - breakfast, lunch, dinner etc
            day - date of menu
    */

    // Convert location to location ID
   const {data : location} = await supabase
      .from("locations")
      .select("id")
      .eq("name",request.params.location)
      .single();
    const locationID = location!.id;
   
    // Query for meals
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .eq("location_id", locationID)
      .eq("meal_type", request.params.type)
      .eq("day", request.params.day)

    if (error) {
      console.error(error);
      response.status(500).json({ error: "database error" });
    }
    if (!data) {
      response.status(404).json({ error: "invalid location, menu, or day" });
    }

    response.json(data);
}