import assert from "node:assert/strict";
import test from "node:test";
import { deriveContinuationReading } from "../scripts/derive-continuation-reading.mjs";

function withEvidence(id, evidenceRows, recordPath = null) {
  return { id, nextStep: `next step for ${id}`, recordPath, evidenceRows };
}

function row(rowId, support, refutation, accessedOn = "2026-09-05") {
  return {
    rowId,
    charge: { support, refutation },
    citation: { sourceUrl: `https://example.test/${rowId}`, sourceTitle: `Row ${rowId}`, accessedOn },
  };
}

function baseRequest(candidates, searched = []) {
  return {
    type: "ContinuationReadingRequest",
    version: 1,
    position: { text: "Is there a next step?", holds: ["position-held"] },
    candidates,
    searched,
  };
}

test("refuses a non-ContinuationReadingRequest input", () => {
  assert.throws(() => deriveContinuationReading({}), /must be a ContinuationReadingRequest/u);
});

test("refuses a position missing text", () => {
  assert.throws(
    () => deriveContinuationReading({ type: "ContinuationReadingRequest", version: 1, position: { holds: [] }, candidates: [], searched: [] }),
    /position\.text must be a nonempty string/u,
  );
});

test("refuses a candidate missing id", () => {
  assert.throws(
    () => deriveContinuationReading(baseRequest([{ nextStep: "x", recordPath: null, evidenceRows: [] }])),
    /candidates\[0\]\.id must be a nonempty string/u,
  );
});

test("refuses a neutral evidence row (both support and refutation false)", () => {
  assert.throws(
    () => deriveContinuationReading(baseRequest([withEvidence("c1", [row("r1", false, false)])])),
    /must assert support or refutation/u,
  );
});

test("refuses a non-boolean charge field", () => {
  assert.throws(
    () => deriveContinuationReading(baseRequest([withEvidence("c1", [{ rowId: "r1", charge: { support: "yes", refutation: false }, citation: { sourceUrl: "https://example.test/r1", sourceTitle: "Row r1", accessedOn: "2026-09-05" } }])])),
    /charge\.support must be a boolean/u,
  );
});

test("refuses a malformed accessedOn", () => {
  assert.throws(
    () => deriveContinuationReading(baseRequest([withEvidence("c1", [row("r1", true, false, "September 5, 2026")])])),
    /accessedOn must be an ISO calendar date/u,
  );
});

test("refuses a recordPath that is neither a string nor null", () => {
  assert.throws(
    () => deriveContinuationReading(baseRequest([{ id: "c1", nextStep: "x", recordPath: 7, evidenceRows: [] }])),
    /candidates\[0\]\.recordPath must be a nonempty string/u,
  );
});

test("two supporting rows: candidate status found, overall reading found, evidence echoed", () => {
  const result = deriveContinuationReading(
    baseRequest([withEvidence("lake-trout-dock-to-retail-ladder", [row("dnr-2024-summary", true, false), row("bodin-price-list", true, false)], "lib/emsenn/services/561-group/services/science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section/services/territorial-economy-science-services-section/data/records/2026-09-05-band-region-value-chain-readings.json")]),
  );
  assert.equal(result.reading, "found");
  assert.equal(result.candidates[0].status, "found");
  assert.deepEqual(result.candidates[0].aggregateCharge.value, [true, false]);
  assert.deepEqual(result.candidates[0].aggregateCharge.evidence, [["dnr-2024-summary", "bodin-price-list"], []]);
  assert.equal(result.candidates[0].evidenceRows.length, 2);
  assert.equal(result.candidates[0].evidenceRows[0].citation.sourceTitle, "Row dnr-2024-summary");
  assert.equal(result.notFormal, true);
});

test("one supporting row and one refuting row: candidate status contested, overall reading contested", () => {
  const result = deriveContinuationReading(
    baseRequest([withEvidence("first-register-conversation", [row("register-entry", true, false), row("attendance-log-gap", false, true)])]),
  );
  assert.equal(result.candidates[0].status, "contested");
  assert.deepEqual(result.candidates[0].aggregateCharge.value, [true, true]);
  assert.equal(result.reading, "contested");
});

test("two refuting rows: candidate status refuted", () => {
  const result = deriveContinuationReading(
    baseRequest([withEvidence("c1", [row("r1", false, true), row("r2", false, true)])]),
  );
  assert.equal(result.candidates[0].status, "refuted");
  assert.deepEqual(result.candidates[0].aggregateCharge.value, [false, true]);
  assert.equal(result.reading, "none-found");
});

test("a candidate with no evidence rows is unevidenced", () => {
  const result = deriveContinuationReading(baseRequest([withEvidence("c1", [])]));
  assert.equal(result.candidates[0].status, "unevidenced");
  assert.deepEqual(result.candidates[0].aggregateCharge.value, [false, false]);
  assert.equal(result.reading, "none-found");
});

test("no candidates: reading is none-found and searched is echoed verbatim", () => {
  const result = deriveContinuationReading(baseRequest([], ["named smokehouse near the dock, price list or quote"]));
  assert.equal(result.reading, "none-found");
  assert.deepEqual(result.candidates, []);
  assert.deepEqual(result.searched, ["named smokehouse near the dock, price list or quote"]);
});

test("candidate order is preserved in the output", () => {
  const result = deriveContinuationReading(
    baseRequest([
      withEvidence("second", [row("r1", false, true)]),
      withEvidence("first", [row("r2", true, false)]),
    ]),
  );
  assert.deepEqual(result.candidates.map((candidate) => candidate.id), ["second", "first"]);
});

test("position is echoed verbatim", () => {
  const result = deriveContinuationReading(baseRequest([]));
  assert.deepEqual(result.position, { text: "Is there a next step?", holds: ["position-held"] });
});
