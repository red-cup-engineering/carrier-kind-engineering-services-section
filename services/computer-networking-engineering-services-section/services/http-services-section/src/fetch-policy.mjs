/**
 * fetch-policy — outbound fetches that cannot be steered at this host or a private network: every URL,
 * the first and each redirect hop, must be http(s), carry no credentials, and resolve only to public
 * addresses. `boundary` supplies `fetchImpl`, `authorize(url, context)` (to replace the check),
 * `resolveHost` and `maxRedirects`.
 */
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
/** Reject URLs that can address this process, its host, or a private network. */
export async function authorizePublicHttpUrl(url, context, resolveHost = systemResolveHost) {
    void context;
    if (url.protocol !== "http:" && url.protocol !== "https:")
        throw new TypeError("network URL must use HTTP or HTTPS");
    if (url.username || url.password)
        throw new TypeError("network URL must not contain credentials");
    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost"))
        throw new TypeError("local network address is not allowed");
    const addresses = isIP(hostname) ? [hostname] : await resolveHost(hostname);
    if (addresses.length === 0)
        throw new TypeError("network host did not resolve");
    if (addresses.some((address) => !isPublicAddress(address)))
        throw new TypeError("private or special-use network address is not allowed");
}
/** Fetch with per-hop authorization and one propagated caller AbortSignal.
 * Injected authorization, fetch and cancellation implementations must honor
 * their own bounds; this helper does not impose a hard elapsed-time watchdog.
 */
export async function fetchWithPolicy(input, init, purpose, boundary = {}) {
    const fetchImpl = boundary.fetchImpl ?? globalThis.fetch;
    if (typeof fetchImpl !== "function")
        throw new TypeError("no fetch implementation is available");
    const authorize = boundary.authorize ?? ((url, context) => authorizePublicHttpUrl(url, context, boundary.resolveHost));
    const maxRedirects = boundary.maxRedirects ?? 5;
    if (!Number.isSafeInteger(maxRedirects) || maxRedirects < 0)
        throw new RangeError("maxRedirects must be a non-negative integer");
    let url = new URL(input);
    let request = { ...init, redirect: "manual" };
    const visited = new Set();
    for (let redirect = 0;; redirect += 1) {
        request.signal?.throwIfAborted();
        const key = `${(request.method ?? "GET").toUpperCase()} ${url.href}`;
        if (visited.has(key)) throw new Error("network redirect loop");
        visited.add(key);
        await authorize(url, { purpose, redirect });
        request.signal?.throwIfAborted();
        const response = await fetchImpl(url.href, request);
        if (![301, 302, 303, 307, 308].includes(response.status))
            return response;
        const location = response.headers.get("location");
        // With no destination this is the caller's terminal response, including
        // its body. Preserve that existing ownership instead of consuming it.
        if (!location) return response;
        // Release every intermediate body, including refused redirects. Keeping
        // unused streams open can exhaust the same bounded observation's pool.
        try {
            if (redirect >= maxRedirects)
                throw new Error(`network request exceeded ${maxRedirects} redirects`);
            url = new URL(location, response.url || url.href);
        } finally {
            await response.body?.cancel?.();
        }
        if (response.status === 303 || ((response.status === 301 || response.status === 302) && request.method?.toUpperCase() === "POST")) {
            const { body: _body, ...withoutBody } = request;
            request = { ...withoutBody, method: "GET", redirect: "manual" };
        }
    }
}
export function isPublicAddress(raw) {
    const address = raw.toLowerCase().replace(/%.+$/, "");
    const family = isIP(address);
    if (family === 4) {
        const parts = address.split(".").map(Number);
        const [a = 0, b = 0, c = 0] = parts;
        // The IANA IPv4 special-purpose registry (RFC 6890) by its exact prefixes: 192.0.66.0/24
        // (Automattic-hosted publishers) is public even though 192.0.0.0/24 and 192.0.2.0/24 are not.
        return !(a === 0 || a === 10 || a === 127 || a >= 224
            || (a === 100 && b >= 64 && b <= 127)
            || (a === 169 && b === 254)
            || (a === 172 && b >= 16 && b <= 31)
            || (a === 192 && b === 0 && (c === 0 || c === 2))
            || (a === 192 && b === 88 && c === 99)
            || (a === 192 && b === 168)
            || (a === 198 && (b === 18 || b === 19))
            || (a === 198 && b === 51 && c === 100)
            || (a === 203 && b === 0 && c === 113));
    }
    if (family === 6) {
        if (address.startsWith("::ffff:"))
            return isPublicAddress(address.slice("::ffff:".length));
        const first = Number.parseInt(address.split(":", 1)[0] ?? "", 16);
        return first >= 0x2000 && first <= 0x3fff && !address.startsWith("2001:db8:");
    }
    return false;
}
async function systemResolveHost(hostname) {
    return (await lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address);
}

