/**
 * analysis/closure-rule-system - finite immediate-consequence operators.
 *
 * as positive finite threshold antecedents over FOUR-valued valuation cells, with
 * one consequent that raises a cell by knowledge join.
 */
import {
  chargeValue,
  chargeValueName,
  chargeValueNames,
  joinKnowledgeValue,
  type ChargeValueName,
} from "../../values/index.mts";
import {
  readValuationFiber,
  valuationFiber,
  valuationLeqKnowledge,
  type ValuationFiber,
} from "../../logic/predicating/evidence/valuation-fiber-algebra.mts";
import { valuationKnowledgeJoin } from "../../logic/predicating/evidence/closure-operator-fiber.mts";

export interface ClosureRuleCondition {
  readonly cell: string;
  readonly atLeast: ChargeValueName;
}

export interface ClosureRuleConsequent {
  readonly cell: string;
  readonly charge: ChargeValueName;
}

export interface ClosureRule {
  readonly kind: "closureRule.rule";
  readonly name: string;
  readonly antecedent: readonly ClosureRuleCondition[];
  readonly consequent: ClosureRuleConsequent;
}

export interface ClosureRuleSystem {
  readonly kind: "closureRule.system";
  readonly cells: readonly string[];
  readonly rules: readonly ClosureRule[];
}

export interface ClosureRuleReceipt {
  readonly kind: "closureRule.system.receipt:witness";
  readonly system: ClosureRuleSystem;
  readonly seed: ValuationFiber;
  readonly orbit: readonly ValuationFiber[];
  readonly closed: ValuationFiber;
  readonly fixed: true;
  readonly inflationary: true;
  readonly monotone: true;
  readonly ruleRespecting: true;
  readonly leastClosed: true;
  readonly lfp: true;
  readonly firedAtSeed: readonly string[];
}

const unique = (items: readonly string[]): boolean => new Set(items).size === items.length;

const freezeRecord = <T,>(record: Record<string, T>): Readonly<Record<string, T>> => Object.freeze({ ...record });

const knowledgeLeqValue = (left: ChargeValueName, right: ChargeValueName): boolean =>
  chargeValueName(joinKnowledgeValue(chargeValue(left), chargeValue(right))) === right;

const knowledgeJoinValueName = (left: ChargeValueName, right: ChargeValueName): ChargeValueName =>
  chargeValueName(joinKnowledgeValue(chargeValue(left), chargeValue(right)));

const sameFiber = (left: ValuationFiber, right: ValuationFiber): boolean =>
  left.points.length === right.points.length
  && left.points.every((point, index) => point === right.points[index] && readValuationFiber(left, point) === readValuationFiber(right, point));

function requireChargeValue(value: ChargeValueName, caller: string): void {
  if (!chargeValueNames.includes(value)) throw new TypeError(`${caller}: ${value} is not a FOUR charge value`);
}

function requireCell(cells: readonly string[], cell: string, caller: string): void {
  if (!cells.includes(cell)) throw new TypeError(`${caller}: cell ${cell} is not in the finite cell set`);
}

export function closureRule(
  name: string,
  antecedent: readonly ClosureRuleCondition[],
  consequent: ClosureRuleConsequent,
): ClosureRule {
  for (const condition of antecedent) requireChargeValue(condition.atLeast, "closureRule");
  requireChargeValue(consequent.charge, "closureRule");
  return Object.freeze({
    kind: "closureRule.rule" as const,
    name,
    antecedent: Object.freeze(antecedent.map((condition) => Object.freeze({ ...condition }))),
    consequent: Object.freeze({ ...consequent }),
  });
}

export const alwaysRule = (cell: string, charge: ChargeValueName): ClosureRule =>
  closureRule(`always:${cell}:${charge}`, [], { cell, charge });

export function closureRuleSystem(cells: readonly string[], rules: readonly ClosureRule[]): ClosureRuleSystem {
  if (cells.length === 0) throw new RangeError("closureRuleSystem: cell set must be nonempty");
  if (!unique(cells)) throw new TypeError("closureRuleSystem: duplicate cells are not a finite set");
  for (const rule of rules) {
    requireCell(cells, rule.consequent.cell, "closureRuleSystem");
    for (const condition of rule.antecedent) requireCell(cells, condition.cell, "closureRuleSystem");
  }
  return Object.freeze({
    kind: "closureRule.system" as const,
    cells: Object.freeze([...cells]),
    rules: Object.freeze([...rules]),
  });
}

export function knowledgeLeastValuation(cells: readonly string[]): ValuationFiber {
  return valuationFiber(cells, Object.fromEntries(cells.map((cell) => [cell, "unknown"])));
}

export function valuation(cells: readonly string[], values: Readonly<Record<string, ChargeValueName>>): ValuationFiber {
  const filled: Record<string, ChargeValueName> = {};
  for (const cell of cells) {
    const value = values[cell] ?? "unknown";
    requireChargeValue(value, "closureRule.valuation");
    filled[cell] = value;
  }
  return valuationFiber(cells, freezeRecord(filled));
}

export function antecedentHolds(rule: ClosureRule, valuationValue: ValuationFiber): boolean {
  return rule.antecedent.every((condition) =>
    knowledgeLeqValue(condition.atLeast, readValuationFiber(valuationValue, condition.cell)),
  );
}

