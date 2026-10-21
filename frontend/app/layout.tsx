import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "UMass Dining", template: "%s | UMass Dining" },
  description: "Fresh food, global flavors, and a place to connect at UMass Amherst.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="flex min-h-svh flex-col">
            <a href="#main-content" className="sr-only z-50 rounded-md bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
            <SiteHeader />
            <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 sm:px-8 sm:py-16" tabIndex={-1}>{children}</main>
            <footer className="border-t">
              <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <p>UMass Amherst · Amherst, Massachusetts</p>
                <p>Student project · CS 320</p>
              </div>
            </footer>
            <AuthDialog />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
