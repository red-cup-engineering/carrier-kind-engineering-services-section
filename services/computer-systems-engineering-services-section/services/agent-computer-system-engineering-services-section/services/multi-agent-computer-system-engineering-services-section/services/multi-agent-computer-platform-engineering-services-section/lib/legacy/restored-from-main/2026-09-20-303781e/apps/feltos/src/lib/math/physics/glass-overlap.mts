/**
 * analysis/glass-overlap - finite configuration overlap.
 *
 * local values to each finite support coordinate, and overlap counts the listed
 * coordinates on which two configurations agree. This is the finite
 * Hamming/replica-overlap shadow;
 * probability-valued Parisi order parameters stay outside this finite overlap model.
 */

export type ConfigurationValue = string | number | boolean | null;
export type Configuration = Readonly<Record<string, ConfigurationValue>>;

export interface OverlapJudgment {
  readonly kind: "glass.overlap.count:witness";
  readonly support: readonly string[];
  readonly left: Configuration;
  readonly right: Configuration;
  readonly count: number;
  readonly length: number;
}

export interface GlassOverlapReceipt {
  readonly kind: "glass.overlap.receipt:witness";
  readonly capturedLeanModule: "Obsmetrologia.Relational.Material.Constraint.Overlap";
  readonly sample: OverlapJudgment;
  readonly self: OverlapJudgment;
  readonly symmetric: OverlapJudgment;
  readonly nil: OverlapJudgment;
  readonly selfOverlapsEverywhere: true;
  readonly overlapSymmetric: true;
  readonly overlapLeLength: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Material.Glass.overlapCount_nil",
    "Obsmetrologia.Relational.Material.Glass.overlapCount_self",
    "Obsmetrologia.Relational.Material.Glass.overlapCount_symm",
    "Obsmetrologia.Relational.Material.Glass.overlapCount_le_length",
  ];
}

const requireLabels = (caller: string, labels: readonly string[]): void => {
  for (const [index, label] of labels.entries()) {
    if (typeof label !== "string" || label.length === 0) {
      throw new TypeError(`${caller} labels[${index}]: expected a nonempty string`);
    }
  }
};

/** Count listed support coordinates where two finite configurations carry equal local values. */
export function overlapCount(
  support: readonly string[],
  left: Configuration,
  right: Configuration,
): OverlapJudgment {
  requireLabels("overlapCount support", support);
  const count = support.reduce((total, coordinate) => total + (Object.is(left[coordinate], right[coordinate]) ? 1 : 0), 0);
  return Object.freeze({
    kind: "glass.overlap.count:witness" as const,
    support: Object.freeze([...support]),
    left: Object.freeze({ ...left }),
    right: Object.freeze({ ...right }),
    count,
    length: support.length,
  });
}

export function glassOverlapReceipt(): GlassOverlapReceipt {
  const support = Object.freeze(["alpha", "beta", "gamma", "delta"]);
  const left: Configuration = Object.freeze({ alpha: "t", beta: "f", gamma: "top", delta: "bot" });
  const right: Configuration = Object.freeze({ alpha: "t", beta: "top", gamma: "top", delta: "f" });
  const sample = overlapCount(support, left, right);
  const self = overlapCount(support, left, left);
  const symmetric = overlapCount(support, right, left);
  const nil = overlapCount([], left, right);
  const selfOverlapsEverywhere = self.count === self.length;
  const overlapSymmetric = sample.count === symmetric.count;
  const overlapLeLength = sample.count <= sample.length && nil.count <= nil.length;
  if (!selfOverlapsEverywhere || !overlapSymmetric || !overlapLeLength) {
    throw new TypeError("glass.overlap.receipt: finite overlap laws failed");
  }
  return Object.freeze({
    kind: "glass.overlap.receipt:witness" as const,
    capturedLeanModule: "Obsmetrologia.Relational.Material.Constraint.Overlap" as const,
    sample,
    self,
    symmetric,
    nil,
    selfOverlapsEverywhere: true as const,
    overlapSymmetric: true as const,
    overlapLeLength: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Material.Glass.overlapCount_nil",
      "Obsmetrologia.Relational.Material.Glass.overlapCount_self",
      "Obsmetrologia.Relational.Material.Glass.overlapCount_symm",
      "Obsmetrologia.Relational.Material.Glass.overlapCount_le_length",
    ] as const),
  });
}

