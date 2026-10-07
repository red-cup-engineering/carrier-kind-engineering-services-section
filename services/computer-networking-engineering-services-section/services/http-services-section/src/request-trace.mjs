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
            v: String(req.url ?? "/"),
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
        entries.push({
            e: id,
            a: `header.${key.toLowerCase()}`,
            v: Array.isArray(value) ? value.join(", ") : String(value),
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
