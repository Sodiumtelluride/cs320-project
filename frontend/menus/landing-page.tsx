import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { DiningHallCards } from "@/components/menus/dining-hall-cards";
import { DEMO_DINING_HALLS } from "@/lib/menus/dining-halls";
import type { DiningHall } from "@/lib/menus/types";

interface DiningLandingPageProps {
  diningHalls?: readonly DiningHall[];
  notice?: string;
}

export function DiningLandingPage({ diningHalls = DEMO_DINING_HALLS, notice }: DiningLandingPageProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main-content" className="sr-only z-50 rounded-md bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 sm:px-8 sm:py-16">
        <section aria-labelledby="dining-title" className="max-w-3xl">
          <p className="mb-5 text-xs font-semibold tracking-[0.18em] text-primary">UMASS AMHERST DINING</p>
          <h1 id="dining-title" className="text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">Good food.<br /><span className="text-primary">Your choice.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">Find your next meal. Choose a dining hall to explore its menu, ingredients, and nutrition information.</p>
        </section>
        <section aria-labelledby="locations-title" className="mt-10 border-t pt-8 sm:mt-12 sm:pt-10">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="locations-title" className="text-2xl font-semibold tracking-tight">Choose your dining hall</h2>
            <p className="text-sm text-muted-foreground">{diningHalls.length} dining commons</p>
          </div>
          {notice && <p role="alert" className="mb-5 rounded-md border bg-accent p-4 text-sm text-primary">{notice}</p>}
          {diningHalls.length ? <DiningHallCards diningHalls={diningHalls} /> : <p role="status">No dining halls are configured.</p>}
          <p className="mt-5 text-sm text-muted-foreground">Browse menus without an account. Select any dish to see its details.</p>
        </section>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-muted-foreground sm:px-8">
          <p>UMass Amherst · Amherst, Massachusetts</p>
          <Link href="/about" className="inline-flex items-center gap-1 rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">About UMass Dining <ArrowUpRight aria-hidden="true" className="size-3.5" /></Link>
        </div>
      </footer>
    </div>
  );
}
