import { parse } from 'node-html-parser';
import { Parser, DataNode } from '../parser';

export class MenuParser extends Parser{
    constructor(html : string){
        super(html);
    }

    
    getData(){
        const diningHall : DataNode = new DataNode();
        
        return diningHall;  
    }
}