"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menus } from "@/components/menus/menus";
import { DiningCategoryCards } from "@/components/menus/dining-category-cards";
import { DINING_CATEGORIES, findCampusLocation, getCategoryLocations } from "@/lib/menus/campus-locations";
import { createHttpMenuDataSource } from "@/lib/menus/http-menu-data-source";
import { DEMO_DINING_HALLS } from "@/lib/menus/dining-halls";
import { categoryHref, menuHref } from "@/lib/menus/links";
import type { DiningHall, MealId, MenuDataSource, MenuQuery } from "@/lib/menus/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_MENU_API_BASE_URL?.trim();
const defaultDataSource = createHttpMenuDataSource({
  baseUrl: apiBaseUrl || "/api/menu-demo",
  mode: apiBaseUrl ? "live" : "demo",
});
const campusDataSource = createHttpMenuDataSource({
  baseUrl: apiBaseUrl || "/api/menu-pending",
  mode: apiBaseUrl ? "live" : "pending",
});

interface MenuPageProps {
  initialHallId: string;
  initialDate: string;
  initialMeal?: MealId;
  dataSource?: MenuDataSource;
  onSelectionChange?: (query: MenuQuery) => void;
  diningHalls?: readonly DiningHall[];
}

function updateSelectionUrl(query: MenuQuery) {
  window.history.replaceState(window.history.state, "", menuHref(query.diningHallId, query));
}

export function MenuPage({ initialHallId, initialDate, initialMeal = "lunch", dataSource, onSelectionChange = updateSelectionUrl, diningHalls }: MenuPageProps) {
  const [locationId, setLocationId] = useState(initialHallId);
  const location = findCampusLocation(locationId);
  const category = location && DINING_CATEGORIES.find((entry) => entry.id === location.categoryId);
  const locations = diningHalls ?? (location ? getCategoryLocations(location.categoryId) : DEMO_DINING_HALLS);
  const source = dataSource ?? (location ? campusDataSource : defaultDataSource);

  function handleSelectionChange(query: MenuQuery) {
    setLocationId(query.diningHallId);
    onSelectionChange(query);
  }

  return (
    <>
      <Button asChild variant="outline" className="mb-8"><Link href={category ? categoryHref(category.id) : "/"}><ArrowLeft aria-hidden="true" />{category ? `All ${category.name} locations` : "All dining locations"}</Link></Button>
      <div className="mb-8">
        <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-primary">CAMPUS DINING</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{category ? `${category.name} menus` : "Dining hall menus"}</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">Choose a location, date, and menu section. Select an item for ingredients, nutrition, and reported allergens.</p>
      </div>
      {location && <section aria-label="About this location" className="mb-8 rounded-xl border bg-muted/30 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{location.name}</h2>
        <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{location.area}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{location.description}</p>
        <a href={location.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 rounded-sm text-xs text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">UMass Dining location information<ExternalLink aria-hidden="true" className="size-3" /></a>
      </section>}
      <Menus diningHalls={locations} dataSource={source} initialHallId={initialHallId} initialDate={initialDate} initialMeal={initialMeal} onSelectionChange={handleSelectionChange}
        locationHeading={category ? "Choose a location" : "Choose a dining hall"} periodLabel={category ? "Menu section" : "Meal"} />
      <section aria-label="More dining locations" className="mt-10 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold">Explore more locations</h2>
        <DiningCategoryCards compact />
      </section>
      <p className="mt-8 text-sm">
        <Link href="/about" className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">About UMass Dining</Link>
      </p>
    </>
  );
}
