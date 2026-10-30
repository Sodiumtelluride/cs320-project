import type { DiningHall } from "./types";

export type DiningCategoryId = "grab-n-go" | "around-campus";

export interface CampusLocation extends DiningHall {
  categoryId: DiningCategoryId;
  area: string;
  description: string;
  sourceUrl: string;
}

export const DINING_CATEGORIES = [
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
] as const;

const aroundCampusSource = "https://www.umassdining.com/locations-menus/around-campus";
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
  { id: "argo-tea", name: "Argo Tea", categoryId: "around-campus", subtitle: "Tea and coffee", area: "Hampden Building", description: "Tea, coffee and espresso beverages with pastries and paninis.", meals: ["daily-offerings"], sourceUrl: aroundCampusSource },
  { id: "newman-cafe", name: "Newman Café", categoryId: "around-campus", subtitle: "Café", area: "Newman Center", description: "Breakfast and lunch options inside the Newman Center.", meals: ["lunch"], sourceUrl: aroundCampusSource },
  { id: "snack-overflow", name: "Snack Overflow", categoryId: "around-campus", subtitle: "Café", area: "Manning College of Information and Computer Sciences", description: "A stop for coffee and specialty hot or cold drinks in Manning.", meals: ["grab-n-go"], sourceUrl: aroundCampusSource },
  { id: "post-and-bean-cafe", name: "Post & Bean Café", categoryId: "around-campus", subtitle: "Café", area: "John W. Olver Design Building", description: "Coffee and espresso with pastries, sandwiches, snacks and salads.", meals: ["grab-n-go"], sourceUrl: aroundCampusSource },
  { id: "carney-cafe", name: "Carney Café", categoryId: "around-campus", subtitle: "Café", area: "Isenberg School of Management", description: "Flatbreads, grilled cheese, baked goods and coffee in Isenberg.", meals: ["grab-n-go", "daily-offerings"], sourceUrl: aroundCampusSource },
  { id: "terrace", name: "Terrace", categoryId: "around-campus", subtitle: "Café", area: "Fieldstone Apartments", description: "Breakfast tarts, sandwiches, salads and espresso beverages at Fieldstone.", meals: ["breakfast", "lunch", "dinner"], sourceUrl: aroundCampusSource },
];

export function isDiningCategory(value: string): value is DiningCategoryId {
  return DINING_CATEGORIES.some((category) => category.id === value);
}

export function getCategoryLocations(category: DiningCategoryId): readonly CampusLocation[] {
  return CAMPUS_LOCATIONS.filter((location) => location.categoryId === category);
}

export function findCampusLocation(id: string): CampusLocation | undefined {
  return CAMPUS_LOCATIONS.find((location) => location.id === id);
}
