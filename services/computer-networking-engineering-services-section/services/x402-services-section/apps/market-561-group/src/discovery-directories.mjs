// x402 directories that list a seller by its origin alone (402 Index, which lists each offer, has
// its own derive and reconcile scripts). Registering publishes only the market's public origin.
import { marketX402Service } from "../../../src/market/market.mjs";

export const DISCOVERY_DIRECTORIES = Object.freeze({
  true402: Object.freeze({ provider: "true402.dev", registerUrl: "https://true402.dev/api/v1/services/register", body: (origin) => ({ url: origin }) }),
  agent402: Object.freeze({ provider: "agent402.tools", registerUrl: "https://agent402.tools/api/index/register", body: (origin) => ({ origin }) }),
});

/** A seller origin: HTTPS, scheme and host only. */
export function sellerOrigin(value) {
  let url;
  try { url = new URL(String(value ?? "")); } catch (error) { throw new TypeError("seller origin must be one absolute HTTPS URL", { cause: error }); }
  if (url.protocol !== "https:") throw new TypeError("seller origin must use HTTPS");
  if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) throw new TypeError("seller origin must contain only scheme and host");
  return url.origin;
}

/** Register the origin with one directory; resolves to its receipt, or throws with the directory's answer. */
export async function registerWithDirectory(name, { origin, offer, rails, fetchImpl = fetch, timeoutMs = 10_000 } = {}) {
  const directory = DISCOVERY_DIRECTORIES[name];
  if (!directory) throw new TypeError(`unknown discovery directory: ${name}`);
  const seller = sellerOrigin(origin);
  if (offer && (name !== "true402" || offer.declaration?.origin !== seller || offer.declaration.listed === false)) throw new TypeError("an individual offer must be a listed true402 offer on this seller origin");
  const registration = offer ? { url: `${seller}${offer.declaration.route}`, manifest: marketX402Service([offer], rails, { origin: seller }) } : directory.body(seller);
  const response = await fetchImpl(directory.registerUrl, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(registration),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(`${directory.provider} registration refused HTTP ${response.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  return Object.freeze({ type: "X402DirectoryRegistrationReceipt", directory: name, provider: directory.provider, origin: seller, ...(offer ? { resource: registration.url } : {}),
    status: response.status, response: body, registeredAt: new Date().toISOString() });
}

/** Register with every named directory; one directory refusing does not stop the others. */
export async function registerWithDirectories({ origin, directories = Object.keys(DISCOVERY_DIRECTORIES), fetchImpl } = {}) {
  const results = await Promise.allSettled(directories.map((name) => registerWithDirectory(name, { origin, fetchImpl })));
  return results.map((result, index) => result.status === "fulfilled" ? result.value
    : Object.freeze({ type: "X402DirectoryRegistrationRefusal", directory: directories[index], origin, error: result.reason?.message ?? String(result.reason) }));
}
