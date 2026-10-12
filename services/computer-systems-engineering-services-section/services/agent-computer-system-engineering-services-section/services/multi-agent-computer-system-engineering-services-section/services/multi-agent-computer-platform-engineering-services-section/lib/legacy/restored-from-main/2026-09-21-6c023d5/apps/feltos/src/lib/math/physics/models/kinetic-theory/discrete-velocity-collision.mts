/**
 * models/kinetic-theory/discrete-velocity-collision - finite kinetic collision invariants.
 *
 * This captures `Obsmetrologia.Relational.Kinetic.DiscreteVelocityCollision`:
 * binary collisions over a finite velocity alphabet, populations as multisets,
 * weighted totals, one-step conservation, physical momentum/energy invariants,
 * and conservation along a collision evolution.
 */

export type CollisionWeight<Velocity extends string> = Readonly<Record<Velocity, number>>;
export type Population<Velocity extends string> = readonly Velocity[];

export interface Collision<Velocity extends string> {
  readonly kind: "relational.kinetic.collision";
  readonly inL: Velocity;
  readonly inR: Velocity;
  readonly outL: Velocity;
  readonly outR: Velocity;
}

export interface CollisionConservesWitness<Velocity extends string> {
  readonly kind: "relational.kinetic.collision.conserves:witness";
  readonly collision: Collision<Velocity>;
  readonly weight: CollisionWeight<Velocity>;
  readonly inputTotal: number;
  readonly outputTotal: number;
  readonly conserves: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Kinetic.Collision.Conserves";
}

export interface TotalPermWitness<Velocity extends string> {
  readonly kind: "relational.kinetic.total_perm:witness";
  readonly weight: CollisionWeight<Velocity>;
  readonly left: Population<Velocity>;
  readonly right: Population<Velocity>;
  readonly total: number;
  readonly permutationInvariant: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Kinetic.total_perm";
}

export interface CollisionStepWitness<Velocity extends string> {
  readonly kind: "relational.kinetic.step:witness";
  readonly collision: Collision<Velocity>;
  readonly before: Population<Velocity>;
  readonly after: Population<Velocity>;
  readonly rest: Population<Velocity>;
  readonly firesUpToPermutation: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Kinetic.Step";
}

export interface StepConservesWitness<Velocity extends string> {
  readonly kind: "relational.kinetic.step_conserves:witness";
  readonly step: CollisionStepWitness<Velocity>;
  readonly invariant: CollisionConservesWitness<Velocity>;
  readonly beforeTotal: number;
  readonly afterTotal: number;
  readonly conserved: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Kinetic.step_conserves";
}

export interface PhysicalCollisionWitness<Velocity extends string> {
  readonly kind: "relational.kinetic.physical:witness";
  readonly collision: Collision<Velocity>;
  readonly velocity: CollisionWeight<Velocity>;
  readonly momentum: CollisionConservesWitness<Velocity>;
  readonly energy: CollisionConservesWitness<Velocity>;
  readonly leanStructure: "Obsmetrologia.Relational.Kinetic.Physical";
}

export interface PhysicalConservationWitness<Velocity extends string> {
  readonly kind: "relational.kinetic.physicalConservation:witness";
  readonly number: StepConservesWitness<Velocity>;
  readonly momentum: StepConservesWitness<Velocity>;
  readonly energy: StepConservesWitness<Velocity>;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Kinetic.physical_conserves_number",
    "Obsmetrologia.Relational.Kinetic.physical_conserves_momentum",
    "Obsmetrologia.Relational.Kinetic.physical_conserves_energy",
  ];
}

export interface EvolutionStep<Velocity extends string> {
  readonly collision: Collision<Velocity>;
  readonly before: Population<Velocity>;
  readonly after: Population<Velocity>;
}

export interface EvolutionConservesWitness<Velocity extends string> {
  readonly kind: "relational.kinetic.evolution_conserves:witness";
  readonly collisions: readonly Collision<Velocity>[];
  readonly steps: readonly StepConservesWitness<Velocity>[];
  readonly initial: Population<Velocity>;
  readonly final: Population<Velocity>;
  readonly initialTotal: number;
  readonly finalTotal: number;
  readonly conserved: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Kinetic.evolution_conserves";
}

