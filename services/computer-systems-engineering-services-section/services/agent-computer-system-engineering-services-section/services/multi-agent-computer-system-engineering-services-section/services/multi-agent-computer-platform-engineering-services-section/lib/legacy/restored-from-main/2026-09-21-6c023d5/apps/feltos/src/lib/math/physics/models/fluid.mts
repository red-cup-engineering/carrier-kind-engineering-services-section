/**
 * models/fluid - finite circulation H1.
 *
 * This captures `Obsmetrologia.Relational.Fluid.VortexCohomology`:
 * loop sums, vortex-loop circulation, gradient/exact flows, circulation
 * additivity, and the unit-vortex non-gradient obstruction.
 */

export interface VortexLoop {
  readonly kind: "relational.fluid.vortex.loop";
  readonly size: number;
  readonly velocity: (edge: number) => number;
}

export interface GradientCirculationZeroWitness {
  readonly kind: "relational.fluid.vortex.gradient_circulation_zero:witness";
  readonly loop: VortexLoop;
  readonly circulation: 0;
  readonly gradient: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Fluid.gradient_circulation_zero";
}

export interface VortexObstructionWitness {
  readonly kind: "relational.fluid.vortex.obstruction:witness";
  readonly loop: VortexLoop;
  readonly circulation: number;
  readonly h1Nonzero: true;
  readonly notGradient: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Fluid.vortex_obstruction_implies_H1_nonzero",
    "Obsmetrologia.Relational.Fluid.unitVortex_circulation",
    "Obsmetrologia.Relational.Fluid.unitVortex_not_gradient",
  ];
}

export interface CirculationSuperposeWitness {
  readonly kind: "relational.fluid.vortex.circulation_superpose:witness";
  readonly size: number;
  readonly leftCirculation: number;
  readonly rightCirculation: number;
  readonly superposedCirculation: number;
  readonly additive: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Fluid.circulation_superpose";
}

export interface FluidVortexCohomologyReceipt {
  readonly kind: "relational.fluid.vortex.receipt:witness";
  readonly gradientZero: GradientCirculationZeroWitness;
  readonly superpose: CirculationSuperposeWitness;
  readonly unit: VortexObstructionWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Fluid.VortexCohomology";
}

export function loopSum(velocity: (edge: number) => number, size: number): number {
  if (!Number.isSafeInteger(size) || size < 0) throw new RangeError("loopSum: size must be a natural number");
  let total = 0;
  for (let edge = 0; edge < size; edge += 1) total += velocity(edge);
  return total;
}

export function vortexLoop(size: number, velocity: (edge: number) => number): VortexLoop {
  if (!Number.isSafeInteger(size) || size < 0) throw new RangeError("vortexLoop: size must be a natural number");
  return Object.freeze({
    kind: "relational.fluid.vortex.loop" as const,
    size,
    velocity,
  });
}

export function circulation(loop: VortexLoop): number {
  return loopSum(loop.velocity, loop.size);
}

export function gradientVelocity(potential: (node: number) => number): (edge: number) => number {
  return (edge) => potential(edge + 1) - potential(edge);
}

export function isGradient(loop: VortexLoop, potential: (node: number) => number): boolean {
  if (potential(loop.size) !== potential(0)) return false;
  for (let edge = 0; edge < loop.size; edge += 1) {
    if (loop.velocity(edge) !== potential(edge + 1) - potential(edge)) return false;
  }
  return true;
}

export function gradientCirculationZero(loop: VortexLoop, potential: (node: number) => number): GradientCirculationZeroWitness {
  if (!isGradient(loop, potential) || circulation(loop) !== 0) throw new TypeError("gradientCirculationZero: gradient did not have zero circulation");
  return Object.freeze({
    kind: "relational.fluid.vortex.gradient_circulation_zero:witness" as const,
    loop,
    circulation: 0 as const,
    gradient: true as const,
    leanTheorem: "Obsmetrologia.Relational.Fluid.gradient_circulation_zero" as const,
  });
}

export function circulationSuperpose(size: number, left: (edge: number) => number, right: (edge: number) => number): CirculationSuperposeWitness {
  const leftCirculation = loopSum(left, size);
  const rightCirculation = loopSum(right, size);
  const superposedCirculation = loopSum((edge) => left(edge) + right(edge), size);
  if (superposedCirculation !== leftCirculation + rightCirculation) throw new TypeError("circulationSuperpose: additivity failed");
  return Object.freeze({
    kind: "relational.fluid.vortex.circulation_superpose:witness" as const,
    size,
    leftCirculation,
    rightCirculation,
    superposedCirculation,
    additive: true as const,
    leanTheorem: "Obsmetrologia.Relational.Fluid.circulation_superpose" as const,
  });
}

export function unitVortex(): VortexLoop {
  return vortexLoop(1, () => 1);
}

export function vortexObstruction(loop: VortexLoop): VortexObstructionWitness {
  const charge = circulation(loop);
  if (charge === 0) throw new TypeError("vortexObstruction: circulation vanishes");
  return Object.freeze({
    kind: "relational.fluid.vortex.obstruction:witness" as const,
    loop,
    circulation: charge,
    h1Nonzero: true as const,
    notGradient: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Fluid.vortex_obstruction_implies_H1_nonzero",
      "Obsmetrologia.Relational.Fluid.unitVortex_circulation",
      "Obsmetrologia.Relational.Fluid.unitVortex_not_gradient",
    ] as const),
  });
}

export function fluidVortexCohomologyReceipt(): FluidVortexCohomologyReceipt {
  const gradient = vortexLoop(2, gradientVelocity((node) => node === 1 ? 1 : 0));
  return Object.freeze({
    kind: "relational.fluid.vortex.receipt:witness" as const,
    gradientZero: gradientCirculationZero(gradient, (node) => node === 1 ? 1 : 0),
    superpose: circulationSuperpose(2, (edge) => edge === 0 ? 1 : -1, () => 2),
    unit: vortexObstruction(unitVortex()),
    capturedLeanModule: "Obsmetrologia.Relational.Fluid.VortexCohomology" as const,
  });
}
