import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MenuNavigation } from "@/components/menus/menu-navigation";

beforeEach(() => {
  // jsdom needs the pointer type to distinguish a real mouse hover from touch.
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    pointerType: string;
    constructor(type: string, options: PointerEventInit = {}) {
      super(type, options);
      this.pointerType = options.pointerType ?? "mouse";
    }
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function openWithMouse() {
  render(<MenuNavigation active={false} />);
  const menus = screen.getByRole("link", { name: "Menus" });
  fireEvent.pointerEnter(menus.parentElement!, { pointerType: "mouse" });
  return { menus, root: menus.parentElement!, panel: screen.getByRole("list", { name: "Dining locations" }) };
}

describe("Header dining navigation", () => {
  it("keeps the Menus directory link and opens exactly four halls plus two categories on hover", () => {
    render(<MenuNavigation active />);
    const menus = screen.getByRole("link", { name: "Menus" });
    expect(menus.getAttribute("href")).toBe("/menus");
    expect(menus.getAttribute("aria-current")).toBe("page");
    expect(screen.queryByRole("list")).toBeNull();
    fireEvent.pointerEnter(menus.parentElement!, { pointerType: "mouse" });
    const panel = screen.getByRole("list", { name: "Dining locations" });
    expect(panel.children).toHaveLength(6);
    for (const [name, id] of [["Berkshire", "berkshire"], ["Worcester", "worcester"], ["Franklin", "franklin"], ["Hampshire", "hampshire"]]) {
      expect(within(panel).getByRole("link", { name }).getAttribute("href")).toBe(`/menus?hall=${id}`);
    }
    expect(within(panel).getAllByRole("button").map((button) => button.textContent)).toEqual(["Grab ’n Go", "Around Campus"]);
  });

  it("opens the four Grab ’n Go links and switches to all sixteen Around Campus links", () => {
    openWithMouse();
    fireEvent.pointerEnter(screen.getByRole("button", { name: "Grab ’n Go" }), { pointerType: "mouse" });
    const grab = screen.getByRole("list", { name: "Grab ’n Go locations" });
    expect(within(grab).getAllByRole("link")).toHaveLength(4);
    expect(within(grab).getByRole("link", { name: "Berkshire Grab ’n Go" }).getAttribute("href")).toBe("/menus?hall=berkshire-grab-n-go");
    fireEvent.pointerEnter(screen.getByRole("button", { name: "Around Campus" }), { pointerType: "mouse" });
    expect(screen.queryByRole("list", { name: "Grab ’n Go locations" })).toBeNull();
    const campus = screen.getByRole("list", { name: "Around Campus locations" });
    expect(within(campus).getAllByRole("link")).toHaveLength(16);
    expect(within(campus).getByRole("link", { name: "Whitmore Café" }).getAttribute("href")).toBe("/menus?hall=whitmore-cafe");
    expect(within(campus).getByRole("link", { name: "Terrace" }).getAttribute("href")).toBe("/menus?hall=terrace");
  });

  it("does not give the main dining halls a submenu", () => {
    const { panel } = openWithMouse();
    fireEvent.pointerEnter(screen.getByRole("button", { name: "Around Campus" }), { pointerType: "mouse" });
    fireEvent.pointerEnter(within(panel).getByRole("link", { name: "Berkshire" }), { pointerType: "mouse" });
    expect(screen.getAllByRole("list")).toHaveLength(1);
    expect(within(panel).getByRole("link", { name: "Berkshire" }).hasAttribute("aria-expanded")).toBe(false);
  });

  it("does not treat touch as hover and allows touch users to open both levels with buttons", () => {
    render(<MenuNavigation active={false} />);
    const toggle = screen.getByRole("button", { name: "Show dining locations" });
    fireEvent.pointerEnter(toggle.parentElement!, { pointerType: "touch" });
    expect(screen.queryByRole("list")).toBeNull();
    act(() => toggle.focus());
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const category = screen.getByRole("button", { name: "Around Campus" });
    act(() => category.focus());
    fireEvent.click(category);
    expect(screen.getByRole("list", { name: "Around Campus locations" })).toBeTruthy();
  });

  it("closes with Escape and restores focus to the disclosure button", () => {
    openWithMouse();
    const category = screen.getByRole("button", { name: "Around Campus" });
    act(() => category.focus());
    fireEvent.keyDown(category, { key: "Escape" });
    const toggle = screen.getByRole("button", { name: "Show dining locations" });
    expect(screen.queryByRole("list")).toBeNull();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle);
  });

  it("moves into each list with arrow keys and returns to its category with Left", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (frame: number) => window.clearTimeout(frame));
    const { menus } = openWithMouse();
    act(() => menus.focus());
    fireEvent.keyDown(menus, { key: "ArrowDown" });
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Berkshire" }));
    const category = screen.getByRole("button", { name: "Around Campus" });
    act(() => category.focus());
    fireEvent.keyDown(category, { key: "ArrowRight" });
    act(() => vi.runOnlyPendingTimers());
    const firstLocation = screen.getByRole("link", { name: "Whitmore Café" });
    expect(document.activeElement).toBe(firstLocation);
    fireEvent.keyDown(firstLocation, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(category);
    expect(category.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes when clicking outside or tabbing to another part of the page", () => {
    const { root } = openWithMouse();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("list")).toBeNull();
    fireEvent.pointerEnter(root, { pointerType: "mouse" });
    const hall = screen.getByRole("link", { name: "Berkshire" });
    act(() => hall.focus());
    fireEvent.blur(hall, { relatedTarget: document.body });
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("stays open while the pointer crosses the gap into the flyout", () => {
    vi.useFakeTimers();
    const { root } = openWithMouse();
    fireEvent.pointerEnter(screen.getByRole("button", { name: "Around Campus" }), { pointerType: "mouse" });
    fireEvent.pointerLeave(root, { pointerType: "mouse" });
    fireEvent.pointerEnter(screen.getByRole("list", { name: "Around Campus locations" }), { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByRole("list", { name: "Around Campus locations" })).toBeTruthy();
  });

  it("dismisses a hover-only dropdown after leaving it", () => {
    vi.useFakeTimers();
    const { root } = openWithMouse();
    fireEvent.pointerLeave(root, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(250));
    expect(screen.queryByRole("list")).toBeNull();
  });
});
