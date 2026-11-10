# Menu API

The menu page uses the shared data source in `lib/menus/snapshot-cache.ts` for all dining locations. Its request is `GET /api/menus?location=<id>&date=<YYYY-MM-DD>`. The Next.js rewrite forwards the request to the Express backend. The page route `/menus?hall=<id>` and the backend API `/api/menus` are separate addresses.

The combined response contains `{ location, date, menus, foods, updatedAt }`. `menus` maps meal identifiers to stations and food summaries. `foods` maps food identifiers to ingredients, reported allergens, nutrition, and other details. The menu list and food dialog read this same response through `getMenu` and `getFoodDetails`; opening a food does not require a separate food endpoint while the cached day remains valid.

The shared loader validates the response, shares in-progress requests, and retains successful results for five minutes. The existing preloader loads today and tomorrow on normal connections and today only on data-saving or slow connections. Other selectable dates load on demand. This UI change does not add or replace the loader, preloader, or backend routes.

## Navigation and dates

The home page lists dining halls and the Grab ’n Go and Around Campus categories. A location opens at `/menus?hall=<id>&date=<YYYY-MM-DD>&meal=<meal>`. Selection changes update that address. The About page remains at `/about`.

The calendar enables today and the next thirteen days in `America/New_York`. Only months intersecting that range are displayed. Dates outside the range are disabled; an invalid or out-of-range entry date resolves to today. The range is recalculated while the page is open. Argo Tea uses today only, omits the calendar controls, and links to its official menu.

## Rendering

`Menus` accepts configured locations, a `MenuDataSource`, initial selections, and a selection callback. `MenuPage` supplies the shared API source by default; tests may inject another source without changing production configuration.

Dietary tags, reported allergens, ingredients, serving size, nutrition, and optional prices are displayed only as provided. Missing values remain unknown. The nutrition label retains Total Sugars and omits Added Sugars because the scraped source does not provide that field. The backend response format is unchanged.

## Verification

Menu component tests exercise calendar boundaries, month and year transitions, date changes, the food dialog, and combined-response reuse. Browser tests intercept `/api/menus` with test-only responses and check navigation, retries, nutrition, and café loading. These tests do not verify a live Supabase database.
