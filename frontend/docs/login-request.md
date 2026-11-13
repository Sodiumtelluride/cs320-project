# Authentication integration

The frontend talks to the Express app in `BackEnd/src/app.ts` through the rewrites in `frontend/next.config.ts`. Its user routes live in `BackEnd/src/routes/users.ts` and `BackEnd/src/handlers/users.ts`, the session routes in `BackEnd/src/routes/auth.ts` and `BackEnd/src/handlers/auth.ts`, and `BackEnd/src/db/client.ts` is the Supabase data layer behind them. Login (`POST /api/authenticate`), registration (`POST /api/users`), session restoration (`GET /api/auth/me`) and logout (`POST /api/auth/logout`) came from PR #27 and the login-request helper from PR #26. The profile page also edits allergies and favorite foods with `PUT`/`DELETE` on `/api/users/:id/allergies` and `/api/users/:id/favorite-foods` — the routes from PR #33, kept here as the single source of user routes.

PR #29 reverted those update/delete routes as unneeded for login alone. They are needed now that the profile edits them, so `20261028233031_update_user_details.sql` **must** be applied to the database, along with `20261109001500_allow_anon_user_details.sql` and `20261110045234_verify_profile_ownership.sql` if you use the publishable key (see below).

`20261110045234` is not optional for the current backend. It re-declares `update_user_details` and `delete_user_details` with a fourth argument, `p_caller_id`, and both handlers now send it, so against a database that still has the three-argument signatures every allergy and favorite-food save fails with a "function does not exist" error (the route answers 500 `database error`).

## Run locally

In `BackEnd/.env`, configure `SUPABASE_URL`, `SUPABASE_KEY`, and a strong random `SESSION_SECRET` (`src/app.ts` refuses to start without one). The database needs three RPCs: `create_user_with_details` for registration, plus `update_user_details` and `delete_user_details` for profile edits.

`SUPABASE_KEY` may be either:

- a **service-role** key, which is permitted to execute all three RPCs with no extra grants, or
- the **publishable (anon)** key, which requires the `GRANT EXECUTE` statements in `20261021183736_allow_anon.sql` (registration) and `20261110045234_verify_profile_ownership.sql` (profile edits — that migration re-grants them to anon after `20261028233031` revoked them). Without those grants, allergy and favorite-food saves fail with `PGRST202`/permission errors.

Never put a service-role key in frontend configuration.

## Who is allowed to see and change which account

- `authorizeUser` + `requireOwnership` (`BackEnd/src/middleware/auth.ts`) authenticate the request — session cookie first, `username`/`password` in the body as a fallback — and reject a `:id` that is not the caller's own.
- The write handlers pass the authenticated id to the database as `p_caller_id`. It comes from the session, never from anything the client sent.
- `require_profile_owner()` (`20261110045234`) repeats the check inside the two write RPCs and raises `42501`, which the handlers map to `403`. The RPCs are `SECURITY DEFINER` and anon has `SELECT` but no direct `INSERT`/`UPDATE`/`DELETE` on `users`, `passwords`, `favorite_foods` and `allergies`, so a caller holding only the publishable key can no longer write those tables at all.
- `GET /api/users` answers with the caller's own account in a one-element array. It used to return every account, which let any signed-in user read everyone else's email, allergies and favorite foods; an admin listing needs an admin role first.
- Known, accepted gaps, tracked as follow-ups: a publishable-key caller can still set `p_caller_id = p_user_id` (proving identity needs a secret the anon role cannot see — a service-role key for these two RPCs, or a per-request token whose subject PostgREST exposes); anon can still `SELECT password_hash` from `passwords` straight through the Data API; and there is no way to list all accounts, which an admin view will need.

## Push the migrations

`BackEnd/` **is** the Supabase project root — `BackEnd/supabase/config.toml` is there, the
project is already linked to the hosted "UMass Dining Test DB", and the CLI reads exactly
`BackEnd/supabase/migrations/`. So from `BackEnd`:

```bash
npx supabase login    # once per machine, if you have never signed in
npx supabase db push  # lists the pending migrations, then applies them
```

If `db push` tries to re-apply migrations that are already on the server (it does this when
earlier migrations were pasted into the dashboard by hand, so the CLI has no local history
to compare against), skip the CLI: open the project in the dashboard → **SQL Editor** → paste
the entire contents of `supabase/migrations/20261028233031_update_user_details.sql` and Run,
then do the same for `supabase/migrations/20261109001500_allow_anon_user_details.sql`.

