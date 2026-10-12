
/**
 * RFC 6455 WebSocket representation helpers.
 *
 * This subpath exports server-side frame encoding, an incremental frame decoder
 * that accepts and unmasks client frames, and `Sec-WebSocket-Accept` key
 * derivation. Upgrade negotiation, sessions, routing, proxying, and connection
 * lifecycle stay outside the representation codec.
 *
 * @packageDocumentation
 */

export { acceptKey, encodeFrame, FrameDecoder } from "@red-cup-engineering/code-websocket-frame-service";
export type { WsFrame } from "@red-cup-engineering/code-websocket-frame-service";
