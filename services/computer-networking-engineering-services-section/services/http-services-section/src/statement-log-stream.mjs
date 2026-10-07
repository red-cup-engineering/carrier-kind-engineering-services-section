
// projections/witness/stream — the Scott transport: an append-only EAVT statement log
// streamed as Server-Sent Events.
//
// The statement log is monotone (append-only), so streaming it is the κ=ω Scott
// session: each new row is one SSE event, the row's content identity is its event
// id, and `Last-Event-ID` resumes from the next row. Appending rows only appends
// frames — coordination-free, the same CALM property the log itself has. Pure: no
// I/O (the caller reads the log via ./store and binds the HTTP response).

import { sseFrame, sseHeaders } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/server-sent-event";

import { eavtKey } from "@red-cup-engineering/eavt/row";

/** The SSE event name carrying one recorded EAVT row. */
export const EAVT_EVENT = "datom";

/** The index of the first row to send after `lastEventId` (0 if absent/unknown). */
function resumeIndex(log, lastEventId) {
  if (lastEventId === undefined) return 0;
  const at = log.findIndex((row) => eavtKey(row) === lastEventId);
  return at < 0 ? 0 : at + 1;
}

/** Project an append-only EAVT statement log into SSE frames, resuming after
 *  `lastEventId`. Each row becomes one `datom` event whose id is the row's content
 *  identity, so a reconnecting client replays from exactly where it left off.
 *  Monotone: extending the log only extends the output (the Scott/CALM property). */
export function streamStatementLog(log, lastEventId) {
  return log
    .slice(resumeIndex(log, lastEventId))
    .map((row) => sseFrame(EAVT_EVENT, row, eavtKey(row)))
    .join("");
}

/** A served SSE response: a status, the event-stream headers, and the resumable
 *  frame body. Kept separate from the running `ServedResponse` because SSE needs
 *  its own headers (no-cache, keep-alive). */

export function feedResponseCollector(lastEventId) {
  const beforeResume = [];
  const selected = [];
  let rows = 0;
  let selectedRows = 0;
  let resumed = lastEventId === undefined;
  let found = lastEventId === undefined;
  const push = (row) => {
    rows += 1;
    const id = eavtKey(row);
    const frame = sseFrame(EAVT_EVENT, row, id);
    if (resumed) {
      selected.push(frame);
      selectedRows += 1;
    } else if (id === lastEventId) {
      found = true;
      resumed = true;
    } else {
      beforeResume.push(frame);
    }
  };
  return Object.freeze({
    push,
    read: () => found
      ? Object.freeze({ body: selected.join(""), rows, selectedRows })
      : Object.freeze({ body: beforeResume.join(""), rows, selectedRows: rows }),
  });
}

/** Project a statement log into the full SSE response observation.
 *
 * A route is the thin glue: read the log, then expose
 * `feedResponse(log, request.headers["last-event-id"])`. The returned response
 * payload is carried beside the Scott-stream contract exposure and report.
 */

export function feedResponse(
  log,
  lastEventId,
) {
  const collector = feedResponseCollector(lastEventId);
  for (const row of log) collector.push(row);
  return feedResponseFromProjection(collector.read(), lastEventId);
}

export function feedResponseFromProjection(
  projection,
  lastEventId,
) {
  void lastEventId;
  const response = Object.freeze({ status: 200, headers: sseHeaders(), body: projection.body });
  return Object.freeze({ kind: "metroplat.feed-response-observation", response });
}
