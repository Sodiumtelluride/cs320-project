import { afterEach, expect, it, vi } from "vitest";
import { authAdapter } from "../../lib/auth";
afterEach(() => vi.unstubAllGlobals());
const account = { id: "user-id", email: "student@umass.edu", favoriteFoods: ["Pizza"], allergies: [] };
it("verifies credentials then restores the database account array", async () => {
 const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ success: true })).mockResolvedValueOnce(Response.json([account]));
 vi.stubGlobal("fetch", fetcher);
 await expect(authAdapter.signIn({ email: account.email, password: "secret" })).resolves.toEqual(account);
 expect(fetcher.mock.calls[0][1].body).toBe(JSON.stringify({ username: account.email, password: "secret" }));
});
it("rejects invalid credentials without requesting a profile", async () => {
 const fetcher = vi.fn().mockResolvedValue(Response.json({ success: false }, { status: 401 })); vi.stubGlobal("fetch", fetcher);
 await expect(authAdapter.signIn({ email: account.email, password: "wrong" })).rejects.toThrow("Invalid email or password");
 expect(fetcher).toHaveBeenCalledTimes(1);
});
it("registers with array fields then logs in", async () => {
 const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ userId: account.id })).mockResolvedValueOnce(Response.json({ success: true })).mockResolvedValueOnce(Response.json([account]));
 vi.stubGlobal("fetch", fetcher);
 await expect(authAdapter.signUp({ email: account.email, password: "password", name: "Student" })).resolves.toEqual({ status: "signed-in", user: account });
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ username: account.email, password: "password", favoriteFoods: [], allergies: [] });
});
it("restores guests and calls server logout", async () => {
 const fetcher = vi.fn().mockImplementation(() => Promise.resolve(Response.json([]))); vi.stubGlobal("fetch", fetcher);
 await expect(authAdapter.getUser()).resolves.toBeNull(); await authAdapter.signOut();
 expect(fetcher).toHaveBeenLastCalledWith("/api/auth/logout", expect.objectContaining({ method: "POST", credentials: "include" }));
});
