/**
 * models/kinetic-theory/boltzmann-closure - finite collisions as closure rules.
 *
 * This is the MetroPlat realization of
 * `Obsmetrologia.Relational.Kinetic.BoltzmannClosure`: a collision contributes a
 * positive closure rule from its incoming pair cell to its outgoing pair cell,
 * and the closure-rule engine supplies the fixed-point/least-closed witness.
 */
import {
  antecedentHolds,
  closureRule,
  closureRuleReceipt,
  closureRuleSystem,
  firedRuleNames,
  tstep,
  valuation,
  type ClosureRuleCarrier as ClosureRule,
  type ClosureRuleReceipt,
  type ClosureRuleSystemCarrier as ClosureRuleSystem,
} from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/closure-rule-system";
import { readValuationFiber, type ValuationFiberCarrier as ValuationFiber } from "@lenticule-science/metrologic/articulation/predicating/positing/valuation-fiber-algebra";
import {
  collision,
  evolutionConserves,
  type Collision,
  type CollisionWeight,
  type EvolutionConservesWitness,
  type EvolutionStep,
  type Population,
} from "./discrete-velocity-collision.mts";

export type PairCell<Velocity extends string> = (left: Velocity, right: Velocity) => string;

export interface CollisionAntecedentWitness<Velocity extends string> {
  readonly kind: "relational.kinetic.boltzmannClosure.collisionAntecedent:witness";
  readonly collision: Collision<Velocity>;
  readonly cell: string;
  readonly positive: boolean;
  readonly leanDefinition: "Obsmetrologia.Relational.Kinetic.collisionAntecedent";
}

export interface CollisionAntecedentMonoWitness<Velocity extends string> {
  readonly kind: "relational.kinetic.boltzmannClosure.collisionAntecedent_mono:witness";
  readonly collision: Collision<Velocity>;
  readonly cell: string;
  readonly seedPositive: true;
  readonly closedPositive: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Kinetic.collisionAntecedent_mono";
}

export interface BoltzmannCollisionRuleWitness<Velocity extends string> {
  readonly kind: "relational.kinetic.boltzmannClosure.collisionRule:witness";
  readonly collision: Collision<Velocity>;
  readonly antecedentCell: string;
  readonly consequentCell: string;
  readonly rule: ClosureRule;
  readonly leanDefinition: "Obsmetrologia.Relational.Kinetic.collisionRule";
}

export interface BoltzmannCollisionRuleSystemWitness<Velocity extends string> {
  readonly kind: "relational.kinetic.boltzmannClosure.collisionRuleSystem:witness";
  readonly collisions: readonly Collision<Velocity>[];
  readonly rules: readonly BoltzmannCollisionRuleWitness<Velocity>[];
  readonly system: ClosureRuleSystem;
  readonly leanDefinition: "Obsmetrologia.Relational.Kinetic.collisionRuleSystem";
}

export interface FiniteBoltzmannCollisionLfpWitness<Velocity extends string> {
  readonly kind: "relational.kinetic.boltzmannClosure.finite_boltzmann_collision_lfp:witness";
  readonly ruleSystem: BoltzmannCollisionRuleSystemWitness<Velocity>;
  readonly receipt: ClosureRuleReceipt;
  readonly tstepFixed: true;
  readonly seedBelowClosure: true;
  readonly leastFixedPoint: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Kinetic.finite_boltzmann_collision_lfp";
}

export interface ClosedCollisionOutputsWitness<Velocity extends string> {
  readonly kind: "relational.kinetic.boltzmannClosure.closed_collision_outputs:witness";
  readonly collision: Collision<Velocity>;
  readonly antecedentCell: string;
  readonly consequentCell: string;
  readonly antecedentPositive: true;
  readonly outputPositive: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Kinetic.closed_collision_outputs";
}

export interface FiniteCollisionInvariantsPreservedWitness<Velocity extends string> {
  readonly kind: "relational.kinetic.boltzmannClosure.finite_collision_invariants_preserved:witness";
  readonly evolution: EvolutionConservesWitness<Velocity>;
  readonly leanTheorem: "Obsmetrologia.Relational.Kinetic.finite_collision_invariants_preserved";
}

