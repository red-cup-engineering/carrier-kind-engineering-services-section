import assert from "node:assert/strict";
import test from "node:test";

import { NostrRelay } from "@red-cup-engineering/mesh-networking-service";

test("published mesh entrypoint resolves its compiled edge type boundary", () => {
  assert.equal(typeof NostrRelay, "function");
});
