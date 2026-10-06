/** Filesystem-journal projection for derived program-contract evidence. */

import { openJournal, journal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { programContractEvidenceContract } from "./contract.mjs";
import { eavtRecord, toEavt } from "@red-cup-engineering/eavt/row";

function isEvidence(value) {
  return programContractEvidenceContract.validate(value);
}

/** Admit one measured contract receipt through the journal's existing write door. */
export function admitProgramContractEvidence(
  root,
  evidence,
  at,
) {
  const admitted = programContractEvidenceContract.assert(evidence, "program contract journal evidence");
  return openJournal(root).appendRows("program-contract", [toEavt({
    e: admitted.contract,
    a: Object.freeze({ kind: "metroplat.program.contract.evidence", reading: admitted.reading }),
    v: admitted,
    t: at,
  })], {
    at,
    subject: "program-contract",
    caller: Object.freeze({ kind: "metroplat.program.contract.oracle" }),
  });
}

/**
 * Read all admitted contract receipts from the contract feed's immutable
 * statement files. This is intentionally a journal read, not a scan of
 * projected `data/contracts` artifacts: contradictory historical measurements
 * must remain visible to the FOUR fold.
 */
export function readProgramContractEvidence(root) {
  const folded = journal.scanCausalSubject(root, "program-contract", "9999-12-31", [], (evidence, row) => {
    const value = eavtRecord(row).v;
    if (isEvidence(value)) evidence.push(value);
    return evidence;
  });
  return Object.freeze(folded.result);
}
