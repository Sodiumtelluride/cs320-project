import type { MenuQuery } from "./types";

export function menuHref(diningHallId: string, selection?: Pick<MenuQuery, "date" | "meal">): string {
  const params = new URLSearchParams({ hall: diningHallId });
  if (selection) {
    params.set("date", selection.date);
    params.set("meal", selection.meal);
  }
  return `/menus?${params.toString()}`;
}