export interface DiscreteVelocityCollisionReceipt {
  readonly kind: "relational.kinetic.discreteVelocityCollision.receipt:witness";
  readonly totalPerm: TotalPermWitness<"neg" | "pos" | "spectator">;
  readonly stepConserves: StepConservesWitness<"neg" | "pos" | "spectator">;
  readonly physical: PhysicalCollisionWitness<"neg" | "pos" | "spectator">;
  readonly physicalConservation: PhysicalConservationWitness<"neg" | "pos" | "spectator">;
  readonly evolution: EvolutionConservesWitness<"neg" | "pos" | "spectator">;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Kinetic.DiscreteVelocityCollision";
}

const assertInt = (value: number, caller: string): number => {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${caller}: expected a safe integer`);
  return value;
};

const normalizeVelocity = <Velocity extends string>(velocity: Velocity, caller: string): Velocity => {
  const trimmed = velocity.trim();
  if (trimmed.length === 0) throw new TypeError(`${caller}: velocity labels must be nonempty`);
  return trimmed as Velocity;
};

function normalizePopulation<Velocity extends string>(
  population: Population<Velocity>,
  caller: string,
): Population<Velocity> {
  return Object.freeze(population.map((velocity) => normalizeVelocity(velocity, caller)));
}

function normalizeWeight<Velocity extends string>(
  velocities: readonly Velocity[],
  weight: CollisionWeight<Velocity>,
  caller: string,
): CollisionWeight<Velocity> {
  const alphabet = Object.freeze([
    ...new Set([
      ...velocities,
      ...(Object.keys(weight) as Velocity[]),
    ]),
  ]);
  return Object.freeze(Object.fromEntries(alphabet.map((velocity) => {
    if (!Object.hasOwn(weight, velocity)) throw new TypeError(`${caller}: missing weight for ${velocity}`);
    return [velocity, assertInt(weight[velocity], caller)];
  })) as Record<Velocity, number>);
}

function counts<Velocity extends string>(population: Population<Velocity>): Map<Velocity, number> {
  const result = new Map<Velocity, number>();
  for (const velocity of population) result.set(velocity, (result.get(velocity) ?? 0) + 1);
  return result;
}

function sameCounts<Velocity extends string>(left: Population<Velocity>, right: Population<Velocity>): boolean {
  const leftCounts = counts(left);
  const rightCounts = counts(right);
  if (leftCounts.size !== rightCounts.size) return false;
  for (const [velocity, count] of leftCounts) {
    if (rightCounts.get(velocity) !== count) return false;
  }
  return true;
}

function removeOne<Velocity extends string>(population: Velocity[], velocity: Velocity): boolean {
  const index = population.indexOf(velocity);
  if (index < 0) return false;
  population.splice(index, 1);
  return true;
}

export function collision<Velocity extends string>(
  inL: Velocity,
  inR: Velocity,
  outL: Velocity,
  outR: Velocity,
): Collision<Velocity> {
  return Object.freeze({
    kind: "relational.kinetic.collision" as const,
    inL: normalizeVelocity(inL, "collision"),
    inR: normalizeVelocity(inR, "collision"),
    outL: normalizeVelocity(outL, "collision"),
    outR: normalizeVelocity(outR, "collision"),
  });
}

export function populationTotal<Velocity extends string>(
  weight: CollisionWeight<Velocity>,
  population: Population<Velocity>,
): number {
  return assertInt(
    normalizePopulation(population, "populationTotal").reduce((sum, velocity) => {
      if (!Object.hasOwn(weight, velocity)) throw new TypeError(`populationTotal: missing weight for ${velocity}`);
      return sum + assertInt(weight[velocity], "populationTotal");
    }, 0),
    "populationTotal",
  );
}

export function collisionConserves<Velocity extends string>(
  c: Collision<Velocity>,
  weight: CollisionWeight<Velocity>,
): CollisionConservesWitness<Velocity> | undefined {
  const normalizedWeight = normalizeWeight([c.inL, c.inR, c.outL, c.outR], weight, "collisionConserves");
  const inputTotal = normalizedWeight[c.inL] + normalizedWeight[c.inR];
  const outputTotal = normalizedWeight[c.outL] + normalizedWeight[c.outR];
  if (inputTotal !== outputTotal) return undefined;
  return Object.freeze({
    kind: "relational.kinetic.collision.conserves:witness" as const,
    collision: c,
    weight: normalizedWeight,
    inputTotal,
    outputTotal,
    conserves: true as const,
    leanDefinition: "Obsmetrologia.Relational.Kinetic.Collision.Conserves" as const,
  });
}

export function totalPerm<Velocity extends string>(
  weight: CollisionWeight<Velocity>,
  left: Population<Velocity>,
  right: Population<Velocity>,
): TotalPermWitness<Velocity> {
  const admittedLeft = normalizePopulation(left, "totalPerm");
  const admittedRight = normalizePopulation(right, "totalPerm");
  if (!sameCounts(admittedLeft, admittedRight)) throw new TypeError("totalPerm: populations are not permutations");
  const leftTotal = populationTotal(weight, admittedLeft);
  const rightTotal = populationTotal(weight, admittedRight);
  if (leftTotal !== rightTotal) throw new TypeError("totalPerm: permuted totals differ");
  return Object.freeze({
    kind: "relational.kinetic.total_perm:witness" as const,
    weight,
    left: admittedLeft,
    right: admittedRight,
    total: leftTotal,
    permutationInvariant: true as const,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.total_perm" as const,
  });
}

export function collisionStep<Velocity extends string>(
  c: Collision<Velocity>,
  before: Population<Velocity>,
  after: Population<Velocity>,
): CollisionStepWitness<Velocity> {
  const admittedBefore = normalizePopulation(before, "collisionStep");
  const admittedAfter = normalizePopulation(after, "collisionStep");
  const restBefore = [...admittedBefore];
  if (!removeOne(restBefore, c.inL) || !removeOne(restBefore, c.inR)) {
    throw new TypeError("collisionStep: input particles are not present in the before population");
  }
  const restAfter = [...admittedAfter];
  if (!removeOne(restAfter, c.outL) || !removeOne(restAfter, c.outR)) {
    throw new TypeError("collisionStep: output particles are not present in the after population");
  }
  if (!sameCounts(restBefore, restAfter)) throw new TypeError("collisionStep: remaining population changed");
  return Object.freeze({
    kind: "relational.kinetic.step:witness" as const,
    collision: c,
    before: admittedBefore,
    after: admittedAfter,
    rest: Object.freeze(restBefore),
    firesUpToPermutation: true as const,
    leanDefinition: "Obsmetrologia.Relational.Kinetic.Step" as const,
  });
}

export function stepConserves<Velocity extends string>(
  invariant: CollisionConservesWitness<Velocity>,
  step: CollisionStepWitness<Velocity>,
): StepConservesWitness<Velocity> {
  if (step.collision !== invariant.collision) throw new TypeError("stepConserves: invariant is for a different collision");
  const beforeTotal = populationTotal(invariant.weight, step.before);
  const afterTotal = populationTotal(invariant.weight, step.after);
  if (beforeTotal !== afterTotal) throw new TypeError("stepConserves: weighted total is not conserved");
  return Object.freeze({
    kind: "relational.kinetic.step_conserves:witness" as const,
    step,
    invariant,
    beforeTotal,
    afterTotal,
    conserved: true as const,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.step_conserves" as const,
  });
}

export function physicalCollision<Velocity extends string>(
  velocity: CollisionWeight<Velocity>,
  c: Collision<Velocity>,
): PhysicalCollisionWitness<Velocity> {
  const states = Object.freeze([...new Set([c.inL, c.inR, c.outL, c.outR, ...(Object.keys(velocity) as Velocity[])])]);
  const admittedVelocity = normalizeWeight(states, velocity, "physicalCollision");
  const energy = Object.freeze(Object.fromEntries(states.map((state) => [
    state,
    admittedVelocity[state] * admittedVelocity[state],
  ])) as Record<Velocity, number>);
  const momentumWitness = collisionConserves(c, admittedVelocity);
  const energyWitness = collisionConserves(c, energy);
  if (momentumWitness === undefined || energyWitness === undefined) {
    throw new TypeError("physicalCollision: collision does not conserve momentum and kinetic energy");
  }
  return Object.freeze({
    kind: "relational.kinetic.physical:witness" as const,
    collision: c,
    velocity: admittedVelocity,
    momentum: momentumWitness,
    energy: energyWitness,
    leanStructure: "Obsmetrologia.Relational.Kinetic.Physical" as const,
  });
}

export function physicalConserves<Velocity extends string>(
  physical: PhysicalCollisionWitness<Velocity>,
  step: CollisionStepWitness<Velocity>,
): PhysicalConservationWitness<Velocity> {
  const unit = Object.freeze(Object.fromEntries(step.before.map((state) => [state, 1])) as Record<Velocity, number>);
  const numberInvariant = collisionConserves(step.collision, unit);
  if (numberInvariant === undefined) throw new TypeError("physicalConserves: unit weight did not conserve number");
  return Object.freeze({
    kind: "relational.kinetic.physicalConservation:witness" as const,
    number: stepConserves(numberInvariant, step),
    momentum: stepConserves(physical.momentum, step),
    energy: stepConserves(physical.energy, step),
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Kinetic.physical_conserves_number",
      "Obsmetrologia.Relational.Kinetic.physical_conserves_momentum",
      "Obsmetrologia.Relational.Kinetic.physical_conserves_energy",
    ] as const),
  });
}

export function evolutionConserves<Velocity extends string>(
  collisions: readonly Collision<Velocity>[],
  weight: CollisionWeight<Velocity>,
  initial: Population<Velocity>,
  steps: readonly EvolutionStep<Velocity>[],
): EvolutionConservesWitness<Velocity> {
  let current = normalizePopulation(initial, "evolutionConserves");
  const stepWitnesses: StepConservesWitness<Velocity>[] = [];
  for (const item of steps) {
    if (!sameCounts(current, normalizePopulation(item.before, "evolutionConserves"))) {
      throw new TypeError("evolutionConserves: step does not start at the current population");
    }
    if (!collisions.includes(item.collision)) throw new TypeError("evolutionConserves: collision is not in the system");
    const invariant = collisionConserves(item.collision, weight);
    if (invariant === undefined) throw new TypeError("evolutionConserves: collision does not conserve the shared weight");
    const step = collisionStep(item.collision, item.before, item.after);
    stepWitnesses.push(stepConserves(invariant, step));
    current = step.after;
  }
  const initialTotal = populationTotal(weight, initial);
  const finalTotal = populationTotal(weight, current);
  if (initialTotal !== finalTotal) throw new TypeError("evolutionConserves: evolution did not conserve the shared weight");
  return Object.freeze({
    kind: "relational.kinetic.evolution_conserves:witness" as const,
    collisions: Object.freeze([...collisions]),
    steps: Object.freeze(stepWitnesses),
    initial: normalizePopulation(initial, "evolutionConserves"),
    final: current,
    initialTotal,
    finalTotal,
    conserved: true as const,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.evolution_conserves" as const,
  });
}

export function discreteVelocityCollisionReceipt(): DiscreteVelocityCollisionReceipt {
  const velocities = Object.freeze({ neg: -1, pos: 1, spectator: 0 });
  const c = collision<"neg" | "pos" | "spectator">("neg", "pos", "pos", "neg");
  const before = Object.freeze(["spectator", "pos", "neg"] as const);
  const after = Object.freeze(["neg", "spectator", "pos"] as const);
  const step = collisionStep(c, before, after);
  const momentumInvariant = collisionConserves(c, velocities);
  if (momentumInvariant === undefined) throw new TypeError("discreteVelocityCollisionReceipt: momentum invariant failed");
  const totalPermWitness = totalPerm(velocities, before, after);
  const stepConservation = stepConserves(momentumInvariant, step);
  const physical = physicalCollision(velocities, c);
  const physicalConservation = physicalConserves(physical, step);
  const evolution = evolutionConserves([c], velocities, before, [
    Object.freeze({ collision: c, before, after }),
    Object.freeze({ collision: c, before: after, after: before }),
  ]);
  return Object.freeze({
    kind: "relational.kinetic.discreteVelocityCollision.receipt:witness" as const,
    totalPerm: totalPermWitness,
    stepConserves: stepConservation,
    physical,
    physicalConservation,
    evolution,
    capturedLeanModule: "Obsmetrologia.Relational.Kinetic.DiscreteVelocityCollision" as const,
  });
}
