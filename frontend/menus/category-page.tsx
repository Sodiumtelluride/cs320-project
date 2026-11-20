import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiningHallCards } from "@/components/menus/dining-hall-cards";
import { DiningCategoryCard } from "@/components/menus/dining-category-cards";
import { DINING_CATEGORIES, getDirectCategoryLocations, type DiningCategoryId } from "@/lib/menus/campus-locations";
import { categoryHref } from "@/lib/menus/links";

export function DiningCategoryPage({ categoryId, notice }: { categoryId: DiningCategoryId; notice?: string }) {
  const category = DINING_CATEGORIES.find((entry) => entry.id === categoryId)!;
  const parent = DINING_CATEGORIES.find((entry) => entry.id === category.parentId);
  const groups = DINING_CATEGORIES.filter((entry) => entry.parentId === categoryId);
  const locations = getDirectCategoryLocations(categoryId);
  return (
    <>
      <Button asChild variant="outline" className="mb-8"><Link href={parent ? categoryHref(parent.id) : "/"}><ArrowLeft aria-hidden="true" />{parent ? `All ${parent.name} locations` : "All dining locations"}</Link></Button>
      <div className="mb-8 max-w-2xl">
        <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-primary">CAMPUS DINING</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{category.name}</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">{category.description} {groups.length ? "Choose a card to explore its locations or menu." : "Choose a location to view its information and menu."}</p>
      </div>
      {notice && <p role="alert" className="mb-6 rounded-md border bg-accent p-4 text-sm text-primary">{notice}</p>}
      <section aria-label={`${category.name} locations`}>
        <p className="mb-5 text-sm text-muted-foreground">{groups.length + locations.length} {groups.length ? "options" : "locations"}</p>
        <DiningHallCards diningHalls={locations}>
          {groups.map((group) => <DiningCategoryCard key={group.id} category={group} />)}
        </DiningHallCards>
      </section>
      <a href={category.sourceUrl} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-1 rounded-sm text-sm text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
        UMass Dining location information<ExternalLink aria-hidden="true" className="size-3.5" />
      </a>
    </>
  );
}
