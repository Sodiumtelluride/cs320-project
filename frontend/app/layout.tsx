import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UMass Dining",
  description: "Browse dining hall menus, ingredients, and nutrition information at UMass Amherst.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
