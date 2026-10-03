import { MenuParser } from "./backend/scraping/parsers/menuParser.ts";
import { Scraper } from "./backend/scraping/scraper.ts";

// Testing my parser: Remove later please
// Create parser

const scraper = new Scraper();
scraper.runScraper("locations-menus/berkshire/menu").then((results) => {
  new MenuParser(results).getData();
});