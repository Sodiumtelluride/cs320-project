import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "@/app/page";
import About from "@/app/about/page";
import MenusRoute from "@/app/menus/page";
import { Menus } from "@/components/menus/menus";
import { MenuPage } from "@/menus/menu-page";
import { DEMO_DINING_HALLS } from "@/lib/menus/dining-halls";
import { createMockMenuDataSource } from "@/lib/menus/mock-menu-data-source";
import { menuHref } from "@/lib/menus/links";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("Dining landing and navigation", () => {
  it("opens with four linked dining halls rather than the About content", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Choose where to eat" })).toBeTruthy();
    for (const hall of DEMO_DINING_HALLS) {
      expect(screen.getByRole("link", { name: `View ${hall.name} menu` }).getAttribute("href")).toBe(`/menus?hall=${hall.id}`);
    }
    expect(screen.queryByText("More than a meal.")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("link", { name: "About UMass Dining" }).getAttribute("href")).toBe("/about");
  });

  it("keeps the About page available at its own route", () => {
    render(<About />);
    expect(screen.getByRole("heading", { name: "Good food.Great company." })).toBeTruthy();
  });

  it("shows the location list when /menus has no selected hall", async () => {
    render(await MenusRoute({ searchParams: Promise.resolve({}) }));
    expect(screen.getAllByRole("link", { name: /^View .+ menu$/ })).toHaveLength(4);
  });

  it("returns an unknown hall to the list with an explanation", async () => {
    render(await MenusRoute({ searchParams: Promise.resolve({ hall: "unknown" }) }));
    expect(screen.getByRole("alert").textContent).toContain("That dining location is not available");
    expect(screen.getAllByRole("link", { name: /^View .+ menu$/ })).toHaveLength(4);
  });

  it("passes a direct link's hall, date, and meal into the menu", async () => {
    const page = await MenusRoute({ searchParams: Promise.resolve({ hall: "worcester", date: "2026-10-20", meal: "dinner" }) });
    expect(page.props.initialHallId).toBe("worcester");
    expect(page.props.initialDate).toBe("2026-10-20");
    expect(page.props.initialMeal).toBe("dinner");
  });

  it("normalizes invalid dates and meals to supported selections", async () => {
    const page = await MenusRoute({ searchParams: Promise.resolve({ hall: "hampshire", date: "2026-02-30", meal: "grab-n-go" }) });
    expect(page.props.initialDate).not.toBe("2026-02-30");
    expect(page.props.initialDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(page.props.initialMeal).toBe("lunch");
  });

  it("keeps all locations visible as blocks and requests the selected hall", async () => {
    const source = createMockMenuDataSource({ latencyMs: 0 });
    const getMenu = vi.spyOn(source, "getMenu");
    render(<Menus diningHalls={DEMO_DINING_HALLS} dataSource={source} initialDate="2026-10-20" />);
    for (const hall of DEMO_DINING_HALLS) {
      fireEvent.click(screen.getByRole("button", { name: `Select ${hall.name}` }));
      await waitFor(() => expect(getMenu.mock.calls.at(-1)?.[0].diningHallId).toBe(hall.id));
      expect(screen.getByRole("button", { name: `Select ${hall.name}` }).getAttribute("aria-pressed")).toBe("true");
    }
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("keeps the selected hall, date, and meal in the URL", async () => {
    render(<MenuPage initialHallId="berkshire" initialDate="2026-10-20" dataSource={createMockMenuDataSource({ latencyMs: 0 })} />);
    fireEvent.click(screen.getByRole("button", { name: "Select Franklin" }));
    fireEvent.click(screen.getByRole("button", { name: "Dinner" }));
    const params = new URLSearchParams(window.location.search);
    expect(params.get("hall")).toBe("franklin");
    expect(params.get("date")).toBe("2026-10-20");
    expect(params.get("meal")).toBe("dinner");
    await screen.findByRole("region", { name: "Dinner menu" });
  });

  it("encodes menu identifiers when building links", () => {
    expect(menuHref("hall & cafe", { date: "2026-10-20", meal: "lunch" })).toBe("/menus?hall=hall+%26+cafe&date=2026-10-20&meal=lunch");
  });
});
