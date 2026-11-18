"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Utensils } from "lucide-react";
import { DINING_CATEGORIES, getCategoryLocations, type DiningCategoryId } from "@/lib/menus/campus-locations";
import { DEMO_DINING_HALLS } from "@/lib/menus/dining-halls";
import { menuHref } from "@/lib/menus/links";
import { cn } from "@/lib/utils";

const itemClass = "flex h-11 w-full items-center justify-between gap-3 rounded-sm px-3 text-left text-sm whitespace-nowrap hover:bg-accent hover:text-primary focus-visible:bg-accent focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring";

export function MenuNavigation({ active }: { active: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<DiningCategoryId | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLUListElement>(null);
  const flyout = useRef<HTMLUListElement>(null);
  const categoryButtons = useRef<Partial<Record<DiningCategoryId, HTMLButtonElement | null>>>({});
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusFrame = useRef<number | null>(null);

  function cancelClose() {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  function close() {
    cancelClose();
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = null;
    setOpen(false);
    setCategory(null);
  }

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
        setCategory(null);
      }
    }
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    function position() {
      const anchor = root.current;
      const primary = panel.current;
      if (!anchor || !primary) return;
      const margin = 8;
      const gap = 4;
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const width = Math.min(224, viewportWidth - margin * 2);
      const anchorBounds = anchor.getBoundingClientRect();
      const top = Math.max(margin, anchorBounds.bottom + gap);
      const left = Math.max(margin, Math.min(anchorBounds.left, viewportWidth - width - margin));
      Object.assign(primary.style, {
        left: `${left}px`, top: `${top}px`, width: `${width}px`,
        maxHeight: `${Math.max(44, window.innerHeight - top - margin)}px`,
        visibility: "visible",
      });

      const secondary = flyout.current;
      const button = category ? categoryButtons.current[category] : null;
      if (!secondary || !button) return;
      const primaryBounds = primary.getBoundingClientRect();
      const buttonBounds = button.getBoundingClientRect();
      const flyoutWidth = Math.min(288, viewportWidth - margin * 2);
      const right = primaryBounds.right + gap;
      const leftSide = primaryBounds.left - flyoutWidth - gap;
      // Use the other side near an edge; stack below on screens too narrow for two panels.
      const beside = right + flyoutWidth <= viewportWidth - margin || leftSide >= margin;
      const flyoutLeft = beside
        ? (right + flyoutWidth <= viewportWidth - margin ? right : leftSide)
        : Math.max(margin, Math.min(left, viewportWidth - flyoutWidth - margin));
      const maximumHeight = buttonBounds.height * 5 + 10;
      const preferredTop = beside ? buttonBounds.top - 5 : primaryBounds.bottom + gap;
      const flyoutTop = Math.max(margin, Math.min(preferredTop, window.innerHeight - maximumHeight - margin));
      Object.assign(secondary.style, {
        left: `${flyoutLeft}px`, top: `${flyoutTop}px`, width: `${flyoutWidth}px`,
        // Five equal rows remain visible; additional names scroll inside this panel.
        maxHeight: `${Math.max(44, Math.min(maximumHeight, window.innerHeight - flyoutTop - margin))}px`,
        visibility: "visible",
      });
    }

    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, category]);

  function focusFirst(list: { current: HTMLUListElement | null }) {
    // Wait for the list to mount; a newer keypress replaces an earlier focus request.
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      list.current?.querySelector<HTMLElement>("a, button")?.focus();
    });
  }

  return (
    <div
      ref={root}
      className={cn("relative flex min-w-0 flex-col rounded-md transition-colors sm:flex-row", open || active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary hover:text-primary-foreground")}
      onPointerEnter={(event) => {
        cancelClose();
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={() => {
        // Allow time to cross the small gap between a category and its side panel.
        cancelClose();
        closeTimer.current = setTimeout(() => {
          if (!root.current?.contains(document.activeElement)) close();
        }, 180);
      }}
      onFocusCapture={(event) => {
        cancelClose();
        if (!event.currentTarget.contains(event.relatedTarget) && !toggle.current?.contains(event.target)) setOpen(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          close();
          toggle.current?.focus();
        }
      }}
    >
      <Link
        href="/menus"
        aria-current={active ? "page" : undefined}
        className="inline-flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-9 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"
        onClick={close}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            focusFirst(panel);
          }
        }}
      >
        <Utensils className="size-4 shrink-0" aria-hidden="true" />Menus
      </Link>
      <button
        ref={toggle}
        type="button"
        aria-label="Show dining locations"
        aria-expanded={open}
        aria-controls={`${id}-locations`}
        className="flex h-6 shrink-0 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-9 sm:w-7"
        onClick={() => {
          if (open) close();
          else setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            focusFirst(panel);
          }
        }}
      >
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </button>
      {open && (
        <ul ref={panel} id={`${id}-locations`} aria-label="Dining locations" className="fixed z-50 overflow-y-auto overscroll-contain rounded-md border bg-background p-1 text-foreground shadow-lg" style={{ visibility: "hidden" }}>
          {/* Reuse the directory data so navigation and location cards share names and URLs. */}
          {DEMO_DINING_HALLS.map((hall) => (
            <li key={hall.id} onPointerEnter={(event) => { if (event.pointerType === "mouse") setCategory(null); }}>
              <Link href={menuHref(hall.id)} className={itemClass} onClick={close} onFocus={() => setCategory(null)}>{hall.name}</Link>
            </li>
          ))}
          {DINING_CATEGORIES.map((entry) => (
            <li key={entry.id} onPointerEnter={(event) => { if (event.pointerType === "mouse") setCategory(entry.id); }}>
              <button
                ref={(element) => { categoryButtons.current[entry.id] = element; }}
                type="button"
                aria-expanded={category === entry.id}
                aria-controls={`${id}-${entry.id}`}
                className={cn(itemClass, category === entry.id && "bg-accent text-primary")}
                onFocus={() => setCategory(entry.id)}
                onClick={() => setCategory(entry.id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    setCategory(entry.id);
                    focusFirst(flyout);
                  }
                }}
              >
                {entry.name}<ChevronRight className="size-4 shrink-0" aria-hidden="true" />
              </button>
              {category === entry.id && (
                <ul
                  ref={flyout}
                  id={`${id}-${entry.id}`}
                  aria-label={`${entry.name} locations`}
                  className="fixed z-50 overflow-y-auto overscroll-contain rounded-md border bg-background p-1 text-foreground shadow-lg"
                  style={{ visibility: "hidden" }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      categoryButtons.current[entry.id]?.focus();
                      setCategory(null);
                    }
                  }}
                >
                  {getCategoryLocations(entry.id).map((location) => (
                    <li key={location.id}><Link href={menuHref(location.id)} className={itemClass} onClick={close}>{location.name}</Link></li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
