import { parse } from 'node-html-parser';
import { Parser, DataNode } from '../parser.ts';
import { Scraper} from "../scraper.ts";
import { MenuParser} from "./menuParser.ts"

export class DiningHallParser extends Parser{
    private diningHallName : string;
    constructor(html : string){
        super(html);
        this.diningHallName = this.getName();
    }

    async getData(){
        const diningHall = new DataNode();
        const promise1 = this.attachMenu(diningHall);
        const promise2 =  this.attachContentText(diningHall);
        const promise3 = this.attachSidebar(diningHall);
        await Promise.all([promise1,promise2,promise3]);
        return diningHall;
    }

    private getName() : string{
        const diningHallName = this.root.getElementById("content_title")?.textContent;
        switch(diningHallName){
            case "Berkshire Dining Commons":
                return "berkshire";
            case "Worcester Commons":
                return "worcester";
            case "Franklin Dining Commons" :
                return "franklin";
            case "Hampshire Dining Commons" :
                return "hampshire";
            default :
                return "not valid dining hall";
        }
    }

    private async attachMenu(diningHall : DataNode){
        const scraper = new Scraper();
        const result = await scraper.runScraper("locations-menus/" + this.diningHallName +"/menu");
        const menu = await new MenuParser(result).getData();
        diningHall.data.set("Menu", menu)
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