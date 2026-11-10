import { MaxPriorityQueue } from '@datastructures-js/priority-queue';
import { DataNode } from '../scraper/parser.js';
import { supabase } from '../db/supabase.js';

type SearchResult = {mealName : string, id : number, score : number};

export class Searcher{
    private allMeals : Map<number, DataNode>;
    private allIngredients : Map<number, string>;
    private allAllergens : Map<number, string>;
    private dataCollected : boolean;

    constructor(){
        this.allMeals = new Map<number, DataNode>();
        this.allIngredients = new Map<number, string>();
        this.allAllergens = new Map<number, string>();
        this.dataCollected = false;
        this.getData();
    }

    private async getData(){
        //const {data : mealData, error : mealError} = await supabase.from("menu_items").select("name, calories, clean_diet").limit(100000);
        const promise1 = await supabase.from("menu_items").select("id, name, calories, clean_diet").limit(100000);
        const promise2 = await supabase.from("menu_item_ingredients").select("menu_item_id, ingredient_id").limit(1000000);
        const promise3 = await supabase.from("ingredients").select("id, name").limit(10000);
        const promise4 = await supabase.from("menu_item_allergens").select("menu_item_id, allergen_id").limit(10000);
        const promise5 = await supabase.from("allergens").select("id, name").limit(50);

        const [
            {data : mealData, error : mealError},
            {data : mapData, error : mapError},
            {data : ingredientData, error : ingredientError},
            {data : allergenMapData, error : allergenMapError},
            {data : allergenData, error : allergenError}
        ] = await Promise.all([promise1,promise2,promise3,promise4,promise5]);

        if(mealError || mapError || ingredientError || allergenError || allergenMapError){
            let e = mealError
            if(mapError) e = mapError;
            else if(ingredientError) e = ingredientError;
            else if(allergenMapError) e = allergenError
            else if(allergenMapError) e = allergenMapError
            console.error("database fetch failed in search getData", e);
            return;
        }

        let menuItem;
        let alreadyInMap = new Set<string>();
        for(const row of mealData){
            if(row.calories > 10 && !alreadyInMap.has(row.name)){
                menuItem = new DataNode();
                menuItem.data.set("ingredients", new DataNode);
                menuItem.data.set("allergens", new DataNode);
                menuItem.data.set("clean_diet",row.clean_diet);
                menuItem.data.set("name",row.name);
                this.allMeals.set(row.id,menuItem);
                alreadyInMap.add(row.name);
            }
        }

        for(const row of ingredientData){
            this.allIngredients.set(row.id ,row.name);
        }

        for(const row of allergenData){
            this.allAllergens.set(row.id, row.name);
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

        for(const row of allergenMapData){
            const allergen = this.allAllergens.get(row.allergen_id);
            if(allergen === undefined) continue;
            const mealNode = this.allMeals.get(row.menu_item_id);
            if(mealNode === undefined) continue;
            const allergensNode = mealNode.data.get("allergens");
            if(allergensNode === undefined || typeof(allergensNode) === "string") continue;

            allergensNode.data.set((allergensNode.data.size).toString(),allergen);
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

    private isFreeOfFilteredAllergens(filter : string[], mealId : number) : boolean{
        const mealNode = this.allMeals.get(mealId);
        if(mealNode === undefined) return false;
        const allergensNode = mealNode.data.get("allergens")!;
        if(typeof(allergensNode) === "string") return false;
        const allergensInMeal = new Set<string>();
        for(const allergen of allergensNode.data.values()){
            allergensInMeal.add(allergen.toString());
        }
        for(const str of filter){
            if(allergensInMeal.has(str)) return false;
        }
        return true;
    }

    public async advancedSearch(userSearch : string, filter : string[] = []) : Promise<SearchResult[]>{ // full search that incorporates ingredient weightings
        if(!this.dataCollected){
            console.warn("data collection not finished yet");
            return [];
        }

        const basicOrder = await this.SearchForSimilar(userSearch,filter);
        const priorityQueue = new MaxPriorityQueue<SearchResult>(result=> result.score);
        let bestMeal : SearchResult | undefined = undefined;
        for(const result of basicOrder){
            if(bestMeal === undefined){
                bestMeal = result;
                bestMeal.score = Infinity;
                priorityQueue.push(bestMeal)
            } else {
                result.score += this.mealSimilarity(bestMeal.id,result.id)/10;
                priorityQueue.push(result);
            }
        }
        
        return priorityQueue.toArray();
    }

    private async SearchForSimilar(userSearch : string, filter : string[] = []) : Promise<SearchResult[]> { //basic search, only incorporates name. 

        if(!this.dataCollected){
            console.warn("data collection not finished yet");
            return [];
        }
        const priorityQueue = new MaxPriorityQueue<SearchResult>(result=> result.score);

        let score : number;
        for(const mealId of this.allMeals.keys()){
            if(!this.checkForRequiredTags(filter,mealId) || !this.isFreeOfFilteredAllergens(filter,mealId)) continue;
            const mealName = this.allMeals.get(mealId)?.data.get("name")
            if(typeof(mealName) !== "string") {console.error("Meal name not properly accessed"); return []};
            const ingredientNode = this.allMeals.get(mealId)?.data.get("ingredients");
            if(ingredientNode === undefined|| typeof(ingredientNode) === "string") continue;
            score = this.getScore(userSearch, mealName, ingredientNode);
            priorityQueue.enqueue({mealName : mealName, id : mealId, score : score});
        }        

        return priorityQueue.toArray();
    } 

    public async partialInputSearch(userSearch : string, filter : string[] = []) : Promise<SearchResult[]> { //lightweight search that weights string input matching when typing above all else
        if(!this.dataCollected){
            console.warn("data collection not finished yet");
            return [];
        }

        const basicOrder = await this.SearchForSimilar(userSearch,filter);
        const priorityQueue = new MaxPriorityQueue<SearchResult>(result=> result.score);
        for(const result of basicOrder){
            result.score += this.partialInputScore(userSearch, result.mealName);
            priorityQueue.enqueue(result)
        }
        
        return priorityQueue.toArray();
    }

    private getScore(userSearch : string, mealName : string, ingredientNode : DataNode) : number{
        let score = 0;
        score += this.wordSimilarity(userSearch,mealName, true);


        const ingredients = this.getIngredientsFromNode(ingredientNode);
        for(const ingredient of ingredients){
            score += this.wordSimilarity(userSearch,ingredient)/(ingredients.length);
        }

        return score;
    }

    private mealSimilarity(meal1Id : number, meal2Id : number) : number{
        const mealNode1 = this.allMeals.get(meal1Id)!;
        const mealNode2 = this.allMeals.get(meal2Id)!;
        const name1 = mealNode1.data.get("name")!;
        const name2 = mealNode2.data.get("name")!;
        if(typeof(name1) !== "string" || typeof(name2) !== "string") return 0;
        let similarity = this.wordSimilarity(name1,name2,true);
        const ingredientNode1 = mealNode1.data.get("ingredients")!
        const ingredientNode2 = mealNode2.data.get("ingredients")!
        if(typeof(ingredientNode1) === "string" || typeof(ingredientNode2) === "string") return 0;
        const ingredients1 = this.getIngredientsFromNode(ingredientNode1);
        const ingredients2 = this.getIngredientsFromNode(ingredientNode2);

        for(const ingredient1 of ingredients1){
            for(const ingredient2 of ingredients2){
                similarity += this.wordSimilarity(ingredient1, ingredient2, false) /(ingredients1.length * ingredients2.length);
            }
        }

        return similarity;
    }

    private partialInputScore(inputName : string, mealName : string) : number {
        inputName = inputName.toLowerCase();
        mealName = mealName.toLowerCase();
        let points = 0;
        const minLength = Math.min(inputName.length, mealName.length);
        for(let i = 0; i < minLength; i++){
            if(inputName.charAt(i) === mealName.charAt(i))
            points += 10000
        }
        return points;
    }

    private getIngredientsFromNode(ingredientNode : DataNode) : string[]{
        const arr = [] as string[];

        for(const key of ingredientNode.data.keys()){
            const val = ingredientNode.data.get(key);
            if(typeof(val) !== "string") continue;
            arr[Number(key)] = val;
        }

        return arr;
    }

    private wordSimilarity(userSearch : string, mealName : string, isMealName = false) : number {
        const item1 = userSearch.toLowerCase();
        const item2 = mealName.toLowerCase();
        const minWordLength = Math.min(userSearch.length,3);
        if(isMealName && item1 == item2) return 100000;

        let similarity = 0;
        const words1 = new Set<string>(item1.split(" ").filter(word => word.length >= minWordLength));
        const words2 = new Set<string>(item2.split(" ").filter(word => word.length >= minWordLength));
        
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

    if(Math.abs(word1.length - word2.length) > 3) return 0;

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
