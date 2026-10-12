import assert from "node:assert/strict";
import test from "node:test";
import { validateCloudEvent } from "../scripts/validate-cloudevent.mjs";
const good = { specversion: "1.0", id: "a-1", source: "urn:example:src", type: "com.example.made", time: "2026-09-04T00:00:00Z", datacontenttype: "application/json", data: { x: 1 }, emsenntruthcharge: "held" };
test("a conformant event has no violations and is returned unchanged", () => {
  const r = validateCloudEvent({ event: good });
  assert.equal(r.ok, true);
  assert.deepEqual(r.violations, []);
  assert.deepEqual(r.event, good);
});
test("each required attribute rule is named", () => {
  const r = validateCloudEvent({ event: { specversion: "0.3", id: "", source: "has space", type: "" } });
  assert.deepEqual(r.violations.map((v) => v.attribute), ["specversion", "id", "source", "type"]);
});
test("optional attribute rules and extension naming are checked", () => {
  const r = validateCloudEvent({ event: { ...good, time: "yesterday", dataschema: "not a uri", "Bad-Name": "x", toolongextensionname1: "y", nested: { a: 1 } } });
  assert.deepEqual(r.violations.map((v) => v.attribute).sort(), ["Bad-Name", "dataschema", "nested", "time", "toolongextensionname1"]);
});
test("data and data_base64 together is a violation", () => {
  assert.ok(validateCloudEvent({ event: { ...good, data_base64: "AAAA" } }).violations.some((v) => v.attribute === "data"));
});
test("refuses a missing event", () => assert.throws(() => validateCloudEvent({}), /event is required/u));
