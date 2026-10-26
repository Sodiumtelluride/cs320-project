import { isMenuDate } from "./date";
import { DEMO_DINING_HALLS } from "./dining-halls";
import type { DietaryTag, FoodDetails, MenuDataSource, MenuFood, MenuQuery, MenuResponse, MenuStation, NutritionFacts } from "./types";

function sampleFood(
  id: string, name: string, dietaryTags: DietaryTag[],
  carbonRating: FoodDetails["carbonRating"], allergens: string[] | null,
  ingredients: string | null, nutrition: NutritionFacts | null, healthfulnessScore: number | null,
): FoodDetails {
  return { id, name, dietaryTags, carbonRating, allergens, ingredients, nutrition,
    healthfulnessScore, sourceUrl: null, updatedAt: "2026-10-19T14:00:00Z" };
}

const foods = [
  sampleFood("cheddar-bisque", "Aged Cheddar & Cauliflower Bisque", ["halal", "vegetarian"], "A",
    ["Milk", "Eggs", "Wheat", "Soy"], "Cauliflower, cream, cheddar cheese, vegetable stock, onions, and seasoning.", {
      servingSize: "5 oz", calories: 199, caloriesFromFat: 148,
      totalFat: { amount: 16.4, unit: "g", dailyValue: 21 },
      saturatedFat: { amount: 9.4, unit: "g" }, transFat: { amount: 0.6, unit: "g" },
      cholesterol: { amount: 49.8, unit: "mg" }, sodium: { amount: 521.5, unit: "mg", dailyValue: 23 },
      totalCarbohydrate: { amount: 5.9, unit: "g", dailyValue: 5 },
      dietaryFiber: { amount: 0.6, unit: "g", dailyValue: 2 },
      totalSugars: { amount: 1.2, unit: "g" }, protein: { amount: 6.4, unit: "g" },
    }, 2),
  sampleFood("minestrone", "Minestrone", ["halal", "vegetarian"], "A", ["Wheat", "Eggs"],
    "Vegetable stock, tomatoes, beans, pasta, carrots, onions, and herbs.", {
      servingSize: "5 oz", calories: 80, totalFat: { amount: 1, unit: "g", dailyValue: 1 },
      sodium: { amount: 280, unit: "mg", dailyValue: 12 }, totalCarbohydrate: { amount: 14, unit: "g", dailyValue: 5 },
      dietaryFiber: { amount: 3, unit: "g", dailyValue: 11 }, protein: { amount: 4, unit: "g" },
    }, 5),
  sampleFood("bbq-chicken", "BBQ Chicken", ["halal"], "C", ["Soy"],
    "Chicken, barbecue sauce, vegetable oil, and seasoning.", { servingSize: "1 piece", calories: 220, protein: { amount: 24, unit: "g" } }, 4),
  sampleFood("sausage-peppers", "Hot Sausage, Onions & Peppers", [], "C", null,
    "Sausage, onions, bell peppers, and seasoning.", null, null),
  sampleFood("sweet-potato-wedges", "Chili Spiced Sweet Potato Wedges", ["halal", "local", "plant-based"], "A", [],
    "Sweet potatoes, vegetable oil, chili powder, and salt.", { servingSize: "3 oz", calories: 110, totalFat: { amount: 3, unit: "g" } }, 6),
  sampleFood("cheese-grits", "Southern Cheese Grits", ["halal", "vegetarian"], "A", ["Milk"],
    "Corn grits, milk, cheddar cheese, and salt.", { servingSize: "4 oz", calories: 160, protein: { amount: 5, unit: "g" } }, 3),
  sampleFood("roasted-squash", "Herb Roasted Squash", ["halal", "local", "plant-based"], "A", [],
    "Squash, vegetable oil, and herbs.", { servingSize: "3 oz", calories: 65, totalFat: { amount: 2, unit: "g" } }, 6),
  sampleFood("collard-greens", "Braised Collard Greens", ["local", "plant-based"], "A", [],
    "Collard greens, onions, vegetable stock, and seasoning.", { servingSize: "3 oz", calories: 40, dietaryFiber: { amount: 3, unit: "g" } }, 7),
  sampleFood("black-bean-burger", "Black Bean Burger", ["halal", "plant-based"], "B", ["Wheat", "Soy"],
    "Black beans, rice, onions, wheat flour, spices, and vegetable oil.", { servingSize: "1 patty", calories: 190, protein: { amount: 8, unit: "g" } }, 5),
  sampleFood("french-fries", "French Fries", ["vegetarian"], "A", null,
    "Potatoes, vegetable oil, and salt.", { servingSize: "3 oz", calories: 190, totalFat: { amount: 9, unit: "g", dailyValue: 12 } }, 2),
  sampleFood("grilled-chicken", "Grilled Chicken Breast", ["halal"], "C", [],
    "Chicken breast, vegetable oil, and seasoning.", { servingSize: "3 oz", calories: 140, protein: { amount: 26, unit: "g" } }, 5),
  sampleFood("ginger-tofu", "Ginger Tofu with Green Beans", ["halal", "local", "plant-based"], "A", ["Soy"],
    "Tofu, green beans, ginger, garlic, and soy sauce.", { servingSize: "4 oz", calories: 170, protein: { amount: 12, unit: "g" } }, 6),
  sampleFood("vegetable-curry", "Malaysian Vegetable Curry", ["halal", "plant-based"], "A", [],
    "Mixed vegetables, coconut milk, ginger, garlic, and curry spices.", { servingSize: "4 oz", calories: 180 }, 5),
  sampleFood("cheese-pizza", "Cheese Pizza", ["halal", "vegetarian"], "B", ["Milk", "Wheat"],
    "Wheat dough, tomato sauce, mozzarella cheese, and herbs.", { servingSize: "1 slice", calories: 260 }, 3),
  sampleFood("pepperoni-pizza", "Pepperoni Pizza", [], "C", ["Milk", "Wheat"],
    "Wheat dough, tomato sauce, mozzarella cheese, pepperoni, and herbs.", { servingSize: "1 slice", calories: 290 }, 2),
  sampleFood("scrambled-eggs", "Scrambled Eggs", ["halal", "local", "vegetarian"], "B", ["Eggs", "Milk"],
    "Eggs, milk, butter, and salt.", { servingSize: "3 oz", calories: 150, protein: { amount: 11, unit: "g" } }, 4),
  sampleFood("oatmeal", "Hot Oatmeal", ["halal", "plant-based"], "A", [],
    "Oats and water.", { servingSize: "6 oz", calories: 120, dietaryFiber: { amount: 4, unit: "g" } }, 7),
  sampleFood("fruit-salad", "Fruit Salad", ["halal", "plant-based"], "A", [],
    "Melon, grapes, and pineapple.", { servingSize: "4 oz", calories: 60, totalFat: { amount: 0, unit: "g", dailyValue: 0 } }, 7),
  sampleFood("vegetable-wrap", "Vegetable Wrap", ["plant-based"], "A", ["Wheat"],
    "Wheat tortilla, hummus, lettuce, tomatoes, and cucumber.", { servingSize: "1 wrap", calories: 310 }, 6),
  sampleFood("beef-burger", "Beef Burger", ["halal"], "E", [],
    "Beef and seasoning.", { servingSize: "1 patty", calories: 280 }, 2),
];

