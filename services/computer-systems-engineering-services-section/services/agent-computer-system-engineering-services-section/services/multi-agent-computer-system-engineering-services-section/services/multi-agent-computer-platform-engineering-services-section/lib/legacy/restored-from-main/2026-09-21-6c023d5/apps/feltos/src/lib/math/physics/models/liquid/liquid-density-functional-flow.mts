/**
 * models/liquid/liquid-density-functional-flow - DFT descent as fixed point.
 *
 * This captures `Obsmetrologia.Relational.Liquid.DensityFunctionalFlow`:
 * rational free-energy descent, minimizer implies equilibrium, monotone
 * relaxation, initial-energy bound, and equilibrium orbits staying constant.
 */

export interface DFTFlow<State extends string> {
  readonly kind: "relational.liquid.dft.flow";
  readonly states: readonly State[];
  readonly omega: (state: State) => number;
  readonly step: (state: State) => State;
}

export interface DFTFlowWitness<State extends string> {
  readonly kind: "relational.liquid.dft.flow:witness";
  readonly flow: DFTFlow<State>;
  readonly minimizer: State;
  readonly equilibrium: true;
  readonly orbitNonIncreasing: true;
  readonly orbitBelowInitial: true;
  readonly equilibriumOrbitConstant: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Liquid.minimizer_is_equilibrium",
    "Obsmetrologia.Relational.Liquid.orbit_Omega_antitone",
    "Obsmetrologia.Relational.Liquid.orbit_Omega_le_init",
    "Obsmetrologia.Relational.Liquid.equilibrium_orbit_const",
  ];
}

export interface LiquidDensityFunctionalFlowReceipt {
  readonly kind: "relational.liquid.dft.receipt:witness";
  readonly settled: DFTFlowWitness<"rho">;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Liquid.DensityFunctionalFlow";
}

export function dftFlow<State extends string>(
  states: readonly State[],
  omega: (state: State) => number,
  step: (state: State) => State,
): DFTFlow<State> {
  const admitted = Object.freeze([...new Set(states)]);
  if (admitted.length === 0) throw new TypeError("dftFlow: expected at least one state");
  const known = new Set(admitted);
  for (const state of admitted) {
    if (!known.has(step(state))) throw new TypeError("dftFlow: step leaves state space");
    if (omega(step(state)) > omega(state)) throw new TypeError("dftFlow: step raises Omega");
    if (omega(step(state)) === omega(state) && step(state) !== state) throw new TypeError("dftFlow: equal-energy step did not settle");
  }
  return Object.freeze({
    kind: "relational.liquid.dft.flow" as const,
    states: admitted,
    omega,
    step,
  });
}

export function dftIsEquilibrium<State extends string>(flow: DFTFlow<State>, state: State): boolean {
  return flow.step(state) === state;
}

export function dftIsMinimizer<State extends string>(flow: DFTFlow<State>, state: State): boolean {
  return flow.states.every((candidate) => flow.omega(state) <= flow.omega(candidate));
}

export function dftOrbit<State extends string>(flow: DFTFlow<State>, state: State, steps: number): State {
  if (!Number.isSafeInteger(steps) || steps < 0) throw new RangeError("dftOrbit: expected a natural number of steps");
  let current = state;
  for (let index = 0; index < steps; index += 1) current = flow.step(current);
  return current;
}

export function dftFlowWitness<State extends string>(flow: DFTFlow<State>, minimizer: State): DFTFlowWitness<State> {
  if (!dftIsMinimizer(flow, minimizer) || !dftIsEquilibrium(flow, minimizer)) {
    throw new TypeError("dftFlowWitness: minimizer/equilibrium check failed");
  }
  const orbitNonIncreasing = flow.states.every((state) => flow.omega(dftOrbit(flow, state, 1)) <= flow.omega(state));
  const orbitBelowInitial = flow.states.every((state) => flow.omega(dftOrbit(flow, state, 3)) <= flow.omega(state));
  const equilibriumOrbitConstant = dftOrbit(flow, minimizer, 3) === minimizer;
  if (!orbitNonIncreasing || !orbitBelowInitial || !equilibriumOrbitConstant) {
    throw new TypeError("dftFlowWitness: orbit checks failed");
  }
  return Object.freeze({
    kind: "relational.liquid.dft.flow:witness" as const,
    flow,
    minimizer,
    equilibrium: true as const,
    orbitNonIncreasing: true as const,
    orbitBelowInitial: true as const,
    equilibriumOrbitConstant: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Liquid.minimizer_is_equilibrium",
      "Obsmetrologia.Relational.Liquid.orbit_Omega_antitone",
      "Obsmetrologia.Relational.Liquid.orbit_Omega_le_init",
      "Obsmetrologia.Relational.Liquid.equilibrium_orbit_const",
    ] as const),
  });
}

export function settledDFTFlow(): DFTFlow<"rho"> {
  return dftFlow(["rho"], () => 0, (state) => state);
}

export function liquidDensityFunctionalFlowReceipt(): LiquidDensityFunctionalFlowReceipt {
  const flow = settledDFTFlow();
  return Object.freeze({
    kind: "relational.liquid.dft.receipt:witness" as const,
    settled: dftFlowWitness(flow, "rho"),
    capturedLeanModule: "Obsmetrologia.Relational.Liquid.DensityFunctionalFlow" as const,
  });
}
