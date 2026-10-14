// Moved down from computer-web-server (request.mjs): a request's trace is a
// witnessed sequence of subject/predicate/object/provenance entries over the
// same computer-data judgment system every substrate capability shares. It
// depended only on computer-data-engine, never on anything web-server- or
// gui-server-specific, so both the web server and TUFTE (and anything else
// admitting an HTTP request) share this one implementation instead of each
// owning a copy.
import { mark, utterance } from "@red-cup-engineering/signcell/utterance";
import { settleJudgments } from "@red-cup-engineering/signchain/bilattice";
let reqCounter = 0;
const credentialHeader = /authorization|cookie|token|secret|password|credential|api[-_]?key|csrf|jwt|signature/iu;
const urlHeaders = new Set(["referer", "referrer", "location", "x-original-url", "x-original-uri", "x-rewrite-url", "x-forwarded-uri"]);

// A trace is diagnostic evidence, not credential custody. Keep the route and
// query names, but never query values or URL userinfo. Routing/admission retain
// the original request separately; this projection cannot authenticate anyone.
function traceUrl(value) {
    const raw = String(value);
    try {
        const url = new URL(raw, "https://request-trace.invalid/");
        if (!url.username && !url.password && !url.search && !url.hash) return raw;
        url.username = "";
        url.password = "";
        url.hash = "";
        for (const name of new Set(url.searchParams.keys())) url.searchParams.set(name, "[redacted]");
        return /^[a-z][a-z0-9+.-]*:\/\//iu.test(raw) ? url.href : `${url.pathname}${url.search}`;
    } catch {
        return "[unparseable URL redacted]";
    }
}
export function traceRequest(req, now) {
    if (typeof now !== "function") throw new TypeError("traceRequest: now (a clock function) is required");
    const id = `req-${++reqCounter}`;
    const t = String(now());
    const entries = [
        {
            e: id,
            a: "method",
            v: String(req.method ?? "GET").toUpperCase(),
            t
        },
        {
            e: id,
            a: "url",
            v: traceUrl(req.url ?? "/"),
            t
        },
        {
            e: id,
            a: "http-version",
            v: req.httpVersion,
            t
        },
        {
            e: id,
            a: "remote-addr",
            v: String(req.socket.remoteAddress ?? ""),
            t
        }
    ];
    for (const [key, value] of Object.entries(req.headers)){
        if (value == null) continue;
        const name = key.toLowerCase();
        const text = Array.isArray(value) ? value.join(", ") : String(value);
        entries.push({
            e: id,
            a: `header.${name}`,
            v: credentialHeader.test(name) ? "[redacted]" : urlHeaders.has(name) ? traceUrl(text) : text,
            t
        });
    }
    return Object.freeze({
        kind: "web-server.request-trace",
        id,
        entries: Object.freeze(entries)
    });
}
export function claimOf(trace, claim) {
    for(let i = trace.entries.length - 1; i >= 0; i--){
        const entry = trace.entries[i];
        if (String(entry.e) === trace.id && entry.a === claim) {
            return String(entry.v);
        }
    }
    return null;
}
export function allClaims(trace, claim) {
    const out = [];
    for (const entry of trace.entries){
        if (String(entry.e) === trace.id && entry.a === claim) out.push(String(entry.v));
    }
    return out;
}
export function appendEntries(trace, entries) {
    return Object.freeze({
        ...trace,
        entries: Object.freeze([
            ...trace.entries,
            ...entries
        ])
    });
}
function traceEntryOf(entry) {
    return {
        subject: mark(String(entry.e)),
        predicate: mark(entry.a),
        object: mark(String(entry.v)),
        provenance: entry.t
    };
}
function judgmentEntry(trace, judgment) {
    return {
        subject: mark(trace.id),
        predicate: mark(`judgment:${judgment.name}`),
        object: mark(judgment.path),
        provenance: judgment.reason
    };
}
function utterTrace(entries) {
    return Object.freeze(entries.map((entry)=>utterance(mark(Object.freeze({
            subject: entry.subject.value,
            object: entry.object.value
        })), entry.predicate)));
}
export function settleRequestTrace(trace, judgments) {
    const settlement = settleJudgments(judgments);
    const utterances = utterTrace([
        ...trace.entries.map(traceEntryOf),
        ...judgments.map((judgment)=>judgmentEntry(trace, judgment))
    ]);
    return Object.freeze({
        kind: "web-server.request-settlement",
        trace,
        value: settlement.value,
        ready: settlement.value === "potential",
        denied: settlement.value === "active",
        contradicted: settlement.value === "stable",
        unsettled: settlement.value === "absurd",
        judgments,
        settlement,
        utterances,
        section: Object.freeze({
            contradicted: settlement.stableJudgments
        })
    });
}
