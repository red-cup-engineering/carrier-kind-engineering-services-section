/**
 * models/dense-matter/eos - finite EOS admissibility.
 *
 * This captures `Obsmetrologia.Relational.DenseMatter.EOS`: sampled pressure
 * and energy, stability, causality, admissibility, incompressible limit,
 * causal speed bounds, and stiff/superluminal witnesses.
 */

export interface FiniteEOS {
  readonly kind: "relational.denseMatter.eos.finite";
  readonly samples: readonly number[];
  readonly pressure: (sample: number) => number;
  readonly energy: (sample: number) => number;
}

export interface EOSAdmissibilityWitness {
  readonly kind: "relational.denseMatter.eos.admissible:witness";
  readonly eos: FiniteEOS;
  readonly c2: number;
  readonly stable: true;
  readonly causal: true;
  readonly leanDefinitions: readonly [
    "Obsmetrologia.Relational.DenseMatter.StableEOS",
    "Obsmetrologia.Relational.DenseMatter.CausalEOS",
    "Obsmetrologia.Relational.DenseMatter.Admissible",
  ];
}

export interface EOSSpeedBoundWitness {
  readonly kind: "relational.denseMatter.eos.speed_bound:witness";
  readonly eos: FiniteEOS;
  readonly c2: number;
  readonly a: number;
  readonly b: number;
  readonly pressureBound: number;
  readonly withinBound: true;
  readonly leanTheorem: "Obsmetrologia.Relational.DenseMatter.admissible_speed_bound";
}

export interface DenseMatterEOSReceipt {
  readonly kind: "relational.denseMatter.eos.receipt:witness";
  readonly stiff: EOSAdmissibilityWitness;
  readonly speedBound: EOSSpeedBoundWitness;
  readonly incompressibleUniform: true;
  readonly superluminalRejected: true;
  readonly maxStable: true;
  readonly capturedLeanModule: "Obsmetrologia.Relational.DenseMatter.EOS";
}

function checkSamples(samples: readonly number[]): readonly number[] {
  if (samples.length === 0) throw new TypeError("finiteEOS: expected samples");
  return Object.freeze(samples.map((sample) => {
    if (!Number.isSafeInteger(sample) || sample < 0) throw new TypeError("finiteEOS: samples must be natural numbers");
    return sample;
  }));
}

export function finiteEOS(samples: readonly number[], pressure: (sample: number) => number, energy: (sample: number) => number): FiniteEOS {
  return Object.freeze({
    kind: "relational.denseMatter.eos.finite" as const,
    samples: checkSamples(samples),
    pressure,
    energy,
  });
}

export function stableEOS(eos: FiniteEOS): boolean {
  return eos.samples.every((a) => eos.samples.every((b) => a > b || eos.pressure(a) <= eos.pressure(b)));
}

export function causalEOS(eos: FiniteEOS, c2: number): boolean {
  return eos.samples.every((a) => eos.samples.every((b) =>
    a > b || eos.pressure(b) - eos.pressure(a) <= c2 * (eos.energy(b) - eos.energy(a))));
}

export function admissibleEOS(eos: FiniteEOS, c2: number): EOSAdmissibilityWitness {
  if (!stableEOS(eos) || !causalEOS(eos, c2)) throw new TypeError("admissibleEOS: EOS is not stable and causal");
  return Object.freeze({
    kind: "relational.denseMatter.eos.admissible:witness" as const,
    eos,
    c2,
    stable: true as const,
    causal: true as const,
    leanDefinitions: Object.freeze([
      "Obsmetrologia.Relational.DenseMatter.StableEOS",
      "Obsmetrologia.Relational.DenseMatter.CausalEOS",
      "Obsmetrologia.Relational.DenseMatter.Admissible",
    ] as const),
  });
}

export function admissibleSpeedBound(eos: FiniteEOS, c2: number, a: number, b: number): EOSSpeedBoundWitness {
  admissibleEOS(eos, c2);
  const pressureBound = eos.pressure(a) + c2 * (eos.energy(b) - eos.energy(a));
  if (eos.pressure(b) > pressureBound) throw new TypeError("admissibleSpeedBound: pressure outran bound");
  return Object.freeze({
    kind: "relational.denseMatter.eos.speed_bound:witness" as const,
    eos,
    c2,
    a,
    b,
    pressureBound,
    withinBound: true as const,
    leanTheorem: "Obsmetrologia.Relational.DenseMatter.admissible_speed_bound" as const,
  });
}

export function stiffEOS(): FiniteEOS {
  return finiteEOS([0, 1, 2, 3], (n) => n, (n) => n);
}

export function superluminalEOS(): FiniteEOS {
  return finiteEOS([0, 1, 2, 3], (n) => 2 * n, (n) => n);
}

export function incompressibleOfCausalZero(eos: FiniteEOS): boolean {
  if (!stableEOS(eos) || !causalEOS(eos, 0)) return false;
  return eos.samples.every((a) => eos.samples.every((b) => a > b || eos.pressure(a) === eos.pressure(b)));
}

export function maxEOS(left: FiniteEOS, right: FiniteEOS): FiniteEOS {
  return finiteEOS(left.samples, (n) => Math.max(left.pressure(n), right.pressure(n)), left.energy);
}

export function denseMatterEOSReceipt(): DenseMatterEOSReceipt {
  const stiff = stiffEOS();
  const flat = finiteEOS([0, 1, 2], () => 4, (n) => n);
  return Object.freeze({
    kind: "relational.denseMatter.eos.receipt:witness" as const,
    stiff: admissibleEOS(stiff, 1),
    speedBound: admissibleSpeedBound(stiff, 1, 0, 3),
    incompressibleUniform: incompressibleOfCausalZero(flat) as true,
    superluminalRejected: !causalEOS(superluminalEOS(), 1) as true,
    maxStable: stableEOS(maxEOS(stiff, flat)) as true,
    capturedLeanModule: "Obsmetrologia.Relational.DenseMatter.EOS" as const,
  });
}
