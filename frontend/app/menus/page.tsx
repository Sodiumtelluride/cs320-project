import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getCampusDate } from "@/lib/menus/date";
import { MenuPage } from "@/menus/menu-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Menus | UMass Dining",
  description: "Browse dining hall menus, food ingredients, and nutrition information.",
};

export default function MenusRoute() {
  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main-content" className="sr-only z-50 rounded-md bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <SiteHeader />
      <MenuPage initialDate={getCampusDate()} />
      <footer className="border-t"><div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-8"><p>UMass Amherst · Amherst, Massachusetts</p><p>Student project · CS 320</p></div></footer>
    </div>
  );
}
