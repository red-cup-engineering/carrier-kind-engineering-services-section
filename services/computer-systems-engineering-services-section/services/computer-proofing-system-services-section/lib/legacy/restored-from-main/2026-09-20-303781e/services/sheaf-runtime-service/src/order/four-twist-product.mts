/**
 * order/four-twist-product - finite executable shadow of
 * RelMath.Order.TwistProductResiduation, generic over any caller-supplied
 * four-valued charge algebra (see ../four-valued-names.mts).
 *
 * Lean proves `FOUR = Two^twist` and the truth-order residuation of the twist
 * product. This module exhausts the finite Boolean-pair carrier and checks that
 * it is exactly a given four-valued charge algebra's own lattice/linear-logic
 * operations.
 *
 * Canonicalized 2026-09-11: this exact checker (algorithm identical, only the
 * four charge-name strings and the concrete charge-algebra module differing) had
 * been hand-copied into `@lenticule-science/articulating`'s own
 * `predicating/positing/settling/analysis/twist-product.mts` (semiotic charge
 * vocabulary: absurd/potential/active/stable) and `@red-cup-engineering/feltos`'s
 * `src/lib/math/topology/twist-product.mts` (federation claim vocabulary:
 * unknown/held/denied/contested) — both now delete their private copy and call
 * this one with their own algebra.
 */
import type { FourValuedNames } from "../four-valued-names.mjs";

export interface FourValuedChargeAlgebra<Value extends { readonly name: Name }, Name extends string> {
  readonly names: FourValuedNames<Name>;
  chargeValue(name: Name): Value;
  readonly chargeValues: readonly Value[];
  joinKnowledgeValue(left: Value, right: Value): Value;
  joinTruthValue(left: Value, right: Value): Value;
  meetKnowledgeValue(left: Value, right: Value): Value;
  meetTruthValue(left: Value, right: Value): Value;
  negateValue(value: Value): Value;
  sameChargeValue(left: Value, right: Value): boolean;
  linearFusionValue(left: Value, right: Value): Value;
  readonly linearMultiplicativeUnit: Value;
  linearResiduumValue(left: Value, right: Value): Value;
}

export interface BooleanTwistPoint {
  readonly kind: "twistProduct.booleanPoint";
  readonly positive: boolean;
  readonly negative: boolean;
  readonly label: string;
}

const booleanPoint = (positive: boolean, negative: boolean): BooleanTwistPoint => Object.freeze({
  kind: "twistProduct.booleanPoint" as const,
  positive,
  negative,
  label: `${positive ? "1" : "0"}${negative ? "1" : "0"}`,
});

export const booleanTwistPoints: readonly BooleanTwistPoint[] = Object.freeze([
  booleanPoint(false, false),
  booleanPoint(true, false),
  booleanPoint(false, true),
  booleanPoint(true, true),
]);

const boolLe = (left: boolean, right: boolean): boolean => !left || right;
const boolMeet = (left: boolean, right: boolean): boolean => left && right;
const boolJoin = (left: boolean, right: boolean): boolean => left || right;

function chargeOfBooleanPoint<Value extends { readonly name: Name }, Name extends string>(
  point: BooleanTwistPoint,
  algebra: FourValuedChargeAlgebra<Value, Name>,
): Value {
  if (point.positive && point.negative) return algebra.chargeValue(algebra.names.top);
  if (point.positive) return algebra.chargeValue(algebra.names.positiveOnly);
  if (point.negative) return algebra.chargeValue(algebra.names.negativeOnly);
  return algebra.chargeValue(algebra.names.bottom);
}

function booleanPointOfCharge<Value extends { readonly name: Name }, Name extends string>(
  value: Value,
  algebra: FourValuedChargeAlgebra<Value, Name>,
): BooleanTwistPoint {
  const { names } = algebra;
  if (value.name === names.bottom) return booleanPoint(false, false);
  if (value.name === names.positiveOnly) return booleanPoint(true, false);
  if (value.name === names.negativeOnly) return booleanPoint(false, true);
  if (value.name === names.top) return booleanPoint(true, true);
  throw new TypeError(`four-twist-product: charge name ${JSON.stringify(value.name)} is outside the supplied FourValuedNames`);
}

const samePoint = (left: BooleanTwistPoint, right: BooleanTwistPoint): boolean =>
  left.positive === right.positive && left.negative === right.negative;

