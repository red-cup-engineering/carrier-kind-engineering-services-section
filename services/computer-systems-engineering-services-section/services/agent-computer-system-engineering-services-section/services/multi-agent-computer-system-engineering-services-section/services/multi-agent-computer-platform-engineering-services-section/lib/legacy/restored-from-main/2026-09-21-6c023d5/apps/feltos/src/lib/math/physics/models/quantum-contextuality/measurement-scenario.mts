/**
 * models/quantum-contextuality/measurement-scenario - finite possibilistic contextuality.
 *
 * This captures `Obsmetrologia.Relational.Quantum.MeasurementScenario`: finite
 * measurement covers, support-level empirical models, global sections,
 * deterministic non-contextuality, compatible families, and the PR-box strong
 * contextuality witness.
 */

export type OutcomeAssignment<Measurement extends string, Outcome extends string | boolean | number> =
  Readonly<Record<Measurement, Outcome>>;

export interface Scenario<Measurement extends string> {
  readonly kind: "relational.quantum.measurementScenario.scenario";
  readonly measurements: readonly Measurement[];
  readonly contexts: readonly (readonly Measurement[])[];
}

export interface Model<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.measurementScenario.model";
  readonly scenario: Scenario<Measurement>;
  readonly outcomes: readonly Outcome[];
  readonly support: (context: readonly Measurement[], assignment: OutcomeAssignment<Measurement, Outcome>) => boolean;
}

export interface HasGlobalSectionWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.measurementScenario.hasGlobalSection:witness";
  readonly model: Model<Measurement, Outcome>;
  readonly assignment: OutcomeAssignment<Measurement, Outcome>;
  readonly leanDefinition: "Obsmetrologia.Relational.Quantum.HasGlobalSection";
}

export interface AllContextsInhabitedWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.measurementScenario.allContextsInhabited:witness";
  readonly model: Model<Measurement, Outcome>;
  readonly localWitnesses: readonly OutcomeAssignment<Measurement, Outcome>[];
  readonly leanDefinition: "Obsmetrologia.Relational.Quantum.AllContextsInhabited";
}

export interface StronglyContextualWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.measurementScenario.stronglyContextual:witness";
  readonly inhabited: AllContextsInhabitedWitness<Measurement, Outcome>;
  readonly hasNoGlobalSection: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Quantum.stronglyContextual_iff";
}

export interface NoncontextualNotStronglyContextualWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.measurementScenario.noncontextual_not_stronglyContextual:witness";
  readonly globalSection: HasGlobalSectionWitness<Measurement, Outcome>;
  readonly excludesStrongContextuality: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Quantum.noncontextual_not_stronglyContextual";
}

export interface CompatibleFamilyWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.measurementScenario.compatibleFamily:witness";
  readonly scenario: Scenario<Measurement>;
  readonly family: readonly OutcomeAssignment<Measurement, Outcome>[];
  readonly compatible: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Quantum.CompatibleFamily";
}

export interface GlobalSectionRestrictsCompatibleWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.measurementScenario.globalSection_restricts_compatible:witness";
  readonly scenario: Scenario<Measurement>;
  readonly global: OutcomeAssignment<Measurement, Outcome>;
  readonly family: CompatibleFamilyWitness<Measurement, Outcome>;
  readonly leanTheorem: "Obsmetrologia.Relational.Quantum.globalSection_restricts_compatible";
}

export interface DeterministicNotStronglyContextualWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.measurementScenario.deterministic_not_stronglyContextual:witness";
  readonly model: Model<Measurement, Outcome>;
  readonly globalSection: HasGlobalSectionWitness<Measurement, Outcome>;
  readonly notStronglyContextual: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Quantum.deterministic_hasGlobalSection",
    "Obsmetrologia.Relational.Quantum.deterministic_not_stronglyContextual",
  ];
}

export type PrMeasurement = "a" | "aPrime" | "b" | "bPrime";

export interface PrBoxWitness {
  readonly kind: "relational.quantum.measurementScenario.prBox_strongly_contextual:witness";
  readonly scenario: Scenario<PrMeasurement>;
  readonly model: Model<PrMeasurement, boolean>;
  readonly inhabited: AllContextsInhabitedWitness<PrMeasurement, boolean>;
  readonly noGlobalSection: true;
  readonly stronglyContextual: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Quantum.prBox_inhabited",
    "Obsmetrologia.Relational.Quantum.prBox_no_global",
    "Obsmetrologia.Relational.Quantum.prBox_strongly_contextual",
  ];
}

