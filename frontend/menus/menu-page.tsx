"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menus } from "@/components/menus/menus";
import { DiningCategoryCards } from "@/components/menus/dining-category-cards";
import { DINING_CATEGORIES, findCampusLocation, getCategoryLocations } from "@/lib/menus/campus-locations";
import { snapshotDataSource } from "@/lib/menus/snapshot-cache";
import { DEMO_DINING_HALLS } from "@/lib/menus/dining-halls";
import { categoryHref, menuHref } from "@/lib/menus/links";
import type { DiningHall, MealId, MenuDataSource, MenuQuery } from "@/lib/menus/types";

interface MenuPageProps {
  initialHallId: string;
  initialDate: string;
  initialCampusDate?: string;
  initialMeal?: MealId;
  dataSource?: MenuDataSource;
  onSelectionChange?: (query: MenuQuery) => void;
  diningHalls?: readonly DiningHall[];
}

function updateSelectionUrl(query: MenuQuery) {
  window.history.replaceState(window.history.state, "", menuHref(query.diningHallId, query));
}

export function MenuPage({ initialHallId, initialDate, initialCampusDate, initialMeal = "lunch", dataSource, onSelectionChange = updateSelectionUrl, diningHalls }: MenuPageProps) {
  const [locationId, setLocationId] = useState(initialHallId);
  const location = findCampusLocation(locationId);
  const category = location && DINING_CATEGORIES.find((entry) => entry.id === location.categoryId);
  const locations = diningHalls ?? (location ? getCategoryLocations(location.categoryId) : DEMO_DINING_HALLS);
  const source = dataSource ?? snapshotDataSource;

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
        <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">{location?.menuDateMode === "today-only" ? "View today’s menu." : "Choose a location, date, and menu section."} Select an item for ingredients, nutrition, and reported allergens.</p>
      </div>
      {location && <section aria-label="About this location" className="mb-8 rounded-xl border bg-muted/30 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{location.name}</h2>
        <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{location.area}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{location.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-primary">
          <a href={location.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">UMass Dining location information<ExternalLink aria-hidden="true" className="size-3" /></a>
          {location.todayMenuUrl && <a href={location.todayMenuUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">View today’s menu on UMass Dining<ExternalLink aria-hidden="true" className="size-3" /></a>}
        </div>
      </section>}
      <Menus diningHalls={locations} dataSource={source} initialHallId={initialHallId} initialDate={initialDate} initialCampusDate={initialCampusDate} initialMeal={initialMeal} onSelectionChange={handleSelectionChange}
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
