import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useRef, useState } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { FoodDetailsDialog } from "@/components/menus/food-details-dialog";
import { authAdapter, saveMenuItemFavorite, type FavoriteMenuItem } from "@/lib/auth";
import type { MenuDataSource, MenuFood } from "@/lib/menus/types";
import { cleanup } from "@testing-library/react";

const userId = "00000000-0000-4000-8000-000000000001";
const food: MenuFood = { id: "42", name: "Grilled salmon", dietaryTags: [], carbonRating: null };
const source: MenuDataSource = {
  mode: "live",
  getMenu: vi.fn(),
  getFoodDetails: async query => ({ ...food, id: query.foodId, nutrition: null, healthfulnessScore: null, allergens: [], ingredients: "Salmon", sourceUrl: null, updatedAt: null }),
};
let favorites: FavoriteMenuItem[] | undefined;
let guest: boolean;
let write: (() => Promise<Response>) | undefined;
let fetcher: ReturnType<typeof vi.fn>;

function Harness() {
  const [selected, setSelected] = useState<MenuFood | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return <AuthProvider>
    <button ref={trigger} onClick={() => setSelected(food)}>Open item 42</button>
    <button onClick={() => setSelected({ ...food, id: "43" })}>Open item 43</button>
    <FoodDetailsDialog food={selected} query={{ diningHallId: "berkshire", date: "2026-11-23", meal: "lunch" }}
      diningHallName="Berkshire" dataSource={source} returnFocusRef={trigger} onClose={() => setSelected(null)} />
  </AuthProvider>;
}
beforeEach(() => {
  favorites = []; guest = false; write = undefined;
  fetcher = vi.fn(async (path: string, init?: RequestInit) => {
    if (path === "/api/auth/me") return Response.json(guest ? [] : [{ id: userId, email: "max@umass.edu", favoriteFoods: [], allergies: [], ...(favorites !== undefined ? { favoriteMenuItems: favorites } : {}) }]);
    if (write) return write();
    const id = path.split("/").at(-1)!;
    favorites = init?.method === "PUT" ? [...(favorites ?? []), { menuItemId: id, name: food.name }] : (favorites ?? []).filter(item => item.menuItemId !== id);
    return new Response(null, { status: 200 });
  });
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const writeCalls = () => fetcher.mock.calls.filter(([path]) => path !== "/api/auth/me");
async function open(id = "42") {
  fireEvent.click(screen.getByRole("button", { name: `Open item ${id}` }));
  const dialog = await screen.findByRole("dialog", { name: food.name });
  await waitFor(() => expect(within(dialog).queryByRole("button", { name: "Loading favorite status" })).toBeNull());
  return dialog;
}
async function close() {
  fireEvent.click(screen.getByRole("button", { name: "Close food details" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

it("reads an already-starred item from the account response", async () => {
  favorites = [{ menuItemId: "42", name: food.name }];
  render(<Harness />); const dialog = await open();
  const button = within(dialog).getByRole("button", { name: `Unfavorite ${food.name}` });
  expect(button.getAttribute("aria-pressed")).toBe("true");
  expect(button.querySelector("svg")?.getAttribute("fill")).toBe("currentColor");
  expect(writeCalls()).toHaveLength(0);
});
it("stars, preserves state on reopen, unstars and preserves that state on reopen", async () => {
  render(<Harness />); let dialog = await open();
  fireEvent.click(within(dialog).getByRole("button", { name: `Favorite ${food.name}` }));
  await within(dialog).findByRole("button", { name: `Unfavorite ${food.name}` });
  expect(writeCalls()[0]).toEqual([`/api/users/${userId}/favorite-menu-items/42`, expect.objectContaining({ method: "PUT", credentials: "include", body: "{}" })]);
  await close(); dialog = await open();
  fireEvent.click(within(dialog).getByRole("button", { name: `Unfavorite ${food.name}` }));
  await within(dialog).findByRole("button", { name: `Favorite ${food.name}` });
  expect(writeCalls()[1][1]?.method).toBe("DELETE");
  await close(); dialog = await open();
  expect(within(dialog).getByRole("button", { name: `Favorite ${food.name}` }).getAttribute("aria-pressed")).toBe("false");
});
it.each([false, true])("keeps previous starred=%s state on a rejected save", async starred => {
  favorites = starred ? [{ menuItemId: "42", name: food.name }] : [];
  write = async () => Response.json({ error: "unavailable" }, { status: 500 });
  render(<Harness />); const dialog = await open();
  const label = `${starred ? "Unfavorite" : "Favorite"} ${food.name}`;
  fireEvent.click(within(dialog).getByRole("button", { name: label }));
  await within(dialog).findByRole("alert");
  expect(within(dialog).getByRole("button", { name: label }).getAttribute("aria-pressed")).toBe(String(starred));
  await close(); const reopened = await open();
  expect(within(reopened).getByRole("button", { name: label }).getAttribute("aria-pressed")).toBe(String(starred));
});
it("prevents duplicate writes even when the popup is closed and reopened while saving", async () => {
  let finish!: (response: Response) => void;
  const response = new Promise<Response>(resolve => { finish = resolve; });
  write = () => response;
  render(<Harness />); let dialog = await open();
  const toggle = within(dialog).getByRole("button", { name: `Favorite ${food.name}` });
  fireEvent.click(toggle); fireEvent.click(toggle);
  expect((toggle as HTMLButtonElement).disabled).toBe(true);
  await close(); dialog = await open();
  expect((within(dialog).getByRole("button", { name: `Favorite ${food.name}` }) as HTMLButtonElement).disabled).toBe(true);
  expect(writeCalls()).toHaveLength(1);
  finish(new Response(null, { status: 200 }));
  await within(dialog).findByRole("button", { name: `Unfavorite ${food.name}` });
});
it("does not confuse two menu item IDs that have the same name", async () => {
  favorites = [{ menuItemId: "42", name: food.name }];
  render(<Harness />); const dialog = await open("43");
  fireEvent.click(within(dialog).getByRole("button", { name: `Favorite ${food.name}` }));
  await within(dialog).findByRole("button", { name: `Unfavorite ${food.name}` });
  expect(writeCalls()[0][0]).toBe(`/api/users/${userId}/favorite-menu-items/43`);
});
it("does not assume missing favorites data means unstarred", async () => {
  favorites = undefined;
  render(<Harness />); const dialog = await open();
  const toggle = within(dialog).getByRole("button", { name: "Favorite status unavailable" });
  expect((toggle as HTMLButtonElement).disabled).toBe(true);
  expect(toggle.hasAttribute("aria-pressed")).toBe(false);
  expect(writeCalls()).toHaveLength(0);
});
it("does not write for a guest", async () => {
  guest = true;
  render(<Harness />); const dialog = await open();
  fireEvent.click(within(dialog).getByRole("button", { name: `Log in to favorite ${food.name}` }));
  expect(writeCalls()).toHaveLength(0);
});
it("keeps exact IDs from the initial read and rejects malformed favorite data", async () => {
  favorites = [{ menuItemId: "9007199254740993", name: food.name }];
  expect((await authAdapter.getUser())?.favoriteMenuItems?.[0].menuItemId).toBe("9007199254740993");
  favorites = [{ menuItemId: undefined, name: food.name }] as unknown as FavoriteMenuItem[];
  await expect(authAdapter.getUser()).rejects.toThrow("Unexpected account response");
});
it("never sends a fixture slug to the write endpoint", async () => {
  await expect(saveMenuItemFavorite(userId, "cheddar-bisque", true)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
