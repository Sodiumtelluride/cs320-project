import { describe, expect, it, vi } from "vitest";
vi.mock("../../db/supabase.js", () => ({ supabase: {} }));
import { formatSnapshotFood, locationSlug } from "../snapshot.js";

describe("snapshot formatting", () => {
  it("maps source location names to frontend identifiers", () => {
    expect(locationSlug("Berkshire Grab ‘N Go")).toBe("berkshire-grab-n-go");
    expect(locationSlug("Peet’s Coffee & Tea")).toBe("peets-coffee-tea");
    expect(locationSlug("Post & Bean Café")).toBe("post-and-bean-cafe");
  });
  it("preserves unknown nutrition and allergens while retaining reported zeroes", () => {
    const food = formatSnapshotFood({ id: 1, name: "Food", calories: "0", total_fat: "0g", menu_item_allergens: [], menu_item_ingredients: [] });
    expect(food.nutrition.calories).toBe(0);
    expect(food.nutrition.totalFat?.amount).toBe(0);
    expect(food.nutrition.sodium).toBeNull();
    expect(food.allergens).toBeNull();
  });
});
