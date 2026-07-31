import { fromCount, natEqual, natIsZero, natZero, predecessor, successor, toCount, type Natural } from "@emsenn/meme-algebra";
import { mark, type Mark } from "@emsenn/meme-algebra";

export interface ZeroOrdinal {
  readonly kind: "ordinal.closure.ordinal.zero";
}

export interface SuccessorOrdinal {
  readonly kind: "ordinal.closure.ordinal.successor";
  readonly predecessor: Ordinal;
}

export interface OrdinalLabel {
  readonly kind: "ordinal.closure.ordinalLabel";
  readonly mark: Mark;
}

export interface LimitOrdinal {
  readonly kind: "ordinal.closure.ordinal.limit";
  readonly label: OrdinalLabel;
  readonly fundamentalSequence: (n: Natural) => Ordinal;
}

export type Ordinal = ZeroOrdinal | SuccessorOrdinal | LimitOrdinal;

export interface FiniteOrdinalWitness {
  readonly kind: "ordinal.closure.finiteOrdinal:witness";
  readonly ordinal: Ordinal;
  readonly value: Natural;
}

export interface FiniteOrdinalObstruction {
  readonly kind: "ordinal.closure.finiteOrdinal-obstruction";
  readonly ordinal: Ordinal;
  readonly residue: Ordinal;
}

export type FiniteOrdinalJudgment = FiniteOrdinalWitness | FiniteOrdinalObstruction;

export interface FiniteClosureRegime {
  readonly kind: "ordinal.closure.regime.finite";
}

export interface ScottClosureRegime {
  readonly kind: "ordinal.closure.regime.scott";
}

export interface TransfiniteClosureRegime {
  readonly kind: "ordinal.closure.regime.transfinite";
}

export interface AperiodicClosureRegime {
  readonly kind: "ordinal.closure.regime.aperiodic";
}

export type StabilizingClosureRegime =
  | FiniteClosureRegime
  | ScottClosureRegime
  | TransfiniteClosureRegime;

export type ClosureRegime = StabilizingClosureRegime | AperiodicClosureRegime;

export interface Lattice<T> {
  readonly bottom: T;
  readonly leq: (left: T, right: T) => boolean;
  readonly join: (left: T, right: T) => T;
  readonly eq: (left: T, right: T) => boolean;
  readonly sup: (sequence: (n: Natural) => T) => T;
}

/** The regime judgment lives on `search`: a witness carries its stabilizing
 *  regime; an obstruction carries no regime claim at all — exhausting the
 *  bounded horizon witnesses nothing about κ beyond `searchedThrough`. */
export interface ClosureCarrier<T> {
  readonly kind: "ordinal.closure.carrier";
  readonly process: ClosureProcessCarrier<T>;
  readonly value: T;
  readonly orbit: readonly ClosureOrbitPoint<T>[];
  readonly search: ClosureStabilizationSearchJudgment<T>;
  readonly stabilization: ClosureStabilizationJudgment<T>;
}

export interface ClosureProcessCarrier<T> {
  readonly kind: "ordinal.closure.process";
  readonly lattice: Lattice<T>;
  readonly endomorphism: (value: T) => T;
  readonly horizon: ClosureStabilizationSearchHorizon;
}

export interface ClosureOrbitPoint<T> {
  readonly kind: "ordinal.closure.orbitPoint";
  readonly stage: Ordinal;
  readonly value: T;
}

export interface ClosureStabilizationWitness<T> {
  readonly kind: "ordinal.closure.stabilization:witness";
  readonly ordinal: Ordinal;
  readonly value: T;
  readonly successor: T;
}

export interface ClosureStabilizationObstruction<T> {
  readonly kind: "ordinal.closure.stabilization-obstruction";
  readonly searchedThrough: Ordinal;
  readonly value: T;
  readonly successor: T;
}

export type ClosureStabilizationJudgment<T> = ClosureStabilizationWitness<T> | ClosureStabilizationObstruction<T>;

export interface ClosureStabilizationSearchWitness<T> {
  readonly kind: "ordinal.closure.stabilizationSearch:witness";
  readonly ordinal: Ordinal;
  readonly regime: StabilizingClosureRegime;
  readonly stabilization: ClosureStabilizationWitness<T>;
}

export interface ClosureStabilizationSearchObstruction<T> {
  readonly kind: "ordinal.closure.stabilizationSearch-obstruction";
  readonly searchedThrough: Ordinal;
  readonly stabilization: ClosureStabilizationObstruction<T>;
}

