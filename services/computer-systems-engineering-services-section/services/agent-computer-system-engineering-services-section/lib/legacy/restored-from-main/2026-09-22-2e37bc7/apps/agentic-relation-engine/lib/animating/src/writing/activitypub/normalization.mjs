/**
 * writing/activitypub/normalization — AS2 interop normalization (memo §19) and the
 * security strips (memo §18). ActivityPub interop bugs are mostly representation bugs:
 * fields are arrays or singletons, references are ids or embedded objects, and remote
 * servers send shapes you didn't expect. These pure helpers absorb that variance and
 * keep the unsafe parts out — without owning a server.
 */

/** Coerce a singleton-or-array field to a readonly array (AS2 fields are often either). */
export function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? (value) : [value];
}

/** The id of a reference that may be a bare id string OR an embedded object `{id}`. */
export function idOf(value) {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const id = (value).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}

/** Strip the blind-copy fields (`bto`/`bcc`) before display or persistence — they may be
 *  used for delivery targeting upstream, but must never be shown or stored (AP §6). */
export function stripBlindCopy(activity) {
  const { bto: _bto, bcc: _bcc, ...rest } = activity;
  return rest;
}

const PRIVATE_HOST = /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|::1$|fc|fd|172\.(1[6-9]|2\d|3[01])\.)/i;

/**
 * safeRemoteUrl — the SSRF guard (memo §18): a remote AS2 `id`/`url`/`icon`/`image`/
 * `attachment` may become a server-side fetch, so only allow `https:` to a public host.
 * Denies private/loopback/link-local/metadata ranges and non-http(s) schemes. `http:`
 * is allowed only when `allowHttp` is set (local/dev federation).
 */
export function safeRemoteUrl(url, allowHttp = false) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && !(allowHttp && parsed.protocol === "http:")) return false;
  return !PRIVATE_HOST.test(parsed.hostname);
}
