import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it, vi } from "vitest";
import { requestLogin } from "../../lib/login-request";

const endpoint = "https://dining-backend.example/api/authenticate";
const credentials = { email: "student@umass.edu", password: "example-password" };

function respond(status: number, body: unknown) {
  return vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }));
}

describe("requestLogin", () => {
  it("submits the full email as username and preserves the password exactly", async () => {
    const fetcher = respond(200, { success: true });
    const controller = new AbortController();

    await expect(requestLogin(
      { email: "  student@umass.edu  ", password: " password with spaces " },
      { endpoint, fetcher, signal: controller.signal },
    )).resolves.toEqual({ success: true });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe(endpoint);
    expect(options).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });
    expect(JSON.parse(options?.body as string)).toEqual({
      username: "student@umass.edu",
      password: " password with spaces ",
    });
  });

  it("returns a rejection result for HTTP 401 with success false", async () => {
    await expect(requestLogin(credentials, { endpoint, fetcher: respond(401, { success: false }) }))
      .resolves.toEqual({ success: false });
  });

  it.each([
    { email: "   ", password: "example-password" },
    { email: "student@umass.edu", password: "" },
  ])("does not send a request with missing credentials: %j", async (input) => {
    const fetcher = respond(200, { success: true });
    await expect(requestLogin(input, { endpoint, fetcher })).rejects.toThrow("Enter your UMass email and password.");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("requires a configured service address", async () => {
    const fetcher = respond(200, { success: true });
    await expect(requestLogin(credentials, { endpoint: " ", fetcher }))
      .rejects.toThrow("The login service address is not configured.");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports a malformed request separately from incorrect credentials", async () => {
    await expect(requestLogin(credentials, { endpoint, fetcher: respond(400, { success: false }) }))
      .rejects.toMatchObject({ name: "LoginRequestError", status: 400 });
  });

  it.each([404, 429, 500])("reports service errors without exposing the HTTP %i response body", async (status) => {
    await expect(requestLogin(credentials, { endpoint, fetcher: respond(status, { error: "internal detail" }) }))
      .rejects.toMatchObject({
        name: "LoginRequestError",
        status,
        message: "The login service is unavailable. Please try again.",
      });
  });

  it.each([null, [], {}, { success: "true" }])("rejects an invalid response structure: %j", async (body) => {
    await expect(requestLogin(credentials, { endpoint, fetcher: respond(200, body) }))
      .rejects.toMatchObject({ name: "LoginRequestError", status: 200 });
  });

  it("rejects a non-JSON response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("<html>Unavailable</html>", { status: 200 }));
    await expect(requestLogin(credentials, { endpoint, fetcher }))
      .rejects.toThrow("The login service returned an unexpected response.");
  });

  it.each([
    { status: 200, success: false },
    { status: 401, success: true },
  ])("rejects inconsistent status and result: %j", async ({ status, success }) => {
    await expect(requestLogin(credentials, { endpoint, fetcher: respond(status, { success }) }))
      .rejects.toMatchObject({ name: "LoginRequestError", status });
  });

  it("replaces network failure details with a user-facing error", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("internal network detail"));
    await expect(requestLogin(credentials, { endpoint, fetcher })).rejects.toMatchObject({
      name: "LoginRequestError",
      message: "Unable to reach the login service. Please try again.",
    });
  });

  it("does not submit an already cancelled request", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = respond(200, { success: true });

    await expect(requestLogin(credentials, { endpoint, fetcher, signal: controller.signal }))
      .rejects.toBe(controller.signal.reason);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("preserves cancellation while waiting for the service", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      controller.abort();
      throw controller.signal.reason;
    });

    await expect(requestLogin(credentials, { endpoint, fetcher, signal: controller.signal }))
      .rejects.toBe(controller.signal.reason);
  });

  it("preserves cancellation while reading the response", async () => {
    const controller = new AbortController();
    const reason = new DOMException("Request cancelled", "AbortError");
    const response = Response.json({ success: true });
    vi.spyOn(response, "json").mockImplementation(async () => {
      controller.abort(reason);
      throw reason;
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);

    await expect(requestLogin(credentials, { endpoint, fetcher, signal: controller.signal }))
      .rejects.toBe(reason);
  });

  it("uses the built-in fetch to transmit the agreed JSON contract over HTTP", async () => {
    let received: unknown;
    let method: string | undefined;
    let path: string | undefined;
    let contentType: string | undefined;
    const server = createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      received = JSON.parse(body);
      method = request.method;
      path = request.url;
      contentType = request.headers["content-type"];
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ success: true }));
    });

    try {
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const { port } = server.address() as AddressInfo;
      await expect(requestLogin(credentials, {
        endpoint: `http://127.0.0.1:${port}/api/authenticate`,
      })).resolves.toEqual({ success: true });
      expect(method).toBe("POST");
      expect(path).toBe("/api/authenticate");
      expect(contentType).toBe("application/json");
      expect(received).toEqual({ username: credentials.email, password: credentials.password });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => { if (error) reject(error); else resolve(); });
      });
    }
  });
});
