/**
 * models/quantum-contextuality/contextual-obstruction - logical contextuality hierarchy.
 *
 * This captures `Obsmetrologia.Relational.Quantum.ContextualObstruction`:
 * extension of local sections, logical contextuality, possibilistic
 * noncontextuality, strong-to-logical contextuality, and the PR-box rung.
 */

import {
  assignments,
  prBox,
  stronglyContextual,
  type Model,
  type OutcomeAssignment,
  type StronglyContextualWitness,
} from "./measurement-scenario.mts";

export interface ExtendsWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.contextualObstruction.extends:witness";
  readonly model: Model<Measurement, Outcome>;
  readonly context: readonly Measurement[];
  readonly localSection: OutcomeAssignment<Measurement, Outcome>;
  readonly globalSection: OutcomeAssignment<Measurement, Outcome>;
  readonly agreesOnContext: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Quantum.Extends";
}

export interface LogicallyContextualWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.contextualObstruction.logicallyContextual:witness";
  readonly model: Model<Measurement, Outcome>;
  readonly context: readonly Measurement[];
  readonly localSection: OutcomeAssignment<Measurement, Outcome>;
  readonly supportedLocally: true;
  readonly extendsToNoGlobalSection: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Quantum.LogicallyContextual";
}

export interface PossibilisticallyNoncontextualWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.contextualObstruction.possibilisticallyNoncontextual:witness";
  readonly model: Model<Measurement, Outcome>;
  readonly extensions: readonly ExtendsWitness<Measurement, Outcome>[];
  readonly everyLocalSectionExtends: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Quantum.PossibilisticallyNoncontextual";
}

export interface NoncontextualImpNotLogicalWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.contextualObstruction.noncontextual_imp_not_logicallyContextual:witness";
  readonly noncontextual: PossibilisticallyNoncontextualWitness<Measurement, Outcome>;
  readonly notLogicallyContextual: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Quantum.noncontextual_imp_not_logicallyContextual";
}

export interface StrongImpLogicalWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.contextualObstruction.stronglyContextual_imp_logicallyContextual:witness";
  readonly strong: StronglyContextualWitness<Measurement, Outcome>;
  readonly logical: LogicallyContextualWitness<Measurement, Outcome>;
  readonly leanTheorem: "Obsmetrologia.Relational.Quantum.stronglyContextual_imp_logicallyContextual";
}

export interface PrBoxLogicalContextualWitness {
  readonly kind: "relational.quantum.contextualObstruction.prBox_logicallyContextual:witness";
  readonly logical: LogicallyContextualWitness<"a" | "aPrime" | "b" | "bPrime", boolean>;
  readonly leanTheorem: "Obsmetrologia.Relational.Quantum.prBox_logicallyContextual";
}

export interface ContextualObstructionReceipt {
  readonly kind: "relational.quantum.contextualObstruction.receipt:witness";
  readonly prBoxLogical: PrBoxLogicalContextualWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Quantum.ContextualObstruction";
}

function agreesOnContext<Measurement extends string, Outcome extends string | boolean | number>(
  context: readonly Measurement[],
  left: OutcomeAssignment<Measurement, Outcome>,
  right: OutcomeAssignment<Measurement, Outcome>,
): boolean {
  return context.every((measurement) => left[measurement] === right[measurement]);
}

export function extendsLocalSection<Measurement extends string, Outcome extends string | boolean | number>(
  model: Model<Measurement, Outcome>,
  context: readonly Measurement[],
  localSection: OutcomeAssignment<Measurement, Outcome>,
): ExtendsWitness<Measurement, Outcome> | undefined {
  const global = assignments(model.scenario.measurements, model.outcomes).find((candidate) =>
    agreesOnContext(context, candidate, localSection)
      && model.scenario.contexts.every((candidateContext) => model.support(candidateContext, candidate)));
  if (global === undefined) return undefined;
  return Object.freeze({
    kind: "relational.quantum.contextualObstruction.extends:witness" as const,
    model,
    context,
    localSection,
    globalSection: global,
    agreesOnContext: true as const,
    leanDefinition: "Obsmetrologia.Relational.Quantum.Extends" as const,
  });
}

