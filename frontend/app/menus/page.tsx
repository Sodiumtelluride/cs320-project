import type { Metadata } from "next";
import Link from "next/link";
import { Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Menus" };

export default function MenusPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary">WHAT’S ON THE MENU</p>
        <h1 className="text-4xl font-bold tracking-tight">Menus</h1>
        <p className="text-muted-foreground">Explore dining options without an account. Sign in only when you want to save favorites.</p>
      </div>
      <Card>
        <CardHeader>
          <Utensils className="mb-3 size-8 text-primary" aria-hidden="true" />
          <CardTitle><h2>See what’s cooking</h2></CardTitle>
          <CardDescription>Dining menus are coming soon. You’ll be able to browse them here as a guest.</CardDescription>
        </CardHeader>
        <CardContent><Button asChild variant="outline"><Link href="/map">View campus map</Link></Button></CardContent>
      </Card>
    </div>
  );
}
