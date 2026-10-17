/**
 * Transfer one original raw NI object between independently admitted hosts.
 *
 * This is a Networking transport over the ORIGINAL URI/NI and immutable-content
 * custody services. It never mints an alternative CID/OID/store key, chooses a
 * caller-provided origin, grants an actor an effect, or changes a namespace.
 * A host installs one peer origin, secured Fetch port and current per-NI
 * authorization. The received original bytes are committed by its own
 * first-write durable custody publisher, not by this transport.
 */
import { isNiUri, makeNiUri, niWellKnownPath } from "@red-cup-engineering/uri-services-section/ni-uri";
import { fetchWithoutRedirects } from "./fetch-without-redirects.mjs";

const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;

function originalPeerOrigin(value) {
  if (typeof value !== "string") throw new TypeError("NI peer: one host-installed origin is required");
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash)
    throw new TypeError("NI peer: origin must be exact credential-free HTTPS without path, query or fragment");
  return url.origin;
}

function exactPositive(value, label) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new RangeError(`NI peer: ${label} must be a positive safe integer`);
  return value;
}

async function boundedBody(response, maximumBytes) {
  const advertised = response.headers?.get("content-length");
  if (advertised !== null && advertised !== undefined) {
    if (!/^(0|[1-9][0-9]*)$/u.test(advertised) || !Number.isSafeInteger(Number(advertised)))
      throw new TypeError("NI peer: content-length is malformed");
    if (Number(advertised) > maximumBytes)
      throw new RangeError("NI peer: original body exceeds the installed byte budget");
  }
  if (response.body === null) {
    if (advertised !== null && advertised !== undefined && Number(advertised) !== 0)
      throw new TypeError("NI peer: nonempty body disappeared before receiving");
    return new Uint8Array(0);
  }
  if (typeof response.body?.getReader !== "function")
    throw new TypeError("NI peer: a bounded byte stream is required");
  const reader = response.body.getReader(), chunks = [];
  let count = 0, complete = false;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) { complete = true; break; }
      if (!(result.value instanceof Uint8Array))
        throw new TypeError("NI peer: raw source stream must yield byte chunks");
      if (result.value.byteLength > maximumBytes - count)
        throw new RangeError("NI peer: original body exceeds the installed byte budget");
      chunks.push(Uint8Array.from(result.value));
      count += result.value.byteLength;
    }
  } finally {
    if (!complete) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (advertised !== null && advertised !== undefined && count !== Number(advertised))
    throw new TypeError("NI peer: received body length differs from HTTP declaration");
  const joined = new Uint8Array(count);
  let cursor = 0;
  for (const chunk of chunks) { joined.set(chunk, cursor); cursor += chunk.length; }
  return joined;
}

/**
 * Installed, single-peer NI receiver. A source's content-type is presentation
 * testimony, not part of a raw-byte NI or local metadata authority: the local
 * first write uses application/octet-stream by construction. Another typed
 * interpretation must be separately admitted as a relation, not overwrite it.
 */
export function createNiPeerReceiver({
  peerOrigin, contentSpace, canReceive, fetchImpl = globalThis.fetch,
  maximumBytes = DEFAULT_MAX_BYTES, timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const origin = originalPeerOrigin(peerOrigin);
  if (contentSpace?.kind !== "semiotic-content.addressed-space.v1" ||
      typeof contentSpace.retain !== "function" || typeof contentSpace.get !== "function")
    throw new TypeError("NI peer: the original installed content space is required");
  if (typeof canReceive !== "function" || typeof fetchImpl !== "function")
    throw new TypeError("NI peer: separate original receive authority and host Fetch port are required");
  exactPositive(maximumBytes, "maximumBytes");
  exactPositive(timeoutMs, "timeoutMs");
  return Object.freeze({
    kind: "ni.peer-receiver.v1",
    peerOrigin: origin,
    async receive(ni, context) {
      if (!isNiUri(ni)) throw new TypeError("NI peer: one canonical raw-byte NI is required");
      if ((await canReceive(context, ni)) !== true)
        throw new TypeError("NI peer: the current principal is not admitted to receive this NI");
      const target = origin + niWellKnownPath(ni);
      const response = await fetchWithoutRedirects(target, {
        method: "GET", headers: { accept: "application/octet-stream" },
        signal: AbortSignal.timeout(timeoutMs),
      }, fetchImpl);
      if (response?.status !== 200) {
        await response?.body?.cancel().catch(() => {});
        throw new Error("NI peer: original HTTP GET did not return 200");
      }
      if (response.url && response.url !== target) {
        await response.body?.cancel().catch(() => {});
        throw new TypeError("NI peer: response came from another URL");
      }
      const encoding = response.headers?.get("content-encoding");
      if (encoding && encoding.toLowerCase() !== "identity") {
        await response.body?.cancel().catch(() => {});
        throw new TypeError("NI peer: encoded/transformed source is not raw NI bytes");
      }
      const bytes = await boundedBody(response, maximumBytes);
      if (makeNiUri(bytes) !== ni)
        throw new TypeError("NI peer: received bytes do not have the requested original NI identity");
      // An NI names raw bytes, not their media presentation. If the local
      // first-writer has already received these exact bytes with a typed
      // presentation, preserve its ORIGINAL metadata: attempting to replace
      // text/javascript with application/octet-stream would falsely refuse
      // otherwise valid cross-office reuse. The remote Content-Type supplies
      // no authority to change local metadata. A fresh object is raw octets.
      const present = typeof contentSpace.head === "function"
        ? await contentSpace.head(ni) : await contentSpace.get(ni);
      if (present !== null && (present.ni !== ni ||
          typeof present.mediaType !== "string" || !present.mediaType ||
          /[\r\n]/u.test(present.mediaType) ||
          (present.size !== undefined && present.size !== bytes.byteLength)))
        throw new TypeError("NI peer: retained original presentation is inconsistent with this NI");
      const mediaType = present?.mediaType ?? "application/octet-stream";
      // Only original durable first-write custody may reestablish receipt
      // barriers, including for preexisting bytes under their retained type.
      const held = await contentSpace.retain(bytes, { mediaType });
      if (held?.ni !== ni || held.byteLength !== bytes.byteLength || held.durable !== true)
        throw new Error("NI peer: durable first-write custody was not received");
      const actual = await contentSpace.get(ni);
      if (!actual || actual.ni !== ni || !(actual.bytes instanceof Uint8Array) ||
          actual.bytes.byteLength !== bytes.byteLength || makeNiUri(actual.bytes) !== ni)
        throw new Error("NI peer: original local custody readback failed");
      return Object.freeze({
        kind: "ni.peer-receiving.v1", ni, peerOrigin: origin,
        byteLength: bytes.byteLength, durable: true,
      });
    },
  });
}
