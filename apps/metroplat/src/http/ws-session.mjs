
/**
 * WebSocket claim-session service binding.
 *
 * The pure transfinite claim exchange lives in `src/integrations/http/claim-sessions/ws-session`. This
 * module binds it to `node:http` upgrade sockets.
 */

import { acceptKey, FrameDecoder } from "@red-cup-engineering/code-websocket-frame-service";
import { CLAIM_SESSION_FAMILY, claim, claimSessionFeed, claimSessionStatementRows, openSession } from "@red-cup-engineering/relating/running/session";
import {
  judgementFrame,
  judgementReply,
  parseClaimMessage,
  websocketClaimSessionObservation,

} from "@red-cup-engineering/computer-web-server/platform-http/claim-sessions/ws-session";
import { openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { processIsoNow } from "@red-cup-engineering/node-process-services-section/clock";
import { processRandomUuid } from "@red-cup-engineering/node-process-services-section/entropy";
import { serviceLifecycleEvent } from "@red-cup-engineering/node-process-services-section/lifecycle";

/** Persist one accepted WebSocket claim-session frame under `$root/data/journals/...`. */
export function admitClaimSessionFrame(
  dataRoot,
  rootName,
  input,
) {
  const observation = websocketClaimSessionObservation(input);
  return openJournal(dataRoot).appendRows(claimSessionFeed.name, claimSessionStatementRows(observation), {
    at: input.at,
    rootName,
    subject: input.sessionId,
    caller: Object.freeze({ transport: "websocket-session", session: input.sessionId }),
  });
}

function emitClaimSessionLifecycle(
  options,
  sessionId,
  event,
  detail,
  ok = true,
) {
  if (options.lifecycle === undefined) return;
  options.lifecycle(serviceLifecycleEvent({
    service: "services/http/ws-session",
    boundary: event === "stream-open" || event === "stream-close" || event === "backpressure" || event === "drain" ? "stream" : "websocket-upgrade",
    event,
    ok,
    at: options.now(),
    ...(detail === undefined ? { detail: { sessionId } } : { detail: { sessionId, ...(typeof detail === "object" && detail !== null && !Array.isArray(detail) ? detail : { value: detail }) } }),
    evidence: ["services/http/ws-session.mts"],
  }));
}

function writeSessionFrame(
  socket,
  frame,
  options,
  sessionId,
) {
  if (socket.write(frame)) return;
  emitClaimSessionLifecycle(options, sessionId, "backpressure", { output: "websocket", bytes: frame.byteLength });
  socket.once("drain", () => {
    emitClaimSessionLifecycle(options, sessionId, "drain", { output: "websocket" });
  });
}

/** Attach a transfinite claim-session WebSocket endpoint to an HTTP server. */
export function attachClaimSession(server, options = {}) {
  server.on("upgrade", (req, socket) => {
    const key = req.headers["sec-websocket-key"];
    if (typeof key !== "string") {
      socket.destroy();
      return;
    }
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\nConnection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
    );
    let session = openSession(CLAIM_SESSION_FAMILY);
    const sessionId = options.persistence?.sessionId?.(req) ?? processRandomUuid();
    let closeEmitted = false;
    const emitClose = (detail) => {
      if (closeEmitted) return;
      closeEmitted = true;
      emitClaimSessionLifecycle(options, sessionId, "close", detail);
      emitClaimSessionLifecycle(options, sessionId, "stream-close", detail);
    };
    emitClaimSessionLifecycle(options, sessionId, "stream-open", { url: req.url ?? "/" });
    const decoder = new FrameDecoder();
    socket.on("data", (chunk) => {
      for (const frame of decoder.push(chunk)) {
        if (frame.opcode === 0x8) {
          emitClose({ reason: "close-frame" });
          socket.end();
          return;
        }
        if (frame.opcode !== 0x1) continue;
        try {
          const message = parseClaimMessage(frame.payload.toString("utf-8"));
          const next = claim(session, message.cell, message.reading);
          const reply = judgementReply(next);
          const persistence = options.persistence;
          if (persistence !== undefined) {
            admitClaimSessionFrame(persistence.dataRoot, persistence.rootName, {
              sessionId,
              message,
              session: next,
              reply,
              at: persistence.now?.() ?? processIsoNow(),
            });
          }
          session = next;
          writeSessionFrame(socket, judgementFrame(reply), options, sessionId);
        } catch (error) {
          writeSessionFrame(socket, judgementFrame(JSON.stringify({ error: String(error) })), options, sessionId);
        }
      }
    });
    socket.on("error", (error) => {
      emitClaimSessionLifecycle(options, sessionId, "error", error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) }, false);
    });
    socket.on("close", () => {
      emitClose({ reason: "socket-close" });
    });
  });
  return server;
}
