import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

export type FetchPurpose = "discovery" | "verification" | "delivery";
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
export type ResolveHost = (hostname: string) => Promise<readonly string[]>;
export type AuthorizeUrl = (url: URL, context: Readonly<{ purpose: FetchPurpose; redirect: number }>) => void | Promise<void>;

export type FetchBoundary = Readonly<{
  fetchImpl?: FetchLike;
  authorize?: AuthorizeUrl;
  resolveHost?: ResolveHost;
  maxRedirects?: number;
}>;

/** Reject URLs that can address this process, its host, or a private network. */
export async function authorizePublicHttpUrl(
  url: URL,
  context: Readonly<{ purpose: FetchPurpose; redirect: number }>,
  resolveHost: ResolveHost = systemResolveHost,
): Promise<void> {
  void context;
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("network URL must use HTTP or HTTPS");
  if (url.username || url.password) throw new TypeError("network URL must not contain credentials");
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) throw new TypeError("local network address is not allowed");
  const addresses = isIP(hostname) ? [hostname] : await resolveHost(hostname);
  if (addresses.length === 0) throw new TypeError("network host did not resolve");
  if (addresses.some((address) => !isPublicAddress(address))) throw new TypeError("private or special-use network address is not allowed");
}

/** Fetch with authorization applied to the initial URL and every redirect hop. */
export async function fetchWithPolicy(
  input: string | URL,
  init: RequestInit,
  purpose: FetchPurpose,
  boundary: FetchBoundary = {},
): Promise<Response> {
  const fetchImpl = boundary.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new TypeError("no fetch implementation is available");
  const authorize = boundary.authorize ?? ((url, context) => authorizePublicHttpUrl(url, context, boundary.resolveHost));
  const maxRedirects = boundary.maxRedirects ?? 5;
  if (!Number.isSafeInteger(maxRedirects) || maxRedirects < 0) throw new RangeError("maxRedirects must be a non-negative integer");
  let url = new URL(input);
  let request = { ...init, redirect: "manual" as const };
  for (let redirect = 0; ; redirect += 1) {
    await authorize(url, { purpose, redirect });
    const response = await fetchImpl(url.href, request);
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    if (redirect >= maxRedirects) throw new Error(`network request exceeded ${maxRedirects} redirects`);
    url = new URL(location, response.url || url.href);
    if (response.status === 303 || ((response.status === 301 || response.status === 302) && request.method?.toUpperCase() === "POST")) {
      const { body: _body, ...withoutBody } = request;
      request = { ...withoutBody, method: "GET", redirect: "manual" };
    }
  }
}

export function isPublicAddress(raw: string): boolean {
  const address = raw.toLowerCase().replace(/%.+$/, "");
  const family = isIP(address);
  if (family === 4) {
    const parts = address.split(".").map(Number);
    const [a = 0, b = 0] = parts;
    return !(a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 0 || b === 168))
      || (a === 198 && (b === 18 || b === 19 || b === 51))
      || (a === 203 && b === 0));
  }
  if (family === 6) {
    if (address.startsWith("::ffff:")) return isPublicAddress(address.slice("::ffff:".length));
    const first = Number.parseInt(address.split(":", 1)[0] ?? "", 16);
    return first >= 0x2000 && first <= 0x3fff && !address.startsWith("2001:db8:");
  }
  return false;
}

async function systemResolveHost(hostname: string): Promise<readonly string[]> {
  return (await lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address);
}
