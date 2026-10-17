
/**
 * integrations/federation/webmention/client — the live HTTP client for Webmention discovery,
 * verification, vouch-checking, and sending.
 *
 * Each function binds one live `fetch` call to the pure admission/codec law:
 * discovery and link-scanning read `codecs/text/webmention`; verification
 * classification reads `admission/webmention`. This module owns only the
 * network call and the {@link fetch}-shaped dependency injection, mirroring
 * `src/integrations/openai/service`'s `fetch?: typeof fetch` pattern.
 *
 * @packageDocumentation
 */
import { fetchWithPolicy } from "@red-cup-engineering/http-services-section/fetch-policy";
import {
  webmentionEndpointsInHtml,
  webmentionEndpointsInLinkHeader,
  outboundLinks,

} from "./codec.mjs";
import {
  verifyMentionBody,
  verifyVouchBody,

} from "./validation.mjs";

function liveFetch(label, opts) {
  const boundary = { ...(opts.network ?? {}), ...(opts.fetch === undefined ? {} : { fetchImpl: opts.fetch }) };
  return (url, init) => fetchWithPolicy(url, init, label, boundary);
}

function headerValue(headers, name) {
  return headers.get(name);
}

/** Fetch `targetUrl` and discover its advertised Webmention endpoint (Link header first, then HTML). */
export async function discoverWebmentionEndpoint(targetUrl, opts = {}) {
  const doFetch = liveFetch("discoverWebmentionEndpoint", opts);
  const res = await doFetch(targetUrl, { method: "GET", redirect: "follow", headers: { accept: "text/html, */*;q=0.8" } });
  const finalUrl = res.url || targetUrl;
  const headerEndpoints = webmentionEndpointsInLinkHeader(headerValue(res.headers, "link"), finalUrl);
  if (headerEndpoints.length > 0) return { endpoint: headerEndpoints[0], via: "link-header" };
  const contentType = (headerValue(res.headers, "content-type") ?? "").toLowerCase();
  if (contentType.includes("html") || contentType === "") {
    const body = await res.text();
    const htmlEndpoints = webmentionEndpointsInHtml(body, finalUrl);
    if (htmlEndpoints.length > 0) return { endpoint: htmlEndpoints[0], via: "html" };
  }
  return { endpoint: null, via: null };
}

/** Fetch `source` and verify it still mentions `target`, admitting the result through `verifyMentionBody`. */
export async function verifyWebmention(source, target, opts = {}) {
  const doFetch = liveFetch("verifyWebmention", opts);
  let res;
  try {
    res = await doFetch(source, { method: "GET", redirect: "follow", headers: { accept: "text/html, application/json;q=0.9, text/plain;q=0.8, */*;q=0.1" } });
  } catch (error) {
    return {
      verified: false, retract: false, type: null, linkCount: 0, httpStatus: 0, source, target,
      status: "error", reason: error instanceof Error ? error.message : String(error),
    };
  }
  let body;
  try {
    body = await res.text();
  } catch {
    body = undefined;
  }
  const contentType = headerValue(res.headers, "content-type");
  return verifyMentionBody({
    source,
    target,
    finalUrl: res.url || source,
    httpStatus: res.status,
    ...(contentType === null ? {} : { contentType }),
    ...(body === undefined ? {} : { body }),
  });
}

/** Fetch `vouch` and verify it links to both `source` and `target`. */
export async function verifyWebmentionVouch(vouch, source, target, opts = {}) {
  const doFetch = liveFetch("verifyWebmentionVouch", opts);
  let res;
  try {
    res = await doFetch(vouch, { method: "GET", redirect: "follow", headers: { accept: "text/html, */*;q=0.8" } });
  } catch (error) {
    return { verified: false, vouch, source, target, linkCount: 0, httpStatus: 0, status: "error", reason: error instanceof Error ? error.message : String(error) };
  }
  let body;
  try {
    body = await res.text();
  } catch (error) {
    return { verified: false, vouch, source, target, linkCount: 0, httpStatus: res.status, status: "error", reason: error instanceof Error ? error.message : String(error) };
  }
  return verifyVouchBody({ vouch, source, target, httpStatus: res.status, body });
}

/** Discover (unless `opts.endpoint` is given) and POST a single Webmention. */
export async function sendWebmention(source, target, opts = {}) {
  const doFetch = liveFetch("sendWebmention", opts);
  let endpoint = opts.endpoint ?? null;
  if (endpoint === null) {
    try {
      endpoint = (await discoverWebmentionEndpoint(target, opts)).endpoint;
    } catch (error) {
      return { ok: false, status: "error", endpoint: null, httpStatus: 0, location: null, source, target, reason: `discovery failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
  if (endpoint === null) return { ok: false, status: "no-endpoint", endpoint: null, httpStatus: 0, location: null, source, target, reason: "target advertises no Webmention endpoint" };

  const params = new URLSearchParams({ source, target });
  if (opts.vouch !== undefined) params.set("vouch", opts.vouch);
  let res;
  try {
    res = await doFetch(endpoint, {
      method: "POST",
      redirect: "follow",
      headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body: params.toString(),
    });
  } catch (error) {
    return { ok: false, status: "error", endpoint, httpStatus: 0, location: null, source, target, reason: `POST failed: ${error instanceof Error ? error.message : String(error)}` };
  }
  const ok = res.status >= 200 && res.status < 300;
  return {
    ok,
    status: ok ? "sent" : "rejected",
    endpoint,
    httpStatus: res.status,
    location: headerValue(res.headers, "location"),
    source,
    target,
    ...(ok ? {} : { reason: `receiver returned HTTP ${res.status}` }),
  };
}

/** Send a Webmention to every target in `targets`. */
export async function sendAllWebmentions(source, targets, opts = {}) {
  const results = [];
  for (const target of targets) results.push(await sendWebmention(source, target, opts));
  return Object.freeze(results);
}

/** Send Webmentions to every outbound link an already-fetched source page contains (its "salmentions"). */
export async function sendSalmentions(source, sourceHtml, opts = {}) {
  const exclude = new Set([source, ...(opts.exclude ?? [])]);
  const targets = outboundLinks(sourceHtml, source).filter((target) => !exclude.has(target));
  return sendAllWebmentions(source, targets, opts);
}
