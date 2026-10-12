// sse.mjs — the text/event-stream wire codec for /api/chat.
//
// Ported in spirit from the house SSE codec at
// .../http-services-section/services/computing-with-http/src/codecs/sse/
// (sseHeaders/sseFrame/parseSseStream) — adapted to the pinned EVE Assist
// wire: "event: <type>\ndata: <json>\n\n" frames, one frame per
// runAnalystTurn event. Only the encoder side is needed here; the client
// (browser EventSource) does the decoding.

/**
 * The canonical response headers for the /api/chat event stream. Exact set
 * pinned by the cross-module contract: content-type, cache-control,
 * x-accel-buffering (disables proxy buffering so events flush immediately).
 * @returns {Record<string, string>}
 */
export function sseHeaders() {
  return {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    "x-accel-buffering": "no",
  };
}

/**
 * Encode one named event whose data line is JSON.
 * @param {string} event - event name (mirrors a runAnalystTurn event `type`, e.g. "text").
 * @param {unknown} dataObj - JSON-serializable payload; must not contain a Gemini API key.
 * @returns {string} a complete SSE frame, "event: <event>\ndata: <json>\n\n".
 */
export function sseFrame(event, dataObj) {
  if (typeof event !== "string" || event.length === 0) {
    throw new TypeError("sseFrame: event must be a non-empty string");
  }
  if (dataObj === undefined) {
    throw new TypeError("sseFrame: dataObj must be JSON-serializable (got undefined)");
  }
  let json;
  try {
    json = JSON.stringify(dataObj);
  } catch (cause) {
    throw new TypeError(`sseFrame: dataObj is not JSON-serializable: ${cause.message}`);
  }
  if (json === undefined) {
    // JSON.stringify returns undefined for functions/symbols at the top level.
    throw new TypeError("sseFrame: dataObj serialized to undefined (function or symbol?)");
  }
  return `event: ${event}\ndata: ${json}\n\n`;
}
