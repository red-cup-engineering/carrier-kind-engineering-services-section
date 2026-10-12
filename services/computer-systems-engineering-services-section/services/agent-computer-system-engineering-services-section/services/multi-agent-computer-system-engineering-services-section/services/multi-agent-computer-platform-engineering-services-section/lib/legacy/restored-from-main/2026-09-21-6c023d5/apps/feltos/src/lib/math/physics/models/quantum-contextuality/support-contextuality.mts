/**
 * models/quantum-contextuality/support-contextuality - probabilistic support weld.
 *
 * This captures `Obsmetrologia.Relational.Quantum.SupportContextuality`: the
 * forgetful map from weighted empirical models to possibilistic support, and
 * the PR-box support's strong-contextuality witness.
 */

import {
  allContextsInhabited,
  empiricalModel,
  hasGlobalSection,
  stronglyContextual,
  type Model,
  type OutcomeAssignment,
  type PrMeasurement,
} from "./measurement-scenario.mts";
import {
  prBoxP,
  sameAssignmentOnContext,
  type PModel,
} from "./empirical-model.mts";

export interface ToSupportWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.supportContextuality.toSupport:witness";
  readonly probabilisticModel: PModel<Measurement, Outcome>;
  readonly supportModel: Model<Measurement, Outcome>;
  readonly leanDefinition: "Obsmetrologia.Relational.Quantum.toSupport";
}

export interface PrBoxPToSupportWitness {
  readonly kind: "relational.quantum.supportContextuality.prBoxP_toSupport:witness";
  readonly support: ToSupportWitness<PrMeasurement, boolean>;
  readonly inhabited: true;
  readonly noGlobalSection: true;
  readonly stronglyContextual: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Quantum.prBoxP_toSupport_inhabited",
    "Obsmetrologia.Relational.Quantum.prBoxP_toSupport_no_global",
    "Obsmetrologia.Relational.Quantum.prBoxP_support_strongly_contextual",
  ];
}

export interface SupportContextualityReceipt {
  readonly kind: "relational.quantum.supportContextuality.receipt:witness";
  readonly prSupport: PrBoxPToSupportWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Quantum.SupportContextuality";
}

export function toSupport<Measurement extends string, Outcome extends string | boolean | number>(
  model: PModel<Measurement, Outcome>,
): ToSupportWitness<Measurement, Outcome> {
  const supportModel = empiricalModel(model.scenario, model.outcomes, (context, assignment) =>
    model.dist(context).some((entry) =>
      entry.weight > 0 && sameAssignmentOnContext(context, entry.assignment, assignment as OutcomeAssignment<Measurement, Outcome>)));
  return Object.freeze({
    kind: "relational.quantum.supportContextuality.toSupport:witness" as const,
    probabilisticModel: model,
    supportModel,
    leanDefinition: "Obsmetrologia.Relational.Quantum.toSupport" as const,
  });
}

export function prBoxPToSupportStronglyContextual(): PrBoxPToSupportWitness {
  const support = toSupport(prBoxP());
  const inhabited = allContextsInhabited(support.supportModel);
  const global = hasGlobalSection(support.supportModel);
  const strong = stronglyContextual(support.supportModel);
  if (inhabited === undefined || global !== undefined || strong === undefined) {
    throw new TypeError("prBoxPToSupportStronglyContextual: support contextuality check failed");
  }
  return Object.freeze({
    kind: "relational.quantum.supportContextuality.prBoxP_toSupport:witness" as const,
    support,
    inhabited: true as const,
    noGlobalSection: true as const,
    stronglyContextual: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.prBoxP_toSupport_inhabited",
      "Obsmetrologia.Relational.Quantum.prBoxP_toSupport_no_global",
      "Obsmetrologia.Relational.Quantum.prBoxP_support_strongly_contextual",
    ] as const),
  });
}

export function supportContextualityReceipt(): SupportContextualityReceipt {
  return Object.freeze({
    kind: "relational.quantum.supportContextuality.receipt:witness" as const,
    prSupport: prBoxPToSupportStronglyContextual(),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.SupportContextuality" as const,
  });
}