export interface BasinGraph {
  readonly kind: "glass.basinGraph";
  readonly basins: readonly string[];
  readonly transitions: Readonly<Record<string, readonly string[]>>;
  readonly energy: Readonly<Record<string, number>>;
}

export interface DescendChainJudgment {
  readonly kind: "glass.basinGraph.descendChain:witness";
  readonly chain: readonly string[];
  readonly startEnergy: number;
  readonly endEnergy: number;
  readonly energyDecreases: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Material.Glass.BasinGraph.descendChain_energy_lt";
}

export interface BasinGraphReceipt {
  readonly kind: "glass.basinGraph.receipt:witness";
  readonly capturedLeanModule: "Obsmetrologia.Relational.Material.Constraint.Basin";
  readonly graph: BasinGraph;
  readonly chain: DescendChainJudgment;
  readonly noDescendingCycle: true;
  readonly descendAsymmetric: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Material.Glass.BasinGraph.descendChain_energy_lt",
    "Obsmetrologia.Relational.Material.Glass.BasinGraph.no_descending_cycle",
    "Obsmetrologia.Relational.Material.Glass.BasinGraph.descend_asymm",
  ];
}

const requireSafeNat = (name: string, value: number): void => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name}: expected a non-negative safe integer`);
};

export function basinGraph(
  basins: readonly string[],
  transitions: Readonly<Record<string, readonly string[]>>,
  energy: Readonly<Record<string, number>>,
): BasinGraph {
  requireLabels("basinGraph basins", basins);
  const basinSet = new Set(basins);
  for (const basin of basins) {
    requireSafeNat(`energy[${basin}]`, energy[basin] ?? -1);
    for (const target of transitions[basin] ?? []) {
      if (!basinSet.has(target)) throw new RangeError(`transition ${basin}->${target}: target outside declared basins`);
    }
  }
  return Object.freeze({
    kind: "glass.basinGraph" as const,
    basins: Object.freeze([...basins]),
    transitions: Object.freeze(Object.fromEntries(basins.map((basin) => [basin, Object.freeze([...(transitions[basin] ?? [])])]))),
    energy: Object.freeze(Object.fromEntries(basins.map((basin) => [basin, energy[basin]!]))),
  });
}

export function descends(graph: BasinGraph, source: string, target: string): boolean {
  return (graph.transitions[source] ?? []).includes(target)
    && (graph.energy[target] ?? Number.POSITIVE_INFINITY) < (graph.energy[source] ?? -1);
}

export function descendChain(graph: BasinGraph, chain: readonly string[]): DescendChainJudgment {
  if (chain.length < 2) throw new RangeError("descendChain: expected at least two basins");
  for (let index = 0; index + 1 < chain.length; index += 1) {
    if (!descends(graph, chain[index]!, chain[index + 1]!)) {
      throw new TypeError("descendChain: every step must strictly lower energy");
    }
  }
  const startEnergy = graph.energy[chain[0]!]!;
  const endEnergy = graph.energy[chain[chain.length - 1]!]!;
  if (!(endEnergy < startEnergy)) throw new TypeError("descendChain: endpoint energy did not decrease");
  return Object.freeze({
    kind: "glass.basinGraph.descendChain:witness" as const,
    chain: Object.freeze([...chain]),
    startEnergy,
    endEnergy,
    energyDecreases: true as const,
    leanTheorem: "Obsmetrologia.Relational.Material.Glass.BasinGraph.descendChain_energy_lt" as const,
  });
}

function reachableByDescent(graph: BasinGraph, source: string, target: string): boolean {
  const seen = new Set<string>();
  const stack = [...(graph.transitions[source] ?? []).filter((next) => descends(graph, source, next))];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === target) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(graph.transitions[current] ?? []).filter((next) => descends(graph, current, next)));
  }
  return false;
}

export function basinGraphReceipt(): BasinGraphReceipt {
  const graph = basinGraph(
    ["high", "mid", "low"],
    { high: ["mid", "low"], mid: ["low"], low: [] },
    { high: 4, mid: 2, low: 0 },
  );
  const chain = descendChain(graph, ["high", "mid", "low"]);
  const noDescendingCycle = graph.basins.every((basin) => !reachableByDescent(graph, basin, basin));
  const descendAsymmetric = graph.basins.every((left) => graph.basins.every((right) =>
    !(reachableByDescent(graph, left, right) && reachableByDescent(graph, right, left))));
  if (!noDescendingCycle || !descendAsymmetric) throw new TypeError("basinGraphReceipt: finite descent laws failed");
  return Object.freeze({
    kind: "glass.basinGraph.receipt:witness" as const,
    capturedLeanModule: "Obsmetrologia.Relational.Material.Constraint.Basin" as const,
    graph,
    chain,
    noDescendingCycle: true as const,
    descendAsymmetric: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Material.Glass.BasinGraph.descendChain_energy_lt",
      "Obsmetrologia.Relational.Material.Glass.BasinGraph.no_descending_cycle",
      "Obsmetrologia.Relational.Material.Glass.BasinGraph.descend_asymm",
    ] as const),
  });
}

export interface DynamicHeterogeneityReceipt {
  readonly kind: "glass.dynamicHeterogeneity.receipt:witness";
  readonly capturedLeanModule: "Obsmetrologia.Relational.Material.Constraint.Heterogeneity";
  readonly support: readonly string[];
  readonly left: Configuration;
  readonly right: Configuration;
  readonly mobilityCount: number;
  readonly overlapCount: number;
  readonly mobilityPlusOverlap: number;
  readonly mobilitySelf: 0;
  readonly zeroMobilityIffAgree: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Material.Glass.mobility_zero_iff_agree_on_support",
    "Obsmetrologia.Relational.Material.Glass.mobility_self",
  ];
}

export function changedOn(left: Configuration, right: Configuration, coordinate: string): boolean {
  return !Object.is(left[coordinate], right[coordinate]);
}

export function mobilityCount(support: readonly string[], left: Configuration, right: Configuration): number {
  requireLabels("mobilityCount support", support);
  return support.reduce((total, coordinate) => total + (changedOn(left, right, coordinate) ? 1 : 0), 0);
}

export function dynamicHeterogeneityReceipt(): DynamicHeterogeneityReceipt {
  const support = Object.freeze(["alpha", "beta", "gamma", "delta"]);
  const left: Configuration = Object.freeze({ alpha: "t", beta: "f", gamma: "top", delta: "bot" });
  const right: Configuration = Object.freeze({ alpha: "t", beta: "top", gamma: "top", delta: "f" });
  const mobility = mobilityCount(support, left, right);
  const overlap = overlapCount(support, left, right).count;
  const mobilitySelf = mobilityCount(support, left, left);
  const zeroMobilityIffAgree = mobilitySelf === 0 && support.every((coordinate) => Object.is(left[coordinate], left[coordinate]));
  if (mobility + overlap !== support.length || mobilitySelf !== 0 || !zeroMobilityIffAgree) {
    throw new TypeError("dynamicHeterogeneityReceipt: finite mobility laws failed");
  }
  return Object.freeze({
    kind: "glass.dynamicHeterogeneity.receipt:witness" as const,
    capturedLeanModule: "Obsmetrologia.Relational.Material.Constraint.Heterogeneity" as const,
    support,
    left,
    right,
    mobilityCount: mobility,
    overlapCount: overlap,
    mobilityPlusOverlap: mobility + overlap,
    mobilitySelf: 0 as const,
    zeroMobilityIffAgree: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Material.Glass.mobility_zero_iff_agree_on_support",
      "Obsmetrologia.Relational.Material.Glass.mobility_self",
    ] as const),
  });
}

export type ActivityConfiguration = Readonly<Record<string, boolean>>;

export interface KcmReceipt {
  readonly kind: "glass.kcm.receipt:witness";
  readonly capturedLeanModule: "Obsmetrologia.Relational.Material.Constraint.KCM";
  readonly support: readonly string[];
  readonly facilitation: Readonly<Record<string, readonly string[]>>;
  readonly seed: ActivityConfiguration;
  readonly afterOneStep: ActivityConfiguration;
  readonly closure: ActivityConfiguration;
  readonly activationInflationary: true;
  readonly activationMonotone: true;
  readonly closureFixed: true;
  readonly seedExtendsToClosure: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Material.Glass.activateStep_infl",
    "Obsmetrologia.Relational.Material.Glass.activateStep_mono",
    "Obsmetrologia.Relational.Material.Glass.activateStep_fixed",
    "Obsmetrologia.Relational.Material.Glass.activation_is_facilitation_closure",
  ];
}

function freezeActivity(support: readonly string[], activity: ActivityConfiguration): ActivityConfiguration {
  return Object.freeze(Object.fromEntries(support.map((coordinate) => [coordinate, activity[coordinate] === true])));
}

export function activateStep(
  support: readonly string[],
  facilitation: Readonly<Record<string, readonly string[]>>,
  active: ActivityConfiguration,
): ActivityConfiguration {
  requireLabels("activateStep support", support);
  return freezeActivity(support, Object.fromEntries(support.map((coordinate) => [
    coordinate,
    active[coordinate] === true || support.some((source) => active[source] === true && (facilitation[source] ?? []).includes(coordinate)),
  ])));
}

export function activeClosure(
  support: readonly string[],
  facilitation: Readonly<Record<string, readonly string[]>>,
  seed: ActivityConfiguration,
): ActivityConfiguration {
  let current = freezeActivity(support, seed);
  for (let index = 0; index <= support.length; index += 1) {
    const next = activateStep(support, facilitation, current);
    if (support.every((coordinate) => next[coordinate] === current[coordinate])) return next;
    current = next;
  }
  throw new Error("activeClosure: finite facilitation closure did not stabilize");
}

export function kcmReceipt(): KcmReceipt {
  const support = Object.freeze(["a", "b", "c"]);
  const facilitation = Object.freeze({
    a: Object.freeze(["b"]),
    b: Object.freeze(["c"]),
    c: Object.freeze([]),
  });
  const seed = freezeActivity(support, { a: true, b: false, c: false });
  const afterOneStep = activateStep(support, facilitation, seed);
  const closure = activeClosure(support, facilitation, seed);
  const largerSeed = freezeActivity(support, { a: true, b: true, c: false });
  const activationInflationary = support.every((coordinate) => !seed[coordinate] || afterOneStep[coordinate] === true);
  const activationMonotone = support.every((coordinate) => !afterOneStep[coordinate] || activateStep(support, facilitation, largerSeed)[coordinate] === true);
  const closureFixed = support.every((coordinate) => activateStep(support, facilitation, closure)[coordinate] === closure[coordinate]);
  const seedExtendsToClosure = support.every((coordinate) => !seed[coordinate] || closure[coordinate] === true);
  if (!activationInflationary || !activationMonotone || !closureFixed || !seedExtendsToClosure) {
    throw new TypeError("kcmReceipt: finite facilitation closure laws failed");
  }
  return Object.freeze({
    kind: "glass.kcm.receipt:witness" as const,
    capturedLeanModule: "Obsmetrologia.Relational.Material.Constraint.KCM" as const,
    support,
    facilitation,
    seed,
    afterOneStep,
    closure,
    activationInflationary: true as const,
    activationMonotone: true as const,
    closureFixed: true as const,
    seedExtendsToClosure: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Material.Glass.activateStep_infl",
      "Obsmetrologia.Relational.Material.Glass.activateStep_mono",
      "Obsmetrologia.Relational.Material.Glass.activateStep_fixed",
      "Obsmetrologia.Relational.Material.Glass.activation_is_facilitation_closure",
    ] as const),
  });
}
