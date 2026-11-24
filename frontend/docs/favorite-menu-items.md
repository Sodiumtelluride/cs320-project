# Nutrition popup favorites

Frontend branch: `frontend-favorite-food-star`, based on Yash's unmerged `origin/fav-foods-route` at `1ad5f6c`. No backend files were changed.

## Verified backend contract

- Initial state: `GET /api/auth/me` returns an array containing the signed-in user's `id` and `favoriteMenuItems: [{ menuItemId: "42", name: "Grilled salmon" }]`. The handlers' shared `USER_SELECT` casts menu IDs to text. Yash's auth-session tests assert this shape.
- Star: `PUT /api/users/:id/favorite-menu-items/:menuItemId`.
- Unstar: `DELETE /api/users/:id/favorite-menu-items/:menuItemId`.
- Both mutations use the session cookie and return an empty HTTP 200 body on success; the frontend does not attempt to parse JSON from that empty body.
- The existing `/api/users/:path*` proxy already covers these routes. No new frontend API route or proxy rule is needed.

## UI behavior

- The nutrition popup shows a labeled star toggle for a real positive database menu-item ID. Development fixture slugs are never sent to the write endpoint.
- The initial pressed state comes from the account's `favoriteMenuItems`, matched by ID, never by food name or the legacy free-text `favoriteFoods` list.
- Successful writes update the shared auth state, preserving the result when the popup closes and reopens. Failed writes leave the prior state unchanged and show an error with retry available.
- An immediate click lock and shared per-user/item pending state prevent duplicate requests, including reopening the popup during a save.
- Auth loading disables the control. Guests are prompted to log in. Missing favorites data is treated as unknown, with a disabled control and an explanatory message.
- Late write completions cannot update a different signed-in account.
- The profile's Favorite foods list displays both ID-based starred menu items and legacy manually entered favorites. Each entry uses its own removal endpoint: menu-item DELETE by ID for starred foods, and the existing text-favorite DELETE for manual entries. Removing a menu favorite updates the shared star state; failed removals retain the entry.

## Yash / deployment handoff

The source contract is clear. Before live database verification, deploy Yash's two favorite-menu-item migrations and ensure `/api/auth/me` always returns `favoriteMenuItems` (including `[]` for no favorites), with string menu-item IDs. If that field is absent or malformed, the frontend will not assume every food is unstarred. No backend workaround is included here.

Local component/browser checks use controlled account/menu responses, not a hosted database. They verify the request contract and UI behavior; they do not establish migration deployment or live database persistence.

## Validation

- All 110 tests across 12 files passed, including 10 new favorite-food tests.
- ESLint, TypeScript, and the production webpack build passed.
- Browser checks passed for initial saved state, keyboard unstarring, starring, reopening, reloading, failed-save recovery, and a 320px viewport without horizontal overflow.
- No backend files, dependencies, or migrations were changed. The existing Next.js version emitted a security advisory during the build; framework upgrades are outside this change.
