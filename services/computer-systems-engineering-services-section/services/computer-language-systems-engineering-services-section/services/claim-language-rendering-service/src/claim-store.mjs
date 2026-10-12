// claim-store.mjs — read one claim out of a sourced-claim store file.
// Koios stays data: this reads the store's own shape
// ({subject, claims:[{id, proposition, time, force, provenance, status}]})
// generically; it does not know about Koios, sites, or categories.

import { readFile } from "node:fs/promises";

export class ClaimNotFoundError extends Error {
  constructor(claimId, filePath) {
    super(`claim ${JSON.stringify(claimId)} not found in ${filePath}`);
    this.name = "ClaimNotFoundError";
    this.claimId = claimId;
    this.filePath = filePath;
  }
}

/** Read one claim from a store file by id. Returns {subject, filePath, claim}. */
export async function readClaim(filePath, claimId) {
  const raw = await readFile(filePath, "utf8");
  const doc = JSON.parse(raw);
  const claim = (doc.claims ?? []).find((c) => c.id === claimId);
  if (claim === undefined) throw new ClaimNotFoundError(claimId, filePath);
  return Object.freeze({ subject: doc.subject, filePath, claim });
}