export interface BoltzmannClosureReceipt {
  readonly kind: "relational.kinetic.boltzmannClosure.receipt:witness";
  readonly rule: BoltzmannCollisionRuleWitness<"neg" | "pos">;
  readonly ruleSystem: BoltzmannCollisionRuleSystemWitness<"neg" | "pos">;
  readonly antecedent: CollisionAntecedentWitness<"neg" | "pos">;
  readonly antecedentMono: CollisionAntecedentMonoWitness<"neg" | "pos">;
  readonly lfp: FiniteBoltzmannCollisionLfpWitness<"neg" | "pos">;
  readonly closedOutput: ClosedCollisionOutputsWitness<"neg" | "pos">;
  readonly invariantsPreserved: FiniteCollisionInvariantsPreservedWitness<"neg" | "pos">;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Kinetic.BoltzmannClosure";
}

export const defaultPairCell = <Velocity extends string>(left: Velocity, right: Velocity): string =>
  `${left}:${right}`;

function uniqueCells(cells: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(cells)]);
}

function sameValuation(left: ValuationFiber, right: ValuationFiber): boolean {
  return left.points.length === right.points.length
    && left.points.every((point, index) => point === right.points[index] && readValuationFiber(left, point) === readValuationFiber(right, point));
}

function findRule<Velocity extends string>(
  ruleSystem: BoltzmannCollisionRuleSystemWitness<Velocity>,
  c: Collision<Velocity>,
): BoltzmannCollisionRuleWitness<Velocity> {
  const rule = ruleSystem.rules.find((candidate) => candidate.collision === c);
  if (rule === undefined) throw new TypeError("BoltzmannClosure: collision is not in the rule system");
  return rule;
}

export function boltzmannCollisionRule<Velocity extends string>(
  pairCell: PairCell<Velocity>,
  c: Collision<Velocity>,
): BoltzmannCollisionRuleWitness<Velocity> {
  const antecedentCell = pairCell(c.inL, c.inR);
  const consequentCell = pairCell(c.outL, c.outR);
  const rule = closureRule(
    `boltzmann:${antecedentCell}->${consequentCell}`,
    [Object.freeze({ cell: antecedentCell, atLeast: "potential" as const })],
    Object.freeze({ cell: consequentCell, charge: "potential" as const }),
  );
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.collisionRule:witness" as const,
    collision: c,
    antecedentCell,
    consequentCell,
    rule,
    leanDefinition: "Obsmetrologia.Relational.Kinetic.collisionRule" as const,
  });
}

export function boltzmannCollisionRuleSystem<Velocity extends string>(
  pairCell: PairCell<Velocity>,
  collisions: readonly Collision<Velocity>[],
): BoltzmannCollisionRuleSystemWitness<Velocity> {
  if (collisions.length === 0) throw new TypeError("boltzmannCollisionRuleSystem: expected at least one collision");
  const rules = Object.freeze(collisions.map((c) => boltzmannCollisionRule(pairCell, c)));
  const cells = uniqueCells(rules.flatMap((rule) => [rule.antecedentCell, rule.consequentCell]));
  const system = closureRuleSystem(cells, rules.map((rule) => rule.rule));
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.collisionRuleSystem:witness" as const,
    collisions: Object.freeze([...collisions]),
    rules,
    system,
    leanDefinition: "Obsmetrologia.Relational.Kinetic.collisionRuleSystem" as const,
  });
}

export function collisionSeedValuation<Velocity extends string>(
  ruleSystem: BoltzmannCollisionRuleSystemWitness<Velocity>,
  positiveCells: readonly string[],
): ValuationFiber {
  return valuation(ruleSystem.system.cells, Object.fromEntries(positiveCells.map((cell) => [cell, "potential"])));
}

export function collisionAntecedent<Velocity extends string>(
  pairCell: PairCell<Velocity>,
  c: Collision<Velocity>,
  valuationValue: ValuationFiber,
): CollisionAntecedentWitness<Velocity> {
  const rule = boltzmannCollisionRule(pairCell, c).rule;
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.collisionAntecedent:witness" as const,
    collision: c,
    cell: pairCell(c.inL, c.inR),
    positive: antecedentHolds(rule, valuationValue),
    leanDefinition: "Obsmetrologia.Relational.Kinetic.collisionAntecedent" as const,
  });
}

