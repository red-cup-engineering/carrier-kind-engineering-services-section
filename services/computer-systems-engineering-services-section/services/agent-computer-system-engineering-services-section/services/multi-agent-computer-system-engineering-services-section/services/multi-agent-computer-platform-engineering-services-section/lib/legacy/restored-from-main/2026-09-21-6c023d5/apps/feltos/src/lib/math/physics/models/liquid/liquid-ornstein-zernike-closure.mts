/**
 * models/liquid/liquid-ornstein-zernike-closure - OZ as Tarski closure.
 *
 * This captures `Obsmetrologia.Relational.Liquid.OrnsteinZernikeClosure`:
 * direct-correlation seeds, positive bin couplings, settled total correlation,
 * direct domination, OZ consistency, leastness, and fixed-image equivalence.
 */

export interface OZCoupling<Bin extends string> {
  readonly from: Bin;
  readonly to: Bin;
}

export interface OZSystem<Bin extends string> {
  readonly kind: "relational.liquid.oz.system";
  readonly bins: readonly Bin[];
  readonly direct: Readonly<Record<Bin, boolean>>;
  readonly couplings: readonly OZCoupling<Bin>[];
}

export interface OZClosureWitness<Bin extends string> {
  readonly kind: "relational.liquid.oz.closure:witness";
  readonly system: OZSystem<Bin>;
  readonly totalCorrelation: Readonly<Record<Bin, boolean>>;
  readonly dominatesDirect: true;
  readonly consistent: true;
  readonly least: true;
  readonly fixedIffImage: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Liquid.total_dominates_direct",
    "Obsmetrologia.Relational.Liquid.oz_consistent",
    "Obsmetrologia.Relational.Liquid.oz_least",
    "Obsmetrologia.Relational.Liquid.oz_image_iff_fixed",
  ];
}

export interface LiquidOrnsteinZernikeClosureReceipt {
  readonly kind: "relational.liquid.oz.receipt:witness";
  readonly closure: OZClosureWitness<"near" | "mid" | "far">;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Liquid.OrnsteinZernikeClosure";
}

function normalizeBoolRecord<Bin extends string>(bins: readonly Bin[], value: Readonly<Record<Bin, boolean>>): Readonly<Record<Bin, boolean>> {
  return Object.freeze(Object.fromEntries(bins.map((bin) => [bin, value[bin] === true])) as Record<Bin, boolean>);
}

export function ozSystem<Bin extends string>(
  bins: readonly Bin[],
  direct: Readonly<Record<Bin, boolean>>,
  couplings: readonly OZCoupling<Bin>[],
): OZSystem<Bin> {
  const admitted = Object.freeze([...new Set(bins)]);
  const known = new Set(admitted);
  for (const coupling of couplings) {
    if (!known.has(coupling.from) || !known.has(coupling.to)) throw new TypeError("ozSystem: coupling mentions unknown bin");
  }
  return Object.freeze({
    kind: "relational.liquid.oz.system" as const,
    bins: admitted,
    direct: normalizeBoolRecord(admitted, direct),
    couplings: Object.freeze(couplings.map((coupling) => Object.freeze({ ...coupling }))),
  });
}

export function totalCorrelation<Bin extends string>(system: OZSystem<Bin>): Readonly<Record<Bin, boolean>> {
  const total: Record<Bin, boolean> = { ...system.direct } as Record<Bin, boolean>;
  for (;;) {
    let changed = false;
    for (const coupling of system.couplings) {
      if (total[coupling.from] && !total[coupling.to]) {
        total[coupling.to] = true;
        changed = true;
      }
    }
    if (!changed) return Object.freeze({ ...total });
  }
}

export function ozConsistent<Bin extends string>(system: OZSystem<Bin>, field: Readonly<Record<Bin, boolean>>): boolean {
  const admitted = normalizeBoolRecord(system.bins, field);
  return system.couplings.every((coupling) => !admitted[coupling.from] || admitted[coupling.to]);
}

export function ornsteinZernikeClosure(system: OZSystem<"near" | "mid" | "far">): OZClosureWitness<"near" | "mid" | "far">;
export function ornsteinZernikeClosure<Bin extends string>(system: OZSystem<Bin>): OZClosureWitness<Bin>;
export function ornsteinZernikeClosure<Bin extends string>(system: OZSystem<Bin>): OZClosureWitness<Bin> {
  const total = totalCorrelation(system);
  const dominates = system.bins.every((bin) => !system.direct[bin] || total[bin]);
  const consistent = ozConsistent(system, total);
  const idempotent = system.bins.every((bin) => totalCorrelation({ ...system, direct: total })[bin] === total[bin]);
  if (!dominates || !consistent || !idempotent) throw new TypeError("ornsteinZernikeClosure: closure checks failed");
  return Object.freeze({
    kind: "relational.liquid.oz.closure:witness" as const,
    system,
    totalCorrelation: total,
    dominatesDirect: true as const,
    consistent: true as const,
    least: true as const,
    fixedIffImage: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Liquid.total_dominates_direct",
      "Obsmetrologia.Relational.Liquid.oz_consistent",
      "Obsmetrologia.Relational.Liquid.oz_least",
      "Obsmetrologia.Relational.Liquid.oz_image_iff_fixed",
    ] as const),
  });
}

export function liquidOrnsteinZernikeClosureReceipt(): LiquidOrnsteinZernikeClosureReceipt {
  const system = ozSystem(["near", "mid", "far"], { near: true, mid: false, far: false }, [
    { from: "near", to: "mid" },
    { from: "mid", to: "far" },
  ]);
  return Object.freeze({
    kind: "relational.liquid.oz.receipt:witness" as const,
    closure: ornsteinZernikeClosure(system),
    capturedLeanModule: "Obsmetrologia.Relational.Liquid.OrnsteinZernikeClosure" as const,
  });
}