export type ClosureStabilizationSearchJudgment<T> =
  | ClosureStabilizationSearchWitness<T>
  | ClosureStabilizationSearchObstruction<T>;

export interface ClosureStabilizationSearchHorizon {
  readonly kind: "ordinal.closure.stabilizationSearchHorizon";
  readonly finiteStages: Natural;
  readonly limitBlocks: Natural;
}

export interface ClosureSearchBlock {
  readonly kind: "ordinal.closure.searchBlock";
  readonly base: Ordinal;
  readonly finiteStages: Natural;
}

export const zeroOrdinal = (): ZeroOrdinal => Object.freeze({ kind: "ordinal.closure.ordinal.zero" as const });
export const successorOrdinal = (predecessorOrdinal: Ordinal): SuccessorOrdinal => Object.freeze({
  kind: "ordinal.closure.ordinal.successor" as const,
  predecessor: predecessorOrdinal,
});
export const ordinalLabel = (label: Mark): OrdinalLabel => Object.freeze({
  kind: "ordinal.closure.ordinalLabel" as const,
  mark: label,
});
export const limitOrdinal = (label: OrdinalLabel, fundamentalSequence: (n: Natural) => Ordinal): LimitOrdinal => Object.freeze({
  kind: "ordinal.closure.ordinal.limit" as const,
  label,
  fundamentalSequence,
});

export const finiteOrdinal = (n: Natural): Ordinal => {
  let ordinal: Ordinal = zeroOrdinal();
  for (let index = 0; index < toCount(n); index += 1) ordinal = successorOrdinal(ordinal);
  return ordinal;
};

export const ordinalPlusFinite = (ordinal: Ordinal, n: Natural): Ordinal => {
  let out = ordinal;
  for (let index = 0; index < toCount(n); index += 1) out = successorOrdinal(out);
  return out;
};

export const omegaOrdinal = (): Ordinal => limitOrdinal(ordinalLabel(mark("omega")), (n) => finiteOrdinal(n));
export const omegaMultipleOrdinal = (k: Natural): Ordinal => natIsZero(k)
  ? zeroOrdinal()
  : limitOrdinal(
    ordinalLabel(mark(natEqual(k, successor(natZero)) ? "omega" : `omega*${toCount(k)}`)),
    (n) => ordinalPlusFinite(omegaMultipleOrdinal(predecessor(k)), n),
  );
export const omegaSquaredOrdinal = (): Ordinal => limitOrdinal(ordinalLabel(mark("omega^2")), (n) => omegaMultipleOrdinal(n));
export const isZeroOrdinal = (ordinal: Ordinal): ordinal is ZeroOrdinal =>
  ordinal.kind === "ordinal.closure.ordinal.zero";
export const isSuccessorOrdinal = (ordinal: Ordinal): ordinal is SuccessorOrdinal =>
  ordinal.kind === "ordinal.closure.ordinal.successor";
export const isLimitOrdinal = (ordinal: Ordinal): ordinal is LimitOrdinal =>
  ordinal.kind === "ordinal.closure.ordinal.limit";

export const finiteClosureRegime = (): FiniteClosureRegime => Object.freeze({
  kind: "ordinal.closure.regime.finite" as const,
});

export const scottClosureRegime = (): ScottClosureRegime => Object.freeze({
  kind: "ordinal.closure.regime.scott" as const,
});

export const transfiniteClosureRegime = (): TransfiniteClosureRegime => Object.freeze({
  kind: "ordinal.closure.regime.transfinite" as const,
});

export const aperiodicClosureRegime = (): AperiodicClosureRegime => Object.freeze({
  kind: "ordinal.closure.regime.aperiodic" as const,
});

export const closureStabilizationSearchHorizon = (
  finiteStages: Natural,
  limitBlocks: Natural,
): ClosureStabilizationSearchHorizon => Object.freeze({
  kind: "ordinal.closure.stabilizationSearchHorizon" as const,
  finiteStages,
  limitBlocks,
});

export const closureProcess = <T,>(
  lattice: Lattice<T>,
  endomorphism: (value: T) => T,
  horizon: ClosureStabilizationSearchHorizon = closureStabilizationSearchHorizon(fromCount(64), fromCount(4)),
): ClosureProcessCarrier<T> => Object.freeze({
  kind: "ordinal.closure.process" as const,
  lattice,
  endomorphism,
  horizon,
});

