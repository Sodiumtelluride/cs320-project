import { parse } from 'node-html-parser';

/* INSANE
    Chat so this is kinda fucked up
    BERKSHIRE DOESNT HAVE A BREAKFAST MENU
    Need to keep track of what locations have what items
*/

const menuItemAttributes = [
    "data-healthfulness",
    "data-carbon-list",
    "data-ingredient-list",
    "data-allergens",
    "data-recipe-webcode",
    "data-clean-diet-str",
    "data-serving-size",
    "data-calories",
    "data-calories-from-fat",
    "data-total-fat",
    "data-total-fat-dv",
    "data-sat-fat",
    "data-sat-fat-dv",
    "data-trans-fat",
    "data-cholesterol",
    "data-cholesterol_dv",
    "data-sodium",
    "data-sodium-dv",
    "data-total-carb",
    "data-total-carb-dv",
    "data-dietary-fiber",
    "data-dietary-fiber-dv",
    "data-sugars",
    "data-sugars-dv",
    "data-protein",
    "data-protein-dv",
    "data-dish-name"
];


export abstract class Parser {

    // https://www.npmjs.com/package/node-html-parser
    // Tutorial for parser lib
    public root;
    constructor(html: string) {
        this.root = parse(html);
    }

    abstract getData() : DataNode;
}

/* move this function into menuParser.ts*/

export class DataNode{
    constructor(){
        this.data = new Map<string, string | DataNode>();
    }
    public data : Map<string,string | DataNode>;

    public toString(indent = "") : string{
        var str = "";
        Array.from(this.data.keys()).forEach((key : string)=>{
            str += "\n" + indent+ key +" : ";
            str += this.data.get(key)?.toString(indent + "         ");
            str += "  \n "+ indent +" - - - - - - - - - ";
        });
        return str;
    }
}