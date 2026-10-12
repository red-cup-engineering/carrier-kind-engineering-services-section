import assert from "node:assert/strict";
import test from "node:test";
import { checkHopeiumIssue } from "../scripts/check-hopeium-issue.mjs";

/** @returns {object} an evidence row in derive-continuation-reading-service's request shape */
function supportingRow(rowId) {
  return {
    rowId,
    charge: { support: true, refutation: false },
    citation: { sourceUrl: `https://example.com/${rowId}`, sourceTitle: `Source for ${rowId}`, accessedOn: "2026-09-05" },
  };
}

/** @returns {object} an evidence row in derive-continuation-reading-service's request shape */
function refutingRow(rowId) {
  return {
    rowId,
    charge: { support: false, refutation: true },
    citation: { sourceUrl: `https://example.com/${rowId}`, sourceTitle: `Source for ${rowId}`, accessedOn: "2026-09-05" },
  };
}

/** @returns {object} a schema-valid hopeium issue, mutate per test */
function validIssue() {
  return {
    title: "Test issue",
    dek: "A test dek.",
    sections: [{ heading: "Claim", "body-markdown": "The claim." }],
    references: {},
    claim: {
      text: "the measured claim",
      charge: { support: true, refutation: false },
      provenance: [{ sourceUrl: "https://example.com/a", sourceTitle: "A Source", accessedOn: "2026-09-05" }],
    },
    lament: { text: "the open wound, without closure." },
    continuation: {
      kind: "record",
      recordPath: "lib/emsenn/services/.../a-record.json",
      evidenceRows: [supportingRow("row-one")],
      nextStep: "the next step",
    },
    return: {
      reading: { title: "A longer reading", sourceUrl: "lib/emsenn/services/.../a-note.md" },
      bodyPractice: "Pay attention to the rhythms of your breathing and heartbeat.",
      tell: "Talk about what you read",
    },
  };
}

test("checkHopeiumIssue passes a schema-valid issue with an open continuation and a return", () => {
  const result = checkHopeiumIssue(validIssue());
  assert.equal(result.ok, true);
  assert.equal(result.reading.reading, "found");
});

test("checkHopeiumIssue passes a settled-support claim with two supporting rows, reading found", () => {
  const issue = validIssue();
  issue.continuation.evidenceRows = [supportingRow("row-one"), supportingRow("row-two")];
  const result = checkHopeiumIssue(issue);
  assert.equal(result.ok, true);
  assert.equal(result.reading.reading, "found");
});

test("checkHopeiumIssue refuses CLAIM_OUTRUNS_EVIDENCE for a settled-support claim over one supporting and one refuting row", () => {
  const issue = validIssue();
  issue.continuation.evidenceRows = [supportingRow("row-one"), refutingRow("row-two")];
  const result = checkHopeiumIssue(issue);
  assert.equal(result.refused, "CLAIM_OUTRUNS_EVIDENCE");
  assert.equal(result.errors[0].message, "the claim's charge outruns what the continuation's own evidence rows read");
  assert.equal(result.reading.reading, "contested");
});

test("checkHopeiumIssue passes a contested-held claim over one supporting and one refuting row, reading contested", () => {
  const issue = validIssue();
  issue.claim.charge = { support: true, refutation: true };
  issue.continuation.evidenceRows = [supportingRow("row-one"), refutingRow("row-two")];
  const result = checkHopeiumIssue(issue);
  assert.equal(result.ok, true);
  assert.equal(result.reading.reading, "contested");
});

test("checkHopeiumIssue refuses SETTLED_OUTCOME_ON_OPEN_CELL for a settled charge on a none-found continuation", () => {
  const issue = validIssue();
  issue.continuation = { kind: "none-found", searched: ["a search that found nothing"] };
  const result = checkHopeiumIssue(issue);
  assert.equal(result.refused, "SETTLED_OUTCOME_ON_OPEN_CELL");
  assert.equal(result.errors[0].message, "a settled outcome on an open cell is the doom-take or the solution-take");
});

test("checkHopeiumIssue refuses SETTLED_OUTCOME_ON_OPEN_CELL for a settled refutation on a none-found continuation", () => {
  const issue = validIssue();
  issue.claim.charge = { support: false, refutation: true };
  issue.continuation = { kind: "none-found", searched: ["a search that found nothing"] };
  const result = checkHopeiumIssue(issue);
  assert.equal(result.refused, "SETTLED_OUTCOME_ON_OPEN_CELL");
});

test("checkHopeiumIssue refuses NO_RETURN for an issue with no return.reading", () => {
  const issue = validIssue();
  delete issue.return.reading;
  const result = checkHopeiumIssue(issue);
  assert.equal(result.refused, "NO_RETURN");
  assert.equal(result.errors[0].message, "an issue with no return.reading has no reading to return the reader to");
});

test("checkHopeiumIssue refuses SCHEMA_INVALID for a verdict field", () => {
  const issue = validIssue();
  issue.verdict = "doom";
  const result = checkHopeiumIssue(issue);
  assert.equal(result.refused, "SCHEMA_INVALID");
  assert.ok(result.errors.some((entry) => entry.path === "/verdict"));
});
