/**
 * evaluating/measuring/linear-algebra - SEN normalizers for finite exact
 * matrix receipts.
 */
import { tm, } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { objectTerm, stringTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";

const field = (key) => tm.field(key, tm.var(0));

/** Normalize finite matrix-shape carriers. */
export const matrixShapeTerm = tm.lam(objectTerm([
  ["columns", field("columns")],
  ["kind", stringTerm("linearAlgebra.matrix.shape")],
  ["rows", field("rows")],
  ["square", field("square")],
]));

/** Normalize square-matrix determinant/rank/Smith/characteristic receipts. */
export const squareMatrixInvariantsTerm = tm.lam(objectTerm([
  ["characteristicPolynomial", field("characteristicPolynomial")],
  ["determinant", field("determinant")],
  ["kind", stringTerm("linearAlgebra.matrix.squareInvariants")],
  ["matrix", field("matrix")],
  ["rank", field("rank")],
  ["shape", field("shape")],
  ["smithNormalForm", field("smithNormalForm")],
]));

/** Normalize finite rank-nullity receipts. */
export const rankNullityTerm = tm.lam(objectTerm([
  ["domainDimension", field("domainDimension")],
  ["kind", stringTerm("linearAlgebra.rankNullity")],
  ["matrix", field("matrix")],
  ["nullity", field("nullity")],
  ["rank", field("rank")],
  ["rankNullityHolds", field("rankNullityHolds")],
  ["rankPlusNullity", field("rankPlusNullity")],
  ["shape", field("shape")],
  ["smithNormalForm", field("smithNormalForm")],
  ["sourceModule", field("sourceModule")],
]));