const leK = (left: BooleanTwistPoint, right: BooleanTwistPoint): boolean =>
  boolLe(left.positive, right.positive) && boolLe(left.negative, right.negative);

const leT = (left: BooleanTwistPoint, right: BooleanTwistPoint): boolean =>
  boolLe(left.positive, right.positive) && boolLe(right.negative, left.negative);

const meetK = (left: BooleanTwistPoint, right: BooleanTwistPoint): BooleanTwistPoint =>
  booleanPoint(boolMeet(left.positive, right.positive), boolMeet(left.negative, right.negative));

const joinK = (left: BooleanTwistPoint, right: BooleanTwistPoint): BooleanTwistPoint =>
  booleanPoint(boolJoin(left.positive, right.positive), boolJoin(left.negative, right.negative));

const meetT = (left: BooleanTwistPoint, right: BooleanTwistPoint): BooleanTwistPoint =>
  booleanPoint(boolMeet(left.positive, right.positive), boolJoin(left.negative, right.negative));

const joinT = (left: BooleanTwistPoint, right: BooleanTwistPoint): BooleanTwistPoint =>
  booleanPoint(boolJoin(left.positive, right.positive), boolMeet(left.negative, right.negative));

const neg = (point: BooleanTwistPoint): BooleanTwistPoint => booleanPoint(point.negative, point.positive);

export interface TwistProductFourElement<Name extends string> {
  readonly point: BooleanTwistPoint;
  readonly charge: Name;
}

export interface TwistProductFourWitness<Name extends string> {
  readonly kind: "twistProduct.four:witness";
  readonly elements: readonly TwistProductFourElement<Name>[];
  readonly knowledgeBottom: Name;
  readonly knowledgeTop: Name;
  readonly truthBottom: Name;
  readonly truthTop: Name;
  readonly fusionUnit: Name;
  readonly consistentFragment: readonly Name[];
  readonly bijection: true;
  readonly knowledgeOrderMatches: true;
  readonly truthOrderMatches: true;
  readonly negationMatches: true;
  readonly knowledgeLatticeMatches: true;
  readonly truthLatticeMatches: true;
  readonly truthResiduation: true;
  readonly fusionCommutative: true;
  readonly fusionUnitLaw: true;
  readonly unitNonIntegral: true;
}

export interface TwistProductFourObstruction<Name extends string> {
  readonly kind: "twistProduct.four-obstruction";
  readonly reason:
    | "bijection"
    | "knowledgeOrder"
    | "truthOrder"
    | "negation"
    | "knowledgeLattice"
    | "truthLattice"
    | "truthResiduation"
    | "fusionCommutative"
    | "fusionUnit"
    | "unitNonIntegral";
  readonly left?: Name | undefined;
  readonly right?: Name | undefined;
  readonly bound?: Name | undefined;
  readonly observed?: Name | undefined;
  readonly expected?: Name | undefined;
}

export type TwistProductFourJudgment<Name extends string> = TwistProductFourWitness<Name> | TwistProductFourObstruction<Name>;

const obstruct = <Name extends string>(
  reason: TwistProductFourObstruction<Name>["reason"],
  left?: Name,
  right?: Name,
  bound?: Name,
  observed?: Name,
  expected?: Name,
): TwistProductFourObstruction<Name> => Object.freeze({
  kind: "twistProduct.four-obstruction" as const,
  reason,
  left,
  right,
  bound,
  observed,
  expected,
});

