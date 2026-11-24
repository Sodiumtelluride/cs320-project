import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {supabaseAdmin as db} from "../db/supabase.js";

describe("favorite menu items", () =>{
    const name = "Test Pizza";
    let userId: string;
    let menuItemId: string;

    beforeAll(async () => {
        const user = await db
            .from("users")
            .insert({username: `test-favorite-starred-menu-items`})
            .select("user_id")
            .single();
        
        if(user.error){
            throw user.error
        }

        userId = user.data.user_id;

        const item = await db
            .from("menu_items")
            .insert({name})
            .select("id::text")
            .single();
        
        if(item.error){
            throw item.error;
        }

        menuItemId = item.data.id;

        const {error} = await db  
            .from("favorite_foods")
            .insert({user_id: userId, food_name: name})

        if(error){
            throw error;
        }
    })

    afterAll(async () =>{
        if(userId){
            await db.from("favorite_foods").delete().eq("user_id", userId);
            await db.from("users").delete().eq("user_id", userId);
        }

        if(menuItemId){
            await db.from("menu_items").delete().eq("id", menuItemId)
        }
    })

    it("correclty adds starred food and deletes unstarred food", async () => {
        const args = {
            p_user_id: userId,
            p_caller_id: userId,
            p_menu_item_id: menuItemId,
        }
        const typeFavorite = {food_name: name, menu_item_id: null};
        const starFavorite = {food_name: name, menu_item_id: menuItemId};

        const star = await db.rpc("set_favorite_menu_item", {...args, p_starred: true});
        expect(star.error).toBeNull();
        expect(star.data).toBe(true);

        const starred = await db
            .from("favorite_foods")
            .select("food_name, menu_item_id::text")
            .eq("user_id", userId);

        expect(starred.error).toBeNull();
        expect(starred.data).toHaveLength(2);
        expect(starred.data).toEqual(expect.arrayContaining([typeFavorite, starFavorite]))

        const unstar = await db.rpc("set_favorite_menu_item", {...args, p_starred: false})
        expect(unstar.error).toBeNull();
        expect(unstar.data).toBe(true);

        const unstarred = await db
            .from("favorite_foods")
            .select("food_name, menu_item_id::text")
            .eq("user_id", userId)

        expect(unstarred.error).toBeNull();
        expect(unstarred.data).toEqual([typeFavorite]);
    })
        
        
        
            
        
})

