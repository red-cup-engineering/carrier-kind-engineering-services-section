import { cacheControl } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/cache-control";
import { httpDate } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/date";
export function ensureDateHeader(res, now) {
    if (now === undefined) throw new TypeError("ensureDateHeader: now (a Date, or milliseconds since the epoch) is required");
    if (!res.hasHeader("Date")) res.setHeader("Date", httpDate(now));
}
function wildcardPattern(pattern) {
    if (!pattern.includes("*")) return null;
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`);
}
function originPatternAllowed(origin, pattern) {
    if (pattern instanceof RegExp) return pattern.test(origin);
    if (pattern === "*") return true;
    const wildcard = wildcardPattern(pattern);
    return wildcard ? wildcard.test(origin) : pattern === origin;
}
export function corsOriginAllowed(req, opts) {
    const origin = String(req.headers["origin"] ?? "");
    if (!origin) return false;
    const { origins } = opts;
    if (!origins) return true;
    if (typeof origins === "function") return origins(origin, {
        req
    });
    return origins.some((pattern)=>originPatternAllowed(origin, pattern));
}
function corsAllowedOrigin(req, opts) {
    const origin = String(req.headers["origin"] ?? "");
    if (!origin || !corsOriginAllowed(req, opts)) return null;
    const origins = opts.origins;
    const wildcard = Array.isArray(origins) && origins.includes("*");
    return wildcard && !opts.credentials ? "*" : origin;
}
function headerTokens(value) {
    const raw = Array.isArray(value) ? value.join(",") : value ?? "";
    return raw.split(",").map((part)=>part.trim()).filter(Boolean);
}
function requestedMethodAllowed(req, opts) {
    const method = String(req.headers["access-control-request-method"] ?? "").trim().toUpperCase();
    if (!method || !opts.methods?.length) return true;
    return opts.methods.map((item)=>item.toUpperCase()).includes(method);
}
function requestedHeadersAllowed(req, opts) {
    if (!opts.headers?.length) return true;
    const allowed = new Set(opts.headers.map((item)=>item.toLowerCase()));
    return headerTokens(req.headers["access-control-request-headers"]).every((item)=>allowed.has(item.toLowerCase()));
}
function privateNetworkAllowed(req, opts) {
    return String(req.headers["access-control-request-private-network"] ?? "").toLowerCase() !== "true" || opts.allowPrivateNetwork === true;
}
export function corsPreflightDecision(req, opts) {
    const denyStatus = opts.preflightDenyStatus ?? 403;
    if (!corsOriginAllowed(req, opts)) return {
        ok: false,
        status: denyStatus,
        reason: "origin"
    };
    if (!requestedMethodAllowed(req, opts)) return {
        ok: false,
        status: 405,
        reason: "method"
    };
    if (!requestedHeadersAllowed(req, opts)) return {
        ok: false,
        status: denyStatus,
        reason: "headers"
    };
    if (!privateNetworkAllowed(req, opts)) return {
        ok: false,
        status: denyStatus,
        reason: "private-network"
    };
    return {
        ok: true,
        status: 204
    };
}
export function applyCors(res, req, opts) {
    const origin = corsAllowedOrigin(req, opts);
    if (!origin) return;
    res.setHeader("Access-Control-Allow-Origin", origin);
    if (opts.credentials) res.setHeader("Access-Control-Allow-Credentials", "true");
    if (opts.expose?.length) res.setHeader("Access-Control-Expose-Headers", opts.expose.join(", "));
    appendVary(res, "Origin");
}
export function corsPreflight(req, res, opts, status = 204) {
    appendVary(res, "Access-Control-Request-Method");
    appendVary(res, "Access-Control-Request-Headers");
    appendVary(res, "Access-Control-Request-Private-Network");
    if (opts.strictPreflight) {
        const decision = corsPreflightDecision(req, opts);
        if (!decision.ok) {
            res.writeHead(decision.status, {
                "content-type": "text/plain; charset=utf-8"
            }).end(decision.reason ? `CORS preflight denied: ${decision.reason}` : "CORS preflight denied");
            return;
        }
    }
    applyCors(res, req, opts);
    const reqMethod = req.headers["access-control-request-method"];
    const reqHeaders = req.headers["access-control-request-headers"];
    if (reqMethod) res.setHeader("Access-Control-Allow-Methods", opts.methods?.join(", ") ?? reqMethod);
    if (reqHeaders) res.setHeader("Access-Control-Allow-Headers", opts.headers?.join(", ") ?? reqHeaders);
    if (opts.allowPrivateNetwork && String(req.headers["access-control-request-private-network"] ?? "").toLowerCase() === "true") {
        res.setHeader("Access-Control-Allow-Private-Network", "true");
    }
    if (opts.maxAge) res.setHeader("Access-Control-Max-Age", String(opts.maxAge));
    res.writeHead(status).end();
}
export function appendVary(res, field) {
    const existing = res.getHeader("Vary");
    const cur = existing ? String(existing) : "";
    const fields = cur ? cur.split(",").map((s)=>s.trim()) : [];
    if (!fields.some((existingField)=>existingField.toLowerCase() === field.toLowerCase())) {
        res.setHeader("Vary", [
            ...fields,
            field
        ].join(", "));
    }
}
function seconds(name, value) {
    if (value === undefined) return null;
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer`);
    return String(value);
}
export function applyCacheControl(res, policy) {
    if (!policy || res.hasHeader("Cache-Control")) return;
    const value = cacheControl(policy);
    if (value) res.setHeader("Cache-Control", value);
}
const DEFAULT_SECURITY_HEADERS = {
    contentSecurityPolicy: "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
    contentSecurityPolicyReportOnly: false,
    strictTransportSecurity: {
        maxAge: 31_536_000,
        includeSubDomains: true
    },
    contentTypeOptions: "nosniff",
    referrerPolicy: "no-referrer",
    frameOptions: "DENY",
    permissionsPolicy: "geolocation=(), microphone=(), camera=()",
    reportingEndpoints: false,
    crossOriginOpenerPolicy: "same-origin",
    crossOriginResourcePolicy: "same-origin",
    crossOriginEmbedderPolicy: false,
    originAgentCluster: "?1",
    dnsPrefetchControl: "off",
    downloadOptions: "noopen",
    permittedCrossDomainPolicies: "none"
};
function hsts(value) {
    const hstsValue = value === undefined ? DEFAULT_SECURITY_HEADERS.strictTransportSecurity : value;
    if (typeof hstsValue === "string" || hstsValue === false) return hstsValue;
    const maxAge = seconds("strictTransportSecurity.maxAge", hstsValue.maxAge ?? 31_536_000);
    const parts = [
        `max-age=${maxAge}`
    ];
    if (hstsValue.includeSubDomains) parts.push("includeSubDomains");
    if (hstsValue.preload) parts.push("preload");
    return parts.join("; ");
}
function securityValue(headers, key) {
    return headers[key] === undefined ? DEFAULT_SECURITY_HEADERS[key] : headers[key];
}
function setHeaderUnlessDisabled(res, name, value) {
    if (value === false || value === undefined || res.hasHeader(name)) return;
    res.setHeader(name, value);
}
function reportingEndpoints(value) {
    if (value === false || value === undefined || typeof value === "string") return value;
    return Object.entries(value).map(([name, url])=>`${name}="${String(url).replace(/"/g, '\\"')}"`).join(", ");
}
export function applySecurityHeaders(res, policy, nonce) {
    if (!policy) return;
    const headers = policy === true ? DEFAULT_SECURITY_HEADERS : policy;
    const csp = policy === true && nonce ? `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'nonce-${nonce}'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'` : securityValue(headers, "contentSecurityPolicy");
    setHeaderUnlessDisabled(res, "Content-Security-Policy", csp);
    setHeaderUnlessDisabled(res, "Content-Security-Policy-Report-Only", securityValue(headers, "contentSecurityPolicyReportOnly"));
    setHeaderUnlessDisabled(res, "Strict-Transport-Security", hsts(headers.strictTransportSecurity));
    setHeaderUnlessDisabled(res, "X-Content-Type-Options", securityValue(headers, "contentTypeOptions"));
    setHeaderUnlessDisabled(res, "Referrer-Policy", securityValue(headers, "referrerPolicy"));
    setHeaderUnlessDisabled(res, "X-Frame-Options", securityValue(headers, "frameOptions"));
    setHeaderUnlessDisabled(res, "Permissions-Policy", securityValue(headers, "permissionsPolicy"));
    setHeaderUnlessDisabled(res, "Reporting-Endpoints", reportingEndpoints(securityValue(headers, "reportingEndpoints")));
    setHeaderUnlessDisabled(res, "Cross-Origin-Opener-Policy", securityValue(headers, "crossOriginOpenerPolicy"));
    setHeaderUnlessDisabled(res, "Cross-Origin-Resource-Policy", securityValue(headers, "crossOriginResourcePolicy"));
    setHeaderUnlessDisabled(res, "Cross-Origin-Embedder-Policy", securityValue(headers, "crossOriginEmbedderPolicy"));
    setHeaderUnlessDisabled(res, "Origin-Agent-Cluster", securityValue(headers, "originAgentCluster"));
    setHeaderUnlessDisabled(res, "X-DNS-Prefetch-Control", securityValue(headers, "dnsPrefetchControl"));
    setHeaderUnlessDisabled(res, "X-Download-Options", securityValue(headers, "downloadOptions"));
    setHeaderUnlessDisabled(res, "X-Permitted-Cross-Domain-Policies", securityValue(headers, "permittedCrossDomainPolicies"));
}
