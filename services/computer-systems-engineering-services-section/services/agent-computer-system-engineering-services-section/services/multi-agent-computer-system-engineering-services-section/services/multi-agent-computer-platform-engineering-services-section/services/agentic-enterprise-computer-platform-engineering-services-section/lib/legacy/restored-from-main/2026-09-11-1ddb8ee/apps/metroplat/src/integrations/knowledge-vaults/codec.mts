/**
 * knowledge-vault/src/codec — thin re-export of the Diataxis mode/charge
 * algebra and coverage read. Relocated to
 * `@red-cup-engineering/vault-note-schema` (published,
 * knowledge-vault-computer-system-services-section/services/vault-note-schema)
 * per the 2026-09-05 ruling that a capability living inside metroplat's
 * `src/integrations/*` is not metroplat's to keep. (The 2026-09-11
 * relocation also corrected two mismatched docstrings on
 * `diataxisLookupDual`/`diataxisDoingDual` that claimed swap pairs
 * `conflateValue`/`negateValue` do not actually produce — see the package's
 * own src/diataxis.mjs for the corrected reading and the measurement that
 * found it.)
 */
export * from "@red-cup-engineering/vault-note-schema/diataxis";
