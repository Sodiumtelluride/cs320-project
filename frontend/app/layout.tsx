import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "About | UMass Dining",
  description: "Fresh food, global flavors, and a place to connect at UMass Amherst.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
