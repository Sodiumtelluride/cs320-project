import { parse } from 'node-html-parser';
import { Parser, DataNode } from '../parser.js';
import { Scraper} from "../scraper.js";
import {MenuConstructor} from "../MenuConstructor.js";

export class DiningHallParser extends Parser{
    private diningHallNum : number;
    private diningHallName : string;
    constructor(html : string){
        super(html);
        this.diningHallNum =1;
        this.diningHallName = this.getName();
    }

    async getData(){
        const diningHall = new DataNode();
        const promise1 = this.attachMenus(diningHall);
        const promise2 =  this.attachContentText(diningHall);
        const promise3 = this.attachSidebar(diningHall);
        await Promise.all([promise1,promise2,promise3]);
        return diningHall;
    }

    private getName() : string{
        const diningHallName = this.root.getElementById("content_title")?.textContent;
        switch(diningHallName){
            case "Berkshire Dining Commons":
                this.diningHallNum = 4;
                return "berkshire";
            case "Worcester Commons":
                this.diningHallNum = 1;
                return "worcester";
            case "Franklin Dining Commons" :
                this.diningHallNum = 2;
                return "franklin";
            case "Hampshire Dining Commons" :
                this.diningHallNum = 3;
                return "hampshire";
            default :
                return "not valid dining hall";
        }
    }

    private async attachMenus(diningHall : DataNode){
        const menuNode = new DataNode();
        let dayMenu;
        let date = new Date();
        for(let i = 0; i < 14; i++){
            dayMenu = new DataNode();
           
            const menuDataURL = "https://www.umassdining.com/foodpro-menu-ajax?tid="+this.diningHallNum+"&date="+(date.getMonth() +1)+"%2F"+date.getDate()+"%2F"+date.getFullYear();
            menuNode.data.set((date.getMonth() + 1) + "/" + (date.getDate()) + "/" + date.getFullYear(),await MenuConstructor.constructMenuDataFromLink(menuDataURL)); 
            date.setDate(date.getDate() + 1);
        }
        diningHall.data.set("Menus", menuNode)

    } 
    
    private async attachContentText(diningHall : DataNode){
        const textContent = new DataNode();
        const contentText = this.root.getElementById("content_text");
        if(contentText == null) return;
        const childTextNodes = contentText.querySelectorAll("p,h1");
        let i = 0;
        for(const node of childTextNodes){
            textContent.data.set("field " + i + ": ",node.textContent);
            i++;
        }
        diningHall.data.set("main text",textContent);
    }

    private async attachSidebar(diningHall : DataNode){
        const sidebarContent = new DataNode();
        const sidebarData = this.root.querySelectorAll("#dining_location_hours");
        for(const section of sidebarData){
            const sectionName = section.querySelector("h2")?.textContent;
            if(sectionName == null) return;
            const newSection = new DataNode();
            sidebarContent.data.set(sectionName,newSection);

            const texts = section.querySelectorAll("p");
            let i = 0;
            for(const text of texts){
                newSection.data.set("field "+i,text.textContent);
                i++;
            }

        }

        diningHall.data.set("sidebar",sidebarContent);
    }

}