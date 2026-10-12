/**
 * models/reaction/support-projection - Boolean support of counted reactions.
 *
 * This captures `Obsmetrologia.Relational.Reaction.SupportProjection`: support
 * forgets counts, Datalog support steps are monotone/inflationary, actual firing
 * sits below the Datalog step, and their gap is exactly full consumption.
 */
import { reaction, type CountVector, type Reaction } from "./mass-action-rate.mts";

export type Support<Species extends string> = Readonly<Record<Species, boolean>>;

export interface BoolOrderWitness<Species extends string> {
  readonly kind: "relational.reaction.supportProjection.ble:witness";
  readonly left: Support<Species>;
  readonly right: Support<Species>;
  readonly below: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Reaction.ble";
}

export interface DatalogInflWitness<Species extends string> {
  readonly kind: "relational.reaction.supportProjection.datalogStep_infl:witness";
  readonly support: Support<Species>;
  readonly stepped: Support<Species>;
  readonly inflationary: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.datalogStep_infl";
}

export interface DatalogMonoWitness<Species extends string> {
  readonly kind: "relational.reaction.supportProjection.datalogStep_mono:witness";
  readonly left: Support<Species>;
  readonly right: Support<Species>;
  readonly steppedLeft: Support<Species>;
  readonly steppedRight: Support<Species>;
  readonly monotone: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.datalogStep_mono";
}

export interface RAntEnabledWitness<Species extends string> {
  readonly kind: "relational.reaction.supportProjection.rAnt_of_enabled:witness";
  readonly reaction: Reaction<Species>;
  readonly marking: CountVector<Species>;
  readonly antecedent: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.rAnt_of_enabled";
}

export interface SupportFireLeDatalogWitness<Species extends string> {
  readonly kind: "relational.reaction.supportProjection.support_fire_le_datalog:witness";
  readonly reaction: Reaction<Species>;
  readonly marking: CountVector<Species>;
  readonly fired: CountVector<Species>;
  readonly fireSupport: Support<Species>;
  readonly datalogSupport: Support<Species>;
  readonly below: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.support_fire_le_datalog";
}

export interface ConsumptionGapWitness<Species extends string> {
  readonly kind: "relational.reaction.supportProjection.consumption_is_the_gap:witness";
  readonly species: Species;
  readonly markingCount: number;
  readonly reactantCount: number;
  readonly productCount: 0;
  readonly presentBefore: true;
  readonly fullyConsumed: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.consumption_is_the_gap";
}

export interface SupportFireEqDatalogWitness<Species extends string> {
  readonly kind: "relational.reaction.supportProjection.support_fire_eq_datalog_of_no_consumption:witness";
  readonly reaction: Reaction<Species>;
  readonly marking: CountVector<Species>;
  readonly fireSupport: Support<Species>;
  readonly datalogSupport: Support<Species>;
  readonly equal: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.support_fire_eq_datalog_of_no_consumption";
}

export interface SupportProjectionReceipt {
  readonly kind: "relational.reaction.supportProjection.receipt:witness";
  readonly rAntEnabled: RAntEnabledWitness<"A" | "B" | "C">;
  readonly infl: DatalogInflWitness<"A" | "B" | "C">;
  readonly mono: DatalogMonoWitness<"A" | "B" | "C">;
  readonly fireBelowDatalog: SupportFireLeDatalogWitness<"A" | "B" | "C">;
  readonly gap: ConsumptionGapWitness<"A" | "B" | "C">;
  readonly catalyticEquality: SupportFireEqDatalogWitness<"A" | "B" | "C">;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Reaction.SupportProjection";
}

const assertNat = (value: number, caller: string): number => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${caller}: expected a safe natural number`);
  return value;
};

function normalizeMarking<Species extends string>(
  species: readonly Species[],
  marking: CountVector<Species>,
  caller: string,
): CountVector<Species> {
  return Object.freeze(Object.fromEntries(species.map((item) => {
    if (!Object.hasOwn(marking, item)) throw new TypeError(`${caller}: missing count for ${item}`);
    return [item, assertNat(marking[item], caller)];
  })) as Record<Species, number>);
}

function normalizeSupport<Species extends string>(
  species: readonly Species[],
  support: Support<Species>,
  caller: string,
): Support<Species> {
  return Object.freeze(Object.fromEntries(species.map((item) => {
    if (!Object.hasOwn(support, item)) throw new TypeError(`${caller}: missing support for ${item}`);
    return [item, support[item] === true];
  })) as Record<Species, boolean>);
}

function supportEquals<Species extends string>(
  species: readonly Species[],
  left: Support<Species>,
  right: Support<Species>,
): boolean {
  return species.every((item) => left[item] === right[item]);
}

export { reaction as supportReaction };

export function enabled<Species extends string>(r: Reaction<Species>, marking: CountVector<Species>): boolean {
  const admitted = normalizeMarking(r.species, marking, "enabled");
  return r.species.every((item) => r.reactant[item] <= admitted[item]);
}

export function fire<Species extends string>(r: Reaction<Species>, marking: CountVector<Species>): CountVector<Species> {
  const admitted = normalizeMarking(r.species, marking, "fire");
  return Object.freeze(Object.fromEntries(r.species.map((item) => [
    item,
    Math.max(0, admitted[item] - r.reactant[item]) + r.product[item],
  ])) as Record<Species, number>);
}

export function supp<Species extends string>(species: readonly Species[], marking: CountVector<Species>): Support<Species> {
  const admitted = normalizeMarking(species, marking, "supp");
  return Object.freeze(Object.fromEntries(species.map((item) => [item, admitted[item] > 0])) as Record<Species, boolean>);
}

export function ble<Species extends string>(
  species: readonly Species[],
  left: Support<Species>,
  right: Support<Species>,
): boolean {
  const admittedLeft = normalizeSupport(species, left, "ble.left");
  const admittedRight = normalizeSupport(species, right, "ble.right");
  return species.every((item) => !admittedLeft[item] || admittedRight[item]);
}

export function bleWitness<Species extends string>(
  species: readonly Species[],
  left: Support<Species>,
  right: Support<Species>,
): BoolOrderWitness<Species> {
  const admittedLeft = normalizeSupport(species, left, "bleWitness.left");
  const admittedRight = normalizeSupport(species, right, "bleWitness.right");
  if (!ble(species, admittedLeft, admittedRight)) throw new TypeError("bleWitness: left support is not below right support");
  return Object.freeze({
    kind: "relational.reaction.supportProjection.ble:witness" as const,
    left: admittedLeft,
    right: admittedRight,
    below: true as const,
    leanDefinition: "Obsmetrologia.Relational.Reaction.ble" as const,
  });
}

export function rAnt<Species extends string>(
  species: readonly Species[],
  r: Reaction<Species>,
  support: Support<Species>,
): boolean {
  const admitted = normalizeSupport(species, support, "rAnt");
  return species.every((item) => r.reactant[item] <= 0 || admitted[item]);
}

export function datalogStep<Species extends string>(
  species: readonly Species[],
  r: Reaction<Species>,
  support: Support<Species>,
): Support<Species> {
  const admitted = normalizeSupport(species, support, "datalogStep");
  const antecedent = rAnt(species, r, admitted);
  return Object.freeze(Object.fromEntries(species.map((item) => [
    item,
    admitted[item] || (antecedent && r.product[item] > 0),
  ])) as Record<Species, boolean>);
}

export function datalogStepInfl<Species extends string>(
  species: readonly Species[],
  r: Reaction<Species>,
  support: Support<Species>,
): DatalogInflWitness<Species> {
  const admitted = normalizeSupport(species, support, "datalogStepInfl");
  const stepped = datalogStep(species, r, admitted);
  if (!ble(species, admitted, stepped)) throw new TypeError("datalogStepInfl: support step is not inflationary");
  return Object.freeze({
    kind: "relational.reaction.supportProjection.datalogStep_infl:witness" as const,
    support: admitted,
    stepped,
    inflationary: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.datalogStep_infl" as const,
  });
}

export function datalogStepMono<Species extends string>(
  species: readonly Species[],
  r: Reaction<Species>,
  left: Support<Species>,
  right: Support<Species>,
): DatalogMonoWitness<Species> {
  const admittedLeft = normalizeSupport(species, left, "datalogStepMono.left");
  const admittedRight = normalizeSupport(species, right, "datalogStepMono.right");
  if (!ble(species, admittedLeft, admittedRight)) throw new TypeError("datalogStepMono: left support is not below right support");
  const steppedLeft = datalogStep(species, r, admittedLeft);
  const steppedRight = datalogStep(species, r, admittedRight);
  if (!ble(species, steppedLeft, steppedRight)) throw new TypeError("datalogStepMono: stepped supports are not ordered");
  return Object.freeze({
    kind: "relational.reaction.supportProjection.datalogStep_mono:witness" as const,
    left: admittedLeft,
    right: admittedRight,
    steppedLeft,
    steppedRight,
    monotone: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.datalogStep_mono" as const,
  });
}

export function rAntOfEnabled<Species extends string>(
  species: readonly Species[],
  r: Reaction<Species>,
  marking: CountVector<Species>,
): RAntEnabledWitness<Species> {
  const admitted = normalizeMarking(species, marking, "rAntOfEnabled");
  if (!enabled(r, admitted) || !rAnt(species, r, supp(species, admitted))) {
    throw new TypeError("rAntOfEnabled: enabled reaction did not fire the support antecedent");
  }
  return Object.freeze({
    kind: "relational.reaction.supportProjection.rAnt_of_enabled:witness" as const,
    reaction: r,
    marking: admitted,
    antecedent: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.rAnt_of_enabled" as const,
  });
}

export function supportFireLeDatalog<Species extends string>(
  species: readonly Species[],
  r: Reaction<Species>,
  marking: CountVector<Species>,
): SupportFireLeDatalogWitness<Species> {
  const admitted = normalizeMarking(species, marking, "supportFireLeDatalog");
  if (!enabled(r, admitted)) throw new TypeError("supportFireLeDatalog: reaction is not enabled");
  const fired = fire(r, admitted);
  const fireSupport = supp(species, fired);
  const datalogSupport = datalogStep(species, r, supp(species, admitted));
  if (!ble(species, fireSupport, datalogSupport)) {
    throw new TypeError("supportFireLeDatalog: fire support is not below Datalog support");
  }
  return Object.freeze({
    kind: "relational.reaction.supportProjection.support_fire_le_datalog:witness" as const,
    reaction: r,
    marking: admitted,
    fired,
    fireSupport,
    datalogSupport,
    below: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.support_fire_le_datalog" as const,
  });
}

export function consumptionIsTheGap<Species extends string>(
  species: readonly Species[],
  r: Reaction<Species>,
  marking: CountVector<Species>,
  x: Species,
): ConsumptionGapWitness<Species> {
  const witness = supportFireLeDatalog(species, r, marking);
  if (!witness.datalogSupport[x] || witness.fireSupport[x]) {
    throw new TypeError("consumptionIsTheGap: selected species is not in the Datalog/fire support gap");
  }
  if (!(witness.marking[x] > 0 && witness.marking[x] === r.reactant[x] && r.product[x] === 0)) {
    throw new TypeError("consumptionIsTheGap: gap is not full consumption");
  }
  return Object.freeze({
    kind: "relational.reaction.supportProjection.consumption_is_the_gap:witness" as const,
    species: x,
    markingCount: witness.marking[x],
    reactantCount: r.reactant[x],
    productCount: 0 as const,
    presentBefore: true as const,
    fullyConsumed: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.consumption_is_the_gap" as const,
  });
}

export function supportFireEqDatalogOfNoConsumption<Species extends string>(
  species: readonly Species[],
  r: Reaction<Species>,
  marking: CountVector<Species>,
): SupportFireEqDatalogWitness<Species> {
  const admitted = normalizeMarking(species, marking, "supportFireEqDatalogOfNoConsumption");
  if (!enabled(r, admitted)) throw new TypeError("supportFireEqDatalogOfNoConsumption: reaction is not enabled");
  const noConsumption = species.every((item) =>
    r.reactant[item] <= 0 || r.reactant[item] < admitted[item] || r.product[item] > 0);
  if (!noConsumption) throw new TypeError("supportFireEqDatalogOfNoConsumption: some reactant is fully consumed");
  const fireSupport = supp(species, fire(r, admitted));
  const datalogSupport = datalogStep(species, r, supp(species, admitted));
  if (!supportEquals(species, fireSupport, datalogSupport)) {
    throw new TypeError("supportFireEqDatalogOfNoConsumption: supports differ despite no full consumption");
  }
  return Object.freeze({
    kind: "relational.reaction.supportProjection.support_fire_eq_datalog_of_no_consumption:witness" as const,
    reaction: r,
    marking: admitted,
    fireSupport,
    datalogSupport,
    equal: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.support_fire_eq_datalog_of_no_consumption" as const,
  });
}

export function supportProjectionReceipt(): SupportProjectionReceipt {
  const species = Object.freeze(["A", "B", "C"] as const);
  const consume = reaction(species, Object.freeze({ A: 1, B: 1, C: 0 }), Object.freeze({ A: 0, B: 0, C: 1 }));
  const catalytic = reaction(species, Object.freeze({ A: 1, B: 1, C: 0 }), Object.freeze({ A: 1, B: 1, C: 1 }));
  const marking = Object.freeze({ A: 1, B: 2, C: 0 });
  const catalyticMarking = Object.freeze({ A: 1, B: 1, C: 0 });
  const baseSupport = supp(species, marking);
  return Object.freeze({
    kind: "relational.reaction.supportProjection.receipt:witness" as const,
    rAntEnabled: rAntOfEnabled(species, consume, marking),
    infl: datalogStepInfl(species, consume, baseSupport),
    mono: datalogStepMono(species, consume, Object.freeze({ A: true, B: false, C: false }), baseSupport),
    fireBelowDatalog: supportFireLeDatalog(species, consume, marking),
    gap: consumptionIsTheGap(species, consume, marking, "A"),
    catalyticEquality: supportFireEqDatalogOfNoConsumption(species, catalytic, catalyticMarking),
    capturedLeanModule: "Obsmetrologia.Relational.Reaction.SupportProjection" as const,
  });
}
