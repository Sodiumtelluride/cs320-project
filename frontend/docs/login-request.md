# Authentication integration

The frontend talks to the Express app in `BackEnd/src/db/client.ts` through the rewrites in `frontend/next.config.ts`. Login (`POST /api/authenticate`), registration (`POST /api/users`), session restoration (`GET /api/auth/me`) and logout (`POST /api/auth/logout`) came from PR #27 and the login-request helper from PR #26. The profile page also edits allergies and favorite foods with `PUT`/`DELETE` on `/api/users/:id/allergies` and `/api/users/:id/favorite-foods` — the routes from PR #33, kept here as the single source of user routes.

PR #29 reverted those update/delete routes as unneeded for login alone. They are needed now that the profile edits them, so `20261028233031_update_user_details.sql` **must** be applied to the database, along with `20261109001500_allow_anon_user_details.sql` if you use the publishable key (see below).

## Run locally

In `BackEnd/.env`, configure `SUPABASE_URL`, `SUPABASE_KEY`, and a strong random `SESSION_SECRET` (`src/db/client.ts` refuses to start without one). The database needs three RPCs: `create_user_with_details` for registration, plus `update_user_details` and `delete_user_details` for profile edits.

`SUPABASE_KEY` may be either:

- a **service-role** key, which is permitted to execute all three RPCs with no extra grants, or
- the **publishable (anon)** key, which requires the `GRANT EXECUTE` statements in `20261021183736_allow_anon.sql` (registration) and `20261109001500_allow_anon_user_details.sql` (profile edits). Without that grant, allergy and favorite-food saves fail with `PGRST202`/permission errors.

Never put a service-role key in frontend configuration.

From `BackEnd`, run `npm ci`, `npm run build`, then `npm start` (port 3001 by default; `PORT` can override it). From `frontend`, run `npm ci` then `npm run dev`. Next.js forwards authentication requests to `http://127.0.0.1:3001`; set server-only `BACKEND_URL` before building for another backend location. Browser requests stay on the frontend origin so session cookies work without cross-origin cookie configuration.

## Login-request helper

```ts
import { requestLogin } from "@/lib/login-request";

const result = await requestLogin(
  { email, password },
  { endpoint: "/api/authenticate", signal },
);

if (!result.success) {
  // Display the invalid-credentials message in the calling interface.
}
```

`endpoint` is the full backend URL or a same-origin forwarding path. The optional `signal` cancels the request, and `fetcher` allows injecting a request implementation in tests. Browser callers use the built-in fetch.

The helper sends JSON with `POST`, `credentials: "include"`, and `cache: "no-store"`. Email whitespace is trimmed and its value is submitted as `username`; the password is unchanged. Credentials are not stored by the helper.

| Response | Helper behavior |
| --- | --- |
| 200 with `{ "success": true }` | Returns `{ success: true }`. |
| 401 with `{ "success": false }` | Returns `{ success: false }`. |
| 400 | Throws `LoginRequestError` for a rejected request. |
| Other status, invalid JSON, or inconsistent result | Throws `LoginRequestError` with a user-safe message and response status. |
| Network failure | Throws `LoginRequestError` with a connection message. |
| Cancellation | Preserves the cancellation error. |

Errors do not expose backend response bodies or network error details. A successful login now establishes a server session; the adapter separately requests the current user rather than treating the success flag as a user object.

## API contract

- POST `/api/users`: existing registration with `{ username, password, favoriteFoods: [], allergies: [] }`. The email is the username. Existing validation limits usernames to 50 characters and passwords to at least 8 characters. Names are not stored by this schema.
- POST `/api/authenticate` (also `/api/auth/login`): `{ username, password }`, returns `{ success: true }` or 401 `{ success: false }`. Successful login regenerates the server session.
- GET `/api/auth/me`: guest `[]`, or `[{ id, email, favoriteFoods: string[], allergies: string[] }]`. Password hashes are never included. Responses are not cached.
- POST `/api/auth/logout`: destroys the session, clears the cookie, returns `[]`.

Signup creates an account using the existing atomic database RPC and then logs in. Refresh restores the server session. The frontend provider stores accounts in an array, and favorites/allergy lists remain arrays. Email ownership verification and official-email eligibility enforcement are not provided by this integration.

The existing database module's legacy user-list and lookup routes are not publicly mounted by the main application because they expose password hashes and lack ownership enforcement. Only its registration handler is reused. Importing that module does not start a second server.

Cookies are HttpOnly, SameSite=Lax, last one hour and use Secure in production. The default express-session memory store supports local development only: restarting the backend clears sessions, and multiple instances require a shared store (`createApp` accepts one). Production requires HTTPS and a correctly configured trusted proxy.

## Validation

From `BackEnd`:

```sh
npm run build
npx vitest run src/tests/auth-session.test.ts src/db/client.test.ts
```

From `frontend`:

```sh
npm run typecheck
npm run lint
npx vitest run --config vitest.auth.config.mts
npx playwright test e2e/auth.spec.ts
```

Backend session tests use real password hashing and HTTP cookies with a mocked Supabase adapter. Frontend helper tests include simulated service responses and a temporary local HTTP server. Browser tests mock API responses. None of these verifies a live Supabase deployment; a live database smoke test remains necessary with the project's environment.
