import { Parser } from "./backend/scraping/parser.ts";
import { Scraper } from "./backend/scraping/scraper.ts";

// Testing my parser: Remove later please
// Create parser

const scraper = new Scraper();
scraper.runScraper().then((results) => {
  new Parser(results).getMenu();
});