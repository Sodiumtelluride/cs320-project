import type { DiningHall } from "./types";

export type DiningCategoryId = "grab-n-go" | "around-campus" | "campus-center" | "blue-wall";

export interface DiningCategory {
  id: DiningCategoryId;
  name: string;
  description: string;
  sourceUrl: string;
  parentId?: DiningCategoryId;
}

export interface CampusLocation extends DiningHall {
  categoryId: DiningCategoryId;
  area: string;
  description: string;
  sourceUrl: string;
  todayMenuUrl?: string;
}

export const DINING_CATEGORIES: readonly DiningCategory[] = [
  {
    id: "grab-n-go",
    name: "Grab ’n Go",
    description: "Find a takeaway meal at one of the four dining commons locations.",
    sourceUrl: "https://www.umassdining.com/locations-menus/grab-n-go",
  },
  {
    id: "around-campus",
    name: "Around Campus",
    description: "Explore cafés and stores in academic buildings, libraries and residential areas.",
    sourceUrl: "https://www.umassdining.com/locations-menus/around-campus",
  },
  {
    id: "campus-center",
    name: "Campus Center",
    description: "Explore Blue Wall, Harvest Market and People’s Organic Coffee.",
    sourceUrl: "https://www.umassdining.com/locations-menus/campus-center",
  },
  {
    id: "blue-wall",
    name: "Blue Wall",
    description: "Choose from seven dining outlets inside the Campus Center’s Blue Wall.",
    sourceUrl: "https://www.umassdining.com/locations-menus/campus-center/blue-wall",
    parentId: "campus-center",
  },
];

export const TOP_LEVEL_DINING_CATEGORIES = DINING_CATEGORIES.filter((category) => !category.parentId);

const aroundCampusSource = "https://www.umassdining.com/locations-menus/around-campus";
const campusCenterSource = "https://www.umassdining.com/locations-menus/campus-center";
const blueWallSource = `${campusCenterSource}/blue-wall`;
const grabDescription = "Takeaway meals and sides for a quick visit to the dining commons.";

export const CAMPUS_LOCATIONS: readonly CampusLocation[] = [
  { id: "berkshire-grab-n-go", name: "Berkshire Grab ’n Go", categoryId: "grab-n-go", subtitle: "Grab ’n Go", area: "Berkshire Dining Commons", description: grabDescription, meals: ["breakfast", "lunch"], sourceUrl: "https://www.umassdining.com/locations-menus/around-campus/berkshire-grab-n-go" },
  { id: "worcester-grab-n-go", name: "Worcester Grab ’n Go", categoryId: "grab-n-go", subtitle: "Grab ’n Go", area: "Worcester Dining Commons", description: grabDescription, meals: ["breakfast", "lunch"], sourceUrl: "https://www.umassdining.com/locations-menus/around-campus/worcester-grab-n-go" },
  { id: "hampshire-grab-n-go", name: "Hampshire Grab ’n Go", categoryId: "grab-n-go", subtitle: "Grab ’n Go", area: "Hampshire Dining Commons", description: grabDescription, meals: ["breakfast"], sourceUrl: "https://www.umassdining.com/locations-menus/around-campus/hampshire-grab-n-go" },
  { id: "franklin-grab-n-go", name: "Franklin Grab ’n Go", categoryId: "grab-n-go", subtitle: "Grab ’n Go", area: "Franklin Dining Commons", description: grabDescription, meals: ["lunch"], sourceUrl: "https://www.umassdining.com/locations-menus/around-campus/franklin-grab-n-go" },
  { id: "whitmore-cafe", name: "Whitmore Café", categoryId: "around-campus", subtitle: "Café", area: "Whitmore Administration Building", description: "Coffee, pastries, paninis and salads in the administration building.", meals: ["grab-n-go", "daily-offerings"], sourceUrl: aroundCampusSource },
  { id: "procrastination-station", name: "Procrastination Station", categoryId: "around-campus", subtitle: "Café", area: "W. E. B. Du Bois Library", description: "A library stop for espresso drinks, sandwiches, soups and pastries.", meals: ["grab-n-go", "daily-offerings"], sourceUrl: aroundCampusSource },
  { id: "courtside-cafe", name: "Courtside Café", categoryId: "around-campus", subtitle: "Café", area: "Recreation Center, second level", description: "Smoothies, cold drinks and takeaway food near the workout facilities.", meals: ["grab-n-go", "daily-offerings"], sourceUrl: aroundCampusSource },
  { id: "worcester-cafe", name: "Worcester Café", categoryId: "around-campus", subtitle: "Café", area: "Worcester Commons, first floor", description: "Coffee, smoothies and breakfast sandwiches on the commons’ first floor.", meals: ["daily-offerings"], sourceUrl: aroundCampusSource },
  { id: "isb-cafe", name: "ISB Café", categoryId: "around-campus", subtitle: "Café", area: "Integrated Sciences Building", description: "Coffee, specialty beverages and snacks in the science building.", meals: ["grab-n-go"], sourceUrl: aroundCampusSource },
  { id: "hampshire-cafe", name: "Hampshire Café", categoryId: "around-campus", subtitle: "Café and store", area: "Hampshire Dining Commons, first floor", description: "Coffee, sandwiches, salads, snacks and everyday essentials in Hampshire.", meals: ["grab-n-go"], sourceUrl: aroundCampusSource },
  { id: "roots-cafe", name: "Roots Café", categoryId: "around-campus", subtitle: "Café", area: "Honors Residential Complex", description: "A residential café with pizza, salads, quesadillas and other prepared meals.", meals: ["breakfast", "lunch", "dinner", "grab-n-go"], sourceUrl: aroundCampusSource },
  { id: "morrill-cafe", name: "Morrill Café", categoryId: "around-campus", subtitle: "Café", area: "Morrill Science Center", description: "Coffee and espresso alongside baked goods, salads and sandwiches.", meals: ["grab-n-go"], sourceUrl: aroundCampusSource },
  { id: "peets-coffee-tea", name: "Peet’s Coffee & Tea", categoryId: "around-campus", subtitle: "Coffee and tea", area: "Integrated Learning Center, first floor", description: "Coffee, espresso drinks and snacks in the Integrated Learning Center.", meals: ["grab-n-go", "daily-offerings"], sourceUrl: aroundCampusSource },
  { id: "the-hub", name: "The Hub", categoryId: "around-campus", subtitle: "Café", area: "Furcolo Hall", description: "Locally roasted coffee with pastries, sandwiches and salads in Furcolo.", meals: ["grab-n-go"], sourceUrl: aroundCampusSource },
  { id: "argo-tea", name: "Argo Tea", categoryId: "around-campus", subtitle: "Tea and coffee", area: "Hampden Building", description: "Tea, coffee and espresso beverages with pastries and paninis.", meals: ["daily-offerings"], menuDateMode: "today-only", sourceUrl: aroundCampusSource, todayMenuUrl: "https://www.umassdining.com/menu/argo-tea-menu" },
  { id: "newman-cafe", name: "Newman Café", categoryId: "around-campus", subtitle: "Café", area: "Newman Center", description: "Breakfast and lunch options inside the Newman Center.", meals: ["lunch"], sourceUrl: aroundCampusSource },
  { id: "snack-overflow", name: "Snack Overflow", categoryId: "around-campus", subtitle: "Café", area: "Manning College of Information and Computer Sciences", description: "A stop for coffee and specialty hot or cold drinks in Manning.", meals: ["grab-n-go"], sourceUrl: aroundCampusSource },
  { id: "post-and-bean-cafe", name: "Post & Bean Café", categoryId: "around-campus", subtitle: "Café", area: "John W. Olver Design Building", description: "Coffee and espresso with pastries, sandwiches, snacks and salads.", meals: ["grab-n-go"], sourceUrl: aroundCampusSource },
  { id: "carney-cafe", name: "Carney Café", categoryId: "around-campus", subtitle: "Café", area: "Isenberg School of Management", description: "Flatbreads, grilled cheese, baked goods and coffee in Isenberg.", meals: ["grab-n-go", "daily-offerings"], sourceUrl: aroundCampusSource },
  { id: "terrace", name: "Terrace", categoryId: "around-campus", subtitle: "Café", area: "Fieldstone Apartments", description: "Breakfast tarts, sandwiches, salads and espresso beverages at Fieldstone.", meals: ["breakfast", "lunch", "dinner"], sourceUrl: aroundCampusSource },
  // Menu IDs match the backend's normalized locations.name values; directory groups are not API locations.
  { id: "harvest-market", name: "Harvest Market", categoryId: "campus-center", subtitle: "Market", area: "Campus Center, main concourse", description: "A market with hot meals, salads and takeaway options.", meals: ["breakfast", "lunch", "dinner", "grab-n-go"], sourceUrl: campusCenterSource, todayMenuUrl: "https://www.umassdining.com/menu/harvest-blue-wall-menu" },
  { id: "peoples-organic-coffee", name: "People’s Organic Coffee", categoryId: "campus-center", subtitle: "Coffee and café", area: "Campus Center, main concourse", description: "Coffee, tea, pastries, sandwiches and salads on the main concourse.", meals: ["grab-n-go", "daily-offerings"], sourceUrl: campusCenterSource, todayMenuUrl: "https://www.umassdining.com/menu/people-organic-coffee" },
  { id: "tavola", name: "Tavola", categoryId: "blue-wall", subtitle: "Blue Wall", area: "Campus Center, Blue Wall", description: "Pizza, pasta, salads and wraps in Blue Wall.", meals: ["lunch", "dinner"], sourceUrl: blueWallSource, todayMenuUrl: "https://www.umassdining.com/menu/tavola" },
  { id: "green-fields", name: "Green Fields", categoryId: "blue-wall", subtitle: "Blue Wall", area: "Campus Center, Blue Wall", description: "Prepared and build-your-own salads and wraps.", meals: ["lunch", "dinner"], sourceUrl: blueWallSource, todayMenuUrl: "https://www.umassdining.com/menu/green-fields-blue-wall" },
  { id: "tamales", name: "Tamales", categoryId: "blue-wall", subtitle: "Blue Wall", area: "Campus Center, Blue Wall", description: "Burritos, quesadillas, rice bowls and salads.", meals: ["lunch", "dinner"], sourceUrl: blueWallSource, todayMenuUrl: "https://www.umassdining.com/menu/tamales-blue-wall-menu" },
  { id: "wasabi", name: "Wasabi", categoryId: "blue-wall", subtitle: "Blue Wall", area: "Campus Center, Blue Wall", description: "Sushi, rice bowls, soup and grilled dishes.", meals: ["lunch", "dinner"], sourceUrl: blueWallSource, todayMenuUrl: "https://www.umassdining.com/menu/wasabi-blue-wall" },
  { id: "deli-delish", name: "Deli Delish", categoryId: "blue-wall", subtitle: "Blue Wall", area: "Campus Center, Blue Wall", description: "Grinders, rolls and hot sandwiches.", meals: ["lunch", "dinner"], sourceUrl: blueWallSource, todayMenuUrl: "https://www.umassdining.com/menu/deli-delish-blue-wall" },
  { id: "star-ginger", name: "Star Ginger", categoryId: "blue-wall", subtitle: "Blue Wall", area: "Campus Center, Blue Wall", description: "Asian noodle bowls, rice bowls and other specialties.", meals: ["lunch", "dinner"], sourceUrl: blueWallSource, todayMenuUrl: "https://www.umassdining.com/menu/star-ginger-blue-wall-menu" },
  { id: "the-grill", name: "The Grill", categoryId: "blue-wall", subtitle: "Blue Wall", area: "Campus Center, Blue Wall", description: "Burgers, grilled sandwiches, chicken and fries.", meals: ["lunch", "dinner"], sourceUrl: blueWallSource, todayMenuUrl: "https://www.umassdining.com/menu/grill-blue-wall-menu" },
];

export function isDiningCategory(value: string): value is DiningCategoryId {
  return DINING_CATEGORIES.some((category) => category.id === value);
}

export function getCategoryLocations(category: DiningCategoryId): readonly CampusLocation[] {
  // The Campus Center flyout lists all nine menus without adding a third dropdown level.
  const children = DINING_CATEGORIES.filter((entry) => entry.parentId === category).map((entry) => entry.id);
  return CAMPUS_LOCATIONS.filter((location) => location.categoryId === category || children.includes(location.categoryId));
}

export function getDirectCategoryLocations(category: DiningCategoryId): readonly CampusLocation[] {
  return CAMPUS_LOCATIONS.filter((location) => location.categoryId === category);
}

export function findCampusLocation(id: string): CampusLocation | undefined {
  return CAMPUS_LOCATIONS.find((location) => location.id === id);
}