export function ruleFire(rule: ClosureRule, valuationValue: ValuationFiber): ValuationFiber {
  if (!antecedentHolds(rule, valuationValue)) return knowledgeLeastValuation(valuationValue.points);
  return valuation(valuationValue.points, { [rule.consequent.cell]: rule.consequent.charge });
}

export function fire(system: ClosureRuleSystem, valuationValue: ValuationFiber): ValuationFiber {
  let fired = knowledgeLeastValuation(system.cells);
  for (const rule of system.rules) fired = valuationKnowledgeJoin(fired, ruleFire(rule, valuationValue));
  return fired;
}

export function tstep(system: ClosureRuleSystem, valuationValue: ValuationFiber): ValuationFiber {
  return valuationKnowledgeJoin(valuationValue, fire(system, valuationValue));
}

export function closureOrbit(
  system: ClosureRuleSystem,
  seed: ValuationFiber,
  maxSteps = Math.max(4, system.cells.length * chargeValueNames.length + system.rules.length + 1),
): readonly ValuationFiber[] {
  const orbit: ValuationFiber[] = [seed];
  let current = seed;
  for (let step = 0; step < maxSteps; step += 1) {
    const next = tstep(system, current);
    orbit.push(next);
    if (sameFiber(next, current)) break;
    current = next;
  }
  return Object.freeze(orbit);
}

export function clS(system: ClosureRuleSystem, seed: ValuationFiber): ValuationFiber {
  const orbit = closureOrbit(system, seed);
  return orbit[orbit.length - 1] as ValuationFiber;
}

function* valuationRecords(cells: readonly string[], index = 0, record: Record<string, ChargeValueName> = {}): Generator<Readonly<Record<string, ChargeValueName>>> {
  if (index === cells.length) {
    yield freezeRecord(record);
    return;
  }
  const cell = cells[index] as string;
  for (const value of chargeValueNames) {
    record[cell] = value;
    yield* valuationRecords(cells, index + 1, record);
  }
  delete record[cell];
}

function allValuations(cells: readonly string[]): readonly ValuationFiber[] {
  return Object.freeze([...valuationRecords(cells)].map((values) => valuation(cells, values)));
}

function ruleRespecting(system: ClosureRuleSystem, valuationValue: ValuationFiber): boolean {
  return system.rules.every((rule) =>
    !antecedentHolds(rule, valuationValue)
    || knowledgeLeqValue(rule.consequent.charge, readValuationFiber(valuationValue, rule.consequent.cell)),
  );
}

function checkMonotone(system: ClosureRuleSystem): boolean {
  const all = allValuations(system.cells);
  return all.every((left) => all.every((right) =>
    !valuationLeqKnowledge(left, right) || valuationLeqKnowledge(tstep(system, left), tstep(system, right)),
  ));
}

function checkLeastClosed(system: ClosureRuleSystem, seed: ValuationFiber, closed: ValuationFiber): boolean {
  if (system.cells.length > 4) {
    throw new RangeError("closureRuleReceipt: exhaustive least-closed check is limited to at most 4 cells");
  }
  return allValuations(system.cells).every((candidate) =>
    !(valuationLeqKnowledge(seed, candidate) && sameFiber(tstep(system, candidate), candidate))
    || valuationLeqKnowledge(closed, candidate),
  );
}

export function firedRuleNames(system: ClosureRuleSystem, valuationValue: ValuationFiber): readonly string[] {
  return Object.freeze(system.rules.filter((rule) => antecedentHolds(rule, valuationValue)).map((rule) => rule.name));
}

export function closureRuleReceipt(system: ClosureRuleSystem, seed: ValuationFiber): ClosureRuleReceipt {
  const orbit = closureOrbit(system, seed);
  const closed = orbit[orbit.length - 1] as ValuationFiber;
  const fixed = sameFiber(tstep(system, closed), closed);
  const inflationary = valuationLeqKnowledge(seed, closed);
  const monotone = checkMonotone(system);
  const respecting = ruleRespecting(system, closed);
  const leastClosed = checkLeastClosed(system, seed, closed);
  if (!fixed || !inflationary || !monotone || !respecting || !leastClosed) {
    throw new TypeError("closureRuleReceipt: finite immediate-consequence laws failed");
  }
  return Object.freeze({
    kind: "closureRule.system.receipt:witness" as const,
    system,
    seed,
    orbit,
    closed,
    fixed: true as const,
    inflationary: true as const,
    monotone: true as const,
    ruleRespecting: true as const,
    leastClosed: true as const,
    lfp: true as const,
    firedAtSeed: firedRuleNames(system, seed),
  });
}

export function alwaysRuleReceipt(cell = "cell", charge: ChargeValueName = "held"): ClosureRuleReceipt {
  const system = closureRuleSystem([cell], [alwaysRule(cell, charge)]);
  return closureRuleReceipt(system, knowledgeLeastValuation(system.cells));
}

export const consequentJoin = (current: ChargeValueName, consequent: ChargeValueName): ChargeValueName =>
  knowledgeJoinValueName(current, consequent);
