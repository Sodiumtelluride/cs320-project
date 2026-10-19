import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Menus } from "@/components/menus/menus";
import { DEMO_DINING_HALLS } from "@/lib/menus/dining-halls";
import { createMockMenuDataSource } from "@/lib/menus/mock-menu-data-source";
import type { MenuDataSource, MenuQuery, MenuResponse } from "@/lib/menus/types";

afterEach(cleanup);
const initialDate = "2026-10-19";

function mount(source = createMockMenuDataSource({ latencyMs: 0 })) {
  return render(<Menus diningHalls={DEMO_DINING_HALLS} dataSource={source} initialDate={initialDate} />);
}

describe("Menus", () => {
  it("loads the initial menu and refetches for meal, date, and hall changes", async () => {
    const source = createMockMenuDataSource({ latencyMs: 0 });
    const getMenu = vi.spyOn(source, "getMenu");
    mount(source);
    await screen.findByRole("button", { name: "Aged Cheddar & Cauliflower Bisque" });
    expect(getMenu.mock.calls.at(-1)?.[0]).toEqual({ diningHallId: "berkshire", date: initialDate, meal: "lunch" });
    fireEvent.click(screen.getByRole("button", { name: "Dinner" }));
    await screen.findByRole("region", { name: "Dinner menu" });
    expect(getMenu.mock.calls.at(-1)?.[0].meal).toBe("dinner");
    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    await screen.findByRole("region", { name: "Dinner menu" });
    expect(getMenu.mock.calls.at(-1)?.[0].date).toBe("2026-10-20");
    fireEvent.change(screen.getByLabelText("Dining hall"), { target: { value: "worcester" } });
    await screen.findByRole("heading", { name: "Worcester Menu" });
    await screen.findByRole("region", { name: "Dinner menu" });
    expect(getMenu.mock.calls.at(-1)?.[0].diningHallId).toBe("worcester");
  });

  it("falls back to an available meal when the hall changes", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Grab n' Go" }));
    await screen.findByRole("button", { name: "Vegetable Wrap" });
    fireEvent.change(screen.getByLabelText("Dining hall"), { target: { value: "hampshire" } });
    await screen.findByRole("region", { name: "Lunch menu" });
    expect(screen.queryByRole("button", { name: "Grab n' Go" })).toBeNull();
  });

  it("loads the selected food's details and restores focus when closed", async () => {
    const source = createMockMenuDataSource({ latencyMs: 0 });
    const getDetails = vi.spyOn(source, "getFoodDetails");
    mount(source);
    const trigger = await screen.findByRole("button", { name: "Aged Cheddar & Cauliflower Bisque" });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Aged Cheddar & Cauliflower Bisque" });
    await within(dialog).findByRole("heading", { name: "Nutrition Facts" });
    expect(getDetails.mock.calls.at(-1)?.[0]).toEqual({ diningHallId: "berkshire", date: initialDate, meal: "lunch", foodId: "cheddar-bisque" });
    expect(within(dialog).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("2");
    expect(within(dialog).getByText(/Milk, Eggs, Wheat, Soy/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("renders missing nutrition and allergen data without inventing values", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Hot Sausage, Onions & Peppers" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Nutrition information has not been provided for this item.");
    expect(within(dialog).getByText("Allergen information has not been provided.")).toBeTruthy();
  });

  it("shows an empty menu and recovers from a failed menu request", async () => {
    const source = createMockMenuDataSource({ latencyMs: 0 });
    const realGetMenu = source.getMenu;
    vi.spyOn(source, "getMenu").mockRejectedValueOnce(new Error("Offline")).mockImplementation(realGetMenu);
    mount(source);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("button", { name: "Aged Cheddar & Cauliflower Bisque" });
    fireEvent.change(screen.getByLabelText("Menu date"), { target: { value: "2026-10-25" } });
    fireEvent.click(screen.getByRole("button", { name: "Late Night" }));
    await screen.findByText("No menu published for this selection.");
  });

  it("retries a failed details request and closes with Escape", async () => {
    const source = createMockMenuDataSource({ latencyMs: 0 });
    const realGetDetails = source.getFoodDetails;
    vi.spyOn(source, "getFoodDetails").mockRejectedValueOnce(new Error("Offline")).mockImplementation(realGetDetails);
    mount(source);
    fireEvent.click(await screen.findByRole("button", { name: "Minestrone" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("alert");
    fireEvent.click(within(dialog).getByRole("button", { name: "Try again" }));
    await within(dialog).findByRole("heading", { name: "Nutrition Facts" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("ignores an old response that arrives after the meal changes", async () => {
    const base = createMockMenuDataSource({ latencyMs: 0 });
    let finishLunch: ((menu: MenuResponse) => void) | undefined;
    const source: MenuDataSource = { ...base,
      getMenu: vi.fn((query: MenuQuery) => query.meal === "lunch" ? new Promise<MenuResponse>((resolve) => { finishLunch = resolve; }) : base.getMenu(query)),
    };
    mount(source);
    await waitFor(() => expect(finishLunch).toBeTypeOf("function"));
    fireEvent.click(screen.getByRole("button", { name: "Dinner" }));
    await screen.findByRole("region", { name: "Dinner menu" });
    await act(async () => {
      finishLunch!(await base.getMenu({ diningHallId: "berkshire", date: initialDate, meal: "lunch" }));
    });
    expect(screen.queryByRole("region", { name: "Lunch menu" })).toBeNull();
    expect(screen.getByRole("region", { name: "Dinner menu" })).toBeTruthy();
  });

  it("reports user selections through props and supports an empty hall list", async () => {
    const onSelectionChange = vi.fn();
    const view = render(<Menus diningHalls={DEMO_DINING_HALLS} dataSource={createMockMenuDataSource({ latencyMs: 0 })} initialDate={initialDate} onSelectionChange={onSelectionChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ diningHallId: "berkshire", date: "2026-10-20", meal: "lunch" });
    view.unmount();
    render(<Menus diningHalls={[]} dataSource={createMockMenuDataSource()} />);
    expect(screen.getByRole("status").textContent).toBe("No dining halls are configured.");
  });
});
