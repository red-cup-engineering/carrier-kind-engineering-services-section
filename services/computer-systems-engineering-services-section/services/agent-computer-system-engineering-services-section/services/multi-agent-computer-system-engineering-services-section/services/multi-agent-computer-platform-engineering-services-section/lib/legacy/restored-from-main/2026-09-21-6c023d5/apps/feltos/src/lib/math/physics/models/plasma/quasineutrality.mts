/**
 * models/plasma/quasineutrality - finite Debye relaxation.
 *
 * This captures `Obsmetrologia.Relational.Plasma.Quasineutrality`:
 * net charge, quasineutrality, imbalance as a Lyapunov, one-step screening,
 * fixed-point equilibrium, and finite relaxation to neutrality.
 */

export interface ImbalanceScreenWitness {
  readonly kind: "relational.plasma.quasineutrality.imbalance_screen:witness";
  readonly before: readonly number[];
  readonly after: readonly number[];
  readonly beforeImbalance: number;
  readonly afterImbalance: number;
  readonly nonIncreasing: true;
  readonly strictlyDecreasing: boolean;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Plasma.imbalance_screen_le",
    "Obsmetrologia.Relational.Plasma.imbalance_screen_lt",
  ];
}

export interface QuasineutralScreenFixedWitness {
  readonly kind: "relational.plasma.quasineutrality.fixed:witness";
  readonly cell: readonly number[];
  readonly quasineutral: boolean;
  readonly screenFixed: boolean;
  readonly equivalent: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Plasma.quasineutral_iff_screen_fixed";
}

export interface RelaxNeutralWitness {
  readonly kind: "relational.plasma.quasineutrality.relax_neutral:witness";
  readonly initial: readonly number[];
  readonly steps: number;
  readonly relaxed: readonly number[];
  readonly quasineutral: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Plasma.relax_neutral";
}

export interface PlasmaQuasineutralityReceipt {
  readonly kind: "relational.plasma.quasineutrality.receipt:witness";
  readonly descent: ImbalanceScreenWitness;
  readonly fixed: QuasineutralScreenFixedWitness;
  readonly relaxed: RelaxNeutralWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Plasma.Quasineutrality";
}

export function netCharge(cell: readonly number[]): number {
  return cell.reduce((total, charge) => total + charge, 0);
}

export function quasineutral(cell: readonly number[]): boolean {
  return netCharge(cell) === 0;
}

export function imbalance(cell: readonly number[]): number {
  return Math.abs(netCharge(cell));
}

export function screen(cell: readonly number[]): readonly number[] {
  const charge = netCharge(cell);
  if (charge > 0) return Object.freeze([-1, ...cell]);
  if (charge < 0) return Object.freeze([1, ...cell]);
  return Object.freeze([...cell]);
}

export function imbalanceScreen(cell: readonly number[]): ImbalanceScreenWitness {
  const after = screen(cell);
  const beforeImbalance = imbalance(cell);
  const afterImbalance = imbalance(after);
  if (afterImbalance > beforeImbalance) throw new TypeError("imbalanceScreen: screening increased imbalance");
  const charged = !quasineutral(cell);
  if (charged && !(afterImbalance < beforeImbalance)) throw new TypeError("imbalanceScreen: charged cell did not strictly descend");
  return Object.freeze({
    kind: "relational.plasma.quasineutrality.imbalance_screen:witness" as const,
    before: Object.freeze([...cell]),
    after,
    beforeImbalance,
    afterImbalance,
    nonIncreasing: true as const,
    strictlyDecreasing: charged,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Plasma.imbalance_screen_le",
      "Obsmetrologia.Relational.Plasma.imbalance_screen_lt",
    ] as const),
  });
}

export function quasineutralIffScreenFixed(cell: readonly number[]): QuasineutralScreenFixedWitness {
  const screened = screen(cell);
  const fixed = screened.length === cell.length && screened.every((charge, index) => charge === cell[index]);
  if (quasineutral(cell) !== fixed) throw new TypeError("quasineutralIffScreenFixed: fixed-point equivalence failed");
  return Object.freeze({
    kind: "relational.plasma.quasineutrality.fixed:witness" as const,
    cell: Object.freeze([...cell]),
    quasineutral: quasineutral(cell),
    screenFixed: fixed,
    equivalent: true as const,
    leanTheorem: "Obsmetrologia.Relational.Plasma.quasineutral_iff_screen_fixed" as const,
  });
}

export function relax(steps: number, cell: readonly number[]): readonly number[] {
  if (!Number.isSafeInteger(steps) || steps < 0) throw new RangeError("relax: expected a natural number of steps");
  let current = Object.freeze([...cell]) as readonly number[];
  for (let index = 0; index < steps; index += 1) current = screen(current);
  return current;
}

export function relaxNeutral(cell: readonly number[], steps = imbalance(cell)): RelaxNeutralWitness {
  if (steps < imbalance(cell)) throw new TypeError("relaxNeutral: steps must cover the initial imbalance");
  const relaxed = relax(steps, cell);
  if (!quasineutral(relaxed)) throw new TypeError("relaxNeutral: relaxation did not reach neutrality");
  return Object.freeze({
    kind: "relational.plasma.quasineutrality.relax_neutral:witness" as const,
    initial: Object.freeze([...cell]),
    steps,
    relaxed,
    quasineutral: true as const,
    leanTheorem: "Obsmetrologia.Relational.Plasma.relax_neutral" as const,
  });
}

export function plasmaQuasineutralityReceipt(): PlasmaQuasineutralityReceipt {
  return Object.freeze({
    kind: "relational.plasma.quasineutrality.receipt:witness" as const,
    descent: imbalanceScreen([1, 1, -1]),
    fixed: quasineutralIffScreenFixed([1, -1]),
    relaxed: relaxNeutral([1, 1, -1]),
    capturedLeanModule: "Obsmetrologia.Relational.Plasma.Quasineutrality" as const,
  });
}