export interface MeasurementScenarioReceipt {
  readonly kind: "relational.quantum.measurementScenario.receipt:witness";
  readonly globalSection: HasGlobalSectionWitness<PrMeasurement, boolean>;
  readonly globalInhabits: AllContextsInhabitedWitness<PrMeasurement, boolean>;
  readonly noncontextualExcludesStrong: NoncontextualNotStronglyContextualWitness<PrMeasurement, boolean>;
  readonly compatibleFamily: GlobalSectionRestrictsCompatibleWitness<PrMeasurement, boolean>;
  readonly deterministicBaseline: DeterministicNotStronglyContextualWitness<PrMeasurement, boolean>;
  readonly prBox: PrBoxWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Quantum.MeasurementScenario";
}

const normalizeMeasurements = <Measurement extends string>(
  measurements: readonly Measurement[],
  caller: string,
): readonly Measurement[] => {
  const normalized = Object.freeze([...new Set(measurements.map((item) => {
    const trimmed = item.trim();
    if (trimmed.length === 0) throw new TypeError(`${caller}: measurement names must be nonempty`);
    return trimmed as Measurement;
  }))]);
  if (normalized.length === 0) throw new TypeError(`${caller}: expected at least one measurement`);
  return normalized;
};

function normalizeAssignment<Measurement extends string, Outcome extends string | boolean | number>(
  measurements: readonly Measurement[],
  assignment: OutcomeAssignment<Measurement, Outcome>,
  caller: string,
): OutcomeAssignment<Measurement, Outcome> {
  return Object.freeze(Object.fromEntries(measurements.map((measurement) => {
    if (!Object.hasOwn(assignment, measurement)) throw new TypeError(`${caller}: missing outcome for ${measurement}`);
    return [measurement, assignment[measurement]];
  })) as Record<Measurement, Outcome>);
}

/** Every outcome assignment over the given measurements — the finite section space. */
export function assignments<Measurement extends string, Outcome extends string | boolean | number>(
  measurements: readonly Measurement[],
  outcomes: readonly Outcome[],
): readonly OutcomeAssignment<Measurement, Outcome>[] {
  if (measurements.length === 0) return Object.freeze([Object.freeze({}) as OutcomeAssignment<Measurement, Outcome>]);
  const [head, ...tail] = measurements;
  const tailAssignments = assignments(tail, outcomes);
  return Object.freeze(outcomes.flatMap((outcome) =>
    tailAssignments.map((tailAssignment) => Object.freeze({
      [head!]: outcome,
      ...tailAssignment,
    }) as OutcomeAssignment<Measurement, Outcome>)));
}

export function measurementScenario<Measurement extends string>(
  measurements: readonly Measurement[],
  contexts: readonly (readonly Measurement[])[],
): Scenario<Measurement> {
  const admittedMeasurements = normalizeMeasurements(measurements, "measurementScenario");
  if (contexts.length === 0) throw new TypeError("measurementScenario: expected at least one context");
  const known = new Set(admittedMeasurements);
  const admittedContexts = Object.freeze(contexts.map((context) => {
    const admitted = normalizeMeasurements(context, "measurementScenario.context");
    for (const measurement of admitted) {
      if (!known.has(measurement)) throw new TypeError(`measurementScenario: unknown measurement ${measurement}`);
    }
    return admitted;
  }));
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.scenario" as const,
    measurements: admittedMeasurements,
    contexts: admittedContexts,
  });
}

export function empiricalModel<Measurement extends string, Outcome extends string | boolean | number>(
  scenario: Scenario<Measurement>,
  outcomes: readonly Outcome[],
  support: (context: readonly Measurement[], assignment: OutcomeAssignment<Measurement, Outcome>) => boolean,
): Model<Measurement, Outcome> {
  if (outcomes.length === 0) throw new TypeError("empiricalModel: expected at least one outcome");
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.model" as const,
    scenario,
    outcomes: Object.freeze([...outcomes]),
    support,
  });
}

