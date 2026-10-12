#!/usr/bin/env node
/**
 * @module check-hopeium-issue
 * The hopeium issue refusal: structural validation against
 * data/records/schema/hopeium-issue.schema.json through
 * @red-cup-engineering/validate-json-service, then the three format refusals
 * the hopeium-media note's plan (3.1) and the hopeium capability
 * specification (iv) state — a settled outcome on an open cell (the
 * doom-take or the solution-take), an issue with no return reading, and (for
 * a record continuation) a claim whose settledness outruns what
 * @red-cup-engineering/derive-continuation-reading-service actually reads
 * off the continuation's own evidence rows.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateJson } from "@red-cup-engineering/computer-data-engine/validation";
import { deriveContinuationReading } from "@red-cup-engineering/derive-continuation-reading-service";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

const SCHEMA_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "records", "schema", "hopeium-issue.schema.json");

/** @type {object} */
const HOPEIUM_ISSUE_SCHEMA = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));

/**
 * @param {unknown} charge - `claim.charge`, `{support: boolean, refutation: boolean}`
 * @returns {boolean} true when exactly one of support/refutation is set (a settled value, never both or neither)
 */
function isSettledCharge(charge) {
  return typeof charge === "object" && charge !== null
    && typeof charge.support === "boolean" && typeof charge.refutation === "boolean"
    && charge.support !== charge.refutation;
}

/**
 * @param {unknown} charge - `claim.charge`, `{support: boolean, refutation: boolean}`
 * @returns {boolean} true when charge is exactly `{support: true, refutation: false}` (settled support)
 */
function isSettledSupportCharge(charge) {
  return typeof charge === "object" && charge !== null && charge.support === true && charge.refutation === false;
}

/**
 * @param {unknown} charge - `claim.charge`, `{support: boolean, refutation: boolean}`
 * @returns {boolean} true when charge is exactly `{support: true, refutation: true}` (contested-held)
 */
function isContestedHeldCharge(charge) {
  return typeof charge === "object" && charge !== null && charge.support === true && charge.refutation === true;
}

/**
 * Builds the one-candidate ContinuationReadingRequest derive-continuation-reading-service
 * reads for a record continuation, carrying the continuation's own evidence rows verbatim.
 * @param {object} issue - a schema-valid hopeium issue whose `continuation.kind` is `"record"`
 * @returns {object} a `ContinuationReadingRequest@1` with one candidate built from the continuation
 */
function buildContinuationReadingRequest(issue) {
  return {
    type: "ContinuationReadingRequest",
    version: 1,
    position: { text: issue.claim.text, holds: [] },
    candidates: [
      {
        id: issue.continuation.recordPath,
        nextStep: issue.continuation.nextStep,
        recordPath: issue.continuation.recordPath,
        evidenceRows: issue.continuation.evidenceRows,
      },
    ],
    searched: [],
  };
}

/**
 * Check one hopeium issue: schema shape first, then the three format
 * refusals. Pure, no I/O, no clock (derive-continuation-reading-service, the
 * only thing it calls, is itself pure).
 * @param {object} issue - a candidate hopeium issue (see hopeium-issue.schema.json)
 * @returns {{ok: true, reading?: object} | {refused: "SCHEMA_INVALID"|"SETTLED_OUTCOME_ON_OPEN_CELL"|"NO_RETURN"|"CLAIM_OUTRUNS_EVIDENCE", errors: ReadonlyArray<object>, reading?: object}}
 */
export function checkHopeiumIssue(issue) {
  const schemaReport = validateJson({ value: issue, schema: HOPEIUM_ISSUE_SCHEMA });
  if (!schemaReport.valid) {
    return Object.freeze({ refused: "SCHEMA_INVALID", errors: Object.freeze(schemaReport.errors) });
  }

  if (isSettledCharge(issue.claim?.charge) && issue.continuation?.kind === "none-found") {
    return Object.freeze({
      refused: "SETTLED_OUTCOME_ON_OPEN_CELL",
      errors: Object.freeze([{ message: "a settled outcome on an open cell is the doom-take or the solution-take" }]),
    });
  }

  if (issue.return?.reading === undefined) {
    return Object.freeze({
      refused: "NO_RETURN",
      errors: Object.freeze([{ message: "an issue with no return.reading has no reading to return the reader to" }]),
    });
  }

  if (issue.continuation?.kind === "record") {
    const reading = deriveContinuationReading(buildContinuationReadingRequest(issue));
    const charge = issue.claim.charge;
    if (
      (isSettledSupportCharge(charge) && reading.reading !== "found")
      || (reading.reading === "contested" && !isContestedHeldCharge(charge))
    ) {
      return Object.freeze({
        refused: "CLAIM_OUTRUNS_EVIDENCE",
        errors: Object.freeze([{ message: "the claim's charge outruns what the continuation's own evidence rows read" }]),
        reading,
      });
    }
    return Object.freeze({ ok: true, reading });
  }

  return Object.freeze({ ok: true });
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "check-hopeium-issue", description: "Check one hopeium issue: schema shape first, then the three format refusals.", operation: checkHopeiumIssue }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
