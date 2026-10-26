import { MEALS, type DiningHall } from "./types";

export const DEMO_DINING_HALLS: readonly DiningHall[] = [
  { id: "berkshire", name: "Berkshire", meals: MEALS.map((meal) => meal.id) },
  { id: "worcester", name: "Worcester", meals: ["breakfast", "lunch", "dinner"] },
  { id: "franklin", name: "Franklin", meals: ["breakfast", "lunch", "dinner"] },
  { id: "hampshire", name: "Hampshire", meals: ["breakfast", "lunch", "dinner"] },
];
