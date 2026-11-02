# Login request

`requestLogin` verifies credentials through the authentication endpoint introduced in backend PR #25. The frontend input uses the existing `Credentials` type. Its email value is submitted under the backend field name `username`.

```ts
import { requestLogin } from "@/lib/login-request";

const result = await requestLogin(
  { email, password },
  { endpoint: authenticationEndpoint, signal },
);

if (!result.success) {
  // Display the invalid-credentials message in the calling interface.
}
```

`authenticationEndpoint` must be the full address of the running backend's `/api/authenticate` endpoint, or an explicitly configured same-origin forwarding path. `signal` is optional and supports cancelling an in-progress request. `fetcher` is an optional request implementation used by the tests; browser callers use the built-in `fetch` by default.

## Request and response

The request uses `POST`, JSON headers, `credentials: "include"`, and `cache: "no-store"`. Leading and trailing email whitespace is removed; the password is sent unchanged.

| Response | Function behavior |
| --- | --- |
| `200` with `{ "success": true }` | Returns `{ success: true }`. |
| `401` with `{ "success": false }` | Returns `{ success: false }`. |
| `400` | Throws `LoginRequestError` for a rejected request. |
| Other status, invalid JSON, or inconsistent result | Throws `LoginRequestError` with a user-facing message and response status. |
| Network failure | Throws `LoginRequestError` with a connection message. |
| Cancellation | Preserves the cancellation error. |

Errors do not expose backend response bodies or network error details. Credentials are not saved by this module.

## Integration

The caller supplies the endpoint because PR #25 registers `/api/authenticate` on the separate application in `BackEnd/src/db/client.ts`. The supplied main server on port 3001 does not mount that endpoint. Backend routing and browser access permissions must be configured before live browser requests can succeed.

Registration must store the full email as the account's `username`. Official-email eligibility and email ownership verification remain backend registration responsibilities. The current backend limits usernames to 50 characters.

This response confirms credential verification only. It does not provide a user object or establish a session. The login UI now calls this helper through `authAdapter.signIn()`. A verified account contains only the submitted email; no database ID is invented. The provider keeps account data as an `AuthUser[]` (empty for guests, one entry after verification). The existing boolean verification response remains an object, matching PRs #25 and #26. Favorites and allergies must remain arrays when profile data is integrated.

Set `NEXT_PUBLIC_AUTH_ENDPOINT` in `.env.local` to the running PR #25 service URL, for example `http://localhost:3000/api/authenticate`, and restart Next.js. Without it, the frontend calls same-origin `/api/authenticate`, which requires a deployment proxy. Cross-origin access requires backend CORS support. This branch does not mount or modify backend routes.

Verification lasts for the current page lifetime. Refresh returns to guest mode; logout clears the in-memory array. Passwords are never stored. Persistent sessions and server logout await PR #24. Sign-up remains unavailable.

## Verification

From `frontend`, run:

```sh
npx vitest run --config vitest.auth.config.mts
npm run typecheck
npm run lint
```

The dedicated test configuration uses the existing Vitest dependency and leaves the menu and Playwright configurations unchanged. Tests simulate service responses and exercise the built-in fetch against a temporary local HTTP server. They do not contact Supabase or a live authentication backend.
