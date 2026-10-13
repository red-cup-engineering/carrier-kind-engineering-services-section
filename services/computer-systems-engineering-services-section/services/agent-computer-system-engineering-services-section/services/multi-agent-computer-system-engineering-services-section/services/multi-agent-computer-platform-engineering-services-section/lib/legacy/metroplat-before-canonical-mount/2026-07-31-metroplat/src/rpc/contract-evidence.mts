/** Filesystem-journal projection for derived program-contract evidence. */
import type { JsonValue } from "../lib/codecs/json/core.mts";
import { eavtObject, toEavt } from "../lib/codecs/json/jsonl/eavt/index.mts";
import { openJournal, type EventWriteResult, journal } from "../journal/index.mts";
import { programContractEvidenceContract, type ProgramContractEvidence } from "./contract.mts";

function isEvidence(value: unknown): value is ProgramContractEvidence {
  return programContractEvidenceContract.validate(value);
}

/** Admit one measured contract receipt through the journal's existing write door. */
export function admitProgramContractEvidence(
  root: string,
  evidence: ProgramContractEvidence,
  at: string,
): EventWriteResult {
  const admitted = programContractEvidenceContract.assert(evidence, "program contract journal evidence") as ProgramContractEvidence;
  return openJournal(root).appendRows("program-contract", [toEavt({
    e: admitted.contract,
    a: Object.freeze({ kind: "metroplat.program.contract.evidence", charge: admitted.charge }),
    v: admitted as unknown as JsonValue,
    t: at,
  })], {
    at,
    subject: "program-contract",
    caller: Object.freeze({ kind: "metroplat.program.contract.oracle" }),
  });
}

/**
 * Read all admitted contract receipts from immutable statement files. This is
 * intentionally a journal read, not a scan of projected `data/contracts`
 * artifacts: contradictory historical measurements must remain visible to the
 * FOUR fold.
 */
export function readProgramContractEvidence(root: string): readonly ProgramContractEvidence[] {
  const folded = journal.scanTerritory(root, [] as ProgramContractEvidence[], (evidence, row) => {
    const value = eavtObject(row).v;
    if (isEvidence(value)) evidence.push(value);
    return evidence;
  });
  return Object.freeze(folded.result);
}
