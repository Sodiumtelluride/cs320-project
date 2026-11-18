import Link from "next/link";
import { ArrowUpRight, Building2, Coffee, ShoppingBag, Utensils } from "lucide-react";
import { TOP_LEVEL_DINING_CATEGORIES, getCategoryLocations, type DiningCategory } from "@/lib/menus/campus-locations";
import { categoryHref } from "@/lib/menus/links";
import { cn } from "@/lib/utils";

export function DiningCategoryCard({ category, compact = false }: { category: DiningCategory; compact?: boolean }) {
  const Icon = category.id === "grab-n-go" ? ShoppingBag : category.id === "campus-center" ? Building2 : category.id === "blue-wall" ? Utensils : Coffee;
  return (
    <Link href={categoryHref(category.id)} aria-label={`Browse ${category.name} locations`}
      className={cn("group flex h-full min-w-0 flex-col rounded-xl border border-border bg-background text-left transition-colors hover:border-primary hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring", compact ? "gap-3 p-4" : "gap-5 p-6 sm:p-7")}>
      <span aria-hidden="true" className="flex items-center justify-between gap-3 text-primary">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent"><Icon className="size-5" /></span>
        <ArrowUpRight className="size-5" />
      </span>
      <span className={cn("font-semibold tracking-tight", compact ? "text-lg" : "text-2xl")}>{category.name}</span>
      {!compact && <span className="text-sm leading-relaxed text-muted-foreground">{category.description}</span>}
      <span className="text-sm font-medium text-primary">{getCategoryLocations(category.id).length} locations</span>
    </Link>
  );
}

export function DiningCategoryCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TOP_LEVEL_DINING_CATEGORIES.map((category) => <DiningCategoryCard key={category.id} category={category} compact={compact} />)}
    </div>
  );
}