To check it landed, run this in the SQL editor:

```sql
SELECT proname, proargnames FROM pg_proc
WHERE proname IN ('update_user_details', 'delete_user_details', 'require_profile_owner');
```

Three rows should come back, and `update_user_details` should show
`{p_user_id,p_caller_id,p_foods,p_allergies}`. If it still shows three arguments,
`20261110045234` has not been applied and profile saves will fail. Or just log in on
`/profile` and add an allergy — it should save instead of reporting "We couldn't update
your account."

From `BackEnd`, run `npm ci`, `npm run build`, then `npm start` (port 3001 by default; `PORT` can override it). From `frontend`, run `npm ci` then `npm run dev`. Next.js forwards authentication requests to `http://127.0.0.1:3001`; set server-only `BACKEND_URL` before building for another backend location. Browser requests stay on the frontend origin so session cookies work without cross-origin cookie configuration.

## Login-request helper

## Run locally

const result = await requestLogin(
  { email, password },
  { endpoint: "/api/authenticate", signal },
);

From BackEnd run `npm ci`, `npm run build`, then `npm start` (port 3001 by default; PORT can override it). From frontend run `npm ci` then `npm run dev`. Next.js forwards authentication requests to `http://127.0.0.1:3001`; set server-only `BACKEND_URL` before building for another backend location. Browser requests stay on the frontend origin so session cookies work without cross-origin cookie configuration.

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
- GET `/api/users`: the caller's own account as `[{ userId, username, favoriteFoods: string[], allergies: string[] }]`, or `[]` when the session points at an account that no longer exists. Requires authentication (400 without credentials or session). It used to return every account.
- GET `/api/users/:id` and GET `/api/users/username/:username`: that account in the same shape, own record only — 400 for a malformed id, 404 when it does not exist, 403 when it belongs to somebody else.
- POST `/api/authenticate`: `{ username, password }`, returns `{ success: true }` or 401 `{ success: false }`. Successful login regenerates the server session.
- GET `/api/auth/me`: guest `[]`, or `[{ id, email, favoriteFoods: string[], allergies: string[] }]`. Password hashes are never included. Responses are not cached.
- POST `/api/auth/logout`: destroys the session, clears the cookie, returns `{ success: true }`.
- PUT/DELETE `/api/users/:id/allergies` and `/api/users/:id/favorite-foods`: edits the signed-in user's own lists (`{ allergies }`, `{ favoriteFoods }`, `{ allergy }`, `{ food }`), answering 200 with an empty body on success, 400 for a rejected body, and 403 for another account or when the database's `require_profile_owner()` rejects the caller.

Signup creates an account using the existing atomic database RPC and then logs in. Refresh restores the server session. The frontend provider stores accounts in an array, and favorites/allergy lists remain arrays. Email ownership verification and official-email eligibility enforcement are not provided by this integration.

All of the user routes are mounted by the main application now: registration, the reads (`GET /api/users`, `GET /api/users/:id`, `GET /api/users/username/:username`) and the profile writes. The reads that were once left unmounted because they exposed password hashes and had no ownership check are behind `authorizeUser`/`requireOwnership`, project only `user_id`, `username`, `favorite_foods` and `allergies`, and are scoped to the caller's own row. `src/db/client.ts` holds only the Supabase layer, so importing it does not start a second server.

Cookies are HttpOnly, SameSite=Lax, last one hour and use Secure in production. The default express-session memory store supports local development only: restarting the backend clears sessions, and multiple instances require a shared store (`createApp` accepts one). Production requires HTTPS and a correctly configured trusted proxy.

## Validation

From `BackEnd`:

```sh
npm run build
npx vitest run src/routes/users.test.ts src/tests/auth-session.test.ts
npx vitest run src/tests/users.integration.test.ts   # needs the database in .env.test
```

From `frontend`:

```sh
npm run typecheck
npm run lint
npx vitest run --config vitest.auth.config.mts
npx playwright test e2e/auth.spec.ts
```

Backend session tests use real password hashing and HTTP cookies with a mocked Supabase adapter, and cover anonymous writes, cross-user reads and the database's `42501` ownership rejection. `src/tests/users.integration.test.ts` runs the same routes against a real Supabase database, including direct PostgREST calls that skip the Express middleware to show the RPC guard and the revoked table writes refuse them; it skips itself when `.env.test` has no database, and the guard tests skip when `20261110045234` has not been applied. Frontend helper tests include simulated service responses and a temporary local HTTP server. Browser tests mock API responses.
