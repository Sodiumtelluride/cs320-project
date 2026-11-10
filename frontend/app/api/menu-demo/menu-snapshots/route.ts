import { DEMO_DINING_HALLS } from "@/lib/menus/dining-halls";
import { isMenuDate } from "@/lib/menus/date";
import { createMockMenuDataSource } from "@/lib/menus/mock-menu-data-source";
import type { FoodDetails, MenuStation } from "@/lib/menus/types";

const source = createMockMenuDataSource({ latencyMs: 0 });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const location = params.get("location");
  const date = params.get("date");
  const hall = DEMO_DINING_HALLS.find((entry) => entry.id === location);
  if (!hall || !date || !isMenuDate(date)) return Response.json({ error: "Sample menu unavailable" }, { status: 404 });
  const menus: Record<string, readonly MenuStation[]> = {};
  const foods: Record<string, FoodDetails> = {};
  await Promise.all((hall.meals ?? []).map(async (meal) => {
    const query = { diningHallId: hall.id, date, meal };
    const menu = await source.getMenu(query);
    menus[meal] = menu.stations;
    await Promise.all(menu.stations.flatMap((station) => station.foods.map(async (food) => {
      foods[food.id] = await source.getFoodDetails({ ...query, foodId: food.id });
    })));
  }));
  return Response.json({ location, date, menus, foods, updatedAt: "2026-10-19T14:00:00Z" });
}
