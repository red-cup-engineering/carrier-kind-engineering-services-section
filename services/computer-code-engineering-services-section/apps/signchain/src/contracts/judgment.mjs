/**
 * contracts/judgment — the computing stratum's semantic judgment as told evidence.
 *
 * The contract calculus reports outcomes as a polarity plus reasons; this module
 * tells that judgment as evidence (SignCell) and reads it with SignChain, so there
 * is one outcome algebra. The polarity states which sides are told:
 *
 * - witness       -> for            (for only) — the subject witnesses it
 * - obstruction   -> against        (against only) — the reasons witness against it
 * - partial       -> for and against (both sides)
 * - boundary-only -> neither        (no side) — interior evidence is not
 *   admissible through the phase's observability, so no evidence enters
 */
import { evidence, knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { truthMeetReading, truthTop } from "@red-cup-engineering/computer-data-services-section/four";

/** The structural face of a computing-stratum semantic judgment. */

/** The canonical judgment whose positive inhabitant is a Witness and whose
 * negative inhabitant is an Obstruction. This module is the sole owner of the
 * polarity; contracts and other consumers merely apply it. */

export function semanticJudgment(subject, missing, boundaryOnly = false) {
  const reasons = Object.freeze([...missing]);
  return Object.freeze({
    kind: "metroplat.semantic-judgment",
    subject,
    polarity: reasons.length === 0 ? "witness" : boundaryOnly ? "boundary-only" : "obstruction",
    reasons,
  });
}

export function semanticJudgmentWitnessed(judgment) {
  return judgment.polarity === "witness";
}

export function semanticJudgmentAspectWitnessed(judgment, aspect) {
  return !judgment.reasons.some((reason) => reason === aspect || reason.startsWith(`${aspect}:`));
}

export function fiberAspectWitnessed(aspects, subject) {
  const aspect = aspects.find((entry) => entry.subject === subject);
  return aspect !== undefined && aspect.polarity === "witness";
}

/** The sides each polarity tells: [for, against]. */
const sidesOfPolarity = Object.freeze({
  witness: [true, false],
  obstruction: [false, true],
  partial: [true, true],
  "boundary-only": [false, false],
});

/** The evidence a semantic judgment tells: its subject witnesses for, its reasons (else its subject) against. */
export function evidenceOfSemanticJudgment(judgment) {
  const [forTold, againstTold] = sidesOfPolarity[judgment.polarity];
  const against = judgment.reasons.length > 0 ? judgment.reasons : [judgment.subject];
  return evidence({ for: forTold ? [judgment.subject] : [], against: againstTold ? against : [] });
}

/**
 * The truth-order meet of a judgment fiber's readings — truth shrinks, falsity grows — the
 * lattice law boolean `&&` flattens. The empty fiber meets to the truth-order top (told for only):
 * vacuously witnessed.
 */
export function readingOfSemanticJudgmentFiber(aspects) {
  return aspects
    .map((aspect) => knowledgeReading(evidenceOfSemanticJudgment(aspect)))
    .reduce((left, right) => truthMeetReading(left, right), truthTop());
}
