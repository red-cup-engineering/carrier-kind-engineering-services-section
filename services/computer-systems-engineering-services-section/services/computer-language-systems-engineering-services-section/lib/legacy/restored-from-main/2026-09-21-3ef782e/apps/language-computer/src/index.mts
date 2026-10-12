/**
 * @emsenn/language-computer — the app form over the language-* math layers.
 *
 * The libraries are pure math, split by layer (algebra, topology, geometry,
 * logic, analysis, codecs) and by fiber (english-language-algebra, …). This app
 * binds them into one surface: give it text and a fiber, and it articulates,
 * settles, analyzes, judges, and measures — the whole pipeline read forwards
 * (understanding) and, via realization, backwards (generation).
 */
import { articulate, parse, cohomology } from "@emsenn/language-topology";
import type { ParseResult, CohomologyResult } from "@emsenn/language-topology";
import type { CompiledBundle } from "@emsenn/language-algebra";
import { grammaticality } from "@emsenn/language-logic";
import type { GrammaticalityResult } from "@emsenn/language-logic";
import { roles, refer } from "@emsenn/language-analysis";
import type { SemanticFrame, ReferenceResult } from "@emsenn/language-analysis";
import { similarity } from "@emsenn/language-geometry";
import { lint } from "@emsenn/language-conformance-topology";
import type { Verdict } from "@emsenn/language-conformance-topology";
import { generate } from "@emsenn/english-language-codecs";
import type { RoleFrame } from "@emsenn/english-language-codecs";
import english from "@emsenn/english-language-algebra";

/** A full report over one sentence: the settled parse and every layer's reading. */
export interface Reading {
  readonly text: string;
  readonly parse: ParseResult;
  readonly roles: readonly SemanticFrame[];
  readonly grammaticality: GrammaticalityResult;
  readonly cohomology: CohomologyResult;
  readonly reference: ReferenceResult;
}

/** Articulate text, take its first sentence, and settle it through the engine. */
export function settle(text: string, bundle: CompiledBundle = english): ParseResult {
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  return parse(sentence, base, bundle);
}

/** Read a sentence at every layer at once. */
export function read(text: string, bundle: CompiledBundle = english): Reading {
  const parsed = settle(text, bundle);
  return {
    text,
    parse: parsed,
    roles: roles(parsed),
    grammaticality: grammaticality(parsed),
    cohomology: cohomology(parsed),
    reference: refer(parsed),
  };
}

/** Inspectable ontology similarity between two words (null when off-graph). */
export { similarity };

/** Prose conformance: lint text against the language-conformance rules. */
export function check(text: string): Verdict {
  return lint(text);
}
export { lint };

/** Generation: realize prose from role frames (the engine read backwards). */
export function say(frames: readonly RoleFrame[], opts?: { tense?: "past" | "present" | "future" }): string {
  return generate(frames, opts);
}
export { generate };
export type { Verdict, RoleFrame };

/** The default English fiber, ready to pass to settle/read. */
export { english };
