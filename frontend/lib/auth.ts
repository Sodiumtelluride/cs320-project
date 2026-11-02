import { requestLogin } from "./login-request";

export type AuthUser = { id?: string; email: string; name?: string };
export type Credentials = { email: string; password: string };
export type SignUpInput = Credentials & { name: string };
export type SignUpResult =
  | { status: "signed-in"; user: AuthUser }
  | { status: "confirmation-required" };

// Backend handoff: implement these four methods with your authentication client.
// Keep the adapter object stable; the provider imports this instance in client code.
// Return the current user after session restoration; return null for a guest.
// Throw an Error with a user-safe message on failure. Never return tokens here.
// The backend owns session persistence, credential rules, and access enforcement.
// Password confirmation is checked by the form and is never passed to signUp.
export interface AuthAdapter {
  getUser(): Promise<AuthUser | null>;
  signIn(input: Credentials): Promise<AuthUser>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signOut(): Promise<void>;
}

// PR #25 verifies credentials only. Account state lives in the provider;
// no credentials or account data are persisted across page reloads.
export const authAdapter: AuthAdapter = {
  async getUser() { return null; },
  async signIn(input) {
    const result = await requestLogin(input, {
      endpoint: process.env.NEXT_PUBLIC_AUTH_ENDPOINT || "/api/authenticate",
    });
    if (!result.success) throw new Error("Invalid email or password. Please try again.");
    // Verification provides no database ID or profile fields.
    return { email: input.email.trim() };
  },
  async signUp() {
    throw new Error("Sign up is not available yet. You can still browse as a guest.");
  },
  async signOut() {
    // There is no backend session to revoke in PR #25.
  },
};
