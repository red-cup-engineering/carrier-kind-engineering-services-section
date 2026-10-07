/**
 * src/dashboards/settlement-view - the live `GET /data/**` dashboard.
 *
 * The dashboard reads through the public runtime index. It does not inspect
 * journal/store/project internals; if a richer visual form needs feed-chain or
 * radial material, that belongs on the runtime read surface first.
 */
import path from "node:path";
import { isObjectRecord } from "@red-cup-engineering/json-services-section";

import { parse } from "@red-cup-engineering/json-services-section";
import {
  renderContentViewHtml,
  renderDirectoryListingHtml,
  renderFeedStateViewHtml,

} from "@red-cup-engineering/metroplat/dashboards/standing-view/rendering";

import { readAtRoot } from "@red-cup-engineering/metroplat/resources/read-write-verbs";

function todayOf(binding) {
  return binding.now().slice(0, 10);
}

function acceptHeaderOf(ctx) {
  const accept = (ctx.req).headers?.["accept"];
  return Array.isArray(accept) ? accept[0] : accept;
}

function decodePathname(pathname) {
  try {
    return pathname.split("/").map((segment) => decodeURIComponent(segment)).join("/");
  } catch {
    return pathname;
  }
}

function normalizeRequestPath(pathname) {
  return pathname.length > "/data".length && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function dataRootOf(binding) {
  return path.resolve(binding.dataRoot, "data");
}

function resolveDataPath(binding, decodedRequestPath) {
  const root = dataRootOf(binding);
  const suffix = decodedRequestPath.slice("/data".length);
  const resolved = path.resolve(root, `.${suffix}`);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) return null;
  return resolved;
}

function joinDataHref(dirRequestPath, relativeName) {
  return `${dirRequestPath.replace(/\/+$/u, "")}/${relativeName}`;
}

const isRecord = isObjectRecord;

function isDirectoryManifest(value) {
  if (!isRecord(value) || value["kind"] !== "metroplat.directory-manifest") return false;
  const files = value["files"];
  return files !== null && typeof files === "object" && !Array.isArray(files);
}

function isContentDocument(value) {
  return isRecord(value)
    && typeof value["entity"] === "string"
    && typeof value["type"] === "string"
    && typeof value["content"] === "string";
}

function negotiateType(accept, offered) {
  if (accept === undefined || accept.trim() === "" || accept.includes("*/*")) return offered[0] ?? null;
  const accepted = accept
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim().toLowerCase() ?? "")
    .filter((entry) => entry.length > 0);
  return offered.find((type) => accepted.includes(type)) ?? null;
}

function contentTypeOf(type) {
  return type.startsWith("text/") || type === "application/json" || type === "application/jsonl"
    ? `${type}; charset=utf-8`
    : type;
}

function directoryEntriesOf(content, requestPath) {
  try {
    const parsed = parse(content);
    if (!isDirectoryManifest(parsed)) return undefined;
    return Object.freeze(Object.keys(parsed.files)
      .sort()
      .map((name) => Object.freeze({ name, href: joinDataHref(requestPath, name) })));
  } catch {
    return undefined;
  }
}

function htmlOf(content, requestPath, binding) {
  try {
    const parsed = parse(content);
    if (Array.isArray(parsed) && parsed.every((item) => isContentDocument(item))) {
      return renderContentViewHtml(requestPath, todayOf(binding), parsed);
    }
    return renderFeedStateViewHtml(parsed, { date: todayOf(binding), token: requestPath });
  } catch {
    return renderContentViewHtml(requestPath, todayOf(binding), [{ entity: requestPath, type: "text", content }]);
  }
}

function htmlRepr(status, body) {
  return { status, type: "text/html; charset=utf-8", body };
}

function errorRepr(status, message) {
  return { status, type: "application/json; charset=utf-8", body: `${JSON.stringify({ error: message }, null, 2)}\n` };
}

function notAcceptable(offered) {
  return { status: 406, type: "text/plain; charset=utf-8", body: `not acceptable - this address offers ${offered.join(", ")}\n` };
}

export function dataResource(opts) {
  return Object.freeze({
    match: (requestPath) => (requestPath === "/data" || requestPath.startsWith("/data/") ? Object.freeze({}) : null),
    route: "/data/**",
    id: "metroplat.data-view.path",
    name: "Data path face",
    methods: Object.freeze(["GET", "HEAD"]),
    produces: Object.freeze(["application/json", "text/html"]),
    handler: async (ctx) => {
      const requestPath = normalizeRequestPath(decodePathname(ctx.url.pathname));
      const resolved = resolveDataPath(opts.binding, requestPath);
      if (resolved === null) return errorRepr(400, `outside the data root: ${requestPath}`);

      let resource;
      try {
        resource = await readAtRoot(opts.binding, { path: resolved });
      } catch {
        return errorRepr(404, `no resource at ${requestPath}`);
      }

      const offered = Object.freeze(["application/json", "text/html"]);
      const chosen = negotiateType(acceptHeaderOf(ctx), offered);
      if (chosen === null) return notAcceptable(offered);
      if (chosen === "text/html") {
        const entries = directoryEntriesOf(resource.content, requestPath);
        return htmlRepr(200, entries === undefined
          ? htmlOf(resource.content, requestPath, opts.binding)
          : renderDirectoryListingHtml(requestPath, todayOf(opts.binding), entries));
      }
      return { status: 200, type: contentTypeOf(resource.type), body: resource.content };
    },
  });
}

export function dataViewResources(opts) {
  return Object.freeze([dataResource(opts)]);
}
