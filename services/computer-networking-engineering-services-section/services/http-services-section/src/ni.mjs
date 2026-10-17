/**
 * RFC 6920 section 4: `GET|HEAD /.well-known/ni/sha-256/<digest>` answers the
 * exact bytes the name `ni:///sha-256;<digest>` identifies, with single byte
 * ranges, from content stores { head(ni), read(ni, { start, end }) }.
 * The existing shared NI content-space exposes { head, range } instead, so
 * the Networking owner adapts that original contract without copying bytes
 * into a second store or rewriting an NI identifier. The host must authorize
 * every private named object before even observing its existence.
 * The ETag is the raw-byte identity, not a Git/Guix/IPFS/FluffOS coordinate.
 */
import { parseRange, contentRange } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/byte-range";
import { NI_WELL_KNOWN_PREFIX, niUriOfWellKnownPath } from "@red-cup-engineering/uri-services-section/ni-uri";

export function niResource(contents, {
  id = "ni-well-known", cacheControl, canRead, maximumResponseBytes = 8 * 1024 * 1024,
} = {}) {
  const stores = [contents].flat();
  if (!stores.length || stores.some(store => !store || typeof store.head !== "function" ||
      (typeof store.read !== "function" && typeof store.range !== "function")))
    throw new TypeError("NI HTTP: original content stores need head and read/range operations");
  if (canRead !== undefined && typeof canRead !== "function")
    throw new TypeError("NI HTTP: private reader admission must be a host function");
  if (!Number.isSafeInteger(maximumResponseBytes) || maximumResponseBytes < 1)
    throw new RangeError("NI HTTP: maximumResponseBytes must be positive and finite");
  // The original shared space is a private host capability, not a public
  // mirror. Existing explicitly public content providers keep their API.
  const privateSpace = stores.some(store => store.kind === "semiotic-content.addressed-space.v1");
  if (privateSpace && typeof canRead !== "function")
    throw new TypeError("NI HTTP: shared content space requires a host-authorized per-NI reader");
  if (canRead !== undefined && cacheControl !== undefined &&
      /(?:^|[,\s])public(?:[,\s]|$)/iu.test(cacheControl))
    throw new TypeError("NI HTTP: authorized private content cannot be publicly cached");
  const policy = cacheControl ?? (canRead === undefined
    ? "private, max-age=31536000, immutable" : "private, no-store");
  async function handler(ctx) {
    const request = ctx.request;
    const header = (name) => (request !== undefined ? request.headers.get(name) ?? undefined : [ctx.req?.headers?.[name]].flat()[0]);
    const method = request?.method ?? ctx.req?.method ?? "GET";
    const path = (ctx.url ?? new URL(request?.url ?? `http://localhost${ctx.req?.url ?? "/"}`)).pathname;
    const ni = niUriOfWellKnownPath(path);
    if (ni === null) return new Response("Not Found", { status: 404 });
    if (method !== "GET" && method !== "HEAD")
      return new Response(null, { status: 405, headers: { allow: "GET, HEAD" } });
    // Do not even ask the original byte owner whether a private NI exists
    // until the real host grants this exact subject and operation.
    if (canRead !== undefined && (await canRead(ctx, ni)) !== true)
      return new Response("Not Found", { status: 404, headers: { "cache-control": "no-store" } });
    let found = null, content;
    for (content of stores) if ((found = await content.head(ni))) break;
    if (!found) return new Response("Not Found", { status: 404 });
    if (found.ni !== undefined && found.ni !== ni)
      throw new TypeError("NI HTTP: original content head disagrees with the selected NI");
    if (!Number.isSafeInteger(found.size) || found.size < 0 ||
        typeof found.mediaType !== "string" || !found.mediaType)
      throw new TypeError("NI HTTP: admitted content head is malformed");
    const etag = `"${ni.slice(ni.indexOf(";") + 1)}"`;
    const headers = { "content-type": found.mediaType, "accept-ranges": "bytes", etag, "cache-control": policy };
    if ((header("if-none-match") ?? "").split(",").map((value) => value.trim()).includes(etag)) return new Response(null, { status: 304, headers });
    const range = header("range") === undefined ? null : parseRange(header("range"), found.size);
    if (range === 416) return new Response(null, { status: 416, headers: { ...headers, "content-range": contentRange(null, found.size) } });
    const slice = range ?? { start: 0, end: found.size - 1 };
    const length = found.size === 0 ? 0 : slice.end - slice.start + 1;
    // HEAD is cheap even for enormous binary sources. GET never constructs an
    // unbounded body: clients must request finite byte ranges for large data.
    if (method === "GET" && length > maximumResponseBytes)
      return new Response(null, { status: 413, headers: { ...headers,
        "cache-control": "no-store", "content-length": "0" } });
    const read = content.read ?? content.range;
    const body = method === "HEAD" || length === 0 ? null : await read.call(content, ni, slice);
    if (body !== null && (!(body instanceof Uint8Array) || body.byteLength !== length))
      throw new TypeError("NI HTTP: original content returned a missing or truncated byte range");
    if (body === null && method === "GET" && length > 0)
      throw new TypeError("NI HTTP: original content disappeared after head");
    return new Response(body, { status: range ? 206 : 200, headers: { ...headers, "content-length": String(length), ...(range ? { "content-range": contentRange(range, found.size) } : {}) } });
  }
  return Object.freeze({ id, name: "ni", match: (path) => path.startsWith(NI_WELL_KNOWN_PREFIX), methods: Object.freeze(["GET", "HEAD"]), handler });
}
