import { writeFile } from 'fs/promises';
import { Scraper } from "./backend/scraping/testScraper.ts";

// Testing my scraper: Remove later please
// Create scraper
const scraper = new Scraper();
scraper.runScraper().then((results) => {
    writeToFile("./scrapedPages/berkshire.txt", results);
});

async function writeToFile(filePath: string, data: string): Promise<void> {
  try {
    await writeFile(filePath, data, 'utf-8');
    console.log('Written to: ' + filePath);
  } catch (error) {
    console.error('Error: ', error);
  }
}