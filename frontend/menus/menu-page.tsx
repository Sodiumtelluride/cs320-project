"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menus } from "@/components/menus/menus";
import { createHttpMenuDataSource } from "@/lib/menus/http-menu-data-source";
import { DEMO_DINING_HALLS } from "@/lib/menus/dining-halls";
import { menuHref } from "@/lib/menus/links";
import type { MealId, MenuDataSource, MenuQuery } from "@/lib/menus/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_MENU_API_BASE_URL?.trim();
const defaultDataSource = createHttpMenuDataSource({
  baseUrl: apiBaseUrl || "/api/menu-demo",
  mode: apiBaseUrl ? "live" : "demo",
});

interface MenuPageProps {
  initialHallId: string;
  initialDate: string;
  initialMeal?: MealId;
  dataSource?: MenuDataSource;
  onSelectionChange?: (query: MenuQuery) => void;
}

function updateSelectionUrl(query: MenuQuery) {
  window.history.replaceState(window.history.state, "", menuHref(query.diningHallId, query));
}

export function MenuPage({ initialHallId, initialDate, initialMeal = "lunch", dataSource = defaultDataSource, onSelectionChange = updateSelectionUrl }: MenuPageProps) {
  return (
    <>
      <Button asChild variant="outline" className="mb-8"><Link href="/"><ArrowLeft aria-hidden="true" />All dining halls</Link></Button>
      <div className="mb-8">
        <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-primary">CAMPUS DINING</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Dining hall menus</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">Choose a location, date, and meal. Select a dish for ingredients, nutrition, and reported allergens.</p>
      </div>
      <Menus diningHalls={DEMO_DINING_HALLS} dataSource={dataSource} initialHallId={initialHallId} initialDate={initialDate} initialMeal={initialMeal} onSelectionChange={onSelectionChange} />
      <p className="mt-8 text-sm">
        <Link href="/about" className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">About UMass Dining</Link>
      </p>
    </>
  );
}