export const closureSearchBlock = (
  base: Ordinal,
  finiteStages: Natural,
): ClosureSearchBlock => Object.freeze({
  kind: "ordinal.closure.searchBlock" as const,
  base,
  finiteStages,
});

export function closureSearchBlocks(horizon: ClosureStabilizationSearchHorizon): readonly ClosureSearchBlock[] {
  const limitBlockCount = toCount(horizon.limitBlocks);
  return Object.freeze([
    closureSearchBlock(zeroOrdinal(), horizon.finiteStages),
    ...Array.from({ length: limitBlockCount }, (_, index) =>
      closureSearchBlock(omegaMultipleOrdinal(successor(fromCount(index))), horizon.finiteStages)),
  ]);
}

export function finiteOrdinalJudgment(ordinal: Ordinal): FiniteOrdinalJudgment {
  let current = ordinal;
  let value = natZero;
  while (current.kind === "ordinal.closure.ordinal.successor") {
    value = successor(value);
    current = current.predecessor;
  }
  return current.kind === "ordinal.closure.ordinal.zero"
    ? Object.freeze({
      kind: "ordinal.closure.finiteOrdinal:witness" as const,
      ordinal,
      value,
    })
    : Object.freeze({
      kind: "ordinal.closure.finiteOrdinal-obstruction" as const,
      ordinal,
      residue: current,
    });
}

export function showOrdinal(ordinal: Ordinal): string {
  if (ordinal.kind === "ordinal.closure.ordinal.zero") return "0";
  if (ordinal.kind === "ordinal.closure.ordinal.limit") return String(ordinal.label.mark.value);
  const finite = finiteOrdinalJudgment(ordinal);
  if (finite.kind === "ordinal.closure.finiteOrdinal:witness") return String(toCount(finite.value));
  return `${showOrdinal(ordinal.predecessor)}+1`;
}

function approx<T>(
  lattice: Lattice<T>,
  phi: (value: T) => T,
  ordinal: Ordinal,
): T {
  switch (ordinal.kind) {
    case "ordinal.closure.ordinal.zero":
      return lattice.bottom;
    case "ordinal.closure.ordinal.successor":
      return phi(approx(lattice, phi, ordinal.predecessor));
    case "ordinal.closure.ordinal.limit":
      return lattice.sup((n) => approx(lattice, phi, ordinal.fundamentalSequence(n)));
  }
}

export const closureApproximant = <T,>(
  process: ClosureProcessCarrier<T>,
  ordinal: Ordinal,
): T => approx(process.lattice, process.endomorphism, ordinal);

function* closureOrbit<T>(lattice: Lattice<T>, phi: (value: T) => T): Generator<ClosureOrbitPoint<T>> {
  let value = lattice.bottom;
  let stage: Ordinal = zeroOrdinal();
  yield closureOrbitPoint(stage, value);
  for (;;) {
    value = phi(value);
    stage = successorOrdinal(stage);
    yield closureOrbitPoint(stage, value);
  }
}

export function* closureOrbitOfProcess<T>(process: ClosureProcessCarrier<T>): Generator<ClosureOrbitPoint<T>> {
  yield* closureOrbit(process.lattice, process.endomorphism);
}

const closureOrbitPoint = <T,>(stage: Ordinal, value: T): ClosureOrbitPoint<T> => Object.freeze({
  kind: "ordinal.closure.orbitPoint" as const,
  stage,
  value,
});

export const stabilizingSup = <T,>(lattice: Pick<Lattice<T>, "eq">) => (sequence: (n: Natural) => T): T => {
  let previous = sequence(natZero);
  for (let index = successor(natZero); ; index = successor(index)) {
    const current = sequence(index);
    if (lattice.eq(current, previous)) return current;
    previous = current;
  }
};

export function closureRegimeOfOrdinal(ordinal: Ordinal): StabilizingClosureRegime {
  const finite = finiteOrdinalJudgment(ordinal);
  if (finite.kind === "ordinal.closure.finiteOrdinal:witness") return finiteClosureRegime();
  if (
    ordinal.kind === "ordinal.closure.ordinal.limit"
    && finiteOrdinalJudgment(ordinal.fundamentalSequence(fromCount(2))).kind === "ordinal.closure.finiteOrdinal:witness"
  ) return scottClosureRegime();
  return transfiniteClosureRegime();
}

