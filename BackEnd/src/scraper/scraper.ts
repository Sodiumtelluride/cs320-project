// Dining common pages that need scraping
const DINING_DOMAIN = "https://www.umassdining.com/";

// This link only works for main DCs, rest are inconsistant
// It's a fuckin' mess, will need several different cases :pensive_emoji:
const MENU_PAGE = "locations-menus/";

const dc_URLs = [
    "berkshire/menu",
    "worcester/menu",
    "franklin/menu",
    "hampshire/menu",
];


export class Scraper {

    constructor() {}

    async runScraper(path : string) {
        return await this.beginScrape(DINING_DOMAIN + path);
    }

    // Actual scaper method
    async beginScrape(webLocation: string): Promise<string> {
        const response = await fetch(webLocation);
        if(!response.ok) {
            throw new Error(`Error fetching website: ${response.status}`);
        }
        return response.text();
    }
}