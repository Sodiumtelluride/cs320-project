import { MaxPriorityQueue } from '@datastructures-js/priority-queue';
import { DataNode } from '../scraper/parser.js';
import { supabase } from '../db/supabase.js';

export class Searcher{
    private allMeals : Map<string, DataNode>;
    private dataCollected : boolean;

    constructor(){
        this.allMeals = new Map<string, DataNode>();
        this.dataCollected = false;
        this.getData();
    }

    public async getData(){
        const {data, error} = await supabase.from("menu_items").select("name, calories, clean_diet").limit(100000);

        if(error){
            console.error("database fetch failed in search getData");
            return;
        }
        let menuItem;
        for(const row of data){
            if(row.calories > 10){
                menuItem = new DataNode();
                menuItem.data.set("clean_diet",row.clean_diet);
                this.allMeals.set(row.name,menuItem);
            }
        }
        this.dataCollected = true;
    }

    private checkForRequiredTags(filter : string[], mealName : string) : boolean {

        const filterSet = new Set<string>(filter);

        const mealNode = this.allMeals.get(mealName);
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
        for(const mealName of this.allMeals.keys()){
            if(!this.checkForRequiredTags(filter,mealName)) continue;
            score = this.getScore(userSearch, mealName);
            priorityQueue.enqueue([mealName,score]);
        }        

        return priorityQueue.toArray().map(([mealName]) => mealName);
    } 

    private getScore(userSearch : string, mealName : string) : number{
        let score = 0;
        score += this.wordSimilarity(userSearch,mealName);

        return score;
    }

    private wordSimilarity(userSearch : string, mealName : string) : number {
        const item1 = userSearch.toLowerCase();
        const item2 = mealName.toLowerCase();
        if(item1 == item2) return Infinity;

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
