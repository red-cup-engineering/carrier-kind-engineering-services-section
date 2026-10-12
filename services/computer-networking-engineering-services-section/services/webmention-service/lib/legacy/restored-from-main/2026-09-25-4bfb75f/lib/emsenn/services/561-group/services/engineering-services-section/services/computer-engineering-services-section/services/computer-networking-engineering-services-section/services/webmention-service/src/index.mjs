import { readTextBody } from "@red-cup-engineering/http-services-section/body";
import { fetchWithPolicy } from "./fetch-policy.mjs";
export * from "./fetch-policy.mjs";
const TYPE_TABLE = Object.freeze([
    ["u-in-reply-to", "reply"],
    ["u-like-of", "like"],
    ["u-repost-of", "repost"],
    ["u-bookmark-of", "bookmark"],
]);
export async function discoverEndpoint(target, network = {}) {
    const targetUrl = httpUrl(target, "target");
    const response = await fetchWithPolicy(targetUrl, {
        method: "GET",
        headers: { accept: "text/html, */*;q=0.8" },
    }, "discovery", network);
    const finalUrl = response.url || targetUrl.href;
    const headerEndpoints = endpointsInLinkHeader(response.headers.get("link"), finalUrl);
    if (headerEndpoints.length > 0)
        return { endpoint: headerEndpoints[0], via: "link-header", status: response.status, finalUrl };
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (contentType === "" || contentType.includes("html")) {
        const endpoints = endpointsInHtml(await response.text(), finalUrl);
        if (endpoints.length > 0)
            return { endpoint: endpoints[0], via: "html", status: response.status, finalUrl };
    }
    return { endpoint: null, via: null, status: response.status, finalUrl };
}
export function endpointsInLinkHeader(value, responseUrl) {
    const found = [];
    for (const item of splitHeaderList(value ?? "")) {
        const match = /^\s*<([^>]*)>(.*)$/.exec(item);
        if (!match)
            continue;
        const params = parameterMap(match[2]);
        if (!(params.get("rel") ?? "").toLowerCase().split(/\s+/).includes("webmention"))
            continue;
        try {
            found.push(new URL(match[1], responseUrl).href);
        }
        catch { /* malformed candidates do not hide later endpoints */ }
    }
    return Object.freeze(found);
}
export function endpointsInHtml(html, responseUrl) {
    const base = documentBase(html, responseUrl);
    const found = [];
    for (const tag of scanTags(html)) {
        if (tag.name !== "link" && tag.name !== "a")
            continue;
        if (!tokens(tag.attrs["rel"]).includes("webmention") || tag.attrs["href"] === undefined)
            continue;
        try {
            found.push(new URL(decodeEntities(tag.attrs["href"]), base).href);
        }
        catch { /* ignore malformed candidates */ }
    }
    return Object.freeze(found);
}
export async function verifyMention(source, target, network = {}) {
    const base = { verified: false, retract: false, type: null, linkCount: 0, httpStatus: 0, source, target };
    const invalid = validatePair(source, target);
    if (invalid)
        return { ...base, status: "invalid", reason: invalid };
    try {
        const response = await fetchWithPolicy(source, {
            method: "GET",
            headers: { accept: "text/html, application/xhtml+xml;q=0.9, */*;q=0.1" },
        }, "verification", network);
        const httpStatus = response.status;
        if (httpStatus === 410)
            return { ...base, status: "deleted", retract: true, httpStatus, reason: "source returned 410 Gone" };
        if (httpStatus < 200 || httpStatus >= 300)
            return { ...base, status: "invalid", httpStatus, reason: `source returned HTTP ${httpStatus}` };
        const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
        if (contentType !== "" && !contentType.includes("html") && !contentType.includes("xml")) {
            return { ...base, status: "invalid", httpStatus, reason: "source is not an HTML document" };
        }
        const hits = linksToTarget(await response.text(), response.url || source, target);
        if (hits.length === 0)
            return { ...base, status: "retracted", retract: true, httpStatus, reason: "source no longer links to target" };
        return { ...base, status: "verified", verified: true, type: classifyMention(hits), linkCount: hits.length, httpStatus };
    }
    catch (error) {
        return { ...base, status: "error", reason: errorMessage(error) };
    }
}
export function classifyMention(hits) {
    const properties = new Set(hits.flatMap(({ mf2Props }) => [...mf2Props]));
    for (const [property, type] of TYPE_TABLE)
        if (properties.has(property))
            return type;
    return "mention";
}
export function linksToTarget(html, responseUrl, target) {
    const base = documentBase(html, responseUrl);
    let targetHref;
    try {
        targetHref = new URL(target).href;
    }
    catch {
        return [];
    }
    const hits = [];
    for (const tag of scanTags(html)) {
        if (tag.name !== "a" && tag.name !== "link")
            continue;
        const href = tag.attrs["href"];
        if (href === undefined)
            continue;
        try {
            if (new URL(decodeEntities(href), base).href !== targetHref)
                continue;
        }
        catch {
            continue;
        }
        const classes = tokens(tag.attrs["class"]);
        hits.push(Object.freeze({
            mf2Props: Object.freeze(TYPE_TABLE.map(([property]) => property).filter((property) => classes.includes(property))),
            index: tag.index,
        }));
    }
    return Object.freeze(hits);
}
export function parseMentionRequest(body) {
    const params = new URLSearchParams(body);
    const source = params.get("source");
    const target = params.get("target");
    if (!source || !target)
        return { ok: false, status: 400, source, target, reason: "source and target are required" };
    const invalid = validatePair(source, target);
    return invalid
        ? { ok: false, status: 400, source, target, reason: invalid }
        : { ok: true, status: 202, source, target };
}
export async function receiveMention(body, options) {
    const request = parseMentionRequest(body);
    if (!request.ok)
        return { accepted: false, status: request.status, request, ...(request.reason ? { reason: request.reason } : {}) };
    const target = new URL(request.target);
    if (!await options.ownsTarget(target))
        return { accepted: false, status: 400, request, reason: "target is not in this receiver's custody" };
    const verify = options.verify ?? verifyMention;
    const verdict = await verify(request.source, request.target, options.network);
    const receivedAt = (options.now ?? (() => new Date()))().toISOString();
    try {
        await options.custody(Object.freeze({ source: request.source, target: request.target, verdict, receivedAt }));
    }
    catch (error) {
        return { accepted: false, status: 500, request, verdict, reason: `custody failed: ${errorMessage(error)}` };
    }
    return { accepted: true, status: 202, request, verdict };
}
export async function sendMention(source, target, options = {}) {
    const base = { ok: false, endpoint: null, httpStatus: 0, location: null, source, target };
    const invalid = validatePair(source, target);
    if (invalid)
        return { ...base, status: "invalid", reason: invalid };
    let endpoint = options.endpoint ?? null;
    if (!endpoint) {
        try {
            endpoint = (await discoverEndpoint(target, options.network)).endpoint;
        }
        catch (error) {
            return { ...base, status: "error", reason: `discovery failed: ${errorMessage(error)}` };
        }
    }
    if (!endpoint)
        return { ...base, status: "no-endpoint", reason: "target advertises no Webmention endpoint" };
    try {
        const response = await fetchWithPolicy(endpoint, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: new URLSearchParams({ source, target }).toString(),
        }, "delivery", options.network);
        const httpStatus = response.status;
        const ok = httpStatus >= 200 && httpStatus < 300;
        return {
            ...base,
            endpoint,
            httpStatus,
            location: response.headers.get("location"),
            ok,
            status: ok ? "sent" : "rejected",
            ...(ok ? {} : { reason: `receiver returned HTTP ${httpStatus}` }),
        };
    }
    catch (error) {
        return { ...base, endpoint, status: "error", reason: `delivery failed: ${errorMessage(error)}` };
    }
}
export function webmentionReceiverApp(options) {
    if (typeof options.ownsTarget !== "function")
        throw new TypeError("Webmention receiver requires ownsTarget(target)");
    if (typeof options.custody !== "function")
        throw new TypeError("Webmention receiver requires custody(record)");
    const path = options.path ?? "/webmention";
    const maxBodyBytes = options.maxBodyBytes ?? 64 * 1024;
    return {
        resources: [{
                id: "webmention.receiver",
                name: "Webmention Receiver",
                route: path,
                match: path,
                methods: ["POST"],
                produces: ["application/json"],
                handler: async (context) => {
                    const contentType = String(context.req.headers["content-type"] ?? "").toLowerCase();
                    if (!contentType.startsWith("application/x-www-form-urlencoded"))
                        return json(415, { error: "expected application/x-www-form-urlencoded" });
                    let body;
                    try {
                        body = await readTextBody(context.req, { maxBytes: maxBodyBytes });
                    }
                    catch {
                        return json(413, { error: "request body too large or invalid" });
                    }
                    const result = await receiveMention(body, options);
                    return json(result.status, result);
                },
            }],
    };
}
export function validatePair(source, target) {
    let sourceUrl;
    let targetUrl;
    try {
        sourceUrl = httpUrl(source, "source");
    }
    catch (error) {
        return errorMessage(error);
    }
    try {
        targetUrl = httpUrl(target, "target");
    }
    catch (error) {
        return errorMessage(error);
    }
    if (sourceUrl.href === targetUrl.href)
        return "source and target must differ";
    return null;
}
function httpUrl(value, label) {
    let url;
    try {
        url = new URL(value);
    }
    catch {
        throw new TypeError(`${label} is not a valid URL`);
    }
    if (url.protocol !== "http:" && url.protocol !== "https:")
        throw new TypeError(`${label} scheme must be HTTP or HTTPS`);
    return url;
}
function json(status, value) {
    return { status, type: "application/json; charset=utf-8", cacheControl: { noStore: true }, body: `${JSON.stringify(value)}\n` };
}
function scanTags(html) {
    const tags = [];
    const visible = html.replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (blocked) => " ".repeat(blocked.length));
    const pattern = /<(a|link|base)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi;
    let match;
    while ((match = pattern.exec(visible)) !== null)
        tags.push(Object.freeze({ name: match[1].toLowerCase(), attrs: attributes(match[2]), index: match.index }));
    return tags;
}
function attributes(input) {
    const result = {};
    const pattern = /([^\s/=>"']+)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;
    let match;
    while ((match = pattern.exec(input)) !== null) {
        const raw = match[2];
        result[match[1].toLowerCase()] = raw === undefined ? "" : raw.replace(/^(["'])|(["'])$/g, "");
    }
    return Object.freeze(result);
}
function documentBase(html, fallback) {
    const base = scanTags(html).find((tag) => tag.name === "base")?.attrs["href"];
    if (base === undefined)
        return fallback;
    try {
        return new URL(decodeEntities(base), fallback).href;
    }
    catch {
        return fallback;
    }
}
function tokens(value) {
    return decodeEntities(value ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
}
function decodeEntities(value) {
    return value.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (whole, body) => {
        const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
        const lower = body.toLowerCase();
        if (named[lower] !== undefined)
            return named[lower];
        const number = Number.parseInt(lower.startsWith("#x") ? lower.slice(2) : lower.slice(1), lower.startsWith("#x") ? 16 : 10);
        return Number.isFinite(number) ? String.fromCodePoint(number) : whole;
    });
}
function splitHeaderList(value) {
    const parts = [];
    let start = 0;
    let quoted = false;
    let angled = false;
    let escaped = false;
    for (let index = 0; index < value.length; index += 1) {
        const char = value[index];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (char === "\\" && quoted) {
            escaped = true;
            continue;
        }
        if (char === '"')
            quoted = !quoted;
        else if (!quoted && char === "<")
            angled = true;
        else if (!quoted && char === ">")
            angled = false;
        else if (!quoted && !angled && char === ",") {
            parts.push(value.slice(start, index));
            start = index + 1;
        }
    }
    parts.push(value.slice(start));
    return parts;
}
function parameterMap(value) {
    const params = new Map();
    for (const part of value.split(";").slice(1)) {
        const [rawName, ...rawValue] = part.split("=");
        const name = rawName?.trim().toLowerCase();
        if (!name)
            continue;
        params.set(name, rawValue.join("=").trim().replace(/^"|"$/g, ""));
    }
    return params;
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
