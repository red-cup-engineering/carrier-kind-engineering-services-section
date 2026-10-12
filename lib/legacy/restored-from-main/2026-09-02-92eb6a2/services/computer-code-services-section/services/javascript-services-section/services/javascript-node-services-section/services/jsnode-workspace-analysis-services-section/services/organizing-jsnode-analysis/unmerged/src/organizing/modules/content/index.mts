/**
 * @emsenn/organizing-with-jsnode/content — documenting workspace packages.
 *
 * Two facets, each the former *-computer app's library surface (the apps are
 * gone; this is where their capability lives):
 *   - `doc`       — deterministic documentation from a package's manifest and
 *     introspected surface: presence audit, dev/docs scaffold, README / AGENTS /
 *     CLAUDE.md generation, markdown API reference, JSDoc coverage, and JSDoc
 *     management (the former jsnode-doc-computer).
 *   - `cultivate` — LLM-written, gate-checked documentation cultivated bottom-up
 *     from the introspected surface, the keystone gate refusing any reference the
 *     surface does not vouch for (the former jsnode-content-computer). Built on
 *     @emsenn/content's documentation primitives; the model's `ask` enters as a
 *     value.
 */
export * as doc from "./doc/index.mjs";
export * as cultivate from "./cultivate/index.mjs";
