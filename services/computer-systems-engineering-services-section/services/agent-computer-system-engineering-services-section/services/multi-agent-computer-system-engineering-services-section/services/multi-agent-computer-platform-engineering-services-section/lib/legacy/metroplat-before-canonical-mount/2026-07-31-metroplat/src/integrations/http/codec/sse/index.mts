
/**
 * `text/event-stream` representation codecs.
 *
 * Event records encode to SSE frame text through the general event frame, the
 * package's JSON event helper, and comment frames. `parseSseStream` decodes
 * frame text back to event records and normalizes the wire form.
 *
 * This module does not model sinks, hubs, retry loops, heartbeats, or HTTP
 * connection lifecycle. It only models the event-stream representation a server
 * adapter may choose to emit or consume.
 *
 * @packageDocumentation
 */

export { parseSseStream, sseCommentFrame, sseEventFrame, sseFrame } from "./frame.mts";
export type { SseEvent } from "./frame.mts";
export { parseSseByteStream } from "./stream.mts";
export type { SseByteStreamOptions } from "./stream.mts";

export { isEventStream, sseHeaders } from "./media.mts";
