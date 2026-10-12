import assert from "node:assert/strict";
import test from "node:test";
import { acceptKey, encodeFrame, FrameDecoder, MessageDecoder } from "@red-cup-engineering/code-websocket-frame-service";

function masked(opcode, data, fin = true) {
  const payload = Buffer.from(data);
  const mask = Buffer.from([1, 2, 3, 4]);
  const out = Buffer.allocUnsafe(6 + payload.length);
  out[0] = (fin ? 0x80 : 0) | opcode;
  out[1] = 0x80 | payload.length;
  mask.copy(out, 2);
  for (let i = 0; i < payload.length; i++) out[6 + i] = payload[i] ^ mask[i & 3];
  return out;
}

test("accepts the RFC handshake example and round-trips a frame", () => {
  assert.equal(acceptKey("dGhlIHNhbXBsZSBub25jZQ=="), "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
  const [frame] = new FrameDecoder().push(encodeFrame(1, Buffer.from("hi")));
  assert.equal(frame?.payload.toString(), "hi");
});

test("decodes split masked fragments while admitting interleaved ping", () => {
  const decoder = new MessageDecoder({ requireMasked: true, maxPayload: 8 });
  const first = masked(1, "hel", false);
  assert.deepEqual(decoder.push(first.subarray(0, 4)), []);
  const events = decoder.push(Buffer.concat([first.subarray(4), masked(9, "p"), masked(0, "lo")]));
  assert.deepEqual(events.map(({ kind, payload }) => [kind, payload.toString()]), [["ping", "p"], ["data", "hello"]]);
});

test("rejects unmasked client frames and an oversized fragmented message", () => {
  assert.equal(new MessageDecoder({ requireMasked: true }).push(encodeFrame(1, Buffer.from("x")))[0]?.kind, "protocol-error");
  const decoder = new MessageDecoder({ requireMasked: true, maxPayload: 3 });
  decoder.push(masked(1, "ab", false));
  assert.equal(decoder.push(masked(0, "cd"))[0]?.kind, "too-large");
});
