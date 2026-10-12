/**
 * models/kinetic-theory/molecular-chaos-gluing - finite molecular-chaos obstruction.
 *
 * This is the MetroPlat realization of
 * `Obsmetrologia.Relational.Kinetic.MolecularChaosGluing`: finite integer
 * two-particle joints, separated gluing, connected-correlation minors, and the
 * concrete EPR obstruction to factorization.
 */

export type SingleParticleSection<State extends string> = Readonly<Record<State, number>>;

export interface JointEntry<State extends string> {
  readonly left: State;
  readonly right: State;
  readonly value: number;
}

export interface JointDistribution<State extends string> {
  readonly kind: "relational.kinetic.joint";
  readonly states: readonly State[];
  readonly entries: readonly JointEntry<State>[];
}

export interface FactorizesWitness<State extends string> {
  readonly kind: "relational.kinetic.factorizes:witness";
  readonly joint: JointDistribution<State>;
  readonly leftSection: SingleParticleSection<State>;
  readonly rightSection: SingleParticleSection<State>;
  readonly factorizes: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Kinetic.Factorizes";
}

export interface DecorrelatedWitness<State extends string> {
  readonly kind: "relational.kinetic.decorrelated:witness";
  readonly joint: JointDistribution<State>;
  readonly allCorrelationMinorsVanish: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Kinetic.Decorrelated";
}

export interface GlueFactorizesWitness<State extends string> {
  readonly kind: "relational.kinetic.glue_factorizes:witness";
  readonly joint: JointDistribution<State>;
  readonly leftSection: SingleParticleSection<State>;
  readonly rightSection: SingleParticleSection<State>;
  readonly factorizes: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Kinetic.Factorizes";
  readonly leanTheorem: "Obsmetrologia.Relational.Kinetic.glue_factorizes";
}

export type AnyFactorizesWitness<State extends string> =
  | FactorizesWitness<State>
  | GlueFactorizesWitness<State>;

export interface FactorizesImpDecorrelatedWitness<State extends string> {
  readonly kind: "relational.kinetic.factorizes_imp_decorrelated:witness";
  readonly factorization: AnyFactorizesWitness<State>;
  readonly decorrelated: DecorrelatedWitness<State>;
  readonly leanTheorem: "Obsmetrologia.Relational.Kinetic.factorizes_imp_decorrelated";
}

export interface CorrelationSwapWitness<State extends string> {
  readonly kind: "relational.kinetic.corr_swap_particles:witness";
  readonly joint: JointDistribution<State>;
  readonly a: State;
  readonly b: State;
  readonly c: State;
  readonly d: State;
  readonly corr: number;
  readonly swapped: number;
  readonly antisymmetric: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Kinetic.corr_swap_particles";
}

export interface EprCorrelationWitness {
  readonly kind: "relational.kinetic.epr_corr_one:witness";
  readonly joint: JointDistribution<"0" | "1">;
  readonly corr: 1;
  readonly leanTheorem: "Obsmetrologia.Relational.Kinetic.epr_corr_one";
}

export interface EprNotFactorizesWitness {
  readonly kind: "relational.kinetic.epr_not_factorizes:witness";
  readonly joint: JointDistribution<"0" | "1">;
  readonly obstruction: EprCorrelationWitness;
  readonly notFactorizes: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Kinetic.epr_not_factorizes";
}

export interface MolecularChaosGluingReceipt {
  readonly kind: "relational.kinetic.molecularChaosGluing.receipt:witness";
  readonly glueFactorizes: GlueFactorizesWitness<"0" | "1">;
  readonly factorizedIsDecorrelated: FactorizesImpDecorrelatedWitness<"0" | "1">;
  readonly corrSwap: CorrelationSwapWitness<"0" | "1">;
  readonly eprCorrelation: EprCorrelationWitness;
  readonly eprNotFactorizes: EprNotFactorizesWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Kinetic.MolecularChaosGluing";
}

