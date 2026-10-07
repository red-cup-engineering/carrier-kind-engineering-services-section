/**
 * Incremental, bounded-memory decoder for an SSE byte source, built over the
 * house server-sent-event frame parser. Moved here from the Anthropic
 * inference team's own effect boundary (itself ported from MetroPlat's
 * `src/integrations/http/codec/sse/stream.mts`): the frame-level parsing
 * itself is not reimplemented here; only the byte-boundary incremental
 * decode loop, which is a networking-substrate concern shared by every SSE
 * client, not one team's own.
 */
import { parseSseStream } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/server-sent-event";

function eventBoundary(buffer) {
  const matches = [
    { at: buffer.indexOf("\r\n\r\n"), width: 4 },
    { at: buffer.indexOf("\n\n"), width: 2 },
    { at: buffer.indexOf("\r\r"), width: 2 },
  ].filter((match) => match.at >= 0).sort((left, right) => left.at - right.at || right.width - left.width);
  return matches[0];
}

function eventOfFrame(frame) {
  return parseSseStream(`${frame}\n\n`)[0];
}

/** Decode frames as bytes arrive; no later frame is materialized in advance. */
export async function* parseSseByteStream(source, options = {}) {
  const maximum = options.maxEventBytes ?? 4 * 1024 * 1024;
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new RangeError("SSE maxEventBytes must be a positive safe integer");
  const decoder = new TextDecoder();
  let buffer = "";
  const append = (chunk) => {
    buffer += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    if (Buffer.byteLength(buffer, "utf8") > maximum) throw new RangeError(`SSE event exceeds ${maximum} bytes`);
  };
  for await (const chunk of source) {
    append(chunk);
    for (;;) {
      const boundary = eventBoundary(buffer);
      if (boundary === undefined) break;
      const frame = buffer.slice(0, boundary.at);
      buffer = buffer.slice(boundary.at + boundary.width);
      const event = eventOfFrame(frame);
      if (event !== undefined) yield event;
    }
  }
  buffer += decoder.decode();
  if (buffer.trim().length > 0) {
    const event = eventOfFrame(buffer);
    if (event !== undefined) yield event;
  }
}