const foodById = new Map(foods.map((food) => [food.id, food]));

function station(id: string, name: string, ids: string[]): MenuStation {
  return { id, name, foods: ids.map((id) => {
    const food = foodById.get(id)!;
    return { id: food.id, name: food.name, dietaryTags: food.dietaryTags, carbonRating: food.carbonRating };
  }) };
}

function buildMenu(query: MenuQuery): MenuResponse {
  const hallIndex = DEMO_DINING_HALLS.findIndex((hall) => hall.id === query.diningHallId);
  const hall = DEMO_DINING_HALLS[hallIndex];
  if (!hall || !isMenuDate(query.date) || !hall.meals?.includes(query.meal)) {
    throw new Error("No sample menu is configured for this selection.");
  }
  const day = Math.floor(Date.parse(`${query.date}T12:00:00Z`) / 86_400_000);
  const alternate = (day + hallIndex) % 2 === 0;
  let stations: MenuStation[];
  switch (query.meal) {
    case "breakfast":
      stations = [station("breakfast", "Breakfast Entrees", ["scrambled-eggs", "oatmeal"]), station("fruit", "Fresh Fruit", ["fruit-salad"])];
      break;
    case "grab-n-go":
      stations = [station("grab-n-go", "Grab n' Go", ["vegetable-wrap", "fruit-salad"])];
      break;
    case "late-night":
      stations = new Date(`${query.date}T12:00:00Z`).getUTCDay() === 0 ? [] : [station("late-night", "Late Night", ["cheese-pizza", "french-fries"])];
      break;
    default:
      stations = [
        station("soups", "Soups", alternate ? ["cheddar-bisque", "minestrone"] : ["minestrone", "cheddar-bisque"]),
        station("entrees", "Entrees", query.meal === "dinner" ? ["ginger-tofu", "grilled-chicken"] : ["bbq-chicken", "sausage-peppers"]),
        station("starches", "Starches", ["sweet-potato-wedges", "cheese-grits"]),
        station("vegetables", "Vegetables", alternate ? ["roasted-squash"] : ["collard-greens"]),
        station("grill", "Grill Station", [hallIndex % 2 ? "beef-burger" : "black-bean-burger", "french-fries", "grilled-chicken"]),
        station("international", "International", ["ginger-tofu", "vegetable-curry"]),
        station("pizza", "Pizza", ["cheese-pizza", "pepperoni-pizza"]),
      ];
  }
  return { ...query, stations, updatedAt: "2026-10-19T14:00:00Z" };
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); signal?.removeEventListener("abort", cancel); reject(new DOMException("Request aborted", "AbortError")); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", cancel); resolve(); }, milliseconds);
    if (signal?.aborted) cancel();
    else signal?.addEventListener("abort", cancel, { once: true });
  });
}

export function createMockMenuDataSource({ latencyMs = 180 }: { latencyMs?: number } = {}): MenuDataSource {
  return {
    mode: "demo",
    async getMenu(query, signal) {
      await wait(latencyMs, signal);
      return structuredClone(buildMenu(query));
    },
    async getFoodDetails(query, signal) {
      await wait(latencyMs, signal);
      const menu = buildMenu(query);
      if (!menu.stations.some((station) => station.foods.some((food: MenuFood) => food.id === query.foodId))) {
        throw new Error("This food is not on the selected menu.");
      }
      return structuredClone(foodById.get(query.foodId)!);
    },
  };
}