const assertInt = (value: number, caller: string): number => {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${caller}: expected a safe integer`);
  return value;
};

function normalizeStates<State extends string>(states: readonly State[], caller: string): readonly State[] {
  const normalized = Object.freeze([...new Set(states.map((state) => {
    const trimmed = state.trim();
    if (trimmed.length === 0) throw new TypeError(`${caller}: states must be nonempty strings`);
    return trimmed as State;
  }))]);
  if (normalized.length === 0) throw new TypeError(`${caller}: expected at least one finite state`);
  return normalized;
}

function normalizeSection<State extends string>(
  states: readonly State[],
  section: SingleParticleSection<State>,
  caller: string,
): SingleParticleSection<State> {
  return Object.freeze(Object.fromEntries(states.map((state) => {
    if (!Object.hasOwn(section, state)) throw new TypeError(`${caller}: missing section value for ${state}`);
    return [state, assertInt(section[state], caller)];
  })) as Record<State, number>);
}

export function jointDistribution<State extends string>(
  states: readonly State[],
  valueAt: (left: State, right: State) => number,
): JointDistribution<State> {
  const admittedStates = normalizeStates(states, "jointDistribution");
  const entries = Object.freeze(admittedStates.flatMap((left) =>
    admittedStates.map((right) => Object.freeze({
      left,
      right,
      value: assertInt(valueAt(left, right), "jointDistribution"),
    }))));
  return Object.freeze({
    kind: "relational.kinetic.joint" as const,
    states: admittedStates,
    entries,
  });
}

export function jointValue<State extends string>(
  joint: JointDistribution<State>,
  left: State,
  right: State,
): number {
  const entry = joint.entries.find((candidate) => candidate.left === left && candidate.right === right);
  if (entry === undefined) throw new TypeError(`jointValue: missing joint entry ${left},${right}`);
  return entry.value;
}

export function glue<State extends string>(
  states: readonly State[],
  leftSection: SingleParticleSection<State>,
  rightSection: SingleParticleSection<State>,
): JointDistribution<State> {
  const admittedStates = normalizeStates(states, "glue");
  const left = normalizeSection(admittedStates, leftSection, "glue");
  const right = normalizeSection(admittedStates, rightSection, "glue");
  return jointDistribution(admittedStates, (v, w) => left[v] * right[w]);
}

export function factorizes<State extends string>(
  joint: JointDistribution<State>,
  leftSection: SingleParticleSection<State>,
  rightSection: SingleParticleSection<State>,
): FactorizesWitness<State> | undefined {
  const left = normalizeSection(joint.states, leftSection, "factorizes");
  const right = normalizeSection(joint.states, rightSection, "factorizes");
  const ok = joint.states.every((v) => joint.states.every((w) => jointValue(joint, v, w) === left[v] * right[w]));
  if (!ok) return undefined;
  return Object.freeze({
    kind: "relational.kinetic.factorizes:witness" as const,
    joint,
    leftSection: left,
    rightSection: right,
    factorizes: true as const,
    leanDefinition: "Obsmetrologia.Relational.Kinetic.Factorizes" as const,
  });
}

export function corr<State extends string>(
  joint: JointDistribution<State>,
  a: State,
  b: State,
  c: State,
  d: State,
): number {
  return assertInt(
    jointValue(joint, a, c) * jointValue(joint, b, d) - jointValue(joint, a, d) * jointValue(joint, b, c),
    "corr",
  );
}

export function decorrelated<State extends string>(
  joint: JointDistribution<State>,
): DecorrelatedWitness<State> | undefined {
  const ok = joint.states.every((a) => joint.states.every((b) =>
    joint.states.every((c) => joint.states.every((d) => corr(joint, a, b, c, d) === 0))));
  if (!ok) return undefined;
  return Object.freeze({
    kind: "relational.kinetic.decorrelated:witness" as const,
    joint,
    allCorrelationMinorsVanish: true as const,
    leanDefinition: "Obsmetrologia.Relational.Kinetic.Decorrelated" as const,
  });
}

export function factorizesImpDecorrelated<State extends string>(
  factorization: AnyFactorizesWitness<State>,
): FactorizesImpDecorrelatedWitness<State> {
  const decorrelation = decorrelated(factorization.joint);
  if (decorrelation === undefined) {
    throw new TypeError("factorizesImpDecorrelated: factorized joint has a nonzero correlation minor");
  }
  return Object.freeze({
    kind: "relational.kinetic.factorizes_imp_decorrelated:witness" as const,
    factorization,
    decorrelated: decorrelation,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.factorizes_imp_decorrelated" as const,
  });
}

export function corrSwapParticles<State extends string>(
  joint: JointDistribution<State>,
  a: State,
  b: State,
  c: State,
  d: State,
): CorrelationSwapWitness<State> {
  const value = corr(joint, a, b, c, d);
  const swapped = corr(joint, b, a, c, d);
  if (value !== -swapped) throw new TypeError("corrSwapParticles: correlation minor is not antisymmetric");
  return Object.freeze({
    kind: "relational.kinetic.corr_swap_particles:witness" as const,
    joint,
    a,
    b,
    c,
    d,
    corr: value,
    swapped,
    antisymmetric: true as const,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.corr_swap_particles" as const,
  });
}

export function glueFactorizes<State extends string>(
  states: readonly State[],
  leftSection: SingleParticleSection<State>,
  rightSection: SingleParticleSection<State>,
): GlueFactorizesWitness<State> {
  const joint = glue(states, leftSection, rightSection);
  const witness = factorizes(joint, leftSection, rightSection);
  if (witness === undefined) throw new TypeError("glueFactorizes: separated gluing did not factorize");
  return Object.freeze({
    ...witness,
    kind: "relational.kinetic.glue_factorizes:witness" as const,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.glue_factorizes" as const,
  });
}

export function eprJoint(): JointDistribution<"0" | "1"> {
  return jointDistribution(Object.freeze(["0", "1"] as const), (left, right) => left === right ? 1 : 0);
}

export function eprCorrOne(): EprCorrelationWitness {
  const joint = eprJoint();
  const value = corr(joint, "0", "1", "0", "1");
  if (value !== 1) throw new TypeError("eprCorrOne: expected EPR correlation minor to equal one");
  return Object.freeze({
    kind: "relational.kinetic.epr_corr_one:witness" as const,
    joint,
    corr: 1 as const,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.epr_corr_one" as const,
  });
}

export function eprNotFactorizes(): EprNotFactorizesWitness {
  const obstruction = eprCorrOne();
  const decorrelation = decorrelated(obstruction.joint);
  if (decorrelation !== undefined) throw new TypeError("eprNotFactorizes: EPR joint unexpectedly decorrelated");
  return Object.freeze({
    kind: "relational.kinetic.epr_not_factorizes:witness" as const,
    joint: obstruction.joint,
    obstruction,
    notFactorizes: true as const,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.epr_not_factorizes" as const,
  });
}

export function molecularChaosGluingReceipt(): MolecularChaosGluingReceipt {
  const states = Object.freeze(["0", "1"] as const);
  const left: SingleParticleSection<"0" | "1"> = Object.freeze({ "0": 2, "1": 3 });
  const right: SingleParticleSection<"0" | "1"> = Object.freeze({ "0": 5, "1": 7 });
  const glued = glueFactorizes(states, left, right);
  const factorizedIsDecorrelated = factorizesImpDecorrelated(glued);
  const corrSwap = corrSwapParticles(eprJoint(), "0", "1", "0", "1");
  const eprCorrelation = eprCorrOne();
  const eprObstruction = eprNotFactorizes();
  return Object.freeze({
    kind: "relational.kinetic.molecularChaosGluing.receipt:witness" as const,
    glueFactorizes: glued,
    factorizedIsDecorrelated,
    corrSwap,
    eprCorrelation,
    eprNotFactorizes: eprObstruction,
    capturedLeanModule: "Obsmetrologia.Relational.Kinetic.MolecularChaosGluing" as const,
  });
}
