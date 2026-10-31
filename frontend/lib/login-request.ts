import type { Credentials } from "./auth";

export interface LoginVerificationResult {
  success: boolean;
}

export interface LoginRequestOptions {
  endpoint: string;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

export class LoginRequestError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "LoginRequestError";
  }
}

function preserveCancellation(error: unknown, signal?: AbortSignal): void {
  if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
    throw error;
  }
}

function invalidResponse(status: number): LoginRequestError {
  return new LoginRequestError("The login service returned an unexpected response. Please try again.", status);
}

export async function requestLogin(
  { email, password }: Credentials,
  { endpoint, signal, fetcher = fetch }: LoginRequestOptions,
): Promise<LoginVerificationResult> {
  const username = email.trim();
  const url = endpoint.trim();

  if (!username || !password) {
    throw new LoginRequestError("Enter your UMass email and password.");
  }
  if (!url) {
    throw new LoginRequestError("The login service address is not configured.");
  }
  signal?.throwIfAborted();

  let response: Response;
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      cache: "no-store",
      signal,
      body: JSON.stringify({ username, password }),
    });
  } catch (error) {
    preserveCancellation(error, signal);
    throw new LoginRequestError("Unable to reach the login service. Please try again.");
  }
  signal?.throwIfAborted();

  if (response.status === 400) {
    throw new LoginRequestError("The login request was rejected. Please check your account information.", 400);
  }
  if (response.status !== 200 && response.status !== 401) {
    throw new LoginRequestError("The login service is unavailable. Please try again.", response.status);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    preserveCancellation(error, signal);
    throw invalidResponse(response.status);
  }

  if (typeof data !== "object" || data === null || !("success" in data) || typeof data.success !== "boolean") {
    throw invalidResponse(response.status);
  }
  if ((response.status === 200 && data.success) || (response.status === 401 && !data.success)) {
    return { success: data.success };
  }
  throw invalidResponse(response.status);
}
