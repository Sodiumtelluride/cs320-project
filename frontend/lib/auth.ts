import { requestLogin } from "./login-request";

export type AuthUser = { id?: string; email: string; name?: string; favoriteFoods?: string[]; allergies?: string[] };
export type Credentials = { email: string; password: string };
export type SignUpInput = Credentials & { name: string };
export type SignUpResult =
  | { status: "signed-in"; user: AuthUser }
  | { status: "confirmation-required" };

// Backend handoff: implement these methods with your authentication client.
// Keep the adapter object stable; the provider imports this instance in client code.
// Return the current user after session restoration; return null for a guest.
// Throw an Error with a user-safe message on failure. Never return tokens here.
// The backend owns session persistence, credential rules, and access enforcement.
// Password confirmation is checked by the form and is never passed to signUp.
//
// Everything here talks to the Express app in BackEnd/src/db/client.ts, proxied
// to it by next.config.ts rewrites. The session cookie is the only credential the
// browser holds, so every call sends credentials: "include".
export interface AuthAdapter {
  getUser(): Promise<AuthUser | null>;
  signIn(input: Credentials): Promise<AuthUser>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signOut(): Promise<void>;
  /** PUT /api/users/:id/allergies — replaces the signed-in user's allergy list. */
  saveAllergies(userId: string, allergies: string[]): Promise<void>;
  /** PUT /api/users/:id/favorite-foods — replaces the signed-in user's food list. */
  saveFavoriteFoods(userId: string, favoriteFoods: string[]): Promise<void>;
  /** DELETE /api/users/:id/allergies — removes one allergy. */
  removeAllergy(userId: string, allergy: string): Promise<void>;
  /** DELETE /api/users/:id/favorite-foods — removes one favorite food. */
  removeFavoriteFood(userId: string, food: string): Promise<void>;
}

async function accountRequest(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, { ...init, credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 409 ? "An account with this email already exists." : "Unable to complete the account request. Please try again.");
  return response.json();
}

// The user routes answer with either the updated payload or a bare {} plus a
// status code, so all we have to judge is the status.
async function detailsRequest(path: string, method: "PUT" | "DELETE", body: Record<string, unknown>): Promise<void> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("We couldn’t reach your account. Please try again.");
  }
  if (!response.ok) {
    switch (response.status) {
      case 400:
        throw new Error("That entry was rejected. Please check it and try again.");
      case 401:
      case 403:
        throw new Error("Your session expired. Please log in again.");
      default:
        throw new Error("We couldn’t update your account. Please try again.");
    }
  }
}

const userPath = (userId: string, segment: "allergies" | "favorite-foods") =>
  `/api/users/${encodeURIComponent(userId)}/${segment}`;

async function getUser(): Promise<AuthUser | null> {
  const data = await accountRequest("/api/auth/me");
  if (!Array.isArray(data) || data.length > 1) throw new Error("Unexpected account response.");
  if (!data.length) return null;
  const user = data[0];
  if (!user || typeof user.id !== "string" || typeof user.email !== "string" ||
      !Array.isArray(user.favoriteFoods) || !user.favoriteFoods.every((x: unknown) => typeof x === "string") ||
      !Array.isArray(user.allergies) || !user.allergies.every((x: unknown) => typeof x === "string")) throw new Error("Unexpected account response.");
  return { id: user.id, email: user.email, favoriteFoods: user.favoriteFoods, allergies: user.allergies };
}

export const authAdapter: AuthAdapter = {
  getUser,
  async signIn(input) {
    const result = await requestLogin(input, { endpoint: "/api/authenticate" });
    if (!result.success) throw new Error("Invalid email or password. Please try again.");
    const user = await getUser();
    if (!user) throw new Error("Unable to restore your login. Please try again.");
    return user;
  },
  async signUp(input) {
    await accountRequest("/api/users", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: input.email.trim(), password: input.password, favoriteFoods: [], allergies: [] }) });
    // Registration does not create a session. Leave the account ready for login.
    return { status: "signed-in", user: await this.signIn(input) };
  },
  async signOut() { await accountRequest("/api/auth/logout", { method: "POST" }); },
  // The update RPC treats an empty array as "leave this list alone", so a full
  // list always goes up on save and single removals use DELETE.
  saveAllergies(userId, allergies) { return detailsRequest(userPath(userId, "allergies"), "PUT", { allergies }); },
  saveFavoriteFoods(userId, favoriteFoods) { return detailsRequest(userPath(userId, "favorite-foods"), "PUT", { favoriteFoods }); },
  removeAllergy(userId, allergy) { return detailsRequest(userPath(userId, "allergies"), "DELETE", { allergy }); },
  removeFavoriteFood(userId, food) { return detailsRequest(userPath(userId, "favorite-foods"), "DELETE", { food }); },
};
