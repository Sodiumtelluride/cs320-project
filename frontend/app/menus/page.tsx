import type { Metadata } from "next";
import { getCampusDate, isMenuDate } from "@/lib/menus/date";
import { DEMO_DINING_HALLS } from "@/lib/menus/dining-halls";
import { MEALS } from "@/lib/menus/types";
import { DiningLandingPage } from "@/menus/landing-page";
import { MenuPage } from "@/menus/menu-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Menus | UMass Dining",
  description: "Explore dining hall menus, ingredients, nutrition information, and reported allergens.",
};

interface MenusRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MenusRoute({ searchParams }: MenusRouteProps) {
  const params = await searchParams;
  const hallId = typeof params.hall === "string" ? params.hall : undefined;
  if (!hallId) return <DiningLandingPage />;

  const hall = DEMO_DINING_HALLS.find((entry) => entry.id === hallId);
  if (!hall) return <DiningLandingPage notice="That dining hall is not available. Choose a location below." />;

  const date = typeof params.date === "string" && isMenuDate(params.date) ? params.date : getCampusDate();
  const requestedMeal = MEALS.find((entry) => entry.id === params.meal)?.id;
  const meal = requestedMeal && (!hall.meals || hall.meals.includes(requestedMeal)) ? requestedMeal : "lunch";

  return <MenuPage key={`${hall.id}:${date}:${meal}`} initialHallId={hall.id} initialDate={date} initialMeal={meal} />;
}
