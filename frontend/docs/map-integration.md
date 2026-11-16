# Campus map / Victor handoff

Branch: `frontend-campus-map`, based on main `0c69b63`. Frontend-only; no backend routes or migrations added.

## Frontend

- Leaflet 1.9.4 renders the interactive map, zoom, dining markers and menu popups.
- Loads Leaflet inside a browser effect; server rendering never imports its browser runtime.
- Uses OpenStreetMap tiles with attribution. An internet connection is required for tiles.
- Requests location only after **Use my location**. Denied/unavailable location keeps the campus map and alphabetical list.
- Consented coordinates are sent to the map endpoint, not stored in browser storage. Backend distances are meters, straight-line, not walking routes.
- List and menu links remain available alongside the map. Unknown backend names get markers without invented menu links.
- The new `/api/map/:path*` rewrite uses the existing `BACKEND_URL` setting (default `http://127.0.0.1:3001`).

## Request / response contract

`POST /api/map/locations`, JSON body `{}` or:

```json
{ "userLocation": { "latitude": 42.388, "longitude": -72.526 } }
```

Expected response is an array:

```json
[
  {
    "name": "berkshire",
    "coords": { "latitude": 42.381917508362285, "longitude": -72.5299664858773 },
    "distance": 820
  }
]
```

`distance` is optional without location. A stable `id` matching menu location IDs is supported and preferred. Existing four dining hall IDs are recognized as names for compatibility with #42. Hours/openStatus are deliberately not shown because #42 supplies temporary values.

## What Victor still needs to do (checked November 16)

1. Change the #42 route registration from GET to the documented POST. POST currently returns 404; ordinary GET without a body returns 500.
2. Accept an empty JSON object when location is not shared; validate coordinates when present.
3. Return stable IDs matching the frontend menu locations, and verify coordinates (the Morrill value conflicts with the branch comments).
4. Replace placeholder hours with verified data or null; correct open-status logic and the failing hours test.
5. Add route tests for requests with/without coordinates, malformed coordinates, and the response contract.

No automatic GET fallback is included: browsers cannot send the JSON body his current GET handler expects.

## Run locally

Normal backend connection: `npm run dev -- --port 3142`, then visit `/map`. Configure/start the backend separately. API errors stay visible; fixture data never silently replaces backend responses.

Explicit UI preview while #42 is being fixed:

```sh
NEXT_PUBLIC_MAP_PREVIEW=1 npm run dev -- --port 3142
```

Preview shows four sample dining locations and does not call the map endpoint or display distance rankings. Restart without that variable to use the backend. The preview banner is omitted from the UI at the user's request.

## Research

- [Leaflet documentation](https://leafletjs.com/reference-1.9.4.html): map layers, markers, popups and cleanup.
- [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading): browser library imports.
- Direct Leaflet keeps the dependency small; no additional React map wrapper is needed for this component.

## Checks

Run `npm run test:menus`, `npm run lint`, `npm run typecheck`, and `npm run build -- --webpack`.
The map tests cover the API contract, malformed responses, permission denial, distance ordering, clearing location, retry and explicit preview mode. Real hosted-backend integration remains blocked by #42.

Verified locally: 70 component/unit tests (12 new map tests), lint, TypeScript and the production Webpack build pass. Browser checks verified real tile loading, four markers, marker/list selection, menu links and no horizontal overflow at 320px. Production-mode browser checks used controlled API responses and simulated coordinates to verify consent, denial, distance ordering, clearing location and retry. These checks do not establish a live connection to Victor's unfinished endpoint.

Next.js 16.4.2 emitted an existing-version security advisory during verification. No framework upgrade was included in this frontend map change.
