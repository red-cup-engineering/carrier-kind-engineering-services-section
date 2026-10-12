/**
 * models/kinetic-theory/boltzmann-entropy - finite real-valued Boltzmann H surface.
 *
 * This captures `Obsmetrologia.Relational.Thermo.BoltzmannEntropy`: cell
 * contributions `log(n!)`, configuration H as their sum, equilibrating exchanges
 * that do not increase H, and monotone relaxation chains.
 */

export interface CellHSuccWitness {
  readonly kind: "relational.thermo.boltzmannEntropy.cellH_succ:witness";
  readonly n: number;
  readonly cellHSucc: number;
  readonly logIncrement: number;
  readonly previous: number;
  readonly additive: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Thermo.cellH_succ";
}

export interface HTheoremPairWitness {
  readonly kind: "relational.thermo.boltzmannEntropy.htheorem_pair:witness";
  readonly a: number;
  readonly b: number;
  readonly beforeH: number;
  readonly afterH: number;
  readonly nonIncreasing: true;
  readonly entropyIncrement: number;
  readonly leanTheorem: "Obsmetrologia.Relational.Thermo.htheorem_pair";
}

export interface ConfigHPermWitness {
  readonly kind: "relational.thermo.boltzmannEntropy.configH_perm:witness";
  readonly left: readonly number[];
  readonly right: readonly number[];
  readonly h: number;
  readonly permutationInvariant: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Thermo.configH_perm";
}

export interface ExchangeWitness {
  readonly kind: "relational.thermo.boltzmannEntropy.exchange:witness";
  readonly a: number;
  readonly b: number;
  readonly rest: readonly number[];
  readonly before: readonly number[];
  readonly after: readonly number[];
  readonly smoothing: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Thermo.Exchange";
}

export interface HTheoremWitness {
  readonly kind: "relational.thermo.boltzmannEntropy.htheorem:witness";
  readonly exchange: ExchangeWitness;
  readonly beforeH: number;
  readonly afterH: number;
  readonly nonIncreasing: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Thermo.htheorem";
}

export interface HTheoremEvolutionWitness {
  readonly kind: "relational.thermo.boltzmannEntropy.htheorem_evolution:witness";
  readonly initial: readonly number[];
  readonly final: readonly number[];
  readonly steps: readonly HTheoremWitness[];
  readonly initialH: number;
  readonly finalH: number;
  readonly nonIncreasing: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Thermo.htheorem_evolution";
}

export interface BoltzmannEntropyReceipt {
  readonly kind: "relational.thermo.boltzmannEntropy.receipt:witness";
  readonly cellHSucc: CellHSuccWitness;
  readonly pair: HTheoremPairWitness;
  readonly configPerm: ConfigHPermWitness;
  readonly exchange: HTheoremWitness;
  readonly evolution: HTheoremEvolutionWitness;
  readonly finiteRealValuedModel: true;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Thermo.BoltzmannEntropy";
}

const EPSILON = 1e-10;