export function closureStabilizationAt<T>(
  process: ClosureProcessCarrier<T>,
  ordinal: Ordinal,
): ClosureStabilizationJudgment<T> {
  const value = closureApproximant(process, ordinal);
  const successorValue = closureApproximant(process, successorOrdinal(ordinal));
  return process.lattice.eq(successorValue, value)
    ? Object.freeze({
      kind: "ordinal.closure.stabilization:witness" as const,
      ordinal,
      value,
      successor: successorValue,
    })
    : Object.freeze({
      kind: "ordinal.closure.stabilization-obstruction" as const,
      searchedThrough: ordinal,
      value,
      successor: successorValue,
    });
}

export function closeOrdinalProcess<T>(process: ClosureProcessCarrier<T>): ClosureCarrier<T> {
  const finiteStageCount = toCount(process.horizon.finiteStages);
  const at = (ordinal: Ordinal): T => closureApproximant(process, ordinal);
  const orbit: ClosureOrbitPoint<T>[] = [];

  const closeAt = (stabilization: ClosureStabilizationWitness<T>): ClosureCarrier<T> => {
    const regime = closureRegimeOfOrdinal(stabilization.ordinal);
    const search: ClosureStabilizationSearchWitness<T> = Object.freeze({
      kind: "ordinal.closure.stabilizationSearch:witness" as const,
      ordinal: stabilization.ordinal,
      regime,
      stabilization,
    });
    return Object.freeze({
      kind: "ordinal.closure.carrier" as const,
      process,
      value: stabilization.value,
      orbit: Object.freeze(orbit),
      search,
      stabilization,
    });
  };
  const closeWitness = (stabilization: ClosureStabilizationJudgment<T>): ClosureCarrier<T> | undefined => {
    switch (stabilization.kind) {
      case "ordinal.closure.stabilization:witness":
        return closeAt(stabilization);
    }
  };

  // The finite block iterates the endomorphism once per stage, recording the
  // orbit as it goes and stopping at stabilization — the previous shape
  // recomputed every stage from bottom (quadratic) and materialized the full
  // horizon past the fixed point.
  {
    let value = process.lattice.bottom;
    let ordinal: Ordinal = zeroOrdinal();
    orbit.push(closureOrbitPoint(ordinal, value));
    for (let index = 0; index < finiteStageCount; index += 1) {
      const successorValue = process.endomorphism(value);
      if (process.lattice.eq(successorValue, value)) {
        return closeAt(Object.freeze({
          kind: "ordinal.closure.stabilization:witness" as const,
          ordinal,
          value,
          successor: successorValue,
        }));
      }
      ordinal = successorOrdinal(ordinal);
      value = successorValue;
      orbit.push(closureOrbitPoint(ordinal, value));
    }
  }

  for (const block of closureSearchBlocks(process.horizon)) {
    const base = block.base;
    switch (base.kind) {
      case "ordinal.closure.ordinal.zero":
        continue;
      case "ordinal.closure.ordinal.limit": {
        const closed = closeWitness(closureStabilizationAt(process, base));
        if (closed) return closed;
        break;
      }
    }
    for (let index = 0; index < toCount(block.finiteStages); index += 1) {
      const closed = closeWitness(closureStabilizationAt(process, ordinalPlusFinite(base, fromCount(index))));
      if (closed) return closed;
    }
  }
  const omegaSquare = omegaSquaredOrdinal();
  const omegaSquareClosure = closeWitness(closureStabilizationAt(process, omegaSquare));
  if (omegaSquareClosure) return omegaSquareClosure;
  const searchedThrough = omegaMultipleOrdinal(successor(process.horizon.limitBlocks));
  const value = at(searchedThrough);
  const stabilization: ClosureStabilizationObstruction<T> = Object.freeze({
    kind: "ordinal.closure.stabilization-obstruction" as const,
    searchedThrough,
    value,
    successor: at(successorOrdinal(searchedThrough)),
  });
  // Exhaustion is an obstruction, never a regime: failing to stabilize within
  // the horizon bounds κ below by `searchedThrough` — it cannot witness the
  // aperiodic regime's κ ≥ ω₁, which enters the system only as declared
  // cofinality (see classifySettling).
  const search: ClosureStabilizationSearchObstruction<T> = Object.freeze({
    kind: "ordinal.closure.stabilizationSearch-obstruction" as const,
    searchedThrough,
    stabilization,
  });
  return Object.freeze({
    kind: "ordinal.closure.carrier" as const,
    process,
    value,
    orbit: Object.freeze(orbit),
    search,
    stabilization,
  });
}

