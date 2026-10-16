import type { Metadata } from "next";
import { AboutPage } from "@/about-page/about-page";

export const metadata: Metadata = { title: "Home" };

export default function Home() {
  return <AboutPage />;
}
