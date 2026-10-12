import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the live boundary receives one colony-owned socket instead of allocating its port", () => {
  const server = readFileSync(new URL("../scripts/serve-tensor-circuit-board-synthesis-a2a.mjs", import.meta.url), "utf8");
  const unit = readFileSync(new URL("../data/records/systemd/tensor-circuit-board-synthesis-service.service", import.meta.url), "utf8");
  const socket = readFileSync(new URL("../data/records/systemd/tensor-circuit-board-synthesis-service.socket", import.meta.url), "utf8");
  assert.match(server, /process\.env\.PORT \?\? 19848/);
  assert.doesNotMatch(unit, /^Environment=PORT=/m);
  assert.match(unit, /^Environment=BASE_URL=http:\/\/127\.0\.0\.1:19848$/m);
  assert.match(unit, /^Sockets=tensor-circuit-board-synthesis-service\.socket$/m);
  assert.match(socket, /^ListenStream=127\.0\.0\.1:19848$/m);
  assert.match(socket, /^FileDescriptorName=a2a$/m);
  assert.match(socket, /^Service=tensor-circuit-board-synthesis-service\.service$/m);
});
