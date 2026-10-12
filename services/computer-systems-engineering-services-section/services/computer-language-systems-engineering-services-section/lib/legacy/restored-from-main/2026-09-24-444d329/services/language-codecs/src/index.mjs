/**
 * @emsenn/language-codecs — the codec layer of language.
 *
 * Codecs are the reversible bridge morphisms between representations of the
 * same content, each obeying a round-trip discipline:
 *   - load:       raw fiber data  ⇄  compiled fiber        (lives in algebra)
 *   - articulate: surface string  →   span base            (lives in topology)
 *   - parse:      span base        →   settled structure    (lives in topology)
 *   - render:     settled structure →  surface string       (owned here)
 *
 * articulate/parse/load are homed in the layers whose machinery they are part
 * of (acyclicity pins them there); this package owns `render` and binds the
 * whole surface/structure round-trip as one addressable namespace.
 *
 * The codec law (after the research archive's `interpret(note; rules) → fiber`):
 *   1. Determinism — `parse(surface; fiber)` and `render(structure)` are
 *      functions: byte-identical inputs yield byte-identical outputs. The fiber
 *      bundle is the *rules*, supplied as content, never hard-coded.
 *   2. Source-of-truth — the surface is authoritative; the structure is derived.
 *
 * Note on direction: `render` is a *faithful presentation* of a parse (a human
 * view — TOKENS / ARCS / ROLES / TOWER), NOT the inverse codec. The genuine
 * structure→surface inverse is *realization* (`generate`/`realizeClause` in
 * `@emsenn/english-language-codecs`); it is fiber-bound, because choosing
 * articles and word order is language-specific. parse↔realize cross a lossy
 * semantic bottleneck (surface → roles → frames → surface drops article/tense/
 * order detail), so there is no exact round-trip — only the determinism above.
 * See codec-law.test / residuation.test for the checked invariants.
 */

// owned here — structure → surface
export { default as render, renderArcs } from "./rendering.mjs";

// bound from the home layers — the rest of the round-trip
export { articulate, tokenize } from "@emsenn/language-topology";
export { parse } from "@emsenn/language-topology";
export { load } from "@emsenn/language-algebra";
