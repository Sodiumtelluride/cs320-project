import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Menus } from "@/components/menus/menus";
import { DEMO_DINING_HALLS } from "@/lib/menus/dining-halls";
import { createMockMenuDataSource } from "@/lib/menus/mock-menu-data-source";

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); });
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mount() {
  const source = createMockMenuDataSource({ latencyMs: 0 });
  const getMenu = vi.spyOn(source, "getMenu");
  render(<Menus diningHalls={DEMO_DINING_HALLS} dataSource={source} />);
  return getMenu;
}

function openCalendar() {
  fireEvent.click(screen.getByRole("button", { name: /^Menu date:/ }));
  return within(screen.getByRole("dialog", { name: "Choose a menu date" }));
}

describe("Menu calendar", () => {
  it("shows only November and enables November 5 through 18 on November 5", () => {
    vi.setSystemTime(new Date("2026-11-05T16:00:00Z"));
    mount();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Previous day" }).disabled).toBe(true);
    const calendar = openCalendar();
    expect(calendar.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["November 2026"]);
    const enabled = calendar.getAllByRole<HTMLButtonElement>("button", { name: /November/ }).filter((button) => !button.disabled);
    expect(enabled.map((button) => Number(button.textContent))).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(enabled[0].getAttribute("aria-current")).toBe("date");
  });

  it("shows only December 1 as selectable in the second month on November 18", async () => {
    vi.setSystemTime(new Date("2026-11-18T16:00:00Z"));
    const getMenu = mount();
    await screen.findByRole("region", { name: "Lunch menu" });
    const calendar = openCalendar();
    const december = within(calendar.getByRole("region", { name: "December 2026" }));
    const enabled = december.getAllByRole<HTMLButtonElement>("button").filter((button) => !button.disabled);
    expect(enabled.map((button) => button.textContent)).toEqual(["1"]);
    fireEvent.click(december.getByRole("button", { name: "Wed, December 2, 2026" }));
    expect(getMenu).toHaveBeenCalledTimes(1);
    fireEvent.click(december.getByRole("button", { name: "Tue, December 1, 2026" }));
    await screen.findByRole("region", { name: "Lunch menu" });
    expect(getMenu.mock.calls.at(-1)?.[0].date).toBe("2026-12-01");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Next day" }).disabled).toBe(true);
  });

  it("removes November when the campus date changes to December 1", async () => {
    vi.setSystemTime(new Date("2026-11-29T16:00:00Z"));
    const getMenu = mount();
    const calendar = openCalendar();
    expect(calendar.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["November 2026", "December 2026"]);
    expect(calendar.getByRole<HTMLButtonElement>("button", { name: "Sat, December 12, 2026" }).disabled).toBe(false);
    expect(calendar.getByRole<HTMLButtonElement>("button", { name: "Sun, December 13, 2026" }).disabled).toBe(true);

    vi.setSystemTime(new Date("2026-12-01T05:00:00Z"));
    fireEvent.focus(window);
    expect(calendar.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["December 2026"]);
    expect(calendar.getByRole<HTMLButtonElement>("button", { name: "Mon, December 14, 2026" }).disabled).toBe(false);
    expect(calendar.getByRole<HTMLButtonElement>("button", { name: "Tue, December 15, 2026" }).disabled).toBe(true);
    fireEvent.click(calendar.getByRole("button", { name: "Close" }));
    await screen.findByRole("region", { name: "Lunch menu" });
    expect(getMenu.mock.calls.at(-1)?.[0].date).toBe("2026-12-01");
  });

  it("includes January only when the fourteen-day window reaches the new year", () => {
    vi.setSystemTime(new Date("2026-12-19T16:00:00Z"));
    mount();
    const calendar = openCalendar();
    expect(calendar.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["December 2026", "January 2027"]);
    const january = within(calendar.getByRole("region", { name: "January 2027" }));
    const enabled = january.getAllByRole<HTMLButtonElement>("button").filter((button) => !button.disabled);
    expect(enabled.map((button) => button.textContent)).toEqual(["1"]);
  });
});
