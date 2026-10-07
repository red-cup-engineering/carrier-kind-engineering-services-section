/**
 * RFC 6920 section 4: `GET|HEAD /.well-known/ni/sha-256/<digest>` answers the
 * exact bytes the name `ni:///sha-256;<digest>` identifies, with single byte
 * ranges, from content stores { head(ni), read(ni, { start, end }) } such as
 * immutable content custody, asked in order. Content never changes under its name, so the
 * answer is cacheable forever and its ETag is the name.
 */
import { parseRange, contentRange } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/byte-range";
import { NI_WELL_KNOWN_PREFIX, niUriOfWellKnownPath } from "@red-cup-engineering/uri-services-section/ni-uri";

export function niResource(contents, { id = "ni-well-known", cacheControl = "private, max-age=31536000, immutable" } = {}) {
  async function handler(ctx) {
    const request = ctx.request;
    const header = (name) => (request !== undefined ? request.headers.get(name) ?? undefined : [ctx.req?.headers?.[name]].flat()[0]);
    const method = request?.method ?? ctx.req?.method ?? "GET";
    const path = (ctx.url ?? new URL(request?.url ?? `http://localhost${ctx.req?.url ?? "/"}`)).pathname;
    const ni = niUriOfWellKnownPath(path);
    if (ni === null) return new Response("Not Found", { status: 404 });
    let found = null, content;
    for (content of [contents].flat()) if ((found = await content.head(ni))) break;
    if (!found) return new Response("Not Found", { status: 404 });
    const etag = `"${ni.slice(ni.indexOf(";") + 1)}"`;
    const headers = { "content-type": found.mediaType, "accept-ranges": "bytes", etag, "cache-control": cacheControl };
    if ((header("if-none-match") ?? "").split(",").map((value) => value.trim()).includes(etag)) return new Response(null, { status: 304, headers });
    const range = header("range") === undefined ? null : parseRange(header("range"), found.size);
    if (range === 416) return new Response(null, { status: 416, headers: { ...headers, "content-range": contentRange(null, found.size) } });
    const slice = range ?? { start: 0, end: found.size - 1 };
    const length = found.size === 0 ? 0 : slice.end - slice.start + 1;
    const body = method === "HEAD" || length === 0 ? null : await content.read(ni, slice);
    return new Response(body, { status: range ? 206 : 200, headers: { ...headers, "content-length": String(length), ...(range ? { "content-range": contentRange(range, found.size) } : {}) } });
  }
  return Object.freeze({ id, name: "ni", match: (path) => path.startsWith(NI_WELL_KNOWN_PREFIX), methods: Object.freeze(["GET", "HEAD"]), handler });
}
