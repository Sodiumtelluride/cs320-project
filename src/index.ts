import { MenuParser } from "./backend/scraping/parsers/menuParser.ts";
import { DiningHallParser} from "./backend/scraping/parsers/dinningHallParser.ts"
import { AllLocationParser} from "./backend/scraping/parsers/allLocationParser.ts"
import { Parser, DataNode} from "./backend/scraping/parser.ts"
import { Scraper} from "./backend/scraping/scraper.ts";

// Testing my parser: Remove later please
// Create parser

const scraper = new Scraper();
scraper.runScraper("locations-menus").then((results) => {
  new AllLocationParser(results).getData().then((menu) => console.log(menu.toString()));
});