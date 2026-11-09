// Invented fixtures for the frontend prototype, not live menus or verified allergens.
export const SEARCH_ALLERGENS = ["Milk", "Eggs", "Wheat", "Soy", "Peanuts", "Tree nuts", "Fish", "Shellfish", "Sesame"] as const;
export type SearchAllergen = (typeof SEARCH_ALLERGENS)[number];

export interface SearchDemoItem {
  id: string;
  name: string;
  location: string;
  allergens: readonly SearchAllergen[] | null;
}

export const SEARCH_DEMO_ITEMS: readonly SearchDemoItem[] = [
  { id: "salmon", name: "Grilled Salmon", location: "Berkshire", allergens: ["Fish"] },
  { id: "salmon-bowl", name: "Salmon Rice Bowl", location: "Worcester", allergens: ["Fish", "Soy", "Sesame"] },
  { id: "chicken", name: "Grilled Chicken", location: "Franklin", allergens: [] },
  { id: "tofu", name: "Sesame Tofu Bowl", location: "Hampshire", allergens: ["Soy", "Sesame"] },
  { id: "pizza", name: "Cheese Pizza", location: "Berkshire", allergens: ["Milk", "Wheat"] },
  { id: "pasta", name: "Pesto Pasta", location: "Worcester", allergens: ["Milk", "Wheat", "Tree nuts"] },
  { id: "salad", name: "Garden Salad", location: "Franklin", allergens: [] },
  { id: "soup", name: "Vegetable Soup", location: "Hampshire", allergens: [] },
  { id: "sandwich", name: "Turkey Sandwich", location: "Berkshire Grab ’n Go", allergens: ["Wheat", "Eggs"] },
  { id: "noodles", name: "Peanut Noodles", location: "Worcester", allergens: ["Wheat", "Soy", "Peanuts"] },
  { id: "shrimp", name: "Garlic Shrimp", location: "Hampshire", allergens: ["Shellfish", "Milk"] },
  { id: "special", name: "Chef’s Special", location: "Franklin", allergens: null },
];

export function filterSearchDemoItems(query: string, excluded: readonly SearchAllergen[]) {
  const term = query.trim().toLocaleLowerCase();
  return SEARCH_DEMO_ITEMS.filter((item) =>
    item.name.toLocaleLowerCase().includes(term) &&
    (!excluded.length || (item.allergens !== null && !item.allergens.some((allergen) => excluded.includes(allergen))))
  );
}
