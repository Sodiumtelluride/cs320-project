"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, UserRound, Utensils } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/map", label: "Map", icon: Map },
  { href: "/menus", label: "Menus", icon: Utensils },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading, openAuth } = useAuth();
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-6 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:gap-3" aria-label="UMass Dining home">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:size-10">
            <Utensils className="size-5" aria-hidden="true" />
          </span>
          <span className="whitespace-nowrap text-sm font-bold tracking-tight sm:text-xl">UMass <span className="text-primary">Dining</span></span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {user ? <span className="text-xs text-muted-foreground sm:text-sm">Signed in</span> : <>
            <Button variant="ghost" size="sm" disabled={loading} onClick={() => openAuth("login")}>Log in</Button>
            <Button size="sm" disabled={loading} onClick={() => openAuth("signup")}>Sign up</Button>
          </>}
        </div>
      </div>
      <nav aria-label="Main navigation" className="border-t">
        <div className="mx-auto grid max-w-5xl grid-cols-4 gap-2 px-6 py-3 sm:px-8">
          {links.map(({ href, label, icon: Icon }) => (
            <Button key={href} asChild variant={pathname === href ? "default" : "ghost"} className="h-auto flex-col gap-1 px-2 py-2 text-xs sm:h-9 sm:flex-row sm:px-3 sm:text-sm">
              <Link href={href} aria-current={pathname === href ? "page" : undefined}><Icon aria-hidden="true" />{label}</Link>
            </Button>
          ))}
        </div>
      </nav>
    </header>
  );
}