export function hasGlobalSection<Measurement extends string, Outcome extends string | boolean | number>(
  model: Model<Measurement, Outcome>,
): HasGlobalSectionWitness<Measurement, Outcome> | undefined {
  const found = assignments(model.scenario.measurements, model.outcomes).find((assignment) =>
    model.scenario.contexts.every((context) => model.support(context, assignment)));
  if (found === undefined) return undefined;
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.hasGlobalSection:witness" as const,
    model,
    assignment: found,
    leanDefinition: "Obsmetrologia.Relational.Quantum.HasGlobalSection" as const,
  });
}

export function allContextsInhabited<Measurement extends string, Outcome extends string | boolean | number>(
  model: Model<Measurement, Outcome>,
): AllContextsInhabitedWitness<Measurement, Outcome> | undefined {
  const all = assignments(model.scenario.measurements, model.outcomes);
  const localWitnesses: OutcomeAssignment<Measurement, Outcome>[] = [];
  for (const context of model.scenario.contexts) {
    const found = all.find((assignment) => model.support(context, assignment));
    if (found === undefined) return undefined;
    localWitnesses.push(found);
  }
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.allContextsInhabited:witness" as const,
    model,
    localWitnesses: Object.freeze(localWitnesses),
    leanDefinition: "Obsmetrologia.Relational.Quantum.AllContextsInhabited" as const,
  });
}

export function globalSectionInhabits<Measurement extends string, Outcome extends string | boolean | number>(
  globalSection: HasGlobalSectionWitness<Measurement, Outcome>,
): AllContextsInhabitedWitness<Measurement, Outcome> {
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.allContextsInhabited:witness" as const,
    model: globalSection.model,
    localWitnesses: Object.freeze(globalSection.model.scenario.contexts.map(() => globalSection.assignment)),
    leanDefinition: "Obsmetrologia.Relational.Quantum.AllContextsInhabited" as const,
  });
}

export function stronglyContextual<Measurement extends string, Outcome extends string | boolean | number>(
  model: Model<Measurement, Outcome>,
): StronglyContextualWitness<Measurement, Outcome> | undefined {
  const inhabited = allContextsInhabited(model);
  if (inhabited === undefined || hasGlobalSection(model) !== undefined) return undefined;
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.stronglyContextual:witness" as const,
    inhabited,
    hasNoGlobalSection: true as const,
    leanTheorem: "Obsmetrologia.Relational.Quantum.stronglyContextual_iff" as const,
  });
}

export function noncontextualNotStronglyContextual<Measurement extends string, Outcome extends string | boolean | number>(
  globalSection: HasGlobalSectionWitness<Measurement, Outcome>,
): NoncontextualNotStronglyContextualWitness<Measurement, Outcome> {
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.noncontextual_not_stronglyContextual:witness" as const,
    globalSection,
    excludesStrongContextuality: true as const,
    leanTheorem: "Obsmetrologia.Relational.Quantum.noncontextual_not_stronglyContextual" as const,
  });
}

export function compatibleFamily<Measurement extends string, Outcome extends string | boolean | number>(
  scenario: Scenario<Measurement>,
  family: readonly OutcomeAssignment<Measurement, Outcome>[],
): CompatibleFamilyWitness<Measurement, Outcome> {
  if (family.length !== scenario.contexts.length) throw new TypeError("compatibleFamily: expected one section per context");
  const compatible = scenario.contexts.every((context, i) =>
    scenario.contexts.every((otherContext, j) =>
      context.every((measurement) =>
        !otherContext.includes(measurement) || family[i]![measurement] === family[j]![measurement])));
  if (!compatible) throw new TypeError("compatibleFamily: family does not agree on context overlaps");
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.compatibleFamily:witness" as const,
    scenario,
    family: Object.freeze(family.map((assignment) => normalizeAssignment(scenario.measurements, assignment, "compatibleFamily"))),
    compatible: true as const,
    leanDefinition: "Obsmetrologia.Relational.Quantum.CompatibleFamily" as const,
  });
}

