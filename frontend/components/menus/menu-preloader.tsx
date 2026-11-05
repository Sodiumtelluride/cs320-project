"use client";
import { useEffect } from "react";
import { preloadMenus } from "@/lib/menus/snapshot-cache";

export function MenuPreloader() {
  useEffect(() => {
    void preloadMenus();
    const timer = window.setInterval(() => { void preloadMenus(); }, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return null;
}
