import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useRef, useState } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ProfileView } from "@/components/auth/profile-view";
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
let legacyFoods: string[];
let write: (() => Promise<Response>) | undefined;
let fetcher: ReturnType<typeof vi.fn>;

function Harness({ profile = false }: { profile?: boolean }) {
  const [selected, setSelected] = useState<MenuFood | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return <AuthProvider>
    {profile && <ProfileView />}
    <button ref={trigger} onClick={() => setSelected(food)}>Open item 42</button>
    <button onClick={() => setSelected({ ...food, id: "43" })}>Open item 43</button>
    <FoodDetailsDialog food={selected} query={{ diningHallId: "berkshire", date: "2026-11-23", meal: "lunch" }}
      diningHallName="Berkshire" dataSource={source} returnFocusRef={trigger} onClose={() => setSelected(null)} />
  </AuthProvider>;
}
beforeEach(() => {
  favorites = []; guest = false; write = undefined; legacyFoods = [];
  fetcher = vi.fn(async (path: string, init?: RequestInit) => {
    if (path === "/api/auth/me") return Response.json(guest ? [] : [{ id: userId, email: "max@umass.edu", favoriteFoods: legacyFoods, allergies: [], ...(favorites !== undefined ? { favoriteMenuItems: favorites } : {}) }]);
    if (write) return write();
    if (path.endsWith("/favorite-foods")) {
      const body = JSON.parse(String(init?.body));
      legacyFoods = init?.method === "PUT" ? body.favoriteFoods : legacyFoods.filter(name => name !== body.food);
      return new Response(null, { status: 200 });
    }
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

it("shows a newly starred item in the profile and preserves it after account reload", async () => {
  const view = render(<Harness profile />);
  const dialog = await open();
  fireEvent.click(within(dialog).getByRole("button", { name: `Favorite ${food.name}` }));
  await within(dialog).findByRole("button", { name: `Unfavorite ${food.name}` });
  await close();
  expect(screen.getByRole("button", { name: `Remove ${food.name}` })).toBeTruthy();
  expect(screen.queryByText("No favorites saved yet.")).toBeNull();
  view.unmount();
  render(<Harness profile />);
  await screen.findByRole("button", { name: `Remove ${food.name}` });
});

it("removes a profile favorite by ID and clears its nutrition-popup star", async () => {
  favorites = [{ menuItemId: "42", name: food.name }];
  render(<Harness profile />);
  fireEvent.click(await screen.findByRole("button", { name: `Remove ${food.name}` }));
  await waitFor(() => expect(screen.queryByRole("button", { name: `Remove ${food.name}` })).toBeNull());
  expect(writeCalls()[0]).toEqual([`/api/users/${userId}/favorite-menu-items/42`, expect.objectContaining({ method: "DELETE" })]);
  const dialog = await open();
  expect(within(dialog).getByRole("button", { name: `Favorite ${food.name}` }).getAttribute("aria-pressed")).toBe("false");
});

it("keeps the profile favorite and its star when profile removal fails", async () => {
  favorites = [{ menuItemId: "42", name: food.name }];
  write = async () => Response.json({ error: "unavailable" }, { status: 500 });
  render(<Harness profile />);
  fireEvent.click(await screen.findByRole("button", { name: `Remove ${food.name}` }));
  await screen.findByRole("alert");
  expect((screen.getByRole("button", { name: `Remove ${food.name}` }) as HTMLButtonElement).disabled).toBe(false);
  const dialog = await open();
  expect(within(dialog).getByRole("button", { name: `Unfavorite ${food.name}` }).getAttribute("aria-pressed")).toBe("true");
});

it("keeps same-name menu favorites separate and preserves manually entered favorites", async () => {
  favorites = [{ menuItemId: "42", name: food.name }, { menuItemId: "43", name: food.name }];
  legacyFoods = [food.name];
  render(<Harness profile />);
  await waitFor(() => expect(screen.getAllByRole("button", { name: `Remove ${food.name}` })).toHaveLength(3));
  fireEvent.click(screen.getAllByRole("button", { name: `Remove ${food.name}` })[0]);
  await waitFor(() => expect(screen.getAllByRole("button", { name: `Remove ${food.name}` })).toHaveLength(2));
  expect(writeCalls()[0][0]).toBe(`/api/users/${userId}/favorite-menu-items/42`);
  expect(favorites).toEqual([{ menuItemId: "43", name: food.name }]);
  expect(legacyFoods).toEqual([food.name]);
  fireEvent.click(screen.getAllByRole("button", { name: `Remove ${food.name}` })[1]);
  await waitFor(() => expect(screen.getAllByRole("button", { name: `Remove ${food.name}` })).toHaveLength(1));
  expect(writeCalls()[1][0]).toBe(`/api/users/${userId}/favorite-foods`);
  expect(favorites).toHaveLength(1);
});
