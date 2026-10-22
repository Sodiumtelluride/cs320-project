"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiningHall } from "@/lib/menus/types";
import { menuHref } from "@/lib/menus/links";

interface DiningHallCardsProps {
  diningHalls: readonly DiningHall[];
  selectedHallId?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
}

export function DiningHallCards({ diningHalls, selectedHallId, onSelect, compact = false }: DiningHallCardsProps) {
  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2")}>
      {diningHalls.map((hall) => {
        const selected = selectedHallId === hall.id;
        const className = cn(
          "group flex h-full min-w-0 flex-col rounded-xl border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
          compact ? "gap-3 p-4" : "gap-5 p-6 sm:p-7",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary hover:bg-accent/50",
        );
        const contents = (
          <>
            <span className="flex items-center justify-between gap-3" aria-hidden="true">
              <span className={cn("flex size-10 items-center justify-center rounded-xl", selected ? "bg-white/15" : "bg-accent text-primary")}>
                <Utensils className="size-5" />
              </span>
              {selected ? <Check className="size-5" /> : <ArrowUpRight className="size-5 text-primary" />}
            </span>
            <span className="block">
              <span className={cn("block font-semibold tracking-tight", compact ? "text-base sm:text-lg" : "text-2xl")}>{hall.name}</span>
              <span className={cn("mt-1 block text-sm", selected ? "text-white/80" : "text-muted-foreground")}>Dining Commons</span>
            </span>
            {!compact && <span className="flex items-center gap-2 text-sm font-medium text-primary">View menu <span aria-hidden="true">→</span></span>}
          </>
        );

        return onSelect ? (
          <button key={hall.id} type="button" className={className} aria-label={`Select ${hall.name}`} aria-pressed={selected} onClick={() => onSelect(hall.id)}>
            {contents}
          </button>
        ) : (
          <Link key={hall.id} href={menuHref(hall.id)} className={className} aria-label={`View ${hall.name} menu`}>
            {contents}
          </Link>
        );
      })}
    </div>
  );
}
