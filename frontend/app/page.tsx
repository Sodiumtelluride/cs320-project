import type { Metadata } from "next";
import { DiningLandingPage } from "@/menus/landing-page";

export const metadata: Metadata = {
  title: "Dining menus",
  description: "Explore dining hall menus, Grab ’n Go locations and cafés around the UMass Amherst campus.",
};

export default function Home() {
  return <DiningLandingPage />;
}
