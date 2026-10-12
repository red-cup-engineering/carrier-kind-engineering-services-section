/**
 * writing/activitypub/sse — the realtime read leg (memo §16): push inbox/collection
 * deltas to a client over Server-Sent Events instead of polling. Reuses relating's SSE
 * codec; the deltas map to ActivityStreams collection changes, and an inbound `Add`
 * delta is the agent's perceive leg (fold the referenced Activity via `perceiveInbox`).
 *
 * Pure: these format the SSE frames. The long-lived `text/event-stream` connection is a
 * transport binding (a site holds it open) — this lib defines what crosses it.
 */
import { sseFrame, sseHeaders } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/server-sent-event";

/** An inbox/collection delta — the AS2 collection-change vocabulary over the wire. */

/** The headers a binding sets on the event-stream response (`text/event-stream`, no-cache). */
export const eventStreamHeaders = sseHeaders;

/**
 * inboxEvent — format one collection delta as an SSE frame: `event: <kind>` with a JSON
 * `data` payload naming the affected `target` collection and `object`. `Add` to an inbox
 * is the perceive signal; the client hydrates the object and folds it.
 */
export function inboxEvent(kind, payload, id) {
  return sseFrame(kind, payload, id);
}
