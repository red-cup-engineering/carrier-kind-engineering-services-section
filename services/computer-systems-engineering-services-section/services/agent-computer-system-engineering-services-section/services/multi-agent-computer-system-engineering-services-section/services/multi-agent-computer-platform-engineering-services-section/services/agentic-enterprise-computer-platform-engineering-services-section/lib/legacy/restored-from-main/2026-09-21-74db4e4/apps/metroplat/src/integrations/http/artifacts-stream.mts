
// projections/witness/stream — the Scott transport: an append-only EAVT statement log
// streamed as Server-Sent Events.
//
// The statement log is monotone (append-only), so streaming it is the κ=ω Scott
// session: each new row is one SSE event, the row's content identity is its event
// id, and `Last-Event-ID` resumes from the next row. Appending rows only appends
// frames — coordination-free, the same CALM property the log itself has. Pure: no
// I/O (the caller reads the log via ./store and binds the HTTP response).

import { eavtId, type EAVT } from "../../lib/codecs/json/jsonl/eavt/index.mts";
import { sseFrame, sseHeaders } from "./codec/sse/index.mts";
import type { JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import {
  directedPhaseEvidence,
  scottStreamPhase,
} from "../../lib/contracts/index.mts";

/** The SSE event name carrying one recorded EAVT row. */
export const EAVT_EVENT = "datom";

/** The index of the first row to send after `lastEventId` (0 if absent/unknown). */
function resumeIndex(log: readonly EAVT[], lastEventId?: string): number {
  if (lastEventId === undefined) return 0;
  const at = log.findIndex((row) => eavtId(row) === lastEventId);
  return at < 0 ? 0 : at + 1;
}

/** Project an append-only EAVT statement log into SSE frames, resuming after
 *  `lastEventId`. Each row becomes one `datom` event whose id is the row's content
 *  identity, so a reconnecting client replays from exactly where it left off.
 *  Monotone: extending the log only extends the output (the Scott/CALM property). */
export function streamStatementLog(log: readonly EAVT[], lastEventId?: string): string {
  return log
    .slice(resumeIndex(log, lastEventId))
    .map((row) => sseFrame(EAVT_EVENT, row as unknown as JsonValue, eavtId(row)))
    .join("");
}

/** A served SSE response: a status, the event-stream headers, and the resumable
 *  frame body. Kept separate from the running `ServedResponse` because SSE needs
 *  its own headers (no-cache, keep-alive). */
export interface FeedResponse {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: string;
}

export interface FeedResponseProjection {
  readonly body: string;
  readonly rows: number;
  readonly selectedRows: number;
}

export interface FeedResponseCollector {
  push(row: EAVT): void;
  read(): FeedResponseProjection;
}

export function feedResponseCollector(lastEventId?: string): FeedResponseCollector {
  const beforeResume: string[] = [];
  const selected: string[] = [];
  let rows = 0;
  let selectedRows = 0;
  let resumed = lastEventId === undefined;
  let found = lastEventId === undefined;
  const push = (row: EAVT): void => {
    rows += 1;
    const id = eavtId(row);
    const frame = sseFrame(EAVT_EVENT, row as unknown as JsonValue, id);
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
export interface FeedResponseObservation {
  readonly kind: "metroplat.feed-response-observation";
  readonly response: { readonly status: number; readonly headers: Readonly<Record<string, string>>; readonly body: string };
}

export function feedResponse(
  log: readonly EAVT[],
  lastEventId?: string,
): FeedResponseObservation {
  const collector = feedResponseCollector(lastEventId);
  for (const row of log) collector.push(row);
  return feedResponseFromProjection(collector.read(), lastEventId);
}

export function feedResponseFromProjection(
  projection: FeedResponseProjection,
  lastEventId?: string,
): FeedResponseObservation {
  void lastEventId;
  const response = Object.freeze({ status: 200, headers: sseHeaders(), body: projection.body });
  return Object.freeze({ kind: "metroplat.feed-response-observation" as const, response });
}
