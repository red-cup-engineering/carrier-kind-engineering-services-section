/**
 * prehending - the constitutive grasp at animating's becoming boundary.
 *
 * A prehension is not a task or an office act. It is the animating-side admission
 * of "this subject grasps that datum under this subjective form" into relating:
 * a predication cell, the utterance that admits it, and the articulation opened
 * from that utterance. Boundary callers provide Mark payloads; this module
 * reconstructs the relating carriers as the lawful form.
 */
import { evaluateRunTerm } from "@red-cup-engineering/signcraft/primitives";
import { arrayTerm, objectTerm, stringTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { prehensionCarrier, prehensionRequestCarrier } from "./carriers.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

export const prehensionSubjectiveForms =
  Object.freeze({
    physical: "animating.agent.prehension.physical",
    conceptual: "animating.agent.prehension.conceptual",
    negative: "animating.agent.prehension.negative",
  });

/** Boundary admission for the prehend action. */
export function admitPrehensionRequest(input, verb) {
  return prehensionRequestCarrier.assert(input, verb);
}

/**
 * Constitute a prehension from Mark payloads: subject and datum become
 * predication terms, subjectiveForm becomes the predicate claim, and the
 * resulting cell is admitted as one utterance/articulation.
 */
export function prehend(request) {
  return prehensionCarrier.assert(evaluateRunTerm(prehendTerm, jsonResource(request)), "prehend");
}

/** One utterance hand as a term: its carrier kind and hand, holding the Mark of its datum (SignCell's one utterance). */
const handTerm = (kind, hand, datum) => objectTerm([
  ["kind", stringTerm(kind)], ["hand", stringTerm(hand)],
  ["mark", objectTerm([["kind", stringTerm("utterance.mark")], ["value", datum]])],
]);

export const prehendTerm = (() => {
  const input = tm.var(0);
  const subjectPayload = tm.field("subject", input);
  const datumPayload = tm.field("datum", input);
  const subjectiveFormPayload = tm.field("subjectiveForm", input);
  const subject = subjectPayload;
  const datum = datumPayload;
  const subjectiveForm = subjectiveFormPayload;
  const utterance = objectTerm([
    ["kind", stringTerm("utterance.carrier")],
    ["token", handTerm("utterance.token", "left", subject)],
    ["claim", handTerm("utterance.claim", "right", subjectiveForm)],
  ]);
  const prehensionCell = objectTerm([["subject", subject], ["predicate", subjectiveForm], ["object", datum]]);
  // Articulating the utterance: its reflexive cell, told for by its own token.
  const articulation = objectTerm([
    ["subject", subject], ["predicate", subjectiveForm], ["object", subject],
    ["for", arrayTerm([subject])], ["against", arrayTerm([])],
  ]);

  return tm.lam(objectTerm([
    ["kind", stringTerm("animating.agent.prehension")],
    ["subject", subject],
    ["datum", datum],
    ["subjectiveForm", subjectiveForm],
    ["cell", prehensionCell],
    ["utterance", utterance],
    ["articulation", articulation],
    ["cells", arrayTerm([prehensionCell])],
    ["utterances", arrayTerm([utterance])],
  ]));
})();
