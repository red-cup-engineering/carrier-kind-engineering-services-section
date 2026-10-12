/**
 * models/reaction/mass-action-rate - finite real-valued reaction rates.
 *
 * This captures `Obsmetrologia.Relational.Reaction.MassActionRate`: natural
 * powers over real readouts, mass-action propensities, net stoichiometry, rate
 * vector fields, Euler steps, and equilibrium fixed points.
 */

export type CountVector<Species extends string> = Readonly<Record<Species, number>>;
export type Concentration<Species extends string> = Readonly<Record<Species, number>>;

export interface Reaction<Species extends string> {
  readonly kind: "relational.reaction.reaction";
  readonly species: readonly Species[];
  readonly reactant: CountVector<Species>;
  readonly product: CountVector<Species>;
}

export interface RpowAddWitness {
  readonly kind: "relational.reaction.massAction.rpow_add:witness";
  readonly base: number;
  readonly m: number;
  readonly n: number;
  readonly left: number;
  readonly right: number;
  readonly multiplicative: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.rpow_add";
}

export interface PropensityZeroWitness<Species extends string> {
  readonly kind: "relational.reaction.massAction.propensity_zero_of_zero_rate:witness";
  readonly reaction: Reaction<Species>;
  readonly concentration: Concentration<Species>;
  readonly propensity: 0;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.propensity_zero_of_zero_rate";
}

export interface PropensityNonnegWitness<Species extends string> {
  readonly kind: "relational.reaction.massAction.propensity_nonneg:witness";
  readonly reaction: Reaction<Species>;
  readonly rateConstant: number;
  readonly concentration: Concentration<Species>;
  readonly propensity: number;
  readonly nonnegative: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.propensity_nonneg";
}

export interface EquilibriumFixedWitness<Species extends string> {
  readonly kind: "relational.reaction.massAction.equilibrium_is_fixed:witness";
  readonly concentration: Concentration<Species>;
  readonly dt: number;
  readonly next: Concentration<Species>;
  readonly fixed: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.equilibrium_is_fixed";
}

export interface EulerStepZeroDtWitness<Species extends string> {
  readonly kind: "relational.reaction.massAction.eulerStep_zero_dt:witness";
  readonly concentration: Concentration<Species>;
  readonly next: Concentration<Species>;
  readonly fixed: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.eulerStep_zero_dt";
}

export interface MassActionRateReceipt {
  readonly kind: "relational.reaction.massAction.receipt:witness";
  readonly rpowAdd: RpowAddWitness;
  readonly zeroRate: PropensityZeroWitness<"A" | "B" | "C">;
  readonly propensityNonneg: PropensityNonnegWitness<"A" | "B" | "C">;
  readonly equilibriumFixed: EquilibriumFixedWitness<"A" | "B" | "C">;
  readonly zeroDt: EulerStepZeroDtWitness<"A" | "B" | "C">;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Reaction.MassActionRate";
}

const EPSILON = 1e-10;

