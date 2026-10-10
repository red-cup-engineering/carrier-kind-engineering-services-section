/**
 * The S3 REST face, path-style: `GET /` lists buckets, `GET /<bucket>` lists
 * objects (ListObjectsV2), `GET|HEAD /<bucket>/<key>` reads one object with
 * single byte ranges, and PUT/DELETE write when the buckets can. Any S3 client
 * (aws s3, rclone, s3 browsers) can browse what it serves; a browser asking for
 * HTML gets a plain index instead of XML.
 *
 * It serves any bucket set with this shape:
 * - listBuckets() -> [{ name, createdAt? }]
 * - listObjects(bucket, { prefix, delimiter, maxKeys, startAfter, continuationToken })
 *     -> { keys: [{ key, size, etag?, lastModified? }], commonPrefixes, isTruncated, nextContinuationToken } | null
 * - headObject(bucket, key) -> { size, contentType, etag?, lastModified?, metadata? } | null
 * - getObject(bucket, key, { range }) -> head & { body: Uint8Array | ReadableStream, range? } | null
 *     A bucket that answers range returns only those bytes; one that ignores it returns them all.
 * - putObject?(bucket, key, bytes, { contentType, metadata }), deleteObject?(bucket, key),
 *   createBucket?(bucket), deleteBucket?(bucket) -> "deleted" | "absent" | "not-empty"
 */
import { parseRange, contentRange } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/byte-range";
import { httpDate } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/date";

const S3_NS = "http://s3.amazonaws.com/doc/2006-03-01/";
const XML_TYPE = "application/xml; charset=utf-8";
const SAFE_BUCKET = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/u;

export const isSafeBucket = (bucket) => SAFE_BUCKET.test(bucket) && bucket !== "." && bucket !== "..";
const xmlEscape = (value) => String(value).replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;").replace(/'/gu, "&apos;");
const iso = (value) => (value instanceof Date ? value : new Date(value)).toISOString();

/** One ListObjectsV2 page over every key of a bucket (any order): prefix, delimiter roll-up, and continuation. */
export function listKeys(objects, { prefix = "", delimiter = "", maxKeys = 1000, startAfter, continuationToken } = {}) {
  const limit = Number.isFinite(maxKeys) && maxKeys > 0 ? Math.floor(maxKeys) : 1000;
  const after = continuationToken ?? startAfter ?? null;
  const all = objects.filter((object) => object.key.startsWith(prefix) && (after === null || object.key > after)).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const keys = [];
  const commonPrefixes = new Set();
  let lastEmitted = null, isTruncated = false, nextContinuationToken = null;
  for (const object of all) {
    const rest = object.key.slice(prefix.length);
    const index = delimiter ? rest.indexOf(delimiter) : -1;
    const common = index === -1 ? null : prefix + rest.slice(0, index + delimiter.length);
    if (common !== null && commonPrefixes.has(common)) { lastEmitted = object.key; continue; }
    if (keys.length + commonPrefixes.size >= limit) { isTruncated = true; nextContinuationToken = lastEmitted; break; }
    if (common !== null) commonPrefixes.add(common);
    else keys.push(object);
    lastEmitted = object.key;
  }
  return { keys, commonPrefixes: [...commonPrefixes].sort(), isTruncated, nextContinuationToken };
}

export function listObjectsV2Xml(bucket, result, { prefix = "", delimiter = "", maxKeys = 1000 } = {}) {
  const contents = result.keys.map((object) => `<Contents><Key>${xmlEscape(object.key)}</Key>`
    + (object.lastModified ? `<LastModified>${iso(object.lastModified)}</LastModified>` : "")
    + (object.etag ? `<ETag>${xmlEscape(object.etag)}</ETag>` : "")
    + (object.size !== undefined ? `<Size>${object.size}</Size>` : "")
    + "<StorageClass>STANDARD</StorageClass></Contents>").join("");
  const common = result.commonPrefixes.map((value) => `<CommonPrefixes><Prefix>${xmlEscape(value)}</Prefix></CommonPrefixes>`).join("");
  const next = result.nextContinuationToken ? `<NextContinuationToken>${xmlEscape(result.nextContinuationToken)}</NextContinuationToken>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="${S3_NS}"><Name>${xmlEscape(bucket)}</Name><Prefix>${xmlEscape(prefix)}</Prefix>`
    + (delimiter ? `<Delimiter>${xmlEscape(delimiter)}</Delimiter>` : "")
    + `<KeyCount>${result.keys.length + result.commonPrefixes.length}</KeyCount><MaxKeys>${maxKeys}</MaxKeys><IsTruncated>${result.isTruncated ? "true" : "false"}</IsTruncated>${next}${contents}${common}</ListBucketResult>`;
}