export function globalSectionRestrictsCompatible<Measurement extends string, Outcome extends string | boolean | number>(
  scenario: Scenario<Measurement>,
  global: OutcomeAssignment<Measurement, Outcome>,
): GlobalSectionRestrictsCompatibleWitness<Measurement, Outcome> {
  const admittedGlobal = normalizeAssignment(scenario.measurements, global, "globalSectionRestrictsCompatible");
  const family = compatibleFamily(scenario, scenario.contexts.map(() => admittedGlobal));
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.globalSection_restricts_compatible:witness" as const,
    scenario,
    global: admittedGlobal,
    family,
    leanTheorem: "Obsmetrologia.Relational.Quantum.globalSection_restricts_compatible" as const,
  });
}

export function deterministicModel<Measurement extends string, Outcome extends string | boolean | number>(
  scenario: Scenario<Measurement>,
  outcomes: readonly Outcome[],
  hidden: OutcomeAssignment<Measurement, Outcome>,
): Model<Measurement, Outcome> {
  const admittedHidden = normalizeAssignment(scenario.measurements, hidden, "deterministicModel");
  return empiricalModel(scenario, outcomes, (context, assignment) =>
    context.every((measurement) => assignment[measurement] === admittedHidden[measurement]));
}

export function deterministicNotStronglyContextual<Measurement extends string, Outcome extends string | boolean | number>(
  scenario: Scenario<Measurement>,
  outcomes: readonly Outcome[],
  hidden: OutcomeAssignment<Measurement, Outcome>,
): DeterministicNotStronglyContextualWitness<Measurement, Outcome> {
  const model = deterministicModel(scenario, outcomes, hidden);
  const globalSection = hasGlobalSection(model);
  if (globalSection === undefined) throw new TypeError("deterministicNotStronglyContextual: deterministic model had no global section");
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.deterministic_not_stronglyContextual:witness" as const,
    model,
    globalSection,
    notStronglyContextual: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.deterministic_hasGlobalSection",
      "Obsmetrologia.Relational.Quantum.deterministic_not_stronglyContextual",
    ] as const),
  });
}

export const prMeasurements = Object.freeze(["a", "aPrime", "b", "bPrime"] as const);

export function primed(measurement: PrMeasurement): boolean {
  return measurement === "aPrime" || measurement === "bPrime";
}

export function prScenario(): Scenario<PrMeasurement> {
  return measurementScenario(prMeasurements, [
    Object.freeze(["a", "b"] as const),
    Object.freeze(["a", "bPrime"] as const),
    Object.freeze(["aPrime", "b"] as const),
    Object.freeze(["aPrime", "bPrime"] as const),
  ]);
}

export function prAllowed(
  context: readonly PrMeasurement[],
  assignment: OutcomeAssignment<PrMeasurement, boolean>,
): boolean {
  if (context.length !== 2) return false;
  const [left, right] = context;
  return (assignment[left!] !== assignment[right!]) === (primed(left!) && primed(right!));
}

export function prBox(): Model<PrMeasurement, boolean> {
  return empiricalModel(prScenario(), Object.freeze([false, true]), prAllowed);
}

export function prBoxStronglyContextual(): PrBoxWitness {
  const model = prBox();
  const inhabited = allContextsInhabited(model);
  if (inhabited === undefined || hasGlobalSection(model) !== undefined) {
    throw new TypeError("prBoxStronglyContextual: PR box contextuality check failed");
  }
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.prBox_strongly_contextual:witness" as const,
    scenario: model.scenario,
    model,
    inhabited,
    noGlobalSection: true as const,
    stronglyContextual: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.prBox_inhabited",
      "Obsmetrologia.Relational.Quantum.prBox_no_global",
      "Obsmetrologia.Relational.Quantum.prBox_strongly_contextual",
    ] as const),
  });
}

export function measurementScenarioReceipt(): MeasurementScenarioReceipt {
  const scenario = prScenario();
  const hidden = Object.freeze({ a: false, aPrime: false, b: false, bPrime: false });
  const deterministic = deterministicNotStronglyContextual(scenario, Object.freeze([false, true]), hidden);
  const globalSection = deterministic.globalSection;
  return Object.freeze({
    kind: "relational.quantum.measurementScenario.receipt:witness" as const,
    globalSection,
    globalInhabits: globalSectionInhabits(globalSection),
    noncontextualExcludesStrong: noncontextualNotStronglyContextual(globalSection),
    compatibleFamily: globalSectionRestrictsCompatible(scenario, hidden),
    deterministicBaseline: deterministic,
    prBox: prBoxStronglyContextual(),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.MeasurementScenario" as const,
  });
}
