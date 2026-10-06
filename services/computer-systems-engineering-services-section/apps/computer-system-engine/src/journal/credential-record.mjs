/**
 * services/filesystem-store/credential-record — project a statement log into
 * a Verifiable Credential under `data/records`. Split out of the generic
 * `filesystem-store/index.mts` so the generic journal never has
 * to import the identity/credential domain directly — this file depends
 * INTO the journal's domain-record projection operation, not the
 * other way around.
 */
import { credentialFromStatementReference } from "@red-cup-engineering/computer-networking-engineering-services-section/identity";
import { journal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { eavtRecord } from "@red-cup-engineering/eavt/row";


/** Project a durable `data/journals` artifact into a Verifiable Credential under `data/records`. */
export function projectLogPathCredential(
  logArtifact,
  options = {},
) {
  const { credential: credentialOptions = {}, ...observationOptions } = options;
  return journal.projectDomainRecord(
    logArtifact,
    "project-log-credential",
    "identity-credential",
    "log credential projection",
    () => Object.freeze({}),
    (fold, row) => {
      if (fold.firstTime !== undefined) return fold;
      const time = eavtRecord(row).t;
      if (typeof time !== "string" || time.length === 0) return fold;
      const next = Object.freeze({ firstTime: time });
      return next;
    },
    (fold, source) => ({
      payload: credentialFromStatementReference(Object.freeze({
        kind: "metroplat.witness-log-reference",
        path: source.logPath,
        mediaType: "application/eavt+jsonl; charset=utf-8",
        rows: source.rows,
        ...(source.malformed === 0 ? {} : { malformed: source.malformed }),
      }), {
        ...credentialOptions,
        issuanceDate: credentialOptions.issuanceDate ?? fold.firstTime ?? new Date(0).toISOString(),
      }),
    }),
    observationOptions,
  );
}