/** Exhaustive finite receipt for `FOUR = Two^twist` and truth-order residuation, over `algebra`. */
export function fourTwistProduct<Value extends { readonly name: Name }, Name extends string>(
  algebra: FourValuedChargeAlgebra<Value, Name>,
): TwistProductFourJudgment<Name> {
  const { names, chargeValue, chargeValues, joinKnowledgeValue, joinTruthValue, meetKnowledgeValue, meetTruthValue,
    negateValue, sameChargeValue, linearFusionValue, linearMultiplicativeUnit, linearResiduumValue } = algebra;

  const fromChargeOp = (op: (left: Value, right: Value) => Value) =>
    (left: BooleanTwistPoint, right: BooleanTwistPoint): BooleanTwistPoint =>
      booleanPointOfCharge(op(chargeOfBooleanPoint(left, algebra), chargeOfBooleanPoint(right, algebra)), algebra);
  const fuse = fromChargeOp(linearFusionValue);
  const imp = fromChargeOp(linearResiduumValue);
  const chargeLeK = (left: Value, right: Value): boolean => sameChargeValue(joinKnowledgeValue(left, right), right);
  const chargeLeT = (left: Value, right: Value): boolean => sameChargeValue(joinTruthValue(left, right), right);

  for (const point of booleanTwistPoints) {
    const charge = chargeOfBooleanPoint(point, algebra);
    if (!samePoint(booleanPointOfCharge(charge, algebra), point)) return obstruct("bijection", charge.name);
  }
  for (const charge of chargeValues) {
    if (!sameChargeValue(chargeOfBooleanPoint(booleanPointOfCharge(charge, algebra), algebra), charge)) return obstruct("bijection", charge.name);
  }

  for (const left of booleanTwistPoints) {
    for (const right of booleanTwistPoints) {
      const leftCharge = chargeOfBooleanPoint(left, algebra);
      const rightCharge = chargeOfBooleanPoint(right, algebra);
      if (leK(left, right) !== chargeLeK(leftCharge, rightCharge)) return obstruct("knowledgeOrder", leftCharge.name, rightCharge.name);
      if (leT(left, right) !== chargeLeT(leftCharge, rightCharge)) return obstruct("truthOrder", leftCharge.name, rightCharge.name);
      if (!sameChargeValue(chargeOfBooleanPoint(neg(left), algebra), negateValue(leftCharge))) return obstruct("negation", leftCharge.name);

      const knowledgeOps = [
        [chargeOfBooleanPoint(meetK(left, right), algebra), meetKnowledgeValue(leftCharge, rightCharge)] as const,
        [chargeOfBooleanPoint(joinK(left, right), algebra), joinKnowledgeValue(leftCharge, rightCharge)] as const,
      ];
      for (const [observed, expected] of knowledgeOps) {
        if (!sameChargeValue(observed, expected)) return obstruct("knowledgeLattice", leftCharge.name, rightCharge.name, undefined, observed.name, expected.name);
      }

      const truthOps = [
        [chargeOfBooleanPoint(meetT(left, right), algebra), meetTruthValue(leftCharge, rightCharge)] as const,
        [chargeOfBooleanPoint(joinT(left, right), algebra), joinTruthValue(leftCharge, rightCharge)] as const,
      ];
      for (const [observed, expected] of truthOps) {
        if (!sameChargeValue(observed, expected)) return obstruct("truthLattice", leftCharge.name, rightCharge.name, undefined, observed.name, expected.name);
      }

      if (!samePoint(fuse(left, right), fuse(right, left))) return obstruct("fusionCommutative", leftCharge.name, rightCharge.name);
      const unitPoint = booleanPointOfCharge(linearMultiplicativeUnit, algebra);
      if (!samePoint(fuse(left, unitPoint), left) || !samePoint(fuse(unitPoint, left), left)) return obstruct("fusionUnit", leftCharge.name);

      for (const bound of booleanTwistPoints) {
        const boundCharge = chargeOfBooleanPoint(bound, algebra);
        if (leT(fuse(left, right), bound) !== leT(left, imp(right, bound))) {
          return obstruct("truthResiduation", leftCharge.name, rightCharge.name, boundCharge.name);
        }
      }
    }
  }

  const unit = linearMultiplicativeUnit;
  const truthTop = chargeValue(names.positiveOnly);
  if (sameChargeValue(unit, truthTop)) return obstruct("unitNonIntegral", unit.name, truthTop.name);

  return Object.freeze({
    kind: "twistProduct.four:witness" as const,
    elements: Object.freeze(booleanTwistPoints.map((point) => Object.freeze({
      point,
      charge: chargeOfBooleanPoint(point, algebra).name,
    }))),
    knowledgeBottom: names.bottom,
    knowledgeTop: names.top,
    truthBottom: names.negativeOnly,
    truthTop: names.positiveOnly,
    fusionUnit: unit.name,
    consistentFragment: Object.freeze([names.bottom, names.positiveOnly, names.negativeOnly] as const),
    bijection: true as const,
    knowledgeOrderMatches: true as const,
    truthOrderMatches: true as const,
    negationMatches: true as const,
    knowledgeLatticeMatches: true as const,
    truthLatticeMatches: true as const,
    truthResiduation: true as const,
    fusionCommutative: true as const,
    fusionUnitLaw: true as const,
    unitNonIntegral: true as const,
  });
}
