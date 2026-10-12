/** Store records for derived program-contract evidence. */

import { extend, readHead, walk } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { programContractEvidenceContract } from "./contract.mjs";

/** The type of a measured contract receipt, and the one thread that keeps them all visible together. */
export const programContractEvidenceType = "program-contract-evidence";
export const programContractEvidenceThread = "program-contract";

/** The most receipts one read follows. */
const READ_LIMIT = 8_192;

function isEvidence(value) {
  return programContractEvidenceContract.validate(value);
}

/** Admit one measured contract receipt: it follows every receipt the thread held when it was measured. */
export function admitProgramContractEvidence(
  root,
  evidence,
  at,
) {
  const admitted = programContractEvidenceContract.assert(evidence, "program contract store evidence");
  return extend(root, programContractEvidenceType, programContractEvidenceThread, { at, evidence: admitted });
}

/**
 * Read all admitted contract receipts, causes first. This reads the thread, not a scan of projected
 * `data/contracts` artifacts: contradictory historical measurements must remain visible to the FOUR fold.
 */
export function readProgramContractEvidence(root) {
  const head = readHead(root, programContractEvidenceType, programContractEvidenceThread);
  if (head === undefined) return Object.freeze([]);
  const evidence = [];
  for (const step of walk(root, programContractEvidenceType, head.frontier, { limit: READ_LIMIT })) {
    if (step.record !== undefined && isEvidence(step.record.evidence)) evidence.push(step.record.evidence);
  }
  return Object.freeze(evidence.reverse());
}
