
import { encodeFrame } from "../codec/ws/index.mts";

/** Encode a judgement reply as a WebSocket text frame (opcode 0x1, fin). */
export function judgementFrame(reply: string): Buffer {
  return encodeFrame(0x1, Buffer.from(reply, "utf-8"));
}