const assertNat = (value: number, caller: string): number => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${caller}: expected a safe natural number`);
  return value;
};

const assertReal = (value: number, caller: string): number => {
  if (!Number.isFinite(value)) throw new RangeError(`${caller}: expected a finite real readout`);
  return value;
};

const closeEnough = (left: number, right: number): boolean => Math.abs(left - right) <= EPSILON;

function normalizeSpecies<Species extends string>(species: readonly Species[], caller: string): readonly Species[] {
  const normalized = Object.freeze([...new Set(species.map((item) => {
    const trimmed = item.trim();
    if (trimmed.length === 0) throw new TypeError(`${caller}: species labels must be nonempty`);
    return trimmed as Species;
  }))]);
  if (normalized.length === 0) throw new TypeError(`${caller}: expected at least one species`);
  return normalized;
}

function normalizeCountVector<Species extends string>(
  species: readonly Species[],
  vector: CountVector<Species>,
  caller: string,
): CountVector<Species> {
  return Object.freeze(Object.fromEntries(species.map((item) => {
    if (!Object.hasOwn(vector, item)) throw new TypeError(`${caller}: missing count for ${item}`);
    return [item, assertNat(vector[item], caller)];
  })) as Record<Species, number>);
}

function normalizeConcentration<Species extends string>(
  species: readonly Species[],
  concentration: Concentration<Species>,
  caller: string,
): Concentration<Species> {
  return Object.freeze(Object.fromEntries(species.map((item) => {
    if (!Object.hasOwn(concentration, item)) throw new TypeError(`${caller}: missing concentration for ${item}`);
    return [item, assertReal(concentration[item], caller)];
  })) as Record<Species, number>);
}

function sameConcentration<Species extends string>(
  species: readonly Species[],
  left: Concentration<Species>,
  right: Concentration<Species>,
): boolean {
  return species.every((item) => closeEnough(left[item], right[item]));
}

export function reaction<Species extends string>(
  species: readonly Species[],
  reactant: CountVector<Species>,
  product: CountVector<Species>,
): Reaction<Species> {
  const admittedSpecies = normalizeSpecies(species, "reaction");
  return Object.freeze({
    kind: "relational.reaction.reaction" as const,
    species: admittedSpecies,
    reactant: normalizeCountVector(admittedSpecies, reactant, "reaction.reactant"),
    product: normalizeCountVector(admittedSpecies, product, "reaction.product"),
  });
}

export function rpow(base: number, exponent: number): number {
  const admittedBase = assertReal(base, "rpow");
  const admittedExponent = assertNat(exponent, "rpow");
  let result = 1;
  for (let index = 0; index < admittedExponent; index += 1) result *= admittedBase;
  return result;
}

export function rpowAdd(base: number, m: number, n: number): RpowAddWitness {
  const admittedM = assertNat(m, "rpowAdd");
  const admittedN = assertNat(n, "rpowAdd");
  const left = rpow(base, admittedM + admittedN);
  const right = rpow(base, admittedM) * rpow(base, admittedN);
  if (!closeEnough(left, right)) throw new TypeError("rpowAdd: natural-power product law failed");
  return Object.freeze({
    kind: "relational.reaction.massAction.rpow_add:witness" as const,
    base,
    m: admittedM,
    n: admittedN,
    left,
    right,
    multiplicative: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.rpow_add" as const,
  });
}

export const rnat = (n: number): number => assertNat(n, "rnat");

export function rprod<Species extends string>(
  species: readonly Species[],
  valueAt: (species: Species) => number,
): number {
  return normalizeSpecies(species, "rprod").reduce((product, item) => product * assertReal(valueAt(item), "rprod"), 1);
}

export function propensity<Species extends string>(
  species: readonly Species[],
  rateConstant: number,
  r: Reaction<Species>,
  concentration: Concentration<Species>,
): number {
  const admittedSpecies = normalizeSpecies(species, "propensity");
  const admittedConcentration = normalizeConcentration(admittedSpecies, concentration, "propensity");
  return assertReal(rateConstant, "propensity") * rprod(admittedSpecies, (item) =>
    rpow(admittedConcentration[item], r.reactant[item] ?? 0));
}

export function propensityZeroOfZeroRate<Species extends string>(
  species: readonly Species[],
  r: Reaction<Species>,
  concentration: Concentration<Species>,
): PropensityZeroWitness<Species> {
  const value = propensity(species, 0, r, concentration);
  if (!closeEnough(value, 0)) throw new TypeError("propensityZeroOfZeroRate: zero rate did not give zero propensity");
  return Object.freeze({
    kind: "relational.reaction.massAction.propensity_zero_of_zero_rate:witness" as const,
    reaction: r,
    concentration: normalizeConcentration(r.species, concentration, "propensityZeroOfZeroRate"),
    propensity: 0 as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.propensity_zero_of_zero_rate" as const,
  });
}

export function propensityNonneg<Species extends string>(
  species: readonly Species[],
  rateConstant: number,
  r: Reaction<Species>,
  concentration: Concentration<Species>,
): PropensityNonnegWitness<Species> {
  if (rateConstant < 0) throw new TypeError("propensityNonneg: rate constant must be nonnegative");
  const admittedConcentration = normalizeConcentration(r.species, concentration, "propensityNonneg");
  if (r.species.some((item) => admittedConcentration[item] < 0)) {
    throw new TypeError("propensityNonneg: concentrations must be nonnegative");
  }
  const value = propensity(species, rateConstant, r, admittedConcentration);
  if (value < -EPSILON) throw new TypeError("propensityNonneg: propensity is negative");
  return Object.freeze({
    kind: "relational.reaction.massAction.propensity_nonneg:witness" as const,
    reaction: r,
    rateConstant,
    concentration: admittedConcentration,
    propensity: value,
    nonnegative: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.propensity_nonneg" as const,
  });
}

export function netStoich<Species extends string>(r: Reaction<Species>): Concentration<Species> {
  return Object.freeze(Object.fromEntries(r.species.map((item) => [
    item,
    rnat(r.product[item]) - rnat(r.reactant[item]),
  ])) as Record<Species, number>);
}

export function massActionField<Species extends string>(
  species: readonly Species[],
  reactions: readonly Reaction<Species>[],
  rateConstant: (reaction: Reaction<Species>) => number,
  concentration: Concentration<Species>,
): Concentration<Species> {
  const admittedSpecies = normalizeSpecies(species, "massActionField");
  const admittedConcentration = normalizeConcentration(admittedSpecies, concentration, "massActionField");
  const totals: Record<Species, number> = Object.fromEntries(admittedSpecies.map((item) => [item, 0])) as Record<Species, number>;
  for (const r of reactions) {
    const p = propensity(admittedSpecies, rateConstant(r), r, admittedConcentration);
    const net = netStoich(r);
    for (const item of admittedSpecies) totals[item] += p * (net[item] ?? 0);
  }
  return Object.freeze(totals);
}

export function eulerStep<Species extends string>(
  species: readonly Species[],
  field: (concentration: Concentration<Species>) => Concentration<Species>,
  dt: number,
  concentration: Concentration<Species>,
): Concentration<Species> {
  const admittedSpecies = normalizeSpecies(species, "eulerStep");
  const admittedConcentration = normalizeConcentration(admittedSpecies, concentration, "eulerStep");
  const vector = normalizeConcentration(admittedSpecies, field(admittedConcentration), "eulerStep.field");
  const admittedDt = assertReal(dt, "eulerStep");
  return Object.freeze(Object.fromEntries(admittedSpecies.map((item) => [
    item,
    admittedConcentration[item] + admittedDt * vector[item],
  ])) as Record<Species, number>);
}

export function isEquilibrium<Species extends string>(
  species: readonly Species[],
  field: (concentration: Concentration<Species>) => Concentration<Species>,
  concentration: Concentration<Species>,
): boolean {
  const admittedSpecies = normalizeSpecies(species, "isEquilibrium");
  const vector = normalizeConcentration(admittedSpecies, field(concentration), "isEquilibrium.field");
  return admittedSpecies.every((item) => closeEnough(vector[item], 0));
}

export function equilibriumIsFixed<Species extends string>(
  species: readonly Species[],
  field: (concentration: Concentration<Species>) => Concentration<Species>,
  dt: number,
  concentration: Concentration<Species>,
): EquilibriumFixedWitness<Species> {
  const admittedConcentration = normalizeConcentration(species, concentration, "equilibriumIsFixed");
  if (!isEquilibrium(species, field, admittedConcentration)) throw new TypeError("equilibriumIsFixed: concentration is not an equilibrium");
  const next = eulerStep(species, field, dt, admittedConcentration);
  if (!sameConcentration(species, next, admittedConcentration)) {
    throw new TypeError("equilibriumIsFixed: equilibrium moved under Euler step");
  }
  return Object.freeze({
    kind: "relational.reaction.massAction.equilibrium_is_fixed:witness" as const,
    concentration: admittedConcentration,
    dt,
    next,
    fixed: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.equilibrium_is_fixed" as const,
  });
}

export function eulerStepZeroDt<Species extends string>(
  species: readonly Species[],
  field: (concentration: Concentration<Species>) => Concentration<Species>,
  concentration: Concentration<Species>,
): EulerStepZeroDtWitness<Species> {
  const admittedConcentration = normalizeConcentration(species, concentration, "eulerStepZeroDt");
  const next = eulerStep(species, field, 0, admittedConcentration);
  if (!sameConcentration(species, next, admittedConcentration)) {
    throw new TypeError("eulerStepZeroDt: zero timestep moved the concentration");
  }
  return Object.freeze({
    kind: "relational.reaction.massAction.eulerStep_zero_dt:witness" as const,
    concentration: admittedConcentration,
    next,
    fixed: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.eulerStep_zero_dt" as const,
  });
}

export function massActionRateReceipt(): MassActionRateReceipt {
  const species = Object.freeze(["A", "B", "C"] as const);
  const combine = reaction(species, Object.freeze({ A: 1, B: 1, C: 0 }), Object.freeze({ A: 0, B: 0, C: 1 }));
  const concentration = Object.freeze({ A: 2, B: 3, C: 0 });
  const zeroField = (_c: Concentration<"A" | "B" | "C">): Concentration<"A" | "B" | "C"> =>
    Object.freeze({ A: 0, B: 0, C: 0 });
  return Object.freeze({
    kind: "relational.reaction.massAction.receipt:witness" as const,
    rpowAdd: rpowAdd(2, 3, 4),
    zeroRate: propensityZeroOfZeroRate(species, combine, concentration),
    propensityNonneg: propensityNonneg(species, 0.5, combine, concentration),
    equilibriumFixed: equilibriumIsFixed(species, zeroField, 0.25, concentration),
    zeroDt: eulerStepZeroDt(species, (c) => massActionField(species, [combine], () => 0.5, c), concentration),
    capturedLeanModule: "Obsmetrologia.Relational.Reaction.MassActionRate" as const,
  });
}