export function collisionAntecedentMono<Velocity extends string>(
  ruleSystem: BoltzmannCollisionRuleSystemWitness<Velocity>,
  c: Collision<Velocity>,
  seed: ValuationFiber,
  closed: ValuationFiber,
): CollisionAntecedentMonoWitness<Velocity> {
  const rule = findRule(ruleSystem, c);
  if (!antecedentHolds(rule.rule, seed) || !antecedentHolds(rule.rule, closed)) {
    throw new TypeError("collisionAntecedentMono: antecedent did not remain positive");
  }
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.collisionAntecedent_mono:witness" as const,
    collision: c,
    cell: rule.antecedentCell,
    seedPositive: true as const,
    closedPositive: true as const,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.collisionAntecedent_mono" as const,
  });
}

export function finiteBoltzmannCollisionLfp<Velocity extends string>(
  ruleSystem: BoltzmannCollisionRuleSystemWitness<Velocity>,
  seed: ValuationFiber,
): FiniteBoltzmannCollisionLfpWitness<Velocity> {
  const receipt = closureRuleReceipt(ruleSystem.system, seed);
  if (!sameValuation(tstep(ruleSystem.system, receipt.closed), receipt.closed)) {
    throw new TypeError("finiteBoltzmannCollisionLfp: closed valuation is not a fixed point");
  }
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.finite_boltzmann_collision_lfp:witness" as const,
    ruleSystem,
    receipt,
    tstepFixed: true as const,
    seedBelowClosure: true as const,
    leastFixedPoint: true as const,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.finite_boltzmann_collision_lfp" as const,
  });
}

export function closedCollisionOutputs<Velocity extends string>(
  ruleSystem: BoltzmannCollisionRuleSystemWitness<Velocity>,
  lfp: FiniteBoltzmannCollisionLfpWitness<Velocity>,
  c: Collision<Velocity>,
): ClosedCollisionOutputsWitness<Velocity> {
  const rule = findRule(ruleSystem, c);
  if (!antecedentHolds(rule.rule, lfp.receipt.closed)) {
    throw new TypeError("closedCollisionOutputs: collision antecedent is not positive in the closed valuation");
  }
  if (readValuationFiber(lfp.receipt.closed, rule.consequentCell) !== "potential") {
    throw new TypeError("closedCollisionOutputs: outgoing pair is not positively asserted");
  }
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.closed_collision_outputs:witness" as const,
    collision: c,
    antecedentCell: rule.antecedentCell,
    consequentCell: rule.consequentCell,
    antecedentPositive: true as const,
    outputPositive: true as const,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.closed_collision_outputs" as const,
  });
}

export function finiteCollisionInvariantsPreserved<Velocity extends string>(
  collisions: readonly Collision<Velocity>[],
  weight: CollisionWeight<Velocity>,
  initial: Population<Velocity>,
  steps: readonly EvolutionStep<Velocity>[],
): FiniteCollisionInvariantsPreservedWitness<Velocity> {
  const evolution = evolutionConserves(collisions, weight, initial, steps);
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.finite_collision_invariants_preserved:witness" as const,
    evolution,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.finite_collision_invariants_preserved" as const,
  });
}

export function boltzmannClosureReceipt(): BoltzmannClosureReceipt {
  const c = collision<"neg" | "pos">("neg", "pos", "pos", "neg");
  const ruleSystem = boltzmannCollisionRuleSystem(defaultPairCell, [c]);
  const rule = ruleSystem.rules[0]!;
  const seed = collisionSeedValuation(ruleSystem, [rule.antecedentCell]);
  const antecedent = collisionAntecedent(defaultPairCell, c, seed);
  const lfp = finiteBoltzmannCollisionLfp(ruleSystem, seed);
  const antecedentMono = collisionAntecedentMono(ruleSystem, c, seed, lfp.receipt.closed);
  const closedOutput = closedCollisionOutputs(ruleSystem, lfp, c);
  const invariantsPreserved = finiteCollisionInvariantsPreserved([c], Object.freeze({ neg: -1, pos: 1 }), ["neg", "pos"], [
    Object.freeze({ collision: c, before: Object.freeze(["neg", "pos"] as const), after: Object.freeze(["pos", "neg"] as const) }),
  ]);
  if (!antecedent.positive || !firedRuleNames(ruleSystem.system, seed).includes(rule.rule.name)) {
    throw new TypeError("boltzmannClosureReceipt: seed did not fire the collision rule");
  }
  return Object.freeze({
    kind: "relational.kinetic.boltzmannClosure.receipt:witness" as const,
    rule,
    ruleSystem,
    antecedent,
    antecedentMono,
    lfp,
    closedOutput,
    invariantsPreserved,
    capturedLeanModule: "Obsmetrologia.Relational.Kinetic.BoltzmannClosure" as const,
  });
}
