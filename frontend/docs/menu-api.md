# Menu API contract

Status: proposed frontend contract. The Express menu endpoints and database identifiers have not been confirmed.

The menu UI consumes `MenuDataSource` from `lib/menus/types.ts`. The HTTP implementation accepts a base URL, request credentials, and an optional fetch implementation. The included fixture routes use the same response contract.

## Requests

| Method | Relative path | Query parameters |
| --- | --- | --- |
| GET | `/menus` | `diningHallId`, `date`, `meal` |
| GET | `/foods/:foodId` | `diningHallId`, `date`, `meal` |

`date` is a campus calendar date in `YYYY-MM-DD` format. Supported meal identifiers are `breakfast`, `lunch`, `dinner`, `grab-n-go`, and `late-night`. Hall and food identifiers are opaque strings. The frontend supplies the selected hall, date, and meal with both requests.

The fixture base path is `/api/menu-demo`. `NEXT_PUBLIC_MENU_API_BASE_URL` selects the future service base path, such as `http://localhost:3001/api`. No fallback to fixture data occurs after a live request fails.

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

The hall IDs and meal availability in `lib/menus/dining-halls.ts` are fixture configuration. They must be replaced with backend identifiers and availability before connecting live data. If the final service uses different paths or response fields, normalization belongs in `http-menu-data-source.ts` and `validation.ts`; the menu components consume the stable frontend types.

Fixture routes are read-only, validate query parameters, and return 400 for malformed selections or 404 for unknown fixtures. Unsuccessful requests, malformed responses, and mismatched identifiers produce error states with retry actions. Superseded requests are cancelled and late responses are ignored.

## Reference assets

Menu layout and food-detail fields follow the [Berkshire menu reference](https://www.umassdining.com/locations-menus/berkshire/menu). The circular tag PNGs under `public/menu-tags/` are copies of the reference site's images from `https://umassdining.com/sites/default/files/legends/`: `icon-hal-v2.png`, `icon-veg-v2.png`, `icon-loc-v2.png`, `icon-plant-v2.png`, and `icon-cr-a-v2.png` through `icon-cr-e-v2.png`. Their symbols and colors are preserved; the surrounding interface uses the project theme.
