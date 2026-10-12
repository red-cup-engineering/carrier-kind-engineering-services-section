// mesh/nostr.ts — Nostr relay (NIP-01) over WebSocket.
//
// Events are stored as Memes: {subject: eventId, predicate: "nostr", object: kind}.
// Subscriptions are tracked in a UtteranceLog and fanned out on publish.
//
// This implements the NIP-01 protocol message format only. Signature verification
// requires secp256k1 — provide a verify callback or use the no-op (dev mode).
import * as crypto from "node:crypto";
import { witness, UtteranceLog, recallWhere } from "@red-cup-engineering/computer-data-engine/utterance-log";
// ── Event ID verification ────────────────────────────────────────────────────
function eventId(event) {
    const data = JSON.stringify([0, event.pubkey, event.created_at, event.kind, event.tags, event.content]);
    return crypto.createHash("sha256").update(data).digest("hex");
}
function filterMatches(event, filter) {
    if (filter.ids && !filter.ids.some((id) => event.id.startsWith(id)))
        return false;
    if (filter.authors && !filter.authors.some((a) => event.pubkey.startsWith(a)))
        return false;
    if (filter.kinds && !filter.kinds.includes(event.kind))
        return false;
    if (filter.since != null && event.created_at < filter.since)
        return false;
    if (filter.until != null && event.created_at > filter.until)
        return false;
    // Tag filters
    for (const [key, val] of Object.entries(filter)) {
        if (!key.startsWith("#") || !Array.isArray(val))
            continue;
        const tag = key.slice(1);
        const hasTag = event.tags.some((t) => t[0] === tag && val.includes(t[1]));
        if (!hasTag)
            return false;
    }
    return true;
}
export class NostrRelay {
    store = new UtteranceLog();
    events = [];
    sessions = new Map();
    opts;
    constructor(opts = {}) {
        this.opts = {
            verify: opts.verify ?? (() => true),
            maxEvents: opts.maxEvents ?? 10_000,
            maxFilters: opts.maxFilters ?? 10,
            ...(opts.onEvent !== undefined ? { onEvent: opts.onEvent } : {}),
        };
    }
    send(session, msg) {
        try {
            session.send(JSON.stringify(msg));
        }
        catch { /* ignore closed sessions */ }
    }
    publish(event) {
        for (const { session, subscriptions } of this.sessions.values()) {
            for (const sub of subscriptions.values()) {
                if (sub.filters.some((f) => filterMatches(event, f))) {
                    this.send(session, ["EVENT", sub.id, event]);
                }
            }
        }
    }
    /** Connect a WsSession to the relay. Returns cleanup function. */
    connect(session) {
        const sessionRecord = { session, subscriptions: new Map() };
        this.sessions.set(session.id, sessionRecord);
        session.on("message", (msg) => {
            if (msg.type !== "text")
                return;
            let parsed;
            try {
                parsed = JSON.parse(msg.data);
            }
            catch {
                return;
            }
            if (parsed[0] === "EVENT") {
                void this.handleEvent(session, parsed[1]);
            }
            else if (parsed[0] === "REQ") {
                const subId = parsed[1];
                const filters = parsed.slice(2);
                if (filters.length > this.opts.maxFilters) {
                    this.send(session, ["NOTICE", "too many filters"]);
                    return;
                }
                sessionRecord.subscriptions.set(subId, { id: subId, filters });
                // Send stored events that match
                for (const event of this.events) {
                    if (filters.some((f) => filterMatches(event, f))) {
                        this.send(session, ["EVENT", subId, event]);
                    }
                }
                this.send(session, ["EOSE", subId]);
            }
            else if (parsed[0] === "CLOSE") {
                sessionRecord.subscriptions.delete(parsed[1]);
            }
        });
        session.on("close", () => this.sessions.delete(session.id));
        return () => this.sessions.delete(session.id);
    }
    async handleEvent(session, event) {
        // Verify ID
        const expectedId = eventId(event);
        if (event.id !== expectedId) {
            this.send(session, ["OK", event.id, false, "invalid: bad event id"]);
            return;
        }
        // Check duplicate
        const existing = recallWhere(this.store, { subject: event.id, predicate: "nostr" });
        if (existing.length > 0) {
            this.send(session, ["OK", event.id, true, "duplicate"]);
            return;
        }
        // Verify signature
        const ok = await this.opts.verify(event);
        if (!ok) {
            this.send(session, ["OK", event.id, false, "invalid: bad signature"]);
            return;
        }
        witness(this.store, { subject: event.id, predicate: "nostr", object: String(event.kind) }, [true, false]);
        if (this.events.length >= this.opts.maxEvents)
            this.events.shift();
        this.events.push(event);
        this.opts.onEvent?.(event);
        this.publish(event);
        this.send(session, ["OK", event.id, true, ""]);
    }
    get eventCount() { return this.events.length; }
    get sessionCount() { return this.sessions.size; }
}
export function nostrRelay(opts = {}) {
    return new NostrRelay(opts);
}
