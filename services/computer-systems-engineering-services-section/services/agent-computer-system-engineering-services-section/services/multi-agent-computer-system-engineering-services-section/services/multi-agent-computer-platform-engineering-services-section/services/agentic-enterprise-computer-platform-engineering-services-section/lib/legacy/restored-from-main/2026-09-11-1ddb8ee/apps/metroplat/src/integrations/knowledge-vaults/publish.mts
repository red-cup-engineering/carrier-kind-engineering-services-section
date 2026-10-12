/**
 * knowledge-vault/src/publish — thin re-export of the vault website
 * publish request/receipt contracts. Relocated to
 * `@red-cup-engineering/vault-note-schema` (published,
 * knowledge-vault-computer-system-services-section/services/vault-note-schema)
 * per the 2026-09-05 ruling that a capability living inside metroplat's
 * `src/integrations/*` is not metroplat's to keep. The effectful publish
 * leg (`knowledge-vault/services/publish.mts::publishVaultWebsite`) stays in
 * metroplat because it composes metroplat's own static-website generator
 * (`src/sites/static-website/generator`), which this package does not own.
 */
export {
  vaultWebsitePublishRequestSchema,
  vaultWebsitePublishReceiptSchema,
  vaultWebsitePublishRequestContract,
  vaultWebsitePublishReceiptContract,
} from "@red-cup-engineering/vault-note-schema/vault-website-publish";
export type {
  VaultWebsitePublishRequest,
  VaultWebsitePublishReceipt,
} from "@red-cup-engineering/vault-note-schema";
