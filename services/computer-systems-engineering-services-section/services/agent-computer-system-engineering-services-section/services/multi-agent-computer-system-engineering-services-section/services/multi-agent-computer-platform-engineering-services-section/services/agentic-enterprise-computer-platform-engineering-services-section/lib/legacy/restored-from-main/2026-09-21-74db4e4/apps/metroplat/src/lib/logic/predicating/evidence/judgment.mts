/**
 * positing/judgment — the computing stratum's semantic judgment as a FOUR
 * charge read.
 *
 * The contract calculus reports outcomes as `SemanticJudgment` (polarity plus
 * reasons); this module transports that judgment onto the existing bilattice
 * `ChargeValue` algebra instead of letting two outcome algebras drift in
 * parallel. The parameter is structural — polarity and reasons — so the
 * calculus stratum stays import-free and this stratum does not depend on it.
 *
 * The mapping is by bilattice coordinates ([truth, falsity]), not by label
 * intuition — so the polarity table below states coordinates directly and the
 * charge NAME is derived from them via `chargeValueAt`, never hardcoded:
 *
 * - witness       -> ⟨present, absent⟩ (`potential`)    — truth-side evidence only
 * - obstruction   -> ⟨absent, present⟩ (`active`)    — falsity-side evidence only
 * - partial       -> ⟨present, present⟩ (`stable`) — evidence both ways, potential
 * - boundary-only -> ⟨absent, absent⟩ (`absurd`)  — interior evidence is not
 *   admissible through the phase's observability, so no evidence enters
 *
 * Evidence marks are placed only on sides whose coordinate is present: the
 * subject witnesses the truth side, the reasons witness the falsity side.
 *
 * @example
 * ```ts
 * valueOf(chargeOfSemanticJudgment({ subject: "c", polarity: "witness", reasons: [] })).name
 * // "potential"
 * ```
 *
 * @packageDocumentation
 */
import { mark, type Mark } from "@red-cup-engineering/computer-data-engine/utterance";
import { charge, chargeSide, chargeValue, chargeValueAt, meetTruth, type Charge } from "@red-cup-engineering/computer-data-engine/bilattice-charge";

/** The structural face of a computing-stratum semantic judgment. */
export interface SemanticJudgmentShape {
  readonly subject: string;
  readonly polarity: "witness" | "obstruction" | "partial" | "boundary-only";
  readonly reasons: readonly string[];
}

/** The canonical judgment whose positive inhabitant is a Witness and whose
 * negative inhabitant is an Obstruction. This module is the sole owner of the
 * polarity; contracts and other consumers merely apply it. */
export type SemanticJudgmentPolarity = SemanticJudgmentShape["polarity"];

export interface SemanticJudgment extends SemanticJudgmentShape {
  readonly kind: "metroplat.semantic-judgment";
}

export function semanticJudgment(subject: string, missing: readonly string[], boundaryOnly = false): SemanticJudgment {
  const reasons = Object.freeze([...missing]);
  return Object.freeze({
    kind: "metroplat.semantic-judgment" as const,
    subject,
    polarity: reasons.length === 0 ? "witness" as const : boundaryOnly ? "boundary-only" as const : "obstruction" as const,
    reasons,
  });
}

export function semanticJudgmentWitnessed(judgment: SemanticJudgmentShape): boolean {
  return judgment.polarity === "witness";
}

export function semanticJudgmentAspectWitnessed(judgment: SemanticJudgmentShape, aspect: string): boolean {
  return !judgment.reasons.some((reason) => reason === aspect || reason.startsWith(`${aspect}:`));
}

export function fiberAspectWitnessed(aspects: readonly SemanticJudgmentShape[], subject: string): boolean {
  const aspect = aspects.find((entry) => entry.subject === subject);
  return aspect !== undefined && aspect.polarity === "witness";
}

/** The invariant coordinates each polarity carries — never a hardcoded charge name. */
const coordinatesOfPolarity: { readonly [polarity in SemanticJudgmentShape["polarity"]]: readonly [truthPresent: boolean, falsityPresent: boolean] } = Object.freeze({
  witness: [true, false],
  obstruction: [false, true],
  partial: [true, true],
  "boundary-only": [false, false],
});

/** Transport one semantic judgment onto a bilattice charge. */
export function chargeOfSemanticJudgment(judgment: SemanticJudgmentShape): Charge {
  const [truthPresent, falsityPresent] = coordinatesOfPolarity[judgment.polarity];
  const name = chargeValueAt([chargeSide(truthPresent ? "present" : "absent"), chargeSide(falsityPresent ? "present" : "absent")]).name;
  return charge(chargeValue(name));
}

/**
 * The truth-order meet of a judgment fiber's transported charges.
 *
 * A report's per-aspect judgments transport to charges and aggregate by
 * `meetTruth` — truth shrinks, falsity grows, evidence merges — which is the
 * lattice law that boolean `&&` was flattening. The empty fiber meets to
 * `potential`, the truth-order top: vacuously witnessed.
 */
export function chargeOfSemanticJudgmentFiber(aspects: readonly SemanticJudgmentShape[]): Charge {
  return aspects
    .map(chargeOfSemanticJudgment)
    .reduce((left, right) => meetTruth(left, right), charge(chargeValue("potential")));
}
