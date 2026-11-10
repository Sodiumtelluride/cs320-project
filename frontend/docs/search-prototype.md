# Header search prototype

Frontend-only component in `components/search/food-search.tsx`, placed between the brand and account controls on desktop. On narrow screens it moves to its own header row.

- Filters the invented local fixtures in `search-demo-data.ts` by food name.
- Results support mouse/touch selection, scrolling, Up/Down, Home/End, Enter, Escape, and normal Tab navigation.
- Selecting a result opens a local item dialog, not a live menu route. Demo/preview labels are intentionally omitted from the visible UI.
- The filter dialog excludes selected reported allergens; unknown-allergen items are also hidden while filters are active. Clear filters restores the list.
- Filters are temporary local component state. No profile reads/writes, search API, new routes, dependencies, migrations, or backend changes are included.

This is an incomplete feature demonstration, not live food availability or allergy guidance. Fixture allergen labels are invented and must not be used for food decisions. Backend integration and real menu navigation require a separately agreed contract and task.

Run component checks from `frontend/` with `npx vitest run --config vitest.search.config.mts`. Also run `npm run lint` and `npm run typecheck`.
