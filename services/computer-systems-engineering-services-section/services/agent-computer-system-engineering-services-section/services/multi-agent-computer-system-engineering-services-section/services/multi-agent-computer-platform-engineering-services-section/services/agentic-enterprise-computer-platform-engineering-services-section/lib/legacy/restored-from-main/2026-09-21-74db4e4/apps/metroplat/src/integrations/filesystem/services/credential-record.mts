/**
 * services/filesystem-store/credential-record — project a statement log into
 * a Verifiable Credential under `data/records`. Split out of the generic
 * `filesystem-store/index.mts` so the generic journal never has
 * to import the identity/credential domain directly — this file depends
 * INTO the journal's domain-record projection operation, not the
 * other way around.
 */
import { credentialFromStatementReference } from "../../../lib/capability/identity/index.mts";
import {
  journal,
  type LogCredentialProjection,
  type LogCredentialProjectionOptions,
} from "../../../journal/index.mts";
import type { DataArtifactHandle } from "../../../lib/addressing/index.mts";
import { eavtObject } from "../../../lib/codecs/json/jsonl/eavt/index.mts";
import type { JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";

interface CredentialProjectionFold {
  readonly firstTime?: string;
}

/** Project a durable `data/journals` artifact into a Verifiable Credential under `data/records`. */
export function projectLogPathCredential(
  logArtifact: DataArtifactHandle,
  options: LogCredentialProjectionOptions = {},
): LogCredentialProjection {
  const { credential: credentialOptions = {}, ...observationOptions } = options;
  return journal.projectDomainRecord<LogCredentialProjection, CredentialProjectionFold>(
    logArtifact,
    "project-log-credential",
    "identity-credential",
    "log credential projection",
    () => Object.freeze({}),
    (fold, row) => {
      if (fold.firstTime !== undefined) return fold;
      const time = eavtObject(row).t;
      if (typeof time !== "string" || time.length === 0) return fold;
      const next: CredentialProjectionFold = Object.freeze({ firstTime: time });
      return next;
    },
    (fold, source) => ({
      payload: credentialFromStatementReference(Object.freeze({
        kind: "metroplat.witness-log-reference" as const,
        path: source.logPath,
        mediaType: "application/eavt+jsonl; charset=utf-8",
        rows: source.rows,
        ...(source.malformed === 0 ? {} : { malformed: source.malformed }),
      }), {
        ...credentialOptions,
        issuanceDate: credentialOptions.issuanceDate ?? fold.firstTime ?? new Date(0).toISOString(),
      }) as unknown as JsonValue,
    }),
    observationOptions,
  );
}
