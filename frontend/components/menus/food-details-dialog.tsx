"use client";

import { useCallback, type RefObject } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMenuDate, formatUpdatedAt } from "@/lib/menus/date";
import { MEALS, type MenuDataSource, type MenuFood, type MenuQuery } from "@/lib/menus/types";
import { MenuTags } from "./menu-tags";
import { NutritionFacts } from "./nutrition-facts";
import { useMenuResource } from "./use-menu-resource";

interface FoodDetailsDialogProps {
  food: MenuFood | null;
  query: MenuQuery;
  diningHallName: string;
  dataSource: MenuDataSource;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

function FoodDetailsContent({ food, query, dataSource }: {
  food: MenuFood;
  query: MenuQuery;
  dataSource: MenuDataSource;
}) {
  const { diningHallId, date, meal } = query;
  const load = useCallback((signal: AbortSignal) => dataSource.getFoodDetails({ diningHallId, date, meal, foodId: food.id }, signal), [dataSource, diningHallId, date, meal, food.id]);
  const { state, retry } = useMenuResource(load);

  if (state.status === "loading") {
    return <div role="status" className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Loading food details…</div>;
  }
  if (state.status === "error") {
    return <div role="alert" className="space-y-3 p-6"><p>Food details could not be loaded.</p><Button variant="outline" onClick={retry}>Try again</Button></div>;
  }

  const details = state.data;
  return (
    <div className="p-6 pt-0">
      {dataSource.mode === "demo" && <p className="mb-5 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Sample nutrition, ingredients, and allergens for development.</p>}
      <div className="grid items-start gap-6 sm:grid-cols-2">
        <NutritionFacts nutrition={details.nutrition} />
        <div className="space-y-6 text-sm">
          <section aria-label="Healthfulness indicator">
            <div className="flex justify-between gap-3 font-semibold"><h3>Healthfulness indicator</h3><span>{details.healthfulnessScore == null ? "Not provided" : `${details.healthfulnessScore}/7`}</span></div>
            {details.healthfulnessScore != null && <div role="progressbar" aria-label="Healthfulness score" aria-valuemin={0} aria-valuemax={7} aria-valuenow={details.healthfulnessScore} className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${details.healthfulnessScore / 7 * 100}%` }} />
            </div>}
          </section>
          <section><h3 className="font-semibold">Carbon footprint rating</h3><p className="mt-1 text-muted-foreground">{details.carbonRating ?? "Not provided"}</p></section>
          <section><h3 className="font-semibold">Diet</h3>
            <div className="mt-2"><MenuTags dietaryTags={details.dietaryTags} carbonRating={null} /></div>
            <p className="mt-2 text-muted-foreground">{details.dietaryTags.length ? details.dietaryTags.map((tag) => ({ halal: "Halal", local: "Local", vegetarian: "Vegetarian", "plant-based": "Plant Based" })[tag]).join(", ") : "No dietary tags provided"}</p>
          </section>
          <section><h3 className="font-semibold">Reported allergens</h3><p className="mt-1 leading-relaxed text-muted-foreground">{details.allergens == null ? "Allergen information has not been provided." : details.allergens.length ? details.allergens.join(", ") : "No allergens reported."}</p></section>
        </div>
      </div>
      <section className="mt-6 border-t pt-5"><h3 className="text-sm font-semibold">Ingredients</h3><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{details.ingredients ?? "Ingredients have not been provided."}</p></section>
      {(details.updatedAt || details.sourceUrl) && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        {details.updatedAt && <p>Updated {formatUpdatedAt(details.updatedAt)} ET</p>}
        {details.sourceUrl && <a href={details.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">View source<ExternalLink aria-hidden="true" className="size-3" /></a>}
      </div>}
    </div>
  );
}

export function FoodDetailsDialog({ food, query, diningHallName, dataSource, returnFocusRef, onClose }: FoodDetailsDialogProps) {
  return (
    <Dialog open={food !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} className="max-h-[85svh] gap-0 overflow-y-auto p-0 sm:max-w-3xl"
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocusRef.current?.focus(); }}>
        <DialogHeader className="p-6 text-left">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="pt-1 text-xl leading-snug">{food?.name ?? "Food details"}</DialogTitle>
            <DialogClose asChild><Button variant="outline" size="sm">Close</Button></DialogClose>
          </div>
          <DialogDescription>{diningHallName} · {MEALS.find((meal) => meal.id === query.meal)?.label} · {formatMenuDate(query.date)}</DialogDescription>
        </DialogHeader>
        {food && <FoodDetailsContent key={food.id} food={food} query={query} dataSource={dataSource} />}
      </DialogContent>
    </Dialog>
  );
}
