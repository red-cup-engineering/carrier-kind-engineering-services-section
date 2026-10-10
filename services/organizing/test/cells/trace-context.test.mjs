import assert from "node:assert/strict";
import test from "node:test";

import {
  agentTraceContextBinding,
  parseTraceParentV00,
} from "../../src/cells/trace-context.mjs";

const VALID = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

test("parse stable W3C traceparent v00", () => {
  const trace = parseTraceParentV00(VALID);
  assert.equal(trace.version, "00");
  assert.equal(trace.traceId, "4bf92f3577b34da6a3ce929d0e0e4736");
  assert.equal(trace.parentId, "00f067aa0ba902b7");
  assert.equal(trace.flags, "01");
  assert.equal(trace.sampled, true);
});

test("reject uppercase, unsupported version, reserved flags, and all-zero identifiers", () => {
  assert.throws(
    () => parseTraceParentV00(
      "00-4BF92F3577B34DA6A3CE929D0E0E4736-00f067aa0ba902b7-01",
    ),
    /expected W3C v00 lowercase/u,
  );
  assert.throws(
    () => parseTraceParentV00(
      "01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    ),
    /expected W3C v00 lowercase/u,
  );
  assert.throws(
    () => parseTraceParentV00(
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-03",
    ),
    /expected W3C v00 lowercase/u,
  );
  assert.throws(
    () => parseTraceParentV00(
      "00-00000000000000000000000000000000-00f067aa0ba902b7-01",
    ),
    /all-zero trace-id/u,
  );
  assert.throws(
    () => parseTraceParentV00(
      "00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01",
    ),
    /all-zero parent-id/u,
  );
});

test("trace correlation is not authority or Semioverse causality", () => {
  const binding = agentTraceContextBinding({
    traceparent: VALID,
    tracestate: "vendor=opaque-state",
    coordinationId: "coordination:swarm:1",
    cell: "agent:receiver",
    causalParents: ["work-item:actual-parent"],
    evidence: ["http:request:1"],
  });

  assert.equal(binding.semantics, "correlation-only");
  assert.equal(binding.authority, "none");
  assert.equal(binding.causalAuthority, "none");
  assert.deepEqual(binding.causalParents, ["work-item:actual-parent"]);
  assert.equal(binding.causalParents.includes(binding.trace.traceId), false);
  assert.equal(binding.causalParents.includes(binding.trace.parentId), false);
  assert.equal(binding.trace.sampled, true);
});

test("same trace may correlate separate cells without merging their causal parents", () => {
  const left = agentTraceContextBinding({
    traceparent: VALID,
    coordinationId: "coordination:swarm:1",
    cell: "agent:left",
    causalParents: ["task:left"],
  });
  const right = agentTraceContextBinding({
    traceparent: VALID,
    coordinationId: "coordination:swarm:1",
    cell: "agent:right",
    causalParents: ["task:right"],
  });

  assert.equal(left.trace.traceId, right.trace.traceId);
  assert.notDeepEqual(left.causalParents, right.causalParents);
  assert.deepEqual(left.causalParents, ["task:left"]);
  assert.deepEqual(right.causalParents, ["task:right"]);
});
