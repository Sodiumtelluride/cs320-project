import Link from "next/link";
import { Utensils } from "lucide-react";
import { LoginButton } from "@/components/login-button";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-6 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:gap-3" aria-label="UMass Dining home">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:size-10">
            <Utensils className="size-5" aria-hidden="true" />
          </span>
          <span className="whitespace-nowrap text-sm font-bold tracking-tight sm:text-xl">UMass <span className="text-primary">Dining</span></span>
        </Link>
        <nav className="flex shrink-0 items-center gap-3 sm:gap-7" aria-label="Main navigation">
          <Link href="/about" className="rounded-sm text-sm font-medium underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">About</Link>
          <LoginButton />
        </nav>
      </div>
    </header>
  );
}
