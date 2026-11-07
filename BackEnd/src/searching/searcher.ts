import { MaxPriorityQueue } from '@datastructures-js/priority-queue';
import { DataNode } from '../scraper/parser.js';
import { supabase } from '../db/supabase.js';

export class Searcher{
    private allMeals : Map<number, DataNode>;
    private allIngredients : Map<number, string>;
    private dataCollected : boolean;

    constructor(){
        this.allMeals = new Map<number, DataNode>();
        this.allIngredients = new Map<number, string>();
        this.dataCollected = false;
        //this.getData();
    }

    public async getData(){
        //const {data : mealData, error : mealError} = await supabase.from("menu_items").select("name, calories, clean_diet").limit(100000);
        const promise1 = await supabase.from("menu_items").select("id, name, calories, clean_diet").limit(100000);
        const promise2 = await supabase.from("menu_item_ingredients").select("menu_item_id, ingredient_id").limit(1000000);
        const promise3 = await supabase.from("ingredients").select("id, name").limit(5000);

        const [{data : mealData, error : mealError},{data : mapData, error : mapError},{data : ingredientData, error : ingredientError}] = await Promise.all([promise1,promise2,promise3]);

        if(mealError){
            console.error("database fetch failed in search getData",mealError);
            return;
        }

        if(mapError){
            console.error("database fetch failed in search getData",mapError);
            return;
        }

        if(ingredientError){
            console.error("database fetch failed in search getData",ingredientError);
            return;
        }

        let menuItem;
        let alreadyInMap = new Set<string>();
        for(const row of mealData){
            if(row.calories > 10 && !alreadyInMap.has(row.name)){
                menuItem = new DataNode();
                menuItem.data.set("ingredients", new DataNode);
                menuItem.data.set("clean_diet",row.clean_diet);
                menuItem.data.set("name",row.name);
                this.allMeals.set(row.id,menuItem);
                alreadyInMap.add(row.name);
            }
        }

        for(const row of ingredientData){
            this.allIngredients.set(row.id ,row.name);
        }

        
        for(const row of mapData){
            const ingredient = this.allIngredients.get(row.ingredient_id);
            if(ingredient === undefined) continue;
            const mealNode = this.allMeals.get(row.menu_item_id);
            if(mealNode === undefined) continue;
            const ingredientsNode = mealNode.data.get("ingredients");
            if(ingredientsNode === undefined || typeof(ingredientsNode) === "string") continue;

            ingredientsNode.data.set((ingredientsNode.data.size).toString(),ingredient);

        }


        this.dataCollected = true;
    }

    private checkForRequiredTags(filter : string[], mealId : number) : boolean {

        const filterSet = new Set<string>(filter);

        const mealNode = this.allMeals.get(mealId);
        if(mealNode === undefined) return false;
        const clean_diet = mealNode.data.get("clean_diet");
        if(typeof(clean_diet) !== "string") return false;
        const tags = new Set<string>(clean_diet.split(", "));

        if(filterSet.has("Halal") && !tags.has("Halal")) return false;
        if(filterSet.has("Vegetarian") && !(tags.has("Vegetarian") || tags.has("Plant Based"))) return false;
        if(filterSet.has("Plant Based") && !tags.has("Plant Based")) return false;
        return true;
    }

    public async SearchForSimilar(userSearch : string, filter : string[] = []) : Promise<string[]> {

        if(!this.dataCollected){
            console.warn("data collection not finished yet");
            return [];
        }
        const priorityQueue = new MaxPriorityQueue<[string,number]>(([name, priority])=> priority);

        let score : number;
        for(const mealId of this.allMeals.keys()){
            if(!this.checkForRequiredTags(filter,mealId)) continue;
            const mealName = this.allMeals.get(mealId)?.data.get("name")
            if(typeof(mealName) !== "string") {console.error("Meal name not properly accessed"); return [];};
            const ingredientNode = this.allMeals.get(mealId)?.data.get("ingredients");
            if(ingredientNode === undefined|| typeof(ingredientNode) === "string") continue;
            score = this.getScore(userSearch, mealName, ingredientNode);
            priorityQueue.enqueue([mealName,score]);
        }        

        return priorityQueue.toArray().map(([mealName]) => mealName);
    } 

    private getScore(userSearch : string, mealName : string, ingredientNode : DataNode) : number{
        let score = 0;
        score += this.wordSimilarity(userSearch,mealName, true);


        const ingredients = [] as string[];
        for(const key of ingredientNode.data.keys()){
            const val = ingredientNode.data.get(key);
            if(typeof(val) !== "string") continue;
            ingredients[Number(key)] = val;
        }
        for(const ingredient of ingredients){
            score += this.wordSimilarity(userSearch,ingredient)/(ingredients.length);
        }

        return score;
    }

    private wordSimilarity(userSearch : string, mealName : string, isMealName = false) : number {
        const item1 = userSearch.toLowerCase();
        const item2 = mealName.toLowerCase();
        if(isMealName && item1 == item2) return 100000;

        let similarity = 0;
        const words1 = new Set<string>(item1.split(" ").filter(word => word.length > 3));
        const words2 = new Set<string>(item2.split(" ").filter(word => word.length > 3));
        
        for(const word1 of words1){
            if(words2.has(word1)) similarity += 100 * (1 + word1.length /10);
            else {
                for(const word2 of words2){
                    similarity += compareSpelling(word1,word2);
                }
            }
        }

        return similarity;
    }


    
}

function compareSpelling(word1 : string, word2 : string) : number{
    const matrix : number[][] = [];
    for(let i = 0; i < word1.length + 1; i++){
        const row = [] as number[];
        for(let j = 0; j < word2.length +1; j++){
            row.push(0);
        }
        matrix.push(row)
    }

    for(let i = 0; i < word1.length+1; i++) matrix[i]![0] = i;
    for(let i = 0; i < word2.length+1; i++) matrix[0]![i] = i;
    let cost;
    let delCost;
    let insCost;
    let matchSubCost;
    for(let i = 1; i < word1.length + 1; i++){
        for(let j = 1; j < word2.length +1; j++){
            (word1.charAt(i-1) === word2.charAt(j-1))? cost = 0 : cost = 1; 

            delCost = matrix[i-1]![j]! + 1;
            insCost = matrix[i]![j-1]! + 1;
            matchSubCost = matrix[i-1]![j-1]! + cost;

            matrix[i]![j]! = Math.min(delCost, insCost, matchSubCost);
        }
        

    }

    const distance = matrix[word1.length]![word2.length]!;
    const similarity = 1 - (distance)/word2.length;
    return (similarity > .5)? similarity : 0;
}