const assertNat = (value: number, caller: string): number => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${caller}: expected a safe natural number`);
  return value;
};

function normalizeConfig(config: readonly number[], caller: string): readonly number[] {
  return Object.freeze(config.map((value) => assertNat(value, caller)));
}

function sameNatMultiset(left: readonly number[], right: readonly number[]): boolean {
  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
}

function closeEnough(left: number, right: number): boolean {
  return Math.abs(left - right) <= EPSILON;
}

export function fact(n: number): bigint {
  const admitted = assertNat(n, "fact");
  let result = 1n;
  for (let k = 2n; k <= BigInt(admitted); k += 1n) result *= k;
  return result;
}

export function logNat(base: number, n: number | bigint): number {
  if (!Number.isSafeInteger(base) || base < 2) throw new RangeError("logNat: base must be a safe integer at least two");
  const asNumber = typeof n === "bigint" ? Number(n) : n;
  if (!Number.isFinite(asNumber) || asNumber < 1) throw new RangeError("logNat: argument must be positive and finite");
  return Math.log(asNumber) / Math.log(base);
}

export function cellH(n: number): number {
  const admitted = assertNat(n, "cellH");
  let total = 0;
  for (let k = 2; k <= admitted; k += 1) total += logNat(2, k);
  return total;
}

export function cellHSucc(n: number): CellHSuccWitness {
  const admitted = assertNat(n, "cellHSucc");
  const lhs = cellH(admitted + 1);
  const increment = logNat(2, admitted + 1);
  const previous = cellH(admitted);
  if (!closeEnough(lhs, increment + previous)) throw new TypeError("cellHSucc: log factorial additive law failed");
  return Object.freeze({
    kind: "relational.thermo.boltzmannEntropy.cellH_succ:witness" as const,
    n: admitted,
    cellHSucc: lhs,
    logIncrement: increment,
    previous,
    additive: true as const,
    leanTheorem: "Obsmetrologia.Relational.Thermo.cellH_succ" as const,
  });
}

export function configH(config: readonly number[]): number {
  return normalizeConfig(config, "configH").reduce((total, occupation) => total + cellH(occupation), 0);
}

export function configHPerm(left: readonly number[], right: readonly number[]): ConfigHPermWitness {
  const admittedLeft = normalizeConfig(left, "configHPerm");
  const admittedRight = normalizeConfig(right, "configHPerm");
  if (!sameNatMultiset(admittedLeft, admittedRight)) throw new TypeError("configHPerm: configurations are not permutations");
  const leftH = configH(admittedLeft);
  const rightH = configH(admittedRight);
  if (!closeEnough(leftH, rightH)) throw new TypeError("configHPerm: permuted configurations have different H");
  return Object.freeze({
    kind: "relational.thermo.boltzmannEntropy.configH_perm:witness" as const,
    left: admittedLeft,
    right: admittedRight,
    h: leftH,
    permutationInvariant: true as const,
    leanTheorem: "Obsmetrologia.Relational.Thermo.configH_perm" as const,
  });
}

export function equilibratingExchange(a: number, b: number, rest: readonly number[] = []): ExchangeWitness {
  const admittedA = assertNat(a, "equilibratingExchange");
  const admittedB = assertNat(b, "equilibratingExchange");
  if (admittedB > admittedA) throw new TypeError("equilibratingExchange: expected b <= a");
  const admittedRest = normalizeConfig(rest, "equilibratingExchange");
  return Object.freeze({
    kind: "relational.thermo.boltzmannEntropy.exchange:witness" as const,
    a: admittedA,
    b: admittedB,
    rest: admittedRest,
    before: Object.freeze([admittedA + 1, admittedB, ...admittedRest]),
    after: Object.freeze([admittedA, admittedB + 1, ...admittedRest]),
    smoothing: true as const,
    leanDefinition: "Obsmetrologia.Relational.Thermo.Exchange" as const,
  });
}

export function htheoremPair(a: number, b: number): HTheoremPairWitness {
  const exchange = equilibratingExchange(a, b);
  const beforeH = configH(exchange.before);
  const afterH = configH(exchange.after);
  if (afterH > beforeH + EPSILON) throw new TypeError("htheoremPair: smoothing exchange increased H");
  return Object.freeze({
    kind: "relational.thermo.boltzmannEntropy.htheorem_pair:witness" as const,
    a: exchange.a,
    b: exchange.b,
    beforeH,
    afterH,
    nonIncreasing: true as const,
    entropyIncrement: beforeH - afterH,
    leanTheorem: "Obsmetrologia.Relational.Thermo.htheorem_pair" as const,
  });
}

export function htheorem(exchange: ExchangeWitness): HTheoremWitness {
  const beforeH = configH(exchange.before);
  const afterH = configH(exchange.after);
  if (afterH > beforeH + EPSILON) throw new TypeError("htheorem: exchange increased H");
  return Object.freeze({
    kind: "relational.thermo.boltzmannEntropy.htheorem:witness" as const,
    exchange,
    beforeH,
    afterH,
    nonIncreasing: true as const,
    leanTheorem: "Obsmetrologia.Relational.Thermo.htheorem" as const,
  });
}

export function htheoremEvolution(initial: readonly number[], exchanges: readonly ExchangeWitness[]): HTheoremEvolutionWitness {
  let current = normalizeConfig(initial, "htheoremEvolution");
  const steps: HTheoremWitness[] = [];
  for (const exchange of exchanges) {
    if (!sameNatMultiset(current, exchange.before)) {
      throw new TypeError("htheoremEvolution: exchange does not start at the current configuration");
    }
    const witness = htheorem(exchange);
    steps.push(witness);
    current = exchange.after;
  }
  const initialH = configH(initial);
  const finalH = configH(current);
  if (finalH > initialH + EPSILON) throw new TypeError("htheoremEvolution: relaxation increased H");
  return Object.freeze({
    kind: "relational.thermo.boltzmannEntropy.htheorem_evolution:witness" as const,
    initial: normalizeConfig(initial, "htheoremEvolution"),
    final: current,
    steps: Object.freeze(steps),
    initialH,
    finalH,
    nonIncreasing: true as const,
    leanTheorem: "Obsmetrologia.Relational.Thermo.htheorem_evolution" as const,
  });
}

export function boltzmannEntropyReceipt(): BoltzmannEntropyReceipt {
  const exchange = equilibratingExchange(4, 1, [2]);
  return Object.freeze({
    kind: "relational.thermo.boltzmannEntropy.receipt:witness" as const,
    cellHSucc: cellHSucc(4),
    pair: htheoremPair(4, 1),
    configPerm: configHPerm([5, 1, 2], [2, 5, 1]),
    exchange: htheorem(exchange),
    evolution: htheoremEvolution(exchange.before, [
      exchange,
      equilibratingExchange(3, 2, [2]),
    ]),
    finiteRealValuedModel: true as const,
    capturedLeanModule: "Obsmetrologia.Relational.Thermo.BoltzmannEntropy" as const,
  });
}
