/**
 * knowledge-vault/src/notes — thin re-export of the vault-note request/reading
 * contracts. Relocated to `@red-cup-engineering/vault-note-schema` (published,
 * knowledge-vault-computer-system-services-section/services/vault-note-schema)
 * per the 2026-09-05 ruling that a capability living inside metroplat's
 * `src/integrations/*` is not metroplat's to keep. This file stays only as
 * metroplat's thin consuming layer so `knowledge-vault/src/vault.mts` and
 * `knowledge-vault/services/notes.mts` keep their existing local import
 * paths unchanged.
 */
export {
  vaultNoteReadRequestSchema,
  vaultNoteProjectionSchema,
  vaultNoteWriteRequestSchema,
  vaultNoteWriteReceiptSchema,
  vaultReadRequestSchema,
  vaultIngestionProfileSchema,
  vaultQueryRequestSchema,
  vaultQueryResultSchema,
  vaultNoteReadRequestContract,
  vaultNoteProjectionContract,
  vaultNoteWriteRequestContract,
  vaultNoteWriteReceiptContract,
  vaultReadRequestContract,
  vaultIngestionProfileContract,
  vaultQueryRequestContract,
  vaultQueryResultContract,
} from "@red-cup-engineering/vault-note-schema/vault-note";
export type {
  VaultNoteReadRequest,
  VaultNoteProjection,
  VaultNoteWriteRequest,
  VaultNoteWriteReceipt,
  VaultReadRequest,
  VaultIngestionProfile,
  VaultQueryRequest,
  VaultQueryResult,
} from "@red-cup-engineering/vault-note-schema";
