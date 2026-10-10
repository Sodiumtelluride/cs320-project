import { parse } from 'node-html-parser';

/* INSANE
    Chat so this is kinda fucked up
    BERKSHIRE DOESNT HAVE A BREAKFAST MENU
    Need to keep track of what locations have what items
*/

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
            const keyToPrint = key.replaceAll("\n","\\n")
            str += "\n" + indent+ keyToPrint +" : ";
            if(typeof(this.data.get(key)) === "string"){
                str += this.data.get(key)?.toString(indent + "  ").replaceAll("\n","\\n");
            } else {
                str += this.data.get(key)?.toString(indent + "  ");
            }
            str += "    "+ indent;
        });
        return str.replaceAll("\r","\\r");
    }
}