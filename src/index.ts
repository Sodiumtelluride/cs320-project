import { MenuParser } from "./backend/scraping/parsers/menuParser.ts";
import { Parser, DataNode} from "./backend/scraping/parser.ts"
import { Scraper} from "./backend/scraping/scraper.ts";

// Testing my parser: Remove later please
// Create parser

const scraper = new Scraper();
scraper.runScraper("locations-menus/worcester/menu").then((results) => {
  const menu = new MenuParser(results).getData();
  console.log(menu.toString());
});