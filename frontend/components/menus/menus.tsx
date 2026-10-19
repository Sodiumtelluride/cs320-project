"use client";

import { useCallback, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMenuDate, formatUpdatedAt, getCampusDate, isMenuDate, shiftMenuDate } from "@/lib/menus/date";
import { MEALS, type DiningHall, type MealId, type MenuDataSource, type MenuFood, type MenuQuery } from "@/lib/menus/types";
import { FoodDetailsDialog } from "./food-details-dialog";
import { MenuLegend, MenuTags } from "./menu-tags";
import { useMenuResource } from "./use-menu-resource";

export interface MenusProps {
  diningHalls: readonly DiningHall[];
  dataSource: MenuDataSource;
  initialHallId?: string;
  initialDate?: string;
  initialMeal?: MealId;
  onSelectionChange?: (query: MenuQuery) => void;
  className?: string;
}

function MenuResults({ query, diningHallName, dataSource }: {
  query: MenuQuery;
  diningHallName: string;
  dataSource: MenuDataSource;
}) {
  const { diningHallId, date, meal } = query;
  const load = useCallback((signal: AbortSignal) => dataSource.getMenu({ diningHallId, date, meal }, signal), [dataSource, diningHallId, date, meal]);
  const { state, retry } = useMenuResource(load);
  const [selectedFood, setSelectedFood] = useState<MenuFood | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  if (state.status === "loading") return <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Loading menu…</div>;
  if (state.status === "error") return <div role="alert" className="rounded-lg border p-6"><h3 className="font-semibold">Menu unavailable</h3><p className="mt-2 text-sm text-muted-foreground">The selected menu could not be loaded. Please try again.</p><Button variant="outline" className="mt-4" onClick={retry}>Try again</Button></div>;

  const menu = state.data;
  const stations = menu.stations.filter((station) => station.foods.length > 0);
  const mealName = MEALS.find((meal) => meal.id === query.meal)!.label;

  return (
    <>
      <section aria-label={`${mealName} menu`} className="rounded-lg border bg-background p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-4">
          <h3 className="text-xl font-semibold">{mealName}</h3>
          {menu.updatedAt && <p className="text-xs text-muted-foreground">Updated {formatUpdatedAt(menu.updatedAt)} ET</p>}
        </div>
        {stations.length === 0 ? <div role="status" className="py-10 text-center"><Utensils aria-hidden="true" className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 font-medium">No menu published for this selection.</p><p className="mt-1 text-sm text-muted-foreground">Choose another date or meal.</p></div> :
          <div className="divide-y">
            {stations.map((station) => <section key={station.id} className="py-5 first:pt-5 last:pb-0">
              <h4 className="mb-2 text-lg font-semibold">{station.name}</h4>
              <ul className="space-y-1">
                {station.foods.map((food) => <li key={food.id} className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <Button variant="link" size="sm" aria-haspopup="dialog"
                    className="h-auto min-h-8 max-w-full justify-start whitespace-normal px-0 py-1 text-left font-normal leading-relaxed text-foreground underline underline-offset-4 hover:text-primary"
                    onClick={(event) => { trigger.current = event.currentTarget; setSelectedFood(food); }}>
                    {food.name}
                  </Button>
                  <MenuTags dietaryTags={food.dietaryTags} carbonRating={food.carbonRating} />
                </li>)}
              </ul>
            </section>)}
          </div>}
      </section>
      <FoodDetailsDialog food={selectedFood} query={query} diningHallName={diningHallName}
        dataSource={dataSource} returnFocusRef={trigger} onClose={() => setSelectedFood(null)} />
    </>
  );
}

function MenuBrowser({ diningHalls, dataSource, initialHallId, initialDate, initialMeal = "lunch", onSelectionChange, className }: MenusProps) {
  const controlsId = useId();
  const [selection, setSelection] = useState(() => ({
    diningHallId: diningHalls.find((hall) => hall.id === initialHallId)?.id ?? diningHalls[0].id,
    date: initialDate && isMenuDate(initialDate) ? initialDate : getCampusDate(),
    meal: initialMeal,
  }));
  const hall = diningHalls.find((entry) => entry.id === selection.diningHallId) ?? diningHalls[0];
  const availableMeals = MEALS.filter((meal) => !hall.meals || hall.meals.includes(meal.id));
  const meal = availableMeals.find((entry) => entry.id === selection.meal)?.id ?? availableMeals.find((entry) => entry.id === "lunch")?.id ?? availableMeals[0]?.id ?? "lunch";
  const query: MenuQuery = { diningHallId: hall.id, date: selection.date, meal };

  function select(next: MenuQuery) {
    setSelection(next);
    onSelectionChange?.(next);
  }

  function selectHall(id: string) {
    const nextHall = diningHalls.find((entry) => entry.id === id)!;
    const options = MEALS.filter((entry) => !nextHall.meals || nextHall.meals.includes(entry.id));
    const nextMeal = options.find((entry) => entry.id === query.meal)?.id ?? options.find((entry) => entry.id === "lunch")?.id ?? options[0]?.id ?? "lunch";
    select({ ...query, diningHallId: id, meal: nextMeal });
  }

  const fieldClass = "h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <div className={cn("space-y-6", className)}>
      {dataSource.mode === "demo" && <div className="rounded-md border bg-muted/50 px-4 py-3 text-sm"><span className="font-semibold">Sample menu</span><span className="text-muted-foreground"> · Development data, not a current dining menu.</span></div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor={`${controlsId}-hall`} className="mb-2 block text-sm font-medium">Dining hall</label>
          <select id={`${controlsId}-hall`} className={fieldClass} value={hall.id} onChange={(event) => selectHall(event.target.value)}>
            {diningHalls.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select>
        </div>
        <div><label htmlFor={`${controlsId}-date`} className="mb-2 block text-sm font-medium">Menu date</label>
          <div className="flex gap-2">
            <Button variant="outline" className="size-10 shrink-0" aria-label="Previous day" onClick={() => select({ ...query, date: shiftMenuDate(query.date, -1) })}><ChevronLeft aria-hidden="true" /></Button>
            <input id={`${controlsId}-date`} className={cn(fieldClass, "min-w-0")} type="date" value={query.date}
              onChange={(event) => { if (isMenuDate(event.target.value)) select({ ...query, date: event.target.value }); }} />
            <Button variant="outline" className="size-10 shrink-0" aria-label="Next day" onClick={() => select({ ...query, date: shiftMenuDate(query.date, 1) })}><ChevronRight aria-hidden="true" /></Button>
          </div>
        </div>
      </div>
      <div><h2 className="text-2xl font-semibold tracking-tight">{hall.name} Menu</h2><p className="mt-1 text-sm text-muted-foreground">Menu for {formatMenuDate(query.date)}</p></div>
      <div role="group" aria-label="Meal" className="flex flex-wrap gap-2">
        {availableMeals.map((entry) => <Button key={entry.id} size="sm" variant={entry.id === query.meal ? "default" : "outline"}
          aria-pressed={entry.id === query.meal} onClick={() => select({ ...query, meal: entry.id })}>{entry.label}</Button>)}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_13rem]">
        {availableMeals.length ? <MenuResults key={`${query.diningHallId}:${query.date}:${query.meal}`} query={query} diningHallName={hall.name} dataSource={dataSource} /> : <p role="status">No meal periods are configured for this dining hall.</p>}
        <MenuLegend />
      </div>
    </div>
  );
}

export function Menus(props: MenusProps) {
  if (props.diningHalls.length === 0) return <p role="status">No dining halls are configured.</p>;
  return <MenuBrowser {...props} />;
}
