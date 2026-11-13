# UMass Dining frontend

The home page lists four dining halls and the Grab ’n Go and Around Campus categories. Location menus use the shared maroon theme, buttons, dialogs, and nutrition components. The About page remains at `/about`.

```sh
npm ci
npm run dev
```

Open the address printed by Next.js, normally `http://localhost:3000`. Run the backend with the team's configuration. Menu requests use `/api/menus?location=<id>&date=<YYYY-MM-DD>` through the existing Next.js rewrite. `BACKEND_URL` selects the Express server; the rewrite defaults to `http://127.0.0.1:3001`.

The menu page uses the shared day-response loader for both dining halls and campus locations. Meal changes and food details reuse its cache. The rolling calendar enables today and the next thirteen days. Argo Tea has no date selector and links to its official menu. Published data is not replaced with sample food when a request fails.

Authentication and profile integration are documented in [docs/login-request.md](docs/login-request.md). The menu request and date behavior are documented in [docs/menu-api.md](docs/menu-api.md).

## Checks

```sh
npm run typecheck
npm run lint
npm run test:menus
npm run build
```

After building, run `npm run start` to use the production server.

The menu browser defaults to the included sample API — no external backend or environment file is needed for local verification — and the four sample dining halls use the same snapshot preload and cache as the live data source, with other sample locations still pending. Sample menus and food details are labeled in the interface. Sign-up, login, session restoration, logout, and the Profile page's allergy and favorite-food edits do talk to the Express backend in `BackEnd/` (port 3001, forwarded by the rewrites in `next.config.ts`): see `docs/login-request.md` for the backend setup, the migrations it needs, and who is allowed to read or edit which account. The Map interface is unchanged.

Set `NEXT_PUBLIC_MENU_API_BASE_URL=/api` and `BACKEND_URL` to the Express server to enable live snapshots through the same-origin rewrite. The browser starts loading today's location snapshots after rendering, then the following 13 days, with four background requests at a time. On browsers that report data saver or a 2G connection, only today is preloaded; other dates still load on demand. A selected location/date starts immediately and shares any existing request. Results are held in memory for five minutes. The current scraper fetches today and future dates; other dates are fetched on demand if a snapshot exists. Special source menus remain unavailable. See `BackEnd/README.md` for migration and refresh setup.

## Browser tests

```sh
npx playwright install chromium
npm run test:e2e
```

The runner builds and starts its own production server at `127.0.0.1:3171`, with a separate `.next-playwright` directory. Leave that port free. It stops the server when finished; no manually started server or backend is needed. The test server forces the built-in sample menu API even if a live API URL is set in your environment.

The same 15 scenarios — ten menu, five authentication — run in Chromium at desktop size and a 320px mobile viewport:

- Guest navigation, dining hall/meal/date selection, and URL persistence.
- Food nutrition/allergen details, missing information, keyboard dismissal, and focus restoration.
- Empty menus, unavailable dining halls, and retrying failed menu/detail requests.
- Login and signup validation and guest mode, plus a verified login that opens Profile, a logout that clears it, and a reload that restores the session.
- Menu-page overflow and food-dialog viewport fit.

Tests pin menu dates and use local sample data. The two failure/retry scenarios intercept one API request with a 503, then allow the retry to reach the actual sample endpoint. Authentication scenarios stub the account endpoints (`/api/authenticate`, `/api/auth/me`, `/api/auth/logout`, and `POST /api/users` with a 409 taken email), so they check how the interface reacts to each response and do not prove a live login; `BackEnd/src/tests/users.integration.test.ts` covers the live-database side. A mobile viewport is not a physical-device or Safari test.

```sh
npm run test:e2e:headed
npx playwright show-report
```
