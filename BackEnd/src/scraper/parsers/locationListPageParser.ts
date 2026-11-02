import { parse } from 'node-html-parser';
import { Parser, DataNode } from '../parser.js';
import { MenuConstructor} from "../MenuConstructor.js"

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

            if(location.querySelectorAll("#dining_location_text").length > 1) {
                locationNode.data.set("menus",await this.addMenus(locationTitle));
            } else {
                locationNode.data.set("menus", "No Menu")
            }

            locationsListNode.data.set(locationTitle,locationNode);
        }
        return locationsListNode;
    }

    async addMenus(locationName : string){
        const allMenusNode = new DataNode();
        const locationId = MenuConstructor.pageId(locationName);
        if(locationId === -1) {return "Special Menu Type"}
        const date = new Date();
        let dayMenu;
        for(let i = 0; i < 14; i++){
            dayMenu = new DataNode();
           
            const menuDataURL = "https://www.umassdining.com/foodpro-menu-ajax?tid="+locationId+"&date="+(date.getMonth() +1)+"%2F"+date.getDate()+"%2F"+date.getFullYear();
            allMenusNode.data.set((date.getMonth() + 1) + "/" + (date.getDate()) + "/" + date.getFullYear(),await MenuConstructor.constructMenuDataFromLink(menuDataURL)); 
            date.setDate(date.getDate() + 1);
        }

        return allMenusNode
    }
}