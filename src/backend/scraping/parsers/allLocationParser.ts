import { parse } from 'node-html-parser';
import { Parser, DataNode } from '../parser.ts';
import { Scraper} from "../scraper.ts";
import { DiningHallParser} from "./dinningHallParser.ts"

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

        await Promise.all([promise1,promise2,promise3,promise4]);
        return allLocations;
    }

    private async attachDiningHall(allLocations : DataNode,diningHallName : string){
        const scraper = new Scraper();
        const result = await scraper.runScraper("locations-menus/" + diningHallName);
        const hall = await new DiningHallParser(result).getData();
        allLocations.data.set(diningHallName, hall);
    }
}