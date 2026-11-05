# Menu API contract

The menu page uses the combined response format from PR #28. Both the menu and food-details panel use `snapshotDataSource` from `lib/menus/snapshot-cache.ts`.

`GET /api/menu-snapshots?location=berkshire&date=2026-11-05` returns `{ location, date, menus, foods, updatedAt }`. In `menus`, each meal has stations containing food summaries. The full details for each summary are in `foods`, under its food ID. Meal changes and dish clicks reuse that response while it is cached for the selected location and date. A new or expired selection requests the same combined endpoint. The browser validates the response and shares an in-progress request for the same selection.

Without a live base URL, `GET /api/menu-demo/menu-snapshots` supplies this format for local testing. To use live menus, set `NEXT_PUBLIC_MENU_API_BASE_URL=/api` and point `BACKEND_URL` at a backend that serves PR #28's snapshot route. The frontend forwards the request to that backend. Live request failures are shown as errors; there is no fallback to sample data or to the older routes.

## Navigation

The home route `/` lists the configured dining halls as cards. `/menus` shows the same location directory until a hall is selected. A selected menu uses `/menus?hall=<id>&date=<YYYY-MM-DD>&meal=<meal>`; the date and meal are optional on entry. The About page remains at `/about`.

`DiningHallCards` renders links on the directory and selection buttons inside `Menus`. Location, date, and meal changes update the query parameters without adding a browser-history entry. The UI still passes `diningHallId`, `date`, and `meal` to its data source. The combined request uses the hall and date; the data source selects the requested meal from the response.

The menu calendar permits the campus date and the following 13 days. Only months intersecting that range are shown. Dates outside the range in shared links resolve to today. Argo Tea uses today only and links to the official menu.

## Retained individual endpoints

The following contract describes the older endpoints, retained for compatibility. The menu page does not call them.

| Method | Relative path | Query parameters |
| --- | --- | --- |
| GET | `/menus` | `diningHallId`, `date`, `meal` |
| GET | `/foods/:foodId` | `diningHallId`, `date`, `meal` |

`date` is a campus calendar date in `YYYY-MM-DD` format. Supported meal identifiers are `breakfast`, `lunch`, `dinner`, `grab-n-go`, and `late-night`. Hall and food identifiers are opaque strings. The frontend supplies the selected hall, date, and meal with both requests.

The individual sample endpoints remain under `/api/menu-demo`.

The HTTP adapter includes credentials by default to support the planned session-based backend. Cross-origin deployments require the backend to permit the frontend origin and credentialed requests. The adapter's `credentials` option can be changed for public, credential-free endpoints.

## Menu response

```json
{
  "diningHallId": "berkshire",
  "date": "2026-10-19",
  "meal": "lunch",
  "updatedAt": "2026-10-19T14:00:00Z",
  "stations": [
    {
      "id": "soups",
      "name": "Soups",
      "foods": [
        {
          "id": "cheddar-bisque",
          "name": "Aged Cheddar & Cauliflower Bisque",
          "dietaryTags": ["halal", "vegetarian"],
          "carbonRating": "A"
        }
      ]
    }
  ]
}
```

An unpublished selection returns a successful response with `stations: []`. Station IDs must be unique within a menu. Food IDs must be unique within a station; a recipe may occur at more than one station. The response selection must match the request.

## Food response

```json
{
  "id": "cheddar-bisque",
  "name": "Aged Cheddar & Cauliflower Bisque",
  "dietaryTags": ["halal", "vegetarian"],
  "carbonRating": "A",
  "nutrition": {
    "servingSize": "5 oz",
    "calories": 199,
    "caloriesFromFat": 148,
    "totalFat": { "amount": 16.4, "unit": "g", "dailyValue": 21 },
    "sodium": { "amount": 521.5, "unit": "mg", "dailyValue": 23 }
  },
  "healthfulnessScore": 2,
  "allergens": ["Milk", "Eggs", "Wheat", "Soy"],
  "ingredients": "Cauliflower, cream, cheddar cheese, vegetable stock, onions, and seasoning.",
  "sourceUrl": null,
  "updatedAt": "2026-10-19T14:00:00Z"
}
```

These examples are development fixtures, not verified recipes or current nutrition and allergen information.

| Field | Contract |
| --- | --- |
| `dietaryTags` | Any combination of `vegetarian`, `local`, `halal`, and `plant-based`; omitted or null becomes an empty list |
| `carbonRating` | `A`, `B`, `C`, `D`, `E`, or null |
| `nutrition` | Object or null; individual fields may be omitted or null |
| Nutrient amount | Nonnegative number with unit `g`, `mg`, or `mcg` |
| `dailyValue` | Nonnegative percentage number or null; the frontend does not calculate it |
| `healthfulnessScore` | Number from 0 to 7, or null; it is not a percentage |
| `allergens` | String array; null or omitted means unknown; an empty array means none reported by the source |
| `ingredients` | Plain text or null |
| `sourceUrl` | Absolute HTTP(S) URL or null |
| `updatedAt` | ISO timestamp with timezone, or null |

Nutrition fields include `servingSize`, `calories`, `caloriesFromFat`, `totalFat`, `saturatedFat`, `transFat`, `cholesterol`, `sodium`, `totalCarbohydrate`, `dietaryFiber`, `totalSugars`, `addedSugars`, and `protein`. Nutrient fields use the `{ amount, unit, dailyValue }` shape.

Missing values remain unknown. Zero is a valid reported value. Dietary tags, allergen claims, healthfulness, and carbon ratings are never inferred from the food name or ingredients.

## Integration

The page uses the root-based `@/*` alias and existing `Button`, `Dialog`, `SiteHeader`, `BackButton`, `cn`, and global theme. It introduces no additional UI dependencies.

`Menus` accepts `diningHalls`, `dataSource`, `initialHallId`, `initialDate`, `initialMeal`, `onSelectionChange`, and `className`. Data sources are created in the client composition rather than passed as functions across a server/client boundary. The selection callback runs when a visitor changes a control.

The frontend and backend use the same location IDs and meal identifiers. The data source validates the response before giving menu and food details to the components.

Fixture routes are read-only, validate query parameters, and return 400 for malformed selections or 404 for unknown fixtures. Unsuccessful requests, malformed responses, and mismatched identifiers produce error states with retry actions. A superseded selection stops waiting for its response; a shared request can finish for other consumers.

## Reference assets

Menu layout and food-detail fields follow the [Berkshire menu reference](https://www.umassdining.com/locations-menus/berkshire/menu). The circular tag PNGs under `public/menu-tags/` are copies of the reference site's images from `https://umassdining.com/sites/default/files/legends/`: `icon-hal-v2.png`, `icon-veg-v2.png`, `icon-loc-v2.png`, `icon-plant-v2.png`, and `icon-cr-a-v2.png` through `icon-cr-e-v2.png`. Their symbols and colors are preserved; the surrounding interface uses the project theme.