export function listBucketsXml(buckets, owner = "local") {
  const rows = buckets.map((bucket) => `<Bucket><Name>${xmlEscape(bucket.name)}</Name><CreationDate>${iso(bucket.createdAt ?? 0)}</CreationDate></Bucket>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><ListAllMyBucketsResult xmlns="${S3_NS}"><Owner><ID>${xmlEscape(owner)}</ID><DisplayName>${xmlEscape(owner)}</DisplayName></Owner><Buckets>${rows}</Buckets></ListAllMyBucketsResult>`;
}

export function s3ErrorXml(code, message, resource) {
  return `<?xml version="1.0" encoding="UTF-8"?><Error><Code>${xmlEscape(code)}</Code><Message>${xmlEscape(message)}</Message>${resource ? `<Resource>${xmlEscape(resource)}</Resource>` : ""}</Error>`;
}

/** { bucket, key } of a path below the mount, or null when the path is not below it. */
export function parseS3Path(path, mount = "/") {
  const base = mount === "/" ? "/" : mount.replace(/\/?$/u, "/");
  if (mount !== "/" && path !== mount && !path.startsWith(base)) return null;
  const relative = (path === mount ? "" : path.slice(base.length)).replace(/^\/+/u, "");
  const slash = relative.indexOf("/");
  const decode = (part) => { try { return decodeURIComponent(part); } catch { return part; } };
  return slash === -1 ? { bucket: decode(relative), key: "" } : { bucket: decode(relative.slice(0, slash)), key: relative.slice(slash + 1).split("/").map(decode).join("/") };
}

function carrier(ctx) {
  const request = ctx.request;
  const header = request !== undefined ? (name) => request.headers.get(name) ?? undefined
    : (name) => { const value = ctx.req?.headers?.[name]; return Array.isArray(value) ? value.join(", ") : value; };
  const url = ctx.url ?? new URL(request?.url ?? `http://${header("host") ?? "localhost"}${ctx.req?.url ?? "/"}`);
  const body = async () => {
    if (request !== undefined) return Buffer.from(await request.arrayBuffer());
    const chunks = [];
    for await (const chunk of ctx.req) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  };
  return { method: request?.method ?? ctx.req?.method ?? "GET", header, url, body };
}

const escapeHtml = (value) => String(value).replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
function sizeText(bytes) {
  if (bytes === undefined) return "";
  const units = ["B", "KiB", "MiB", "GiB"];
  let value = bytes, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}
function htmlPage(title, rows) {
  const body = rows.map(([href, label, size = "", modified = ""]) => `<tr><td><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></td><td>${escapeHtml(size)}</td><td>${escapeHtml(modified)}</td></tr>`).join("");
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title><style>body{font:15px/1.5 system-ui,sans-serif;margin:2rem auto;max-width:60rem;padding:0 1rem}td{padding:.2rem 1rem .2rem 0;vertical-align:top}td:nth-child(2),td:nth-child(3){white-space:nowrap;color:#666}</style><h1>${escapeHtml(title)}</h1><table>${body}</table>`;
}
const wantsHtml = (http) => /\btext\/html\b/u.test(http.header("accept") ?? "") && !http.header("authorization") && !http.url.searchParams.has("list-type");

/** The S3 face as one web resource below mount, answering web Responses. */
export function s3Resource(buckets, { mount = "/", id = "s3", title = "Buckets" } = {}) {
  const base = mount === "/" ? "/" : mount.replace(/\/?$/u, "/");
  const href = (...parts) => base + parts.map((part) => part.split("/").map(encodeURIComponent).join("/")).join("/");
  const xml = (status, body, headers = {}, head = false) => new Response(head ? null : body, { status, headers: { "content-type": XML_TYPE, ...headers } });
  const error = (status, code, message, resource, head) => xml(status, s3ErrorXml(code, message, resource), {}, head);

  async function object(http, bucket, key) {
    const head = http.method === "HEAD";
    const meta = await buckets.headObject(bucket, key);
    if (!meta) return error(404, "NoSuchKey", "The specified key does not exist.", key, head);
    const headers = { "content-type": meta.contentType ?? "application/octet-stream", "accept-ranges": "bytes" };
    if (meta.etag) headers.etag = meta.etag;
    if (meta.lastModified) headers["last-modified"] = httpDate(meta.lastModified instanceof Date ? meta.lastModified : new Date(meta.lastModified));
    for (const [name, value] of Object.entries(meta.metadata ?? {})) headers[`x-amz-meta-${name}`] = String(value);
    const range = http.header("range") === undefined ? null : parseRange(http.header("range"), meta.size);
    if (range === 416) return new Response(null, { status: 416, headers: { ...headers, "content-range": contentRange(null, meta.size) } });
    if (head) return new Response(null, { status: 200, headers: { ...headers, "content-length": String(meta.size) } });
    const found = await buckets.getObject(bucket, key, range ? { range } : {});
    if (!found) return error(404, "NoSuchKey", "The specified key does not exist.", key);
    let body = found.body;
    if (range && !found.range && body instanceof Uint8Array) body = body.subarray(range.start, range.end + 1);
    if (!range) return new Response(body, { status: 200, headers: { ...headers, "content-length": String(meta.size) } });
    return new Response(body, { status: 206, headers: { ...headers, "content-range": contentRange(range, meta.size), "content-length": String(range.end - range.start + 1) } });
  }

  async function bucketList(http, bucket) {
    const params = http.url.searchParams;
    const options = { prefix: params.get("prefix") ?? "", delimiter: params.get("delimiter") ?? "", maxKeys: params.has("max-keys") ? parseInt(params.get("max-keys"), 10) : 1000 };
    if (params.has("start-after")) options.startAfter = params.get("start-after");
    if (params.has("continuation-token")) options.continuationToken = params.get("continuation-token");
    if (wantsHtml(http)) options.delimiter = "/";
    const result = await buckets.listObjects(bucket, options);
    if (!result) return error(404, "NoSuchBucket", "The specified bucket does not exist", bucket, http.method === "HEAD");
    if (!wantsHtml(http)) return xml(200, listObjectsV2Xml(bucket, result, options), {}, http.method === "HEAD");
    const up = options.prefix ? options.prefix.replace(/[^/]*\/$/u, "") : null;
    const rows = [
      ...(up === null ? [[base, "../"]] : [[`${href(bucket)}?prefix=${encodeURIComponent(up)}`, "../"]]),
      ...result.commonPrefixes.map((prefix) => [`${href(bucket)}?prefix=${encodeURIComponent(prefix)}`, prefix.slice(options.prefix.length)]),
      ...result.keys.map((object) => [href(bucket, object.key), object.key.slice(options.prefix.length), sizeText(object.size), object.lastModified ? iso(object.lastModified).slice(0, 10) : ""]),
    ];
    return new Response(htmlPage(`${bucket}/${options.prefix}`, rows), { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  async function handler(ctx) {
    const http = carrier(ctx);
    const parsed = parseS3Path(http.url.pathname, mount);
    if (parsed === null) return undefined;
    const { bucket, key } = parsed;
    const read = http.method === "GET" || http.method === "HEAD";
    if (!bucket) {
      if (!read) return error(405, "MethodNotAllowed", "The specified method is not allowed.", "/");
      const all = typeof buckets.listBuckets === "function" ? await buckets.listBuckets() : [];
      if (wantsHtml(http)) return new Response(htmlPage(title, all.map((entry) => [href(entry.name) + "/", entry.title ? `${entry.title} (${entry.name})` : entry.name, "", entry.createdAt ? iso(entry.createdAt).slice(0, 10) : ""])), { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
      return xml(200, listBucketsXml(all), {}, http.method === "HEAD");
    }
    if (!isSafeBucket(bucket)) return error(400, "InvalidBucketName", "The specified bucket is not valid.", bucket);
    if (key) {
      if (read) return object(http, bucket, key);
      if (http.method === "PUT" && typeof buckets.putObject === "function") {
        const metadata = {};
        for (const [name, value] of (ctx.request?.headers ?? Object.entries(ctx.req?.headers ?? {}))) if (name.toLowerCase().startsWith("x-amz-meta-")) metadata[name.slice(11)] = Array.isArray(value) ? value.join(",") : String(value);
        const stored = await buckets.putObject(bucket, key, await http.body(), { contentType: http.header("content-type") ?? "application/octet-stream", metadata });
        return xml(200, "", stored?.etag ? { etag: stored.etag } : {});
      }
      if (http.method === "DELETE" && typeof buckets.deleteObject === "function") { await buckets.deleteObject(bucket, key); return new Response(null, { status: 204 }); }
      return error(405, "MethodNotAllowed", "The specified method is not allowed.", key);
    }
    if (read) return bucketList(http, bucket);
    if (http.method === "PUT" && typeof buckets.createBucket === "function") { await buckets.createBucket(bucket); return xml(200, "", { location: `/${bucket}` }); }
    if (http.method === "DELETE" && typeof buckets.deleteBucket === "function") {
      const result = await buckets.deleteBucket(bucket);
      if (result === "absent") return error(404, "NoSuchBucket", "The specified bucket does not exist", bucket);
      if (result === "not-empty") return error(409, "BucketNotEmpty", "The bucket you tried to delete is not empty", bucket);
      return new Response(null, { status: 204 });
    }
    return error(405, "MethodNotAllowed", "The specified method is not allowed.", bucket);
  }

  const within = mount === "/" ? () => true : (path) => path === mount || path.startsWith(base);
  return Object.freeze({ id, name: "S3", match: (path) => within(path), methods: Object.freeze(["GET", "HEAD", "PUT", "DELETE"]), handler });
}
