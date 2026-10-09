const MIME_TYPES = Object.freeze({ ".mts": "text/javascript; charset=utf-8" });

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isPath = (value) => typeof value === "string" && value.startsWith("/") && !value.includes("?") && !value.includes("#");
const isBinding = (value) => typeof value === "string" && /^[A-Z][A-Z0-9_]{0,127}$/u.test(value);
const freeze = (value) => Object.freeze(value);
const failure = (message) => { throw new TypeError(`invalid static-assets route policy: ${message}`); };

/**
 * Builds the stateless Cloudflare Worker shell for an asset release.
 *
 * The only provider effect is the returned Worker fetch handler calling the declared
 * Assets capability. Route decisions stay data, so public applications do not each
 * reimplement redirect, rewrite, and media-type behavior.
 */
export function createCloudflareStaticAssetsWorker(policy) {
  if (!isRecord(policy) || !isBinding(policy.assetBinding)) failure("assetBinding must be an uppercase Worker binding name");
  const redirects = policy.redirects ?? [];
  const rewrites = policy.rewrites ?? [];
  const responses = policy.responses ?? [];
  const mimeTypes = policy.mimeTypes ?? MIME_TYPES;
  if (!Array.isArray(redirects) || !redirects.every((rule) => isRecord(rule) && isPath(rule.from) && isPath(rule.to) && [301, 302, 303, 307, 308].includes(rule.status ?? 302))) failure("redirects must be path-to-path redirect rules");
  if (!Array.isArray(rewrites) || !rewrites.every((rule) => isRecord(rule) && isPath(rule.from) && isPath(rule.to))) failure("rewrites must be path-to-path rewrite rules");
  if (!Array.isArray(responses) || !responses.every((rule) => isRecord(rule) && isPath(rule.path) && Number.isInteger(rule.status) && rule.status >= 100 && rule.status <= 599 && typeof rule.body === "string" && isRecord(rule.headers ?? {}))) failure("responses must be declared path, status, body, and headers");
  if (!isRecord(mimeTypes) || Object.entries(mimeTypes).some(([suffix, type]) => !suffix.startsWith(".") || typeof type !== "string" || type.length === 0)) failure("mimeTypes must map filename suffixes to media types");
  if (policy.prefix !== undefined && (!isRecord(policy.prefix) || !isPath(policy.prefix.path) || !Array.isArray(policy.prefix.exclude) || !policy.prefix.exclude.every(isPath) || !isPath(policy.prefix.index))) failure("prefix requires path, excluded path prefixes, and index path");
  const byPath = (rules, key) => new Map(rules.map((rule) => [rule[key], rule]));
  const redirectByPath = byPath(redirects, "from");
  const rewriteByPath = byPath(rewrites, "from");
  const responseByPath = byPath(responses, "path");
  if (redirectByPath.size !== redirects.length || rewriteByPath.size !== rewrites.length || responseByPath.size !== responses.length) failure("route rule paths must be unique within their kind");
  const prefix = policy.prefix === undefined ? undefined : freeze({ path: policy.prefix.path.replace(/\/$/u, ""), exclude: freeze([...policy.prefix.exclude]), index: policy.prefix.index });

  const rewriteRequest = (request, target) => {
    const url = new URL(request.url);
    url.pathname = target;
    return new Request(url, request);
  };
  const resolveAssetRequest = (request) => {
    const url = new URL(request.url);
    const explicit = rewriteByPath.get(url.pathname);
    if (explicit !== undefined) return rewriteRequest(request, explicit.to);
    if (prefix !== undefined && !prefix.exclude.some((entry) => url.pathname.startsWith(entry))) {
      let relative = url.pathname;
      if (relative === "/" || relative === "") relative = prefix.index;
      else if (relative.endsWith("/")) relative = `${relative}${prefix.index.slice(1)}`;
      return rewriteRequest(request, `${prefix.path}${relative}`);
    }
    return request;
  };
  return freeze({
    async fetch(request, env) {
      const url = new URL(request.url);
      const response = responseByPath.get(url.pathname);
      if (response !== undefined) return new Response(response.body, { status: response.status, headers: response.headers });
      const redirect = redirectByPath.get(url.pathname);
      if (redirect !== undefined) return new Response(null, { status: redirect.status ?? 302, headers: { Location: redirect.to } });
      const assets = env[policy.assetBinding];
      if (!assets || typeof assets.fetch !== "function") throw new TypeError(`missing declared Assets binding ${policy.assetBinding}`);
      const assetResponse = await assets.fetch(resolveAssetRequest(request));
      const mediaType = Object.entries(mimeTypes).find(([suffix]) => url.pathname.endsWith(suffix))?.[1];
      if (!mediaType || !assetResponse.ok) return assetResponse;
      const headers = new Headers(assetResponse.headers);
      headers.set("Content-Type", mediaType);
      return new Response(assetResponse.body, { status: assetResponse.status, statusText: assetResponse.statusText, headers });
    },
  });
}
