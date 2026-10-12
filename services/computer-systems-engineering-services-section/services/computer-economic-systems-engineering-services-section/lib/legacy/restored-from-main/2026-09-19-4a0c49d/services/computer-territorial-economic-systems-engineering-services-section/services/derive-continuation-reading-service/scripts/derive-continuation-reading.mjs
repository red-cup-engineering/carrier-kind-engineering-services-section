#!/usr/bin/env node
import { joinKnowledge, isTop } from "@lenticule-science/metrologic/bilattice/charge";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

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
  const result = await runJavascriptNodeOperation({ name: "derive-continuation-reading", description: "Derives a record-level ContinuationReading for a held position: for every candidate, joins its evidence rows' charges through metrologic's bilattice knowledge-order join (support and refutation accumulate losslessly; a row's evidence witnesses that row's own rowId on the side(s) it asserts) and names the candidate's status (found: support without refutation; contested: knowledge-order top, both asserted; refuted: refutation without support; unevidenced: knowledge-order bottom, no evidence rows), then names the overall reading (found if any candidate is found, contested if none is found but any is contested, else none-found).", operation: deriveContinuationReading }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
