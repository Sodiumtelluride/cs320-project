import type { Metadata } from "next";
import { DiningLandingPage } from "@/menus/landing-page";

export const metadata: Metadata = {
  title: "Dining menus",
  description: "Choose Berkshire, Worcester, Franklin, or Hampshire and explore its dining menu.",
};

export default function Home() {
  return <DiningLandingPage />;
}
