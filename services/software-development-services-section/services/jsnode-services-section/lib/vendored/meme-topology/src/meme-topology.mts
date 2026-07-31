import { articulate, utterance, Mark, type UtteranceCarrier } from "@emsenn/meme-algebra";
import { predicate } from "@emsenn/meme-algebra";
import { markCoincidenceHolds } from "@emsenn/meme-algebra";
import { posit, type Meme } from "./predication-fiber.mjs";
import { settlingFirstCohomology, type SettlingCarrier, type SettlingFirstCohomology } from "./predication-settling.mjs";
import { presheaf } from "./predication-valuation-sheaf.mjs";
import {
  knowledgeClosureSettling,
  knowledgeClosureTrace,
  sameValuation,
  type PredicationValuationClosureTraceCarrier,
} from "./predication-valuation-closure.mjs";
import { fixedPoints, type FixedPointCarrier } from "./predication-valuation-fixed-point.mjs";
import { theoryOfBase, typedTheoryProofCarrier, type TypedTheoryCarrier, type TypedTheoryProofCarrier } from "@emsenn/meme-logic";
import { fixedPointReadings, type MemeTopologyFixedPointReadings } from "./meme-topology-fixed-point-reading.mjs";

export interface MemeTopologyCarrier {
  readonly kind: "meme-topology.carrier";
  /** The givens: the utterance log this carrier was induced from. Utterances
   *  are the only admission — every charge, edge, and section is derived. */
  readonly witnesses: readonly UtteranceCarrier[];
  readonly fixedPoints: FixedPointCarrier;
  readonly fixedPointReadings: MemeTopologyFixedPointReadings;
  readonly settling: SettlingCarrier;
  readonly settlingFirstCohomology: SettlingFirstCohomology;
  readonly theory: TypedTheoryCarrier;
  readonly proofs: TypedTheoryProofCarrier;
}

export type SingleUtteranceInput = UtteranceCarrier | readonly [left: Mark, right: Mark];

export interface SingleSettlingCarrier {
  readonly kind: "meme-topology.singleSettling.carrier";
  readonly meme: Meme;
  readonly trace: PredicationValuationClosureTraceCarrier;
}

/** Term inputs at the value-level read facade: strings pass through `mark()`. */
export type TermInput = string | Mark;

export function normalizeUtterance(input: SingleUtteranceInput): UtteranceCarrier {
  if (typeof input === "object" && input !== null && "kind" in input && input.kind === "utterance.carrier") {
    return input;
  }
  const pair = input as readonly [Mark, Mark];
  if (!(pair[0] instanceof Mark) || !(pair[1] instanceof Mark)) {
    throw new TypeError("normalizeUtterance: expected an utterance carrier or a [left mark, right mark] pair");
  }
  return utterance(pair[0], pair[1]);
}

/** The descent, folded: articulate every utterance, predicate the union into
 *  the relational sites, posit the measured valuation, and settle it into one
 *  frozen carrier. Evidence enters here and only here — there is no verb that
 *  admits a charge, a polarity, or an edge directly. A token whose mark value
 *  is a `{ subject, object }` pair articulates a relational cell; any other
 *  token articulates the diagonal cell. */
export function induce(utterances: readonly SingleUtteranceInput[]): MemeTopologyCarrier {
  const log = utterances.map(normalizeUtterance);
  const predicated = predicate(log.map((carrier) => articulate(carrier)));
  const p = presheaf(posit(predicated));
  const fixed = fixedPoints(p);
  const settling = knowledgeClosureSettling(p);
  const theory = theoryOfBase(predicated.base);
  return Object.freeze({
    kind: "meme-topology.carrier" as const,
    witnesses: Object.freeze(log),
    fixedPoints: fixed,
    fixedPointReadings: fixedPointReadings(fixed),
    settling,
    settlingFirstCohomology: settlingFirstCohomology(settling),
    theory,
    proofs: typedTheoryProofCarrier(theory),
  });
}

/** Evidence is monotone: `extend(induce(a), b)` agrees with `induce([...a, ...b])`. */
export function extend(carrier: MemeTopologyCarrier, delta: readonly SingleUtteranceInput[]): MemeTopologyCarrier {
  if (typeof carrier !== "object" || carrier === null || carrier.kind !== "meme-topology.carrier") {
    throw new TypeError("extend: expected a meme-topology carrier");
  }
  return induce([...carrier.witnesses, ...delta]);
}

const sameUtterance = (left: UtteranceCarrier, right: UtteranceCarrier): boolean =>
  markCoincidenceHolds(left.token.mark, right.token.mark)
  && markCoincidenceHolds(left.claim.mark, right.claim.mark);

/** Mathematical parity of two carriers: same utterance log and same four
 *  fixed points. Carriers hold per-instance lattice and endomorphism closures,
 *  so reference-level deep equality can never hold between separately induced
 *  carriers — parity is adjudicated on content, never on identity. */
export function sameMemeTopology(left: MemeTopologyCarrier, right: MemeTopologyCarrier): boolean {
  if (left.kind !== "meme-topology.carrier" || right.kind !== "meme-topology.carrier") return false;
  if (left.witnesses.length !== right.witnesses.length) return false;
  if (!left.witnesses.every((witness, index) => sameUtterance(witness, right.witnesses[index]!))) return false;
  return (["knowledge", "truth"] as const).every((order) => (["least", "greatest"] as const).every((bound) => {
    const leftExtremum = left.fixedPoints[order][bound];
    const rightExtremum = right.fixedPoints[order][bound];
    return leftExtremum.fixedPoint.kind === rightExtremum.fixedPoint.kind
      && sameValuation(leftExtremum.fixedPoint.value, rightExtremum.fixedPoint.value);
  }));
}

export function singleUtteranceTopology(left: Mark, right: Mark): MemeTopologyCarrier {
  return induce([[left, right]]);
}

export function knowledgeLeastMemeOfSingleUtterance(input: SingleUtteranceInput): Meme {
  const carrier = normalizeUtterance(input);
  const topology = singleUtteranceTopology(carrier.token.mark, carrier.claim.mark);
  return topology.fixedPointReadings.knowledgeLeast.extremum.sheaf.section.fibers[0]!.assignments[0]!;
}

export function settleOneTraced(input: SingleUtteranceInput): SingleSettlingCarrier {
  const carrier = normalizeUtterance(input);
  const predicated = predicate([articulate(carrier)]);
  const trace = knowledgeClosureTrace(presheaf(posit(predicated)));
  return Object.freeze({
    kind: "meme-topology.singleSettling.carrier" as const,
    meme: trace.sheaf.section.fibers[0]!.assignments[0]!,
    trace,
  });
}
