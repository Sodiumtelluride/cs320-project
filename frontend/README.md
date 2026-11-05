# UMass Dining frontend

Next.js frontend with a four-location dining hall directory, menu browser, food details, and an About page. The directory is the home page. The interface uses the shared maroon theme, buttons, and dialogs.

Validated with Node.js 24.19.0.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. Select a dining hall to open its menu. The About page is available at `/about`.

```sh
npm run typecheck
npm run lint
npm run test:menus
npm run build
```

After building, run `npm run start` to use the production server.

The default data source uses the included combined sample API. No external backend or environment file is needed for local verification. The four dining halls display sample menus and food details; campus locations without sample data show the pending message.

Set `NEXT_PUBLIC_MENU_API_BASE_URL=/api` and `BACKEND_URL` to a running backend with PR #28's combined snapshot endpoint to enable live menus. Both menu loading and food details use that endpoint. See `docs/menu-api.md` for the response format.

## Browser tests (Playwright)

Run from `frontend/` using Node.js 24:

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

The runner builds and starts its own production server at `127.0.0.1:3171`, with a separate `.next-playwright` directory. Leave that port free. It stops the server when finished; no manually started server or backend is needed. The test server forces the built-in sample menu API even if a live API URL is set in your environment.

The same scenarios run in Chromium at desktop size and a 320px mobile viewport:

- Guest navigation, dining hall/meal/date selection, and URL persistence.
- Food nutrition/allergen details, missing information, keyboard dismissal, and focus restoration.
- Empty menus, unavailable dining halls, and retrying a failed snapshot request.
- One request serving meal tabs and food details for a location and date.
- Login/signup validation, the current unconnected-auth message, and guest mode.
- Menu-page overflow and food-dialog viewport fit.

Menu tests use the current campus date and local sample data. The retry scenario intercepts one snapshot request with a 503, then lets the retry reach the sample endpoint. A mobile viewport is not a physical-device or Safari test.

```sh
npm run test:e2e:headed  # Watch the browser clicks
npm run test:e2e:ui      # Interactive runner
npx playwright show-report
```

Failures retain a screenshot and trace in `test-results/`. Browser output, build output, and the HTML report are ignored by Git. Existing component tests remain available through `npm run test:menus`.