export function logicallyContextual<Measurement extends string, Outcome extends string | boolean | number>(
  model: Model<Measurement, Outcome>,
): LogicallyContextualWitness<Measurement, Outcome> | undefined {
  const all = assignments(model.scenario.measurements, model.outcomes);
  for (const context of model.scenario.contexts) {
    for (const localSection of all) {
      if (!model.support(context, localSection)) continue;
      if (extendsLocalSection(model, context, localSection) !== undefined) continue;
      return Object.freeze({
        kind: "relational.quantum.contextualObstruction.logicallyContextual:witness" as const,
        model,
        context,
        localSection,
        supportedLocally: true as const,
        extendsToNoGlobalSection: true as const,
        leanDefinition: "Obsmetrologia.Relational.Quantum.LogicallyContextual" as const,
      });
    }
  }
  return undefined;
}

export function possibilisticallyNoncontextual<Measurement extends string, Outcome extends string | boolean | number>(
  model: Model<Measurement, Outcome>,
): PossibilisticallyNoncontextualWitness<Measurement, Outcome> | undefined {
  const all = assignments(model.scenario.measurements, model.outcomes);
  const extensions: ExtendsWitness<Measurement, Outcome>[] = [];
  for (const context of model.scenario.contexts) {
    for (const localSection of all) {
      if (!model.support(context, localSection)) continue;
      const extension = extendsLocalSection(model, context, localSection);
      if (extension === undefined) return undefined;
      extensions.push(extension);
    }
  }
  return Object.freeze({
    kind: "relational.quantum.contextualObstruction.possibilisticallyNoncontextual:witness" as const,
    model,
    extensions: Object.freeze(extensions),
    everyLocalSectionExtends: true as const,
    leanDefinition: "Obsmetrologia.Relational.Quantum.PossibilisticallyNoncontextual" as const,
  });
}

export function noncontextualImpNotLogicallyContextual<Measurement extends string, Outcome extends string | boolean | number>(
  noncontextual: PossibilisticallyNoncontextualWitness<Measurement, Outcome>,
): NoncontextualImpNotLogicalWitness<Measurement, Outcome> {
  return Object.freeze({
    kind: "relational.quantum.contextualObstruction.noncontextual_imp_not_logicallyContextual:witness" as const,
    noncontextual,
    notLogicallyContextual: true as const,
    leanTheorem: "Obsmetrologia.Relational.Quantum.noncontextual_imp_not_logicallyContextual" as const,
  });
}

export function stronglyContextualImpLogicallyContextual<Measurement extends string, Outcome extends string | boolean | number>(
  strong: StronglyContextualWitness<Measurement, Outcome>,
): StrongImpLogicalWitness<Measurement, Outcome> {
  const logical = logicallyContextual(strong.inhabited.model);
  if (logical === undefined) throw new TypeError("stronglyContextualImpLogicallyContextual: strong model had no logical witness");
  return Object.freeze({
    kind: "relational.quantum.contextualObstruction.stronglyContextual_imp_logicallyContextual:witness" as const,
    strong,
    logical,
    leanTheorem: "Obsmetrologia.Relational.Quantum.stronglyContextual_imp_logicallyContextual" as const,
  });
}

export function prBoxLogicallyContextual(): PrBoxLogicalContextualWitness {
  const strong = stronglyContextual(prBox());
  if (strong === undefined) throw new TypeError("prBoxLogicallyContextual: PR box was not strongly contextual");
  return Object.freeze({
    kind: "relational.quantum.contextualObstruction.prBox_logicallyContextual:witness" as const,
    logical: stronglyContextualImpLogicallyContextual(strong).logical,
    leanTheorem: "Obsmetrologia.Relational.Quantum.prBox_logicallyContextual" as const,
  });
}

export function contextualObstructionReceipt(): ContextualObstructionReceipt {
  return Object.freeze({
    kind: "relational.quantum.contextualObstruction.receipt:witness" as const,
    prBoxLogical: prBoxLogicallyContextual(),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.ContextualObstruction" as const,
  });
}
