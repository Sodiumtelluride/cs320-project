"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { filterSearchDemoItems, SEARCH_ALLERGENS, type SearchAllergen, type SearchDemoItem } from "./search-demo-data";

/** Frontend-only interaction prototype. Does not fetch data or read profile allergies. */
export function FoodSearch() {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [excluded, setExcluded] = useState<SearchAllergen[]>([]);
  const [selected, setSelected] = useState<SearchDemoItem | null>(null);
  const results = filterSearchDemoItems(query, excluded);
  const active = results[activeIndex];
  const optionId = (item: SearchDemoItem) => `${id}-item-${item.id}`;

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  useEffect(() => {
    if (open && active) document.getElementById(`${id}-item-${active.id}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, id, open]);

  function choose(item: SearchDemoItem) {
    setSelected(item);
    setOpen(false);
    setActiveIndex(-1);
  }

  function navigate(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (!results.length) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => current < 0 ? (direction === 1 ? 0 : results.length - 1) : (current + direction + results.length) % results.length);
    } else if (open && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      setActiveIndex(results.length ? (event.key === "Home" ? 0 : results.length - 1) : -1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && active) choose(active);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function toggle(allergen: SearchAllergen) {
    setExcluded((current) => current.includes(allergen) ? current.filter((entry) => entry !== allergen) : [...current, allergen]);
    setActiveIndex(-1);
  }

  return (
    <div ref={root} className="relative min-w-0" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <div className="flex min-w-0 items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <label htmlFor={`${id}-search`} className="sr-only">Search food items</label>
          <Search aria-hidden="true" className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
          <Input ref={input} id={`${id}-search`} role="combobox" type="text" autoComplete="off" spellCheck={false}
            placeholder="Search food…" value={query} className="h-10 pr-14 pl-9"
            aria-expanded={open} aria-controls={open ? `${id}-results` : undefined} aria-autocomplete="list"
            aria-activedescendant={open && active ? optionId(active) : undefined} aria-describedby={`${id}-hint`}
            onFocus={() => setOpen(true)} onKeyDown={navigate}
            onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1); }} />
          {query && <button type="button" aria-label="Clear food search" className="absolute top-0 right-0 flex h-10 w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            onClick={() => { setQuery(""); setActiveIndex(-1); input.current?.focus(); setOpen(true); }}>
            <X aria-hidden="true" className="size-4" />
          </button>}
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant={excluded.length ? "default" : "outline"} className="h-10 px-3" onClick={() => setOpen(false)}
              aria-label={`Allergy filters${excluded.length ? `, ${excluded.length} selected` : ""}`}>
              <SlidersHorizontal aria-hidden="true" />
              {excluded.length > 0 && <span>{excluded.length}</span>}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Allergy filters</DialogTitle>
              <DialogDescription>Choose allergens to exclude. Filters apply only to this search and are not saved to your profile.</DialogDescription>
            </DialogHeader>
            <fieldset className="grid grid-cols-2 gap-2">
              <legend className="sr-only">Exclude items reporting these allergens</legend>
              {SEARCH_ALLERGENS.map((allergen) => <label key={allergen} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-3 text-sm hover:bg-accent">
                <input type="checkbox" checked={excluded.includes(allergen)} onChange={() => toggle(allergen)} className="size-4 accent-primary" />
                {allergen}
              </label>)}
            </fieldset>
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Items with unknown allergen information are hidden when a filter is selected. Always confirm ingredients with dining staff.</p>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => { setExcluded([]); setActiveIndex(-1); }}>Clear filters</Button>
              <DialogClose asChild><Button>Done</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <p id={`${id}-hint`} className="sr-only">Use Up and Down arrows to browse, Enter to select an item, and Escape to close.</p>
      {open && <div className="absolute top-full right-0 left-0 z-40 mt-2 overflow-hidden rounded-xl border bg-background shadow-lg">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <span className="text-xs font-semibold text-primary">{query.trim() ? "Search results" : "Browse food items"}</span>
          <span className="text-xs text-muted-foreground" role="status">{results.length} {results.length === 1 ? "result" : "results"}{excluded.length ? " · filtered" : ""}</span>
        </div>
        <ul id={`${id}-results`} role="listbox" aria-label="Food results" className="max-h-64 overflow-y-auto overscroll-contain py-1">
          {results.map((item, index) => <li key={item.id} id={optionId(item)} role="option" aria-selected={activeIndex === index}
            onMouseDown={(event) => event.preventDefault()} onMouseMove={() => setActiveIndex(index)} onClick={() => choose(item)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") choose(item); }}
            className={cn("cursor-pointer px-4 py-3", activeIndex === index ? "bg-accent text-primary" : "hover:bg-muted/60")}>
            <span className="block text-sm font-medium">{item.name}</span>
            <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin aria-hidden="true" className="size-3" />{item.location}</span>
          </li>)}
        </ul>
        {!results.length && <p className="px-4 py-6 text-sm text-muted-foreground">No items match. Try another food or clear your filters.</p>}
      </div>}
      <Dialog open={selected !== null} onOpenChange={(isOpen) => { if (!isOpen) setSelected(null); }}>
        <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); input.current?.focus(); }}>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>{selected?.location}</DialogDescription>
          </DialogHeader>
          <DialogFooter><DialogClose asChild><Button>Back to search</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
