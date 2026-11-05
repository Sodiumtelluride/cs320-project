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

After building, `npm run start` runs the production server locally.

## Browser tests

```sh
npx playwright install chromium
npm run test:e2e
```

Playwright builds and starts a separate frontend at `127.0.0.1:3171`. Menu tests supply test-only responses for `/api/menus` and authentication tests mock their own API responses, so no live backend is required for those tests. The scenarios run at desktop and narrow browser widths. They verify UI behavior and request integration, not live database access.

```sh
npm run test:e2e:headed
npx playwright show-report
```
