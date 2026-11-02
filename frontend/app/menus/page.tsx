import type { Metadata } from "next";
import { getCampusDate, isMenuDate } from "@/lib/menus/date";
import { DEMO_DINING_HALLS } from "@/lib/menus/dining-halls";
import { MEALS } from "@/lib/menus/types";
import { findCampusLocation, isDiningCategory } from "@/lib/menus/campus-locations";
import { DiningLandingPage } from "@/menus/landing-page";
import { MenuPage } from "@/menus/menu-page";
import { DiningCategoryPage } from "@/menus/category-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Menus",
  description: "Explore dining hall menus, ingredients, nutrition information, and reported allergens.",
};

interface MenusRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MenusRoute({ searchParams }: MenusRouteProps) {
  const params = await searchParams;
  const category = typeof params.category === "string" && isDiningCategory(params.category) ? params.category : undefined;
  if (params.category !== undefined && !category) {
    return <DiningLandingPage notice="That category is not available. Choose a dining location below." />;
  }
  const hallId = typeof params.hall === "string" ? params.hall : undefined;
  if (!hallId) return category ? <DiningCategoryPage categoryId={category} /> : <DiningLandingPage />;

  const campusLocation = findCampusLocation(hallId);
  const hall = campusLocation ?? DEMO_DINING_HALLS.find((entry) => entry.id === hallId);
  if (!hall || (category && campusLocation?.categoryId !== category)) {
    const notice = "That dining location is not available. Choose a location below.";
    return category ? <DiningCategoryPage categoryId={category} notice={notice} /> : <DiningLandingPage notice={notice} />;
  }

  const date = typeof params.date === "string" && isMenuDate(params.date) ? params.date : getCampusDate();
  const requestedMeal = MEALS.find((entry) => entry.id === params.meal)?.id;
  const defaultMeal = hall.meals?.includes("lunch") ? "lunch" : hall.meals?.includes("daily-offerings") ? "daily-offerings" : hall.meals?.[0] ?? "lunch";
  const meal = requestedMeal && (!hall.meals || hall.meals.includes(requestedMeal)) ? requestedMeal : defaultMeal;

  return <MenuPage key={`${hall.id}:${date}:${meal}`} initialHallId={hall.id} initialDate={date} initialMeal={meal} />;
}
