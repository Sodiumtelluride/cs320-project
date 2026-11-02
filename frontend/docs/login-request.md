# Authentication integration

This branch combines PRs #24, #25 and #26. The existing account creation endpoint is reused; no new registration database schema is introduced.

## Run locally

In `BackEnd/.env`, configure `SUPABASE_URL`, `SUPABASE_KEY` (a server-only service-role key permitted to call the account RPC), and a strong random `SESSION_SECRET`. Apply the existing Supabase migrations, including `create_user_with_details`, before running. Never put the service-role key in frontend configuration.

From BackEnd run `npm ci`, `npm run build`, then `npm start` (port 3001 by default; PORT can override it). From frontend run `npm ci` then `npm run dev`. Next.js forwards authentication requests to `http://127.0.0.1:3001`; set server-only `BACKEND_URL` before building for another backend location. Browser requests stay on the frontend origin so session cookies work without cross-origin cookie configuration.

## Contract

- POST `/api/users`: existing registration, with `{ username, password, favoriteFoods: [], allergies: [] }`. The email is the username. Existing validation limits usernames to 50 characters and passwords to at least 8 characters. Names are not stored by this schema.
- POST `/api/authenticate` (also `/api/auth/login`): `{ username, password }`, returns `{ success: true }` or 401 `{ success: false }`. Retains PR #26's helper contract and establishes a regenerated server session on success.
- GET `/api/auth/me`: guest `[]`, or `[{ id, email, favoriteFoods: string[], allergies: string[] }]`. Password hashes are never included. Responses are not cached.
- POST `/api/auth/logout`: destroys the session, clears the cookie, returns `[]`.

Signup creates an account using the existing atomic database RPC and then logs in. Email ownership verification is not provided by the existing backend. Login restores the database account; the frontend provider stores accounts in an array. Refresh restores the server session. All favorites/allergy lists remain arrays. Legacy user listing/mutation routes from the standalone database app are not publicly mounted, because they expose password hashes or lack ownership enforcement.

Cookies are HttpOnly, SameSite=Lax, last one hour and use Secure in production. The default express-session memory store supports local development only: restarting the backend clears sessions, and multiple instances require a shared store (createApp accepts one). Production requires HTTPS and a correctly configured trusted proxy.

## Validation

Backend: `npm run build`; `npx vitest run src/tests/auth-session.test.ts src/db/client.test.ts`.
Frontend: `npm run typecheck`; `npm run lint`; `npx vitest run --config vitest.auth.config.mts`; `npx playwright test e2e/auth.spec.ts`.

Backend integration tests use real password hashing and HTTP cookies with a mocked Supabase adapter. Browser tests mock API responses. A live database smoke test remains necessary with the project's Supabase environment. On this Windows machine the browser tests used a temporary webpack build configuration because Turbopack failed to launch its CSS subprocess.
