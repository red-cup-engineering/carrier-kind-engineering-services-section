/**
 * typography holds pure typographic reads of syntax, fiber, charge, scale, weight, style, and spacing.
 * It may import values, schema, records, logic, fixpoint, math, codecs, capability, contracts, and sibling rendering modules, but it must not import search, runtime, integrations, interfaces, or apps.
 */
import type {
  Cell,
  PredicationPredicate,
  PredicationTerm,
} from "../../logic/predicating/predication.mts";
import type { QuadraticRational } from "../../logic/predicating/geometry/spatial/quadratic.mts";
import {
  quadraticFromInts,
  quadraticMultiply,
  quadraticRational,
} from "../../logic/predicating/geometry/spatial/quadratic.mts";
import {
  asChargeValue,
  chargeValueName,
  valueOf,
  type Charge,
  type ChargeValueName,
} from "../../values/index.mts";
import type {
  FiberAlgebra,
  Meme,
  OrderName,
  Valuation,
} from "../../logic/predicating/evidence/fiber.mts";
import {
  finiteOrdinal,
  finiteOrdinalJudgment,
  type Ordinal,
} from "../../fixpoint/closure.mts";
import {
  fromCount,
  fromRatio,
  toCount,
} from "../../math/rational/exact-number.mts";

export type SyntacticRole = "subject" | "predicate" | "object";
export type TypographyWeight = 400 | 600 | 700;
export type TypographyCase = "uppercase" | "titlecase" | "lowercase" | "preserve";
export type TypographyStyle = "roman" | "italic";
export type TypographyLocusElement = PredicationTerm | PredicationPredicate;

export interface TypographyLocus {
  readonly kind: "metroplat.projections.typography.locus";
  readonly cell: Cell;
  readonly role: SyntacticRole;
  readonly element: TypographyLocusElement;
}

export interface TypographyFiber {
  readonly kind: "metroplat.projections.typography.fiber";
  readonly locus: TypographyLocus;
  readonly charge: Charge;
  readonly order: OrderName;
  readonly ordinal: Ordinal;
}

export interface TypeDerivation {
  readonly weight: TypographyWeight;
  readonly case: TypographyCase;
  readonly style: TypographyStyle;
  readonly scaleStep: QuadraticRational;
}

export interface TypographyDerivation {
  readonly kind: "metroplat.projections.typography.derivation";
  readonly fiber: TypographyFiber;
  readonly type: TypeDerivation;
}

const roleType = {
  subject: Object.freeze({ weight: 700, case: "preserve" }),
  predicate: Object.freeze({ weight: 600, case: "preserve" }),
  object: Object.freeze({ weight: 400, case: "preserve" }),
} as const satisfies Readonly<Record<SyntacticRole, { readonly weight: TypographyWeight; readonly case: TypographyCase }>>;

const orderHeight = {
  knowledge: Object.freeze({
    unknown: 0,
    held: 1,
    denied: 1,
    contested: 2,
  }),
  truth: Object.freeze({
    denied: 0,
    unknown: 1,
    contested: 1,
    held: 2,
  }),
} as const satisfies Readonly<Record<OrderName, Readonly<Record<ChargeValueName, number>>>>;

/** The exact identity scale in the same quadratic field as the type step. */
export const TYPE_SCALE_UNIT: QuadraticRational = quadraticFromInts(5, 1, 0);

/** Golden quadratic unit (1 + sqrt(5)) / 2, represented in the spatial geometry field. */
export const TYPE_SCALE_STEP: QuadraticRational = quadraticRational(5, fromRatio(1, 2), fromRatio(1, 2));

export function typeScaleOrdinalForCharge(value: ChargeValueName, order: OrderName): Ordinal {
  return finiteOrdinal(fromCount(orderHeight[order][value]));
}

export function scaleStepForOrdinal(ordinal: Ordinal): QuadraticRational {
  const finite = finiteOrdinalJudgment(ordinal);
  if (finite.kind !== "ordinal.closure.finiteOrdinal:witness") {
    throw new TypeError("scaleStepForOrdinal: typography scale requires a finite ordinal");
  }
  let scale = TYPE_SCALE_UNIT;
  const rank = toCount(finite.value);
  for (let index = 0; index < rank; index += 1) scale = quadraticMultiply(scale, TYPE_SCALE_STEP);
  return scale;
}

function locusElement(cell: Cell, role: SyntacticRole): TypographyLocusElement {
  switch (role) {
    case "subject": return cell.subject;
    case "predicate": return cell.predicate;
    case "object": return cell.object;
  }
}

export function typographyLocus(cell: Cell, role: SyntacticRole): TypographyLocus {
  return Object.freeze({
    kind: "metroplat.projections.typography.locus" as const,
    cell,
    role,
    element: locusElement(cell, role),
  });
}

export function typographyLociForCell(cell: Cell): readonly [TypographyLocus, TypographyLocus, TypographyLocus] {
  return Object.freeze([
    typographyLocus(cell, "subject"),
    typographyLocus(cell, "predicate"),
    typographyLocus(cell, "object"),
  ] as const);
}

function styleOf(value: ChargeValueName): TypographyStyle {
  return value === "denied" ? "italic" : "roman";
}

export function typographyFiber(
  locus: TypographyLocus,
  charge: Charge,
  order: OrderName = "knowledge",
): TypographyFiber {
  const value = chargeValueName(valueOf(charge));
  return Object.freeze({
    kind: "metroplat.projections.typography.fiber" as const,
    locus,
    charge,
    order,
    ordinal: typeScaleOrdinalForCharge(value, order),
  });
}

export function typographyFibersForMeme(assignment: Meme, order: OrderName = "knowledge"): readonly TypographyFiber[] {
  return Object.freeze(typographyLociForCell(assignment.cell).map((locus) => typographyFiber(locus, assignment.charge, order)));
}

export function typographyFibersForFiberAlgebra(fiber: FiberAlgebra, order: OrderName = "knowledge"): readonly TypographyFiber[] {
  return Object.freeze(fiber.assignments.flatMap((assignment) => typographyFibersForMeme(assignment, order)));
}

export function typographyFibersForValuation(valuation: Valuation, order: OrderName = "knowledge"): readonly TypographyFiber[] {
  return Object.freeze(valuation.fibers.flatMap((fiber) => typographyFibersForFiberAlgebra(fiber, order)));
}

export function fiberToType(fiber: TypographyFiber): TypeDerivation {
  const roleProjection = roleType[fiber.locus.role];
  const value = asChargeValue(valueOf(fiber.charge));
  const ordinal = typeScaleOrdinalForCharge(chargeValueName(value), fiber.order);
  return Object.freeze({
    weight: roleProjection.weight,
    case: roleProjection.case,
    style: styleOf(chargeValueName(valueOf(fiber.charge))),
    scaleStep: scaleStepForOrdinal(ordinal),
  });
}

export function deriveTypographyFiber(fiber: TypographyFiber): TypographyDerivation {
  return Object.freeze({
    kind: "metroplat.projections.typography.derivation" as const,
    fiber,
    type: fiberToType(fiber),
  });
}

export function deriveTypographyValuation(valuation: Valuation, order: OrderName = "knowledge"): readonly TypographyDerivation[] {
  return Object.freeze(typographyFibersForValuation(valuation, order).map(deriveTypographyFiber));
}
