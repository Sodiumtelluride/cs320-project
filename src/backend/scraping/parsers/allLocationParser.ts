import { parse } from 'node-html-parser';
import { Parser, DataNode } from '../parser.ts';
import { Scraper} from "../scraper.ts";
import { DiningHallParser} from "./dinningHallParser.ts"
import { LocationListPageParser} from "./locationListPageParser.ts"

export class AllLocationParser extends Parser{
    constructor(html : string){
        super(html);
    }

    async getData() {
        const allLocations = new DataNode();
        const promise1 = this.attachDiningHall(allLocations, "berkshire");
        const promise2 = this.attachDiningHall(allLocations, "worcester");
        const promise3 = this.attachDiningHall(allLocations, "franklin");
        const promise4 = this.attachDiningHall(allLocations, "hampshire");
        const promise5 = this.attachText(allLocations);
        const promise6 = this.attachLocationList(allLocations,"grab-n-go");
        const promise7 = this.attachLocationList(allLocations,"campus-center");
        const promise8 = this.attachLocationList(allLocations,"campus");
        const promise9 = this.attachLocationList(allLocations,"student-businesses");
        

        await Promise.all([promise1,promise2,promise3,promise4,promise5,promise6,promise7,promise8,promise9]);
        return allLocations;
    }

    private async attachDiningHall(allLocations : DataNode,diningHallName : string){
        const scraper = new Scraper();
        const result = await scraper.runScraper("locations-menus/" + diningHallName);
        const hall = await new DiningHallParser(result).getData();
        allLocations.data.set(diningHallName, hall);
    }

    private async attachText(allLocations : DataNode){
        const toAttach = new DataNode();
        const title = this.root.getElementById("content_title")?.textContent;
        if(title == undefined) return;
        toAttach.data.set("header",title);

        const content = this.root.getElementById("content_text")?.querySelectorAll("p")[1].textContent;
        if(content == undefined) return;
        toAttach.data.set("bodyText",content);
        allLocations.data.set("page_content",toAttach);
        
    }

    private async attachLocationList(allLocations : DataNode, listName : string){
        const scraper = new Scraper();
        const result = await scraper.runScraper("locations-menus/" + listName);
        const lst = await new LocationListPageParser(result).getData();
        allLocations.data.set(listName,lst);
    }
}