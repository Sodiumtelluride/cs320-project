export type AuthUser = { id: string; email: string; name?: string };
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

// Replace these methods when connecting the backend. No requests, credential
// storage, or simulated sign-in are performed by this frontend placeholder.
export const authAdapter: AuthAdapter = {
  async getUser() { return null; },
  async signIn() {
    throw new Error("Log in is not available yet. You can still browse as a guest.");
  },
  async signUp() {
    throw new Error("Sign up is not available yet. You can still browse as a guest.");
  },
  async signOut() {
    throw new Error("Log out is not available yet. Please try again later.");
  },
};
