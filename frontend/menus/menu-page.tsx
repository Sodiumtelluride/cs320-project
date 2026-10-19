"use client";

import { BackButton } from "@/components/back-button";
import { Menus } from "@/components/menus/menus";
import { createHttpMenuDataSource } from "@/lib/menus/http-menu-data-source";
import { DEMO_DINING_HALLS } from "@/lib/menus/dining-halls";

const apiBaseUrl = process.env.NEXT_PUBLIC_MENU_API_BASE_URL?.trim();
const dataSource = createHttpMenuDataSource({
  baseUrl: apiBaseUrl || "/api/menu-demo",
  mode: apiBaseUrl ? "live" : "demo",
});

export function MenuPage({ initialDate }: { initialDate: string }) {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 sm:px-8 sm:py-16">
      <BackButton className="mb-8" />
      <div className="mb-8 max-w-2xl">
        <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-primary">CAMPUS DINING</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Dining menus</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">Choose a dining hall, date, and meal. Select any food to view its nutrition, ingredients, and reported allergens.</p>
      </div>
      <Menus diningHalls={DEMO_DINING_HALLS} dataSource={dataSource} initialHallId="berkshire" initialDate={initialDate} initialMeal="lunch" />
    </main>
  );
}
