/**
 * knowledge-vaults barrel — genuinely local metroplat composition only. The
 * vault-note/diataxis/vault-website-publish schema and codec contracts this
 * domain used to re-export here (`notes.mts`, `schema.mts`, `codec.mts`,
 * `publish.mts`) are published at `@red-cup-engineering/vault-note-schema`;
 * import them from there directly rather than through this barrel.
 */
export * from "./vault.mts";
export * from "./wikilinks.mts";
export * from "./projector.mts";
export * from "./services/notes.mts";
export * from "./services/publish.mts";
export * from "./services/corpus.mts";
