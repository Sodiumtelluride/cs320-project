import type { Metadata } from "next";
import { CampusMap } from "@/components/map/campus-map";

export const metadata: Metadata = { title: "Map" };

export default function MapPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary">EXPLORE CAMPUS</p>
        <h1 className="text-4xl font-bold tracking-tight">Campus map</h1>
      </div>
      <CampusMap preview={process.env.NEXT_PUBLIC_MAP_PREVIEW === "1"} />
    </div>
  );
}
