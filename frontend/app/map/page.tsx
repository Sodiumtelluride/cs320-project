import type { Metadata } from "next";
import Link from "next/link";
import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Map" };

export default function MapPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary">EXPLORE CAMPUS</p>
        <h1 className="text-4xl font-bold tracking-tight">Campus map</h1>
        <p className="text-muted-foreground">Find your next meal around UMass Amherst. No account needed.</p>
      </div>
      <Card>
        <CardHeader>
          <Map className="mb-3 size-8 text-primary" aria-hidden="true" />
          <CardTitle><h2>Dining locations, all in one place</h2></CardTitle>
          <CardDescription>The campus dining map is coming soon.</CardDescription>
        </CardHeader>
        <CardContent><Button asChild variant="outline"><Link href="/menus">Explore menus</Link></Button></CardContent>
      </Card>
    </div>
  );
}
