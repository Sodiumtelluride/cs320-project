import { parse } from 'node-html-parser';
import { Parser, DataNode } from '../parser.js';

export class LocationListPageParser extends Parser{
    constructor(html : string){
        super(html);
    }

    async getData() {
        const locationsListNode = new DataNode();
        const listedLocationsData = this.root.getElementById("menu_item")?.querySelectorAll("li");
        if(listedLocationsData === undefined) return locationsListNode;
        var locationNode;
        var locationTitle;
        var teaser;
        var hours;
        for(const location of listedLocationsData){
            locationNode = new DataNode();
            locationTitle = location.getElementById("menu_item_title")?.textContent;
            if(locationTitle === undefined) return locationsListNode;
            teaser = location.getElementById("teaser")?.textContent;
            if(teaser === undefined) return locationsListNode;
            hours = location.getElementById("dining_location_text")?.textContent
            if(hours === undefined) return locationsListNode;
            locationNode.data.set("description",teaser)
            locationNode.data.set("hours",hours)


            locationsListNode.data.set(locationTitle,locationNode);
        }
        return locationsListNode;
    }
}