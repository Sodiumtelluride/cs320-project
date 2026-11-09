import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { FoodSearch } from "@/components/search/food-search";
import { filterSearchDemoItems, SEARCH_DEMO_ITEMS } from "@/components/search/search-demo-data";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function openSearch(query = "") {
  render(<FoodSearch />);
  const input = screen.getByRole("combobox", { name: "Search food items" });
  fireEvent.focus(input);
  if (query) fireEvent.change(input, { target: { value: query } });
  return input;
}

describe("Frontend-only food search", () => {
  it("shows labeled sample results without making a network request", () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    openSearch();
    expect(screen.getAllByRole("option")).toHaveLength(SEARCH_DEMO_ITEMS.length);
    expect(screen.getByText(/Sample items, not live menus/)).toBeTruthy();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("matches food names without case or surrounding whitespace sensitivity", () => {
    openSearch("  SALMON  ");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("option", { name: /Grilled Salmon/ })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /Cheese Pizza/ })).toBeNull();
  });

  it("supports arrows, wrapping, Home/End, and Escape", () => {
    const input = openSearch();
    const options = screen.getAllByRole("option");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.getAttribute("aria-activedescendant")).toBe(options.at(-1)?.id);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe(options[0].id);
    fireEvent.keyDown(input, { key: "End" });
    expect(input.getAttribute("aria-activedescendant")).toBe(options.at(-1)?.id);
    fireEvent.keyDown(input, { key: "Home" });
    expect(input.getAttribute("aria-activedescendant")).toBe(options[0].id);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("previews keyboard selection and returns focus to search", async () => {
    const input = openSearch("salmon");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    const dialog = await screen.findByRole("dialog", { name: "Grilled Salmon" });
    expect(within(dialog).getByText(/No request was sent/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Back to search" }));
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it("previews a mouse selection instead of navigating to a real food", async () => {
    openSearch("pizza");
    fireEvent.click(screen.getByRole("option", { name: /Cheese Pizza/ }));
    expect(await screen.findByRole("dialog", { name: "Cheese Pizza" })).toBeTruthy();
  });

  it("shows an empty state and handles navigation with no matches", () => {
    const input = openSearch("zzzz");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText(/No sample items match/)).toBeTruthy();
    expect(input.getAttribute("aria-activedescendant")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("clears the query and restores all results", () => {
    const input = openSearch("salmon");
    fireEvent.click(screen.getByRole("button", { name: "Clear food search" }));
    expect((input as HTMLInputElement).value).toBe("");
    expect(screen.getAllByRole("option")).toHaveLength(SEARCH_DEMO_ITEMS.length);
  });

  it("applies multiple allergy filters, hides unknowns, and clears them", async () => {
    const input = openSearch();
    fireEvent.click(screen.getByRole("button", { name: "Allergy filters" }));
    const dialog = await screen.findByRole("dialog", { name: /Allergy filters/ });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Milk" }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Fish" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    fireEvent.focus(input);
    expect(screen.queryByRole("option", { name: /Cheese Pizza/ })).toBeNull();
    expect(screen.queryByRole("option", { name: /Salmon/ })).toBeNull();
    expect(screen.queryByRole("option", { name: /Chef’s Special/ })).toBeNull();
    expect(screen.getByRole("option", { name: /Garden Salad/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Allergy filters, 2 selected" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.focus(input);
    expect(screen.getAllByRole("option")).toHaveLength(SEARCH_DEMO_ITEMS.length);
  });

  it("closes on outside click and normal focus leaving the component", () => {
    const input = openSearch();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.focus(input);
    fireEvent.blur(input, { relatedTarget: document.body });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("combines name matching and allergen exclusions without changing fixtures", () => {
    expect(filterSearchDemoItems("salmon", ["Fish"])).toHaveLength(0);
    expect(filterSearchDemoItems("", ["Milk", "Fish"]).some((item) => item.allergens === null)).toBe(false);
    expect(SEARCH_DEMO_ITEMS).toHaveLength(12);
  });
});
