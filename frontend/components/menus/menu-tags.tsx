import Image from "next/image";
import { useId } from "react";
import type { CarbonRating, DietaryTag } from "@/lib/menus/types";

const tags: Record<DietaryTag, { label: string; file: string }> = {
  vegetarian: { label: "Vegetarian", file: "icon-veg-v2.png" },
  local: { label: "Local", file: "icon-loc-v2.png" },
  halal: { label: "Halal", file: "icon-hal-v2.png" },
  "plant-based": { label: "Plant Based", file: "icon-plant-v2.png" },
};

export function MenuTags({ dietaryTags, carbonRating }: {
  dietaryTags: readonly DietaryTag[];
  carbonRating: CarbonRating | null;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {dietaryTags.map((tag) => (
        <Image key={tag} src={`/menu-tags/${tags[tag].file}`} alt={tags[tag].label}
          title={tags[tag].label} width={20} height={20} unoptimized className="size-5" />
      ))}
      {carbonRating && (
        <Image src={`/menu-tags/icon-cr-${carbonRating.toLowerCase()}-v2.png`}
          alt={`Carbon footprint rating ${carbonRating}`} title={`Carbon footprint rating ${carbonRating}`}
          width={20} height={20} unoptimized className="size-5" />
      )}
    </span>
  );
}

export function MenuLegend() {
  const legendId = useId();
  return (
    <aside aria-labelledby={legendId} className="h-fit rounded-lg border bg-muted/40 p-5">
      <h3 id={legendId} className="font-semibold">Menu legend</h3>
      <ul className="mt-4 space-y-3 text-sm">
        {Object.entries(tags).map(([id, tag]) => (
          <li key={id} className="flex items-center gap-2">
            <Image src={`/menu-tags/${tag.file}`} alt="" width={24} height={24} unoptimized className="size-6" />
            {tag.label}
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t pt-4 text-xs font-medium">Carbon footprint rating</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(["A", "B", "C", "D", "E"] as const).map((rating) => (
          <MenuTags key={rating} dietaryTags={[]} carbonRating={rating} />
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Tags and ratings appear only when reported.</p>
    </aside>
  );
}
