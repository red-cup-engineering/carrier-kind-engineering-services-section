export function requestAbortSignal(req, res) {
    const controller = new AbortController();
    let completed = false;
    const abort = (reason)=>{
        if (!completed && !controller.signal.aborted) controller.abort(new Error(reason));
    };
    res.once("finish", ()=>{
        completed = true;
    });
    res.once("close", ()=>abort("response closed before completion"));
    res.once("error", ()=>abort("response stream error"));
    req.once("aborted", ()=>abort("request aborted by client"));
    req.once("error", ()=>abort("request stream error"));
    const upstream = req.webAbortSignal;
    if (upstream instanceof AbortSignal) {
        if (upstream.aborted) abort("request aborted upstream");
        else upstream.addEventListener("abort", ()=>abort("request aborted upstream"), {
            once: true
        });
    }
    return controller.signal;
}
export function requestTarget(raw) {
    try {
        const absolute = new URL(raw);
        return `${absolute.pathname}${absolute.search}${absolute.hash}`;
    } catch  {
        return raw;
    }
}
export function requestBase(req, app) {
    const configured = absoluteHttpBase(app.base);
    if (configured) return configured;
    const forwarded = app.trustProxy ? forwardedAuthority(req) : {};
    const proto = forwarded.proto ?? directProtocol(req);
    const host = forwarded.host ?? firstHeaderValue(req.headers.host) ?? "localhost";
    return safeOrigin(proto, host);
}
function absoluteHttpBase(base) {
    if (!base) return null;
    try {
        const url = new URL(base);
        if (url.protocol === "http:" || url.protocol === "https:") return url.href;
    } catch  {}
    return null;
}
function forwardedAuthority(req) {
    const forwarded = parseForwarded(firstHeaderValue(req.headers.forwarded));
    const proto = forwarded.proto ?? firstHeaderValue(req.headers["x-forwarded-proto"]);
    const host = forwarded.host ?? firstHeaderValue(req.headers["x-forwarded-host"]);
    return {
        ...proto !== undefined ? {
            proto
        } : {},
        ...host !== undefined ? {
            host
        } : {}
    };
}
function parseForwarded(value) {
    if (!value) return {};
    const first = value.split(",")[0] ?? "";
    const out = {};
    for (const part of first.split(";")){
        const [rawKey, ...rest] = part.split("=");
        const key = rawKey?.trim().toLowerCase();
        if (key !== "proto" && key !== "host") continue;
        const rawValue = rest.join("=").trim();
        const unquoted = rawValue.startsWith("\"") && rawValue.endsWith("\"") ? rawValue.slice(1, -1).replace(/\\(["\\])/g, "$1") : rawValue;
        if (key === "proto") out.proto = unquoted;
        if (key === "host") out.host = unquoted;
    }
    return out;
}
function firstHeaderValue(value) {
    const text = Array.isArray(value) ? value[0] : value;
    const first = text?.split(",")[0]?.trim();
    return first || undefined;
}
function directProtocol(req) {
    return req.socket.encrypted ? "https" : "http";
}
function safeOrigin(proto, host) {
    const protocol = proto.trim().toLowerCase() === "https" ? "https" : "http";
    const trimmedHost = host.trim();
    try {
        return new URL(`${protocol}://${trimmedHost}/`).href;
    } catch  {
        return `${protocol}://localhost/`;
    }
}
