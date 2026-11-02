import { afterEach, expect, it, vi } from "vitest";
import { authAdapter } from "../../lib/auth";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("connects credentials to verification without inventing profile data", async () => {
  vi.stubEnv("NEXT_PUBLIC_AUTH_ENDPOINT", "https://auth.example/api/authenticate");
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));
  vi.stubGlobal("fetch", fetcher);
  await expect(authAdapter.signIn({ email: " student@umass.edu ", password: "secret" })).resolves.toEqual({ email: "student@umass.edu" });
  expect(fetcher).toHaveBeenCalledWith("https://auth.example/api/authenticate", expect.objectContaining({ body: JSON.stringify({ username: "student@umass.edu", password: "secret" }) }));
});
it("rejects invalid credentials", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 401 })));
  await expect(authAdapter.signIn({ email: "student@umass.edu", password: "wrong" })).rejects.toThrow("Invalid email or password");
});
it("restores a guest and permits local logout without requests", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  await expect(authAdapter.getUser()).resolves.toBeNull();
  await expect(authAdapter.signOut()).resolves.toBeUndefined();
  expect(fetcher).not.toHaveBeenCalled();
});
