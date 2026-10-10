import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { officeReading, readAgency } from "../../src/agency/index.mjs";

// The office installers read an office as the registry reads it (`officeReading(...).effective`).
// A formed office's effective record is its form applied; an office that is not formed is
// effective as authored, so its reading must still carry the record.
test("an office that is not formed reads effective as its authored record", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "office-reading-effective-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const offices = path.join(root, "sample-section", "lib", "agency", "offices");
  mkdirSync(offices, { recursive: true });
  writeFileSync(path.join(offices, "operator.json"), JSON.stringify({ id: "operator", name: "Operator", kind: "office" }));
  const agency = readAgency(root, { acts: [] });
  const key = [...agency.offices.keys()].find((k) => k.endsWith("#operator"));
  assert.ok(key, "the office is read");
  const reading = officeReading(agency, key);
  assert.equal(reading.kind, "organizing.agency.office");
  assert.equal(reading.formation, undefined);
  assert.equal(reading.effective.kind, "office");
  assert.deepEqual(reading.effective, reading.authored);
});
