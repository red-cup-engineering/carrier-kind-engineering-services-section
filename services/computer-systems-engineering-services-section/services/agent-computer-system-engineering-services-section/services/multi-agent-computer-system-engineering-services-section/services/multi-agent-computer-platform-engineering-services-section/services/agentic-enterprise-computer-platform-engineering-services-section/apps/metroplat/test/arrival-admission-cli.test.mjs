import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { readArrivalProjection } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";

const packageRoot = path.resolve(import.meta.dirname, "..");

/** The arrivals the CLI admitted on a day: the day's arrival records. */
const arrivalsOn = (dataRoot, date) => readArrivalProjection(dataRoot, date).entries;

function admitArrival(dataRoot, stdin, args = []) {
  const result = spawnSync(process.execPath, [...process.execArgv.filter((flag) => !flag.startsWith("--test")), "scripts/metroplat-admit-arrival.mjs", ...args], {
    cwd: packageRoot,
    env: { ...process.env, METROPLAT_DATA_ROOT: dataRoot },
    input: `${typeof stdin === "string" ? stdin : JSON.stringify(stdin)}\n`,
    encoding: "utf8",
    timeout: 20_000,
  });
  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.trim().split("\n").filter((line) => line.length > 0);
  return lines.map((line) => JSON.parse(line));
}

function cloudEvent(id, data = { hello: id }) {
  return Object.freeze({
    specversion: "1.0",
    id,
    source: "urn:test:arrival-admission-cli",
    type: "org.emsenn.metroplat.test.arrival",
    time: "2026-09-02T00:00:00.000Z",
    datacontenttype: "application/json",
    data,
  });
}

test("infograph-admit-arrival admits a single CloudEvent object from stdin", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-arrival-admission-cli-"));
  try {
    const [line] = admitArrival(dataRoot, cloudEvent("single-event"));
    assert.equal(line.ok, true);
    assert.equal(line.index, 0);
    assert.ok(line.arrivalReceiptHandle, "admitted line must carry an arrivalReceiptHandle");
    assert.equal(line.arrivalReceiptHandle.ok, true);

    const witnesses = arrivalsOn(dataRoot, "2026-09-02");
    assert.equal(witnesses.length, 1);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("infograph-admit-arrival admits a JSON array of CloudEvents in order", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-arrival-admission-cli-array-"));
  try {
    const events = [cloudEvent("array-event-1"), cloudEvent("array-event-2"), cloudEvent("array-event-3")];
    const lines = admitArrival(dataRoot, events);
    assert.equal(lines.length, 3);
    lines.forEach((line, index) => {
      assert.equal(line.index, index);
      assert.equal(line.ok, true);
      assert.ok(line.arrivalReceiptHandle);
    });

    const witnesses = arrivalsOn(dataRoot, "2026-09-02");
    assert.equal(witnesses.length, 3);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("infograph-admit-arrival is idempotent: re-admitting the same CloudEvent id writes no duplicate row", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-arrival-admission-cli-dup-"));
  try {
    const event = cloudEvent("duplicate-event");
    const [first] = admitArrival(dataRoot, event);
    const [second] = admitArrival(dataRoot, event);

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.deepEqual(second.arrivalReceiptHandle, first.arrivalReceiptHandle);

    const witnesses = arrivalsOn(dataRoot, "2026-09-02");
    assert.equal(witnesses.length, 1, "re-admitting the identical CloudEvent must not create a second journal row");
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("infograph-admit-arrival reports a validation failure without admitting or crashing the batch", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-arrival-admission-cli-invalid-"));
  try {
    const invalid = { not: "a-cloudevent" };
    const valid = cloudEvent("valid-after-invalid");
    const lines = admitArrival(dataRoot, [invalid, valid]);

    assert.equal(lines.length, 2);
    assert.equal(lines[0].ok, false);
    assert.equal(lines[0].index, 0);
    assert.equal(lines[0].arrivalReceiptHandle, undefined);
    assert.ok(Array.isArray(lines[0].obstructions) && lines[0].obstructions.length > 0);

    assert.equal(lines[1].ok, true);
    assert.equal(lines[1].index, 1);
    assert.ok(lines[1].arrivalReceiptHandle);

    const witnesses = arrivalsOn(dataRoot, "2026-09-02");
    assert.equal(witnesses.length, 1, "only the valid event is admitted to the journal");
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
