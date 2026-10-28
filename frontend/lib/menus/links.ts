import type { MenuQuery } from "./types";
import type { DiningCategoryId } from "./campus-locations";

export function categoryHref(category: DiningCategoryId): string {
  return `/menus?${new URLSearchParams({ category }).toString()}`;
}

export function menuHref(diningHallId: string, selection?: Pick<MenuQuery, "date" | "meal">): string {
  const params = new URLSearchParams({ hall: diningHallId });
  if (selection) {
    params.set("date", selection.date);
    params.set("meal", selection.meal);
  }
  return `/menus?${params.toString()}`;
}
