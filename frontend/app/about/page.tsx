import type { Metadata } from "next";
import { AboutPage } from "@/about-page/about-page";

export const metadata: Metadata = {
  title: "About",
  description: "Fresh food, global flavors, and a place to connect at UMass Amherst.",
};

export default function About() {
  return <AboutPage />;
}
