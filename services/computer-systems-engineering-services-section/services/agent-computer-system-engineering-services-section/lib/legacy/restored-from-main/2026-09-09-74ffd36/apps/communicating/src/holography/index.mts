/**
 * holography — projections from a communicating whole into readable layers.
 *
 * Holography is the representation boundary, not a codec. It does not encode a
 * carrier for transport; it reads the communicative whole through layer
 * projections whose parts remain accountable to the whole parse.
 */
import type { LambekForestProof, ParseForest, ParseResult, CohomologyResult } from "../speaking/listening/parsing/index.mjs";
import { admitCommunication, lambekProofOfForest, parseCommunicationForest } from "../speaking/listening/parsing/index.mjs";
import { cohomology } from "../speaking/listening/parsing/cohomology.mjs";
import type { CompiledBundle } from "../speaking/listening/algebra/index.mjs";
import { grammaticality } from "../speaking/listening/judging/grammaticality/index.mjs";
import type { GrammaticalityResult } from "../speaking/listening/judging/grammaticality/index.mjs";
import { discourseInformationOfState, discourseStateOfForest, roles, resolveReferences } from "../speaking/listening/understanding/index.mjs";
import type { DiscourseInformation, DiscourseState, SemanticFrame, ReferenceResult } from "../speaking/listening/understanding/index.mjs";
import { projectReading } from "@lenticule-science/communicating/holography";
export { projectReading };

/** A full report over one sentence: the settled parse and every layer's reading. */
export interface Reading {
  readonly text: string;
  readonly forest: ParseForest;
  readonly lambek: LambekForestProof;
  readonly discourse: DiscourseState;
  readonly discourseInformation: DiscourseInformation;
  readonly parse: ParseResult;
  readonly roles: readonly SemanticFrame[];
  readonly grammaticality: GrammaticalityResult;
  readonly cohomology: CohomologyResult;
  readonly reference: ReferenceResult;
}

/** Articulate text, take its first sentence, and settle it through the engine. */
export function settle(text: string, bundle: CompiledBundle): ParseForest {
  return parseCommunicationForest(admitCommunication(text), bundle);
}

/** Read a sentence at every layer at once — the headline endomorphism. */
export function read(text: string, bundle: CompiledBundle): Reading {
  const forest = settle(text, bundle);
  const lambek = lambekProofOfForest(forest);
  const discourse = discourseStateOfForest(forest, lambek);
  const parsed = forest.readings[0]?.parse ?? {
    words: [],
    arcs: [],
    answers: [],
    compositions: [],
    tower: { folds: 0, fixedPoint: true, sizes: [] },
    conflicts: [],
    voids: [],
  };
  return {
    text,
    forest,
    lambek,
    discourse,
    discourseInformation: discourseInformationOfState(discourse),
    parse: parsed,
    roles: roles(parsed),
    grammaticality: grammaticality(parsed),
    cohomology: cohomology(parsed),
    reference: resolveReferences(parsed),
  };
}


