/**
 * Server-side client for the pi harness (pixelspace v3).
 *
 * Authenticates once with the harness service account, caches the session
 * cookie in module memory, and re-logs in on 401. Every call is server-side
 * only — the browser never sees harness credentials.
 */

const BASE = (process.env.PI_BASE_URL ?? "").replace(/\/+$/, "");

export const piConfigured = () => BASE.length > 0;

let sessionCookie: string | null = null;

const login = async () => {
  const email = process.env.PI_EMAIL ?? "";
  const password = process.env.PI_PASSWORD ?? "";
  if (!email || !password) throw new Error("pi credentials are not configured");
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`pi login failed (${res.status})`);
  const cookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  const cookie = cookies.map((entry) => entry.split(";")[0]).join("; ");
  if (!cookie) throw new Error("pi login returned no session cookie");
  sessionCookie = cookie;
};

export const piFetch = async (
  path: string,
  init?: RequestInit,
  retry = true,
): Promise<Response> => {
  if (!sessionCookie) await login();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      cookie: sessionCookie ?? "",
    },
  });
  if (res.status === 401 && retry) {
    sessionCookie = null;
    return piFetch(path, init, false);
  }
  return res;
};
