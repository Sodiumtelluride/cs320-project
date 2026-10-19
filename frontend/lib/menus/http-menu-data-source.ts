import type { FoodDetails, MenuDataSource, MenuQuery, MenuResponse } from "./types";
import { parseFoodDetails, parseMenuResponse } from "./validation";

interface HttpMenuOptions {
  baseUrl: string;
  mode?: MenuDataSource["mode"];
  credentials?: RequestCredentials;
  fetcher?: typeof fetch;
}

function queryString(query: MenuQuery): string {
  return new URLSearchParams({ diningHallId: query.diningHallId, date: query.date, meal: query.meal }).toString();
}

export function createHttpMenuDataSource({ baseUrl, mode = "live", credentials = "include", fetcher = fetch }: HttpMenuOptions): MenuDataSource {
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (base && !/^https?:\/\//.test(base) && !base.startsWith("/")) {
    throw new Error("The menu API base URL must be an HTTP URL or an absolute path.");
  }

  async function request<T>(path: string, parse: (value: unknown) => T, signal?: AbortSignal): Promise<T> {
    const response = await fetcher(`${base}${path}`, {
      signal, credentials, cache: "no-store", headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      if (response.status === 404) throw new Error("The requested menu information was not found.");
      throw new Error("The menu service is unavailable. Please try again.");
    }
    return parse(await response.json());
  }

  return {
    mode,
    async getMenu(query, signal): Promise<MenuResponse> {
      const menu = await request(`/menus?${queryString(query)}`, parseMenuResponse, signal);
      if (menu.diningHallId !== query.diningHallId || menu.date !== query.date || menu.meal !== query.meal) {
        throw new Error("The menu service returned a different menu than requested.");
      }
      return menu;
    },
    async getFoodDetails(query, signal): Promise<FoodDetails> {
      const food = await request(`/foods/${encodeURIComponent(query.foodId)}?${queryString(query)}`, parseFoodDetails, signal);
      if (food.id !== query.foodId) throw new Error("The menu service returned a different food than requested.");
      return food;
    },
  };
}
