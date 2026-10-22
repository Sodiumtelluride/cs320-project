import { AllLocationParser} from "./parsers/allLocationParser.js"
import { Scraper} from "./scraper.js";

// Testing my parser: Remove later please
// Create parser

const scraper = new Scraper();
scraper.runScraper("locations-menus").then((results) => {
  new AllLocationParser(results).getData().then((menu) => console.log(menu.toString()));
});