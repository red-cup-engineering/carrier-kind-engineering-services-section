# derive-continuation-reading
## Requirements
- `candidate-order-preserved`: The operation must return `candidates` in the same order as the input's `candidates`, so a candidate's position in the output names the same candidate as at that position in the input.
- `evidence-row-charge-mapping`: For every evidence row, the operation must derive a bilattice charge whose `value` is exactly `[row.charge.support, row.charge.refutation]` and whose `evidence` witnesses that row's own `rowId` on the side(s) it asserts.
- `aggregate-charge-via-knowledge-join`: The operation must compute each candidate's aggregate charge as the metrologic `/bilattice` knowledge-order join (`joinKnowledge`) of its evidence rows' charges, reduced from the knowledge-order bottom charge (`value: [false, false]`), never a hand-rolled boolean combination.
- `status-found-when-support-only`: The operation must name a candidate's `status` as `"found"` when its aggregate charge's value is `[true, false]` (support asserted, refutation never asserted).
- `status-contested-when-top`: The operation must name a candidate's `status` as `"contested"` when its aggregate charge is knowledge-order top (`isTop`, both support and refutation asserted).
- `status-refuted-when-refutation-only`: The operation must name a candidate's `status` as `"refuted"` when its aggregate charge's value is `[false, true]` (refutation asserted, support never asserted).
- `status-unevidenced-when-no-rows`: The operation must name a candidate's `status` as `"unevidenced"` when its aggregate charge is knowledge-order bottom (`value: [false, false]`), which occurs exactly when the candidate carries no evidence rows.
- `evidence-rows-echoed-with-citations`: The operation must echo every candidate's evidence rows in the output, each with its `rowId`, `charge`, and `citation` unchanged.
- `overall-reading-any-found`: The operation must name the overall `reading` as `"found"` when any candidate's status is `"found"`.
- `overall-reading-contested-else`: The operation must name the overall `reading` as `"contested"` when no candidate's status is `"found"` but any candidate's status is `"contested"`.
- `overall-reading-none-found-else`: The operation must name the overall `reading` as `"none-found"` when no candidate's status is `"found"` or `"contested"`.
- `position-echoed-verbatim`: The operation must echo the input's `position` (`text` and `holds`) unchanged in the output.
- `searched-echoed-verbatim`: The operation must echo the input's `searched` array unchanged in the output, in every case, not only when the overall reading is `"none-found"`.
- `not-formal-flag-present`: The operation must return `notFormal: true` on every result, naming this a record-level reading rather than the unbuilt-affects note's held-⊥ formalization.
## Prohibitions
- `no-neutral-evidence-row`: The operation must not accept an evidence row whose charge has both `support` and `refutation` false, since such a row asserts nothing and is not a witness.
- `no-non-boolean-charge-fields`: The operation must not accept an evidence row whose charge's `support` or `refutation` is not a strict boolean.
- `no-malformed-accessed-on`: The operation must not accept a citation whose `accessedOn` is not an ISO calendar date in the form `YYYY-MM-DD`.
- `no-recordpath-outside-string-or-null`: The operation must not accept a candidate `recordPath` that is neither a nonempty string nor `null`.
- `no-empty-identifying-strings`: The operation must not accept an empty string for `position.text`, a `position.holds` entry, a candidate's `id` or `nextStep`, an evidence row's `rowId`, a citation's `sourceUrl` or `sourceTitle`, or a `searched` entry.
## Laws
- `belnap-four-valued-logic` | Modern Uses of Multiple-Valued Logic (Springer, Episteme vol. 2) | 1977 | https://doi.org/10.1007/978-94-010-1161-7_2 | Applies to aggregate-charge-via-knowledge-join, status-found-when-support-only, status-contested-when-top, status-refuted-when-refutation-only, status-unevidenced-when-no-rows. | Belnap's four-valued logic reads the "both" value ⊤ as the knowledge-order join of independently asserted true and false, an informational state rather than an error; the knowledge-order join of a charge asserting only support with one asserting only refutation is exactly ⊤, and the join of no assertions is exactly ⊥ ("told nothing").
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to candidate-order-preserved, evidence-rows-echoed-with-citations, position-echoed-verbatim, searched-echoed-verbatim. | The package uses one executable ESM operation source file with no runtime dependencies beyond the named metrologic subpath.
- `json-schema-2020-12` | JSON Schema | 2020-12 | https://json-schema.org/draft/2020-12/schema | Applies to no-non-boolean-charge-fields, no-neutral-evidence-row, no-malformed-accessed-on, no-recordpath-outside-string-or-null. | The request and result schemas are Draft 2020-12 documents validated with `@red-cup-engineering/validate-json-service`, using no `format` keyword; every boolean, enum, and pattern constraint named above is expressed and checked directly in that schema.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-continuation-reading-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@lenticule-science/metrologic":"0.2.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-continuation-reading.mjs
#!/usr/bin/env node
import { joinKnowledge, isTop } from "@lenticule-science/metrologic/bilattice/charge";

const BOTTOM_CHARGE = Object.freeze({ value: [false, false], evidence: [[], []] });
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

function nonEmptyString(value, context) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`derive-continuation-reading: ${context} must be a nonempty string`);
  }
  return value;
}

function validateStringArray(value, context) {
  if (!Array.isArray(value)) {
    throw new TypeError(`derive-continuation-reading: ${context} must be an array`);
  }
  value.forEach((entry, index) => nonEmptyString(entry, `${context}[${index}]`));
  return value;
}

function validatePosition(position) {
  if (!position || typeof position !== "object" || Array.isArray(position)) {
    throw new TypeError("derive-continuation-reading: input.position must be an object");
  }
  nonEmptyString(position.text, "input.position.text");
  validateStringArray(position.holds, "input.position.holds");
  return position;
}

function validateCitation(citation, context) {
  if (!citation || typeof citation !== "object" || Array.isArray(citation)) {
    throw new TypeError(`derive-continuation-reading: ${context} must be an object`);
  }
  nonEmptyString(citation.sourceUrl, `${context}.sourceUrl`);
  nonEmptyString(citation.sourceTitle, `${context}.sourceTitle`);
  nonEmptyString(citation.accessedOn, `${context}.accessedOn`);
  if (!ISO_DATE_PATTERN.test(citation.accessedOn)) {
    throw new RangeError(`derive-continuation-reading: ${context}.accessedOn must be an ISO calendar date (YYYY-MM-DD), got ${JSON.stringify(citation.accessedOn)}`);
  }
  return citation;
}

function validateCharge(charge, context) {
  if (!charge || typeof charge !== "object" || Array.isArray(charge)) {
    throw new TypeError(`derive-continuation-reading: ${context} must be an object`);
  }
  if (typeof charge.support !== "boolean") {
    throw new TypeError(`derive-continuation-reading: ${context}.support must be a boolean`);
  }
  if (typeof charge.refutation !== "boolean") {
    throw new TypeError(`derive-continuation-reading: ${context}.refutation must be a boolean`);
  }
  if (charge.support === false && charge.refutation === false) {
    throw new RangeError(`derive-continuation-reading: ${context} must assert support or refutation (an evidence row cannot be neutral)`);
  }
  return charge;
}

function validateEvidenceRow(row, context) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new TypeError(`derive-continuation-reading: ${context} must be an object`);
  }
  nonEmptyString(row.rowId, `${context}.rowId`);
  validateCharge(row.charge, `${context}.charge`);
  validateCitation(row.citation, `${context}.citation`);
  return row;
}

function validateCandidate(candidate, index) {
  const context = `input.candidates[${index}]`;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError(`derive-continuation-reading: ${context} must be an object`);
  }
  nonEmptyString(candidate.id, `${context}.id`);
  nonEmptyString(candidate.nextStep, `${context}.nextStep`);
  if (candidate.recordPath !== null) nonEmptyString(candidate.recordPath, `${context}.recordPath`);
  if (!Array.isArray(candidate.evidenceRows)) {
    throw new TypeError(`derive-continuation-reading: ${context}.evidenceRows must be an array`);
  }
  candidate.evidenceRows.forEach((row, rowIndex) => validateEvidenceRow(row, `${context}.evidenceRows[${rowIndex}]`));
  return candidate;
}

function chargeFromEvidenceRow(row) {
  return {
    value: [row.charge.support, row.charge.refutation],
    evidence: [row.charge.support ? [row.rowId] : [], row.charge.refutation ? [row.rowId] : []],
  };
}

function aggregateCharge(evidenceRows) {
  return evidenceRows.reduce(
    (accumulated, row) => joinKnowledge({ left: accumulated, right: chargeFromEvidenceRow(row) }),
    BOTTOM_CHARGE,
  );
}

function statusFromCharge(charge) {
  if (isTop(charge)) return "contested";
  const [support, refutation] = charge.value;
  if (support && !refutation) return "found";
  if (refutation && !support) return "refuted";
  return "unevidenced";
}

/**
 * Derives a record-level ContinuationReading for a held position: for every candidate, joins its
 * evidence rows' charges through metrologic's bilattice knowledge-order join (support and refutation
 * accumulate losslessly; a row's evidence witnesses that row's own rowId on the side(s) it asserts) and
 * names the candidate's status (found: support without refutation; contested: knowledge-order top, both
 * asserted; refuted: refutation without support; unevidenced: knowledge-order bottom, no evidence rows),
 * then names the overall reading (found if any candidate is found, contested if none is found but any is
 * contested, else none-found). Pure, no I/O, no clock. This is a record-level reading over evidence rows,
 * never the unbuilt-affects note's held-⊥ formalization over playing-substrate chronicles — the
 * territorial-economy science seat's 2026-09-05 continuation-reading-falsification-finding measured that
 * formalization as unreachable over the playing substrate as built and named it upstream of this program.
 * @param {{ type: "ContinuationReadingRequest", version: 1, position: { text: string, holds: readonly
 *   string[] }, candidates: readonly { id: string, nextStep: string, recordPath: (string | null),
 *   evidenceRows: readonly { rowId: string, charge: { support: boolean, refutation: boolean },
 *   citation: { sourceUrl: string, sourceTitle: string, accessedOn: string } }[] }[], searched:
 *   readonly string[] }} input The held position and its candidate continuations, each carrying the
 *   evidence rows (a lossless four-valued charge and its citation) found for it, and the search terms
 *   run when none was found.
 * @returns {{ type: "ContinuationReading", version: 1, notFormal: true, position: { text: string,
 *   holds: readonly string[] }, candidates: readonly { id: string, nextStep: string, recordPath:
 *   (string | null), status: ("found" | "contested" | "refuted" | "unevidenced"), aggregateCharge:
 *   { value: [boolean, boolean], evidence: [readonly string[], readonly string[]] }, evidenceRows:
 *   readonly { rowId: string, charge: { support: boolean, refutation: boolean }, citation: {
 *   sourceUrl: string, sourceTitle: string, accessedOn: string } }[] }[], reading: ("found" |
 *   "contested" | "none-found"), searched: readonly string[] }} The position and searched terms
 *   echoed verbatim, each candidate's evidence rows echoed with their citations alongside its joined
 *   aggregate charge and derived status, and the overall reading.
 * @throws {TypeError} When `input` is not a `ContinuationReadingRequest`, or a position, candidate,
 *   evidence row, charge, or citation is malformed.
 * @throws {RangeError} When an evidence row's charge asserts neither support nor refutation, or a
 *   citation's `accessedOn` is not an ISO calendar date (YYYY-MM-DD).
 */
export function deriveContinuationReading(input) {
  if (!input || typeof input !== "object" || input.type !== "ContinuationReadingRequest" || input.version !== 1) {
    throw new TypeError("derive-continuation-reading: input must be a ContinuationReadingRequest@1 record");
  }
  const position = validatePosition(input.position);
  if (!Array.isArray(input.candidates)) {
    throw new TypeError("derive-continuation-reading: input.candidates must be an array");
  }
  input.candidates.forEach((candidate, index) => validateCandidate(candidate, index));
  const searched = validateStringArray(input.searched, "input.searched");

  const candidates = input.candidates.map((candidate) => {
    const charge = aggregateCharge(candidate.evidenceRows);
    return {
      id: candidate.id,
      nextStep: candidate.nextStep,
      recordPath: candidate.recordPath,
      status: statusFromCharge(charge),
      aggregateCharge: charge,
      evidenceRows: candidate.evidenceRows.map((row) => ({
        rowId: row.rowId,
        charge: { support: row.charge.support, refutation: row.charge.refutation },
        citation: { sourceUrl: row.citation.sourceUrl, sourceTitle: row.citation.sourceTitle, accessedOn: row.citation.accessedOn },
      })),
    };
  });

  const reading = candidates.some((candidate) => candidate.status === "found")
    ? "found"
    : candidates.some((candidate) => candidate.status === "contested")
      ? "contested"
      : "none-found";

  return Object.freeze({
    type: "ContinuationReading",
    version: 1,
    notFormal: true,
    position: { text: position.text, holds: [...position.holds] },
    candidates: Object.freeze(candidates),
    reading,
    searched: [...searched],
  });
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "deriveContinuationReading — Derives a record-level ContinuationReading for a held position: for every candidate, joins its evidence rows' charges through metrologic's bilattice knowledge-order join (support and refutation accumulate losslessly; a row's evidence witnesses that row's own rowId on the side(s) it asserts) and names the candidate's status (found: support without refutation; contested: knowledge-order top, both asserted; refuted: refutation without support; unevidenced: knowledge-order bottom, no evidence rows), then names the overall reading (found if any candidate is found, contested if none is found but any is contested, else none-found). Pure, no I/O, no clock. This is a record-level reading over evidence rows, never the unbuilt-affects note's held-⊥ formalization over playing-substrate chronicles — the territorial-economy science seat's 2026-09-05 continuation-reading-falsification-finding measured that formalization as unreachable over the playing substrate as built and named it upstream of this program.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length === 0) continue;
      try {
        process.stdout.write(`${JSON.stringify(deriveContinuationReading(JSON.parse(line)))}\n`);
      } catch (error) {
        process.stderr.write(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`);
        process.exitCode = 1;
      }
    }
  }
}
```
## Tests
```mjs path=test/derive-continuation-reading.test.mjs
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
```
## Examples
```json name="Lake Superior fish continuation, two supporting rows, found"
{"input":{"type":"ContinuationReadingRequest","version":1,"position":{"text":"What is the next step for a Lake Superior commercial fish species' value chain?","holds":["producer-position-price-elicited","retail-position-price-elicited"]},"candidates":[{"id":"lake-trout-dock-to-retail-ladder","nextStep":"Register the Lake Superior lake trout producer-to-retail price ladder (dock price to Bodin Fisheries retail price) in the band's value-chain readout.","recordPath":"lib/emsenn/services/561-group/services/science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section/services/territorial-economy-science-services-section/data/records/2026-09-05-band-region-value-chain-readings.json","evidenceRows":[{"rowId":"mn-dnr-2024-lake-superior-commercial-fishing-summary","charge":{"support":true,"refutation":false},"citation":{"sourceUrl":"https://files.dnr.state.mn.us/publications/fisheries/educational_reports/2024-lake-superior-commercial-fishing-summary.pdf","sourceTitle":"Commercial Fishing Summary, Minnesota Waters of Lake Superior, 2024, Minnesota DNR Division of Fish and Wildlife","accessedOn":"2026-09-05"}},{"rowId":"bodin-fisheries-price-list-2019","charge":{"support":true,"refutation":false},"citation":{"sourceUrl":"http://www.bodinfisheries.com/price-list.html","sourceTitle":"Price List, Bodin Fisheries","accessedOn":"2026-09-05"}}]}],"searched":["Lake Superior lake trout dock-to-retail price ladder, band region economic records"]},"output":{"type":"ContinuationReading","version":1,"notFormal":true,"position":{"text":"What is the next step for a Lake Superior commercial fish species' value chain?","holds":["producer-position-price-elicited","retail-position-price-elicited"]},"candidates":[{"id":"lake-trout-dock-to-retail-ladder","nextStep":"Register the Lake Superior lake trout producer-to-retail price ladder (dock price to Bodin Fisheries retail price) in the band's value-chain readout.","recordPath":"lib/emsenn/services/561-group/services/science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section/services/territorial-economy-science-services-section/data/records/2026-09-05-band-region-value-chain-readings.json","status":"found","aggregateCharge":{"value":[true,false],"evidence":[["mn-dnr-2024-lake-superior-commercial-fishing-summary","bodin-fisheries-price-list-2019"],[]]},"evidenceRows":[{"rowId":"mn-dnr-2024-lake-superior-commercial-fishing-summary","charge":{"support":true,"refutation":false},"citation":{"sourceUrl":"https://files.dnr.state.mn.us/publications/fisheries/educational_reports/2024-lake-superior-commercial-fishing-summary.pdf","sourceTitle":"Commercial Fishing Summary, Minnesota Waters of Lake Superior, 2024, Minnesota DNR Division of Fish and Wildlife","accessedOn":"2026-09-05"}},{"rowId":"bodin-fisheries-price-list-2019","charge":{"support":true,"refutation":false},"citation":{"sourceUrl":"http://www.bodinfisheries.com/price-list.html","sourceTitle":"Price List, Bodin Fisheries","accessedOn":"2026-09-05"}}]}],"reading":"found","searched":["Lake Superior lake trout dock-to-retail price ladder, band region economic records"]}}
```
```json name="contested candidate, one supporting and one refuting row, no candidate found"
{"input":{"type":"ContinuationReadingRequest","version":1,"position":{"text":"Has the band's wild-rice register held its first conversation about pricing hand-harvested rice?","holds":["register-conversation-logged"]},"candidates":[{"id":"first-register-conversation","nextStep":"Confirm the register's first conversation about pricing hand-harvested wild rice against cultivated rice.","recordPath":null,"evidenceRows":[{"rowId":"register-entry-2026-09-01","charge":{"support":true,"refutation":false},"citation":{"sourceUrl":"https://example.test/band-register/entries/2026-09-01","sourceTitle":"Band Economic Register, entry 2026-09-01","accessedOn":"2026-09-05"}},{"rowId":"register-attendance-log-gap","charge":{"support":false,"refutation":true},"citation":{"sourceUrl":"https://example.test/band-register/attendance-log","sourceTitle":"Band Economic Register attendance log","accessedOn":"2026-09-05"}}]}],"searched":[]},"output":{"type":"ContinuationReading","version":1,"notFormal":true,"position":{"text":"Has the band's wild-rice register held its first conversation about pricing hand-harvested rice?","holds":["register-conversation-logged"]},"candidates":[{"id":"first-register-conversation","nextStep":"Confirm the register's first conversation about pricing hand-harvested wild rice against cultivated rice.","recordPath":null,"status":"contested","aggregateCharge":{"value":[true,true],"evidence":[["register-entry-2026-09-01"],["register-attendance-log-gap"]]},"evidenceRows":[{"rowId":"register-entry-2026-09-01","charge":{"support":true,"refutation":false},"citation":{"sourceUrl":"https://example.test/band-register/entries/2026-09-01","sourceTitle":"Band Economic Register, entry 2026-09-01","accessedOn":"2026-09-05"}},{"rowId":"register-attendance-log-gap","charge":{"support":false,"refutation":true},"citation":{"sourceUrl":"https://example.test/band-register/attendance-log","sourceTitle":"Band Economic Register attendance log","accessedOn":"2026-09-05"}}]}],"reading":"contested","searched":[]}}
```
```json name="no candidates found, searched echoed verbatim"
{"input":{"type":"ContinuationReadingRequest","version":1,"position":{"text":"Is there a named smokehouse's price for the band's fish-to-smoked-product continuation?","holds":["smokehouse-price-named"]},"candidates":[],"searched":["named smokehouse near the dock for Lake Superior lake trout and whitefish, price list or quote"]},"output":{"type":"ContinuationReading","version":1,"notFormal":true,"position":{"text":"Is there a named smokehouse's price for the band's fish-to-smoked-product continuation?","holds":["smokehouse-price-named"]},"candidates":[],"reading":"none-found","searched":["named smokehouse near the dock for Lake Superior lake trout and whitefish, price list or quote"]}}
```
## Traceability
- `candidate-order-preserved` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `evidence-row-charge-mapping` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `belnap-four-valued-logic`
- `aggregate-charge-via-knowledge-join` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `belnap-four-valued-logic`
- `status-found-when-support-only` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `belnap-four-valued-logic`
- `status-contested-when-top` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `belnap-four-valued-logic`
- `status-refuted-when-refutation-only` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `belnap-four-valued-logic`
- `status-unevidenced-when-no-rows` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `belnap-four-valued-logic`
- `evidence-rows-echoed-with-citations` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `overall-reading-any-found` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `belnap-four-valued-logic`
- `overall-reading-contested-else` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `belnap-four-valued-logic`
- `overall-reading-none-found-else` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `belnap-four-valued-logic`
- `position-echoed-verbatim` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `searched-echoed-verbatim` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `not-formal-flag-present` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `json-schema-2020-12`
- `no-neutral-evidence-row` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `json-schema-2020-12`
- `no-non-boolean-charge-fields` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `json-schema-2020-12`
- `no-malformed-accessed-on` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `json-schema-2020-12`
- `no-recordpath-outside-string-or-null` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `json-schema-2020-12`
- `no-empty-identifying-strings` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `json-schema-2020-12`
