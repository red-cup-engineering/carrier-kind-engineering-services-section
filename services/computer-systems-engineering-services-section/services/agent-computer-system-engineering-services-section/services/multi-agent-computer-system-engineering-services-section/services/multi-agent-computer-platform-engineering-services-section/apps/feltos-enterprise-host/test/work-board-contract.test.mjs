import assert from "node:assert/strict";
import test from "node:test";

import { workBoardCodomain, workBoardDomain } from "../src/enterprise-loops.mjs";

test("work-board advertises and enforces its public query contract", () => {
  assert.equal(workBoardDomain.schema.properties.step.type, "string");
  assert.equal(workBoardDomain.schema.properties.agenda.type, "string");
  assert.equal(workBoardDomain.schema.properties.limit.maximum, 200);
  assert.equal(workBoardDomain.validate({ open: true, step: "refined", limit: 50 }), true);
  assert.equal(workBoardDomain.validate({ unknown: true }), false);
  assert.equal(workBoardDomain.validate({ source: "a", sources: ["b"] }), false);
});

test("work-board output contract admits listing and whole-thread refusal shapes", () => {
  const common = {
    kind: "feltos.work.work-board",
    at: "2026-10-02T00:00:00.000Z",
    position: "position",
    matched: 0,
    threads: [],
  };
  assert.equal(workBoardCodomain.validate({ ...common, refused: 0 }), true);
  assert.equal(workBoardCodomain.validate({ ...common, refused: [] }), true);
});
