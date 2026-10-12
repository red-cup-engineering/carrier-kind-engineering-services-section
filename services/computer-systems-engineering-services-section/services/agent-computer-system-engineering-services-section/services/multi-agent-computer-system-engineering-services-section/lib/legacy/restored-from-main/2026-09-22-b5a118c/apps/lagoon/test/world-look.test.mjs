// world-look.test — exercises scripts/world-look.mjs against a synthetic trace written to a tmp
// file (never the real data/state/world.eavt), covering the told-both (⊤) converse mechanic.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { constituteEntity, appendEavt } from "@red-cup-engineering/eavt";
import { look } from "../scripts/world-look.mjs";

// Builds a synthetic trace: one machine, two systemd-service things located-in it, a
// (running, has-converse, stopped) declaration, service-one told only "running", service-two
// told both "running" and "stopped" (the genuine told-both case).
function buildTrace(tracePath) {
  const baseT = 1000;
  const machine = constituteEntity({ kind: "machine", attributes: { name: "test-machine" }, t: baseT });
  const serviceOne = constituteEntity({ kind: "systemd-service", attributes: { name: "test-service-one" }, t: baseT + 1 });
  const serviceTwo = constituteEntity({ kind: "systemd-service", attributes: { name: "test-service-two" }, t: baseT + 2 });

  appendEavt(tracePath, machine.genesisRow);
  appendEavt(tracePath, serviceOne.genesisRow);
  appendEavt(tracePath, serviceTwo.genesisRow);
  appendEavt(tracePath, { e: "running", a: "has-converse", v: "stopped", t: baseT });
  appendEavt(tracePath, { e: serviceOne.address, a: "located-in", v: machine.address, t: baseT + 1 });
  appendEavt(tracePath, { e: serviceTwo.address, a: "located-in", v: machine.address, t: baseT + 2 });
  appendEavt(tracePath, { e: serviceOne.address, a: "running", v: "yes", t: baseT + 1 });
  appendEavt(tracePath, { e: serviceTwo.address, a: "running", v: "yes", t: baseT + 2 });
  appendEavt(tracePath, { e: serviceTwo.address, a: "stopped", v: "yes", t: baseT + 3 });

  return { machine, serviceOne, serviceTwo };
}

function withTrace(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "lagoon-world-look-test-"));
  const tracePath = path.join(dir, "world.eavt");
  try {
    return fn(tracePath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("look finds the place and its located-in things", () => {
  withTrace((tracePath) => {
    const { machine, serviceOne, serviceTwo } = buildTrace(tracePath);
    const result = look(tracePath, "test-machine");

    assert.equal(result.place, "test-machine");
    assert.equal(result.address, machine.address);
    assert.deepEqual(result.placeAttributes, { name: "test-machine" });
    assert.equal(result.things.length, 2);
    assert.deepEqual(
      result.things.map((thing) => thing.address).sort(),
      [serviceOne.address, serviceTwo.address].sort(),
    );
  });
});

test("a service told only 'running' reads affirmed, no told-both", () => {
  withTrace((tracePath) => {
    const { serviceOne } = buildTrace(tracePath);
    const result = look(tracePath, "test-machine");
    const thing = result.things.find((t) => t.address === serviceOne.address);
    const cell = thing.fiber.find((c) => c.predicate === "running" && c.object === "yes");

    assert.ok(cell, "expected a (running, yes) cell");
    assert.deepEqual(cell.value.pos, 1);
    assert.deepEqual(cell.value.neg, 0);
  });
});

test("a service told both 'running' and 'stopped' reads a genuine told-both (⊤)", () => {
  withTrace((tracePath) => {
    const { serviceTwo } = buildTrace(tracePath);
    const result = look(tracePath, "test-machine");
    const thing = result.things.find((t) => t.address === serviceTwo.address);
    const cell = thing.fiber.find((c) => c.predicate === "running" && c.object === "yes");

    assert.ok(cell, "expected a (running, yes) cell");
    assert.deepEqual(cell.value.pos, 1);
    assert.deepEqual(cell.value.neg, 1);
  });
});

test("look returns nulls and an empty things array when the place is not found", () => {
  withTrace((tracePath) => {
    buildTrace(tracePath);
    const result = look(tracePath, "no-such-place");

    assert.deepEqual(result, { place: "no-such-place", address: null, placeAttributes: null, things: [] });
  });
});

test("look's recentDuties lists reported-at entities newest-first, capped, separate from things", () => {
  withTrace((tracePath) => {
    const { machine } = buildTrace(tracePath);
    const dutyEarly = constituteEntity({ kind: "duty", attributes: { activity: "skill-selected", name: "early" }, t: 5000 });
    const dutyLate = constituteEntity({ kind: "duty", attributes: { activity: "skill-selected", name: "late" }, t: 6000 });
    appendEavt(tracePath, dutyEarly.genesisRow);
    appendEavt(tracePath, dutyLate.genesisRow);
    appendEavt(tracePath, { e: dutyEarly.address, a: "reported-at", v: machine.address, t: 5000 });
    appendEavt(tracePath, { e: dutyLate.address, a: "reported-at", v: machine.address, t: 6000 });

    const result = look(tracePath, "test-machine");
    assert.equal(result.things.length, 2, "duties are not counted as located-in things");
    assert.equal(result.recentDuties.length, 2);
    assert.deepEqual(result.recentDuties.map((d) => d.address), [dutyLate.address, dutyEarly.address], "newest-first");

    const capped = look(tracePath, "test-machine", { recentDutyLimit: 1 });
    assert.deepEqual(capped.recentDuties.map((d) => d.address), [dutyLate.address]);
  });
});

test("a retraction tombstone resolves a held ⊤, and a fresh assertion re-raises it", () => {
  withTrace((tracePath) => {
    const { serviceTwo } = buildTrace(tracePath);

    // 1. Already told both "running" and "stopped" by buildTrace — drift present.
    const cellOf = (tp) => {
      const result = look(tp, "test-machine");
      const thing = result.things.find((t) => t.address === serviceTwo.address);
      return thing.fiber.find((c) => c.predicate === "running" && c.object === "yes");
    };

    const initial = cellOf(tracePath);
    assert.equal(initial.value.pos, 1);
    assert.equal(initial.value.neg, 1);

    // 2. A later retraction tombstone (v: null) supersedes the stale "stopped" claim — drift resolves.
    appendEavt(tracePath, { e: serviceTwo.address, a: "stopped", v: null, t: 2000 });
    const resolved = cellOf(tracePath);
    assert.equal(resolved.value.pos, 1);
    assert.equal(resolved.value.neg, 0);

    // 3. A fresh "stopped" assertion after the tombstone re-raises the drift.
    appendEavt(tracePath, { e: serviceTwo.address, a: "stopped", v: "yes", t: 3000 });
    const reraised = cellOf(tracePath);
    assert.equal(reraised.value.pos, 1);
    assert.equal(reraised.value.neg, 1);
  });
});
