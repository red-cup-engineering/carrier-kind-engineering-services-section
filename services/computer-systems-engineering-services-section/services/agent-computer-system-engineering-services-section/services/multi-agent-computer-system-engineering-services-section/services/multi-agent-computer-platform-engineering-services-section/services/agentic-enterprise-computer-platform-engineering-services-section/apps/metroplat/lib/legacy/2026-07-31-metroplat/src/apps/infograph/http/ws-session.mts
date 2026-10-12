
/**
 * WebSocket claim-session service binding.
 *
 * The pure transfinite claim exchange lives in `src/integrations/http/claim-sessions/ws-session`. This
 * module binds it to `node:http` upgrade sockets.
 */
import type { Server } from "node:http";
import type { Duplex } from "node:stream";
import type { IncomingMessage } from "node:http";
import type { ServiceLifecycleEvent } from "../../../integrations/process/services/lifecycle-schema/schema.mts";
import { acceptKey, FrameDecoder } from "../../../integrations/http/codec/ws/index.mts";
import {
  claim,
  claimSessionFeed,
  claimSessionStatementRows,
  openSession,
  type Session,
} from "../../../claims/session.mts";
import {
  judgementFrame,
  judgementReply,
  parseClaimMessage,
  websocketClaimSessionObservation,
  type WebSocketClaimSessionObservationInput,
} from "../../../integrations/http/claim-sessions/ws-session.mts";
import {
  openJournal,
  type EventWriteResult,
} from "../../../journal/index.mts";
import { processIsoNow, processRandomUuid, serviceLifecycleEvent } from "../../../integrations/process/services/index.mts";

export type ClaimSessionObservationInput = WebSocketClaimSessionObservationInput;

export interface ClaimSessionPersistence {
  readonly dataRoot: string;
  readonly rootName: string;
  readonly now?: (() => string) | undefined;
  readonly sessionId?: ((req: IncomingMessage) => string) | undefined;
}

export interface ClaimSessionAttachOptions {
  readonly persistence?: ClaimSessionPersistence | undefined;
  readonly lifecycle?: ((event: ServiceLifecycleEvent) => void) | undefined;
}

/** Persist one accepted WebSocket claim-session frame under `$root/data/journals/...`. */
export function admitClaimSessionFrame(
  dataRoot: string,
  rootName: string,
  input: WebSocketClaimSessionObservationInput,
): EventWriteResult {
  const observation = websocketClaimSessionObservation(input);
  return openJournal(dataRoot).appendRows(claimSessionFeed.name, claimSessionStatementRows(observation), {
    at: input.at,
    rootName,
    subject: input.sessionId,
    caller: Object.freeze({ transport: "websocket-session", session: input.sessionId }),
  });
}

function emitClaimSessionLifecycle(
  options: ClaimSessionAttachOptions,
  sessionId: string,
  event: ServiceLifecycleEvent["event"],
  detail?: unknown,
  ok = true,
): void {
  if (options.lifecycle === undefined) return;
  options.lifecycle(serviceLifecycleEvent({
    service: "services/http/ws-session",
    boundary: event === "stream-open" || event === "stream-close" || event === "backpressure" || event === "drain" ? "stream" : "websocket-upgrade",
    event,
    ok,
    ...(detail === undefined ? { detail: { sessionId } } : { detail: { sessionId, ...(typeof detail === "object" && detail !== null && !Array.isArray(detail) ? detail : { value: detail }) } }),
    evidence: ["services/http/ws-session.mts"],
  }));
}

function writeSessionFrame(
  socket: Duplex,
  frame: Buffer,
  options: ClaimSessionAttachOptions,
  sessionId: string,
): void {
  if (socket.write(frame)) return;
  emitClaimSessionLifecycle(options, sessionId, "backpressure", { output: "websocket", bytes: frame.byteLength });
  socket.once("drain", () => {
    emitClaimSessionLifecycle(options, sessionId, "drain", { output: "websocket" });
  });
}

/** Attach a transfinite claim-session WebSocket endpoint to an HTTP server. */
export function attachClaimSession(server: Server, options: ClaimSessionAttachOptions = {}): Server {
  server.on("upgrade", (req, socket: Duplex) => {
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
    let session: Session = openSession();
    const sessionId = options.persistence?.sessionId?.(req) ?? processRandomUuid();
    let closeEmitted = false;
    const emitClose = (detail?: unknown): void => {
      if (closeEmitted) return;
      closeEmitted = true;
      emitClaimSessionLifecycle(options, sessionId, "close", detail);
      emitClaimSessionLifecycle(options, sessionId, "stream-close", detail);
    };
    emitClaimSessionLifecycle(options, sessionId, "stream-open", { url: req.url ?? "/" });
    const decoder = new FrameDecoder();
    socket.on("data", (chunk: Buffer) => {
      for (const frame of decoder.push(chunk)) {
        if (frame.opcode === 0x8) {
          emitClose({ reason: "close-frame" });
          socket.end();
          return;
        }
        if (frame.opcode !== 0x1) continue;
        try {
          const message = parseClaimMessage(frame.payload.toString("utf-8"));
          const next = claim(session, message.cell, message.charge);
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
