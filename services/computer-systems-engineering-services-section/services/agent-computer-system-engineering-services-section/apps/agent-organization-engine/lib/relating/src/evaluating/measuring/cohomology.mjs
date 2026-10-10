/**
 * evaluating/measuring/cohomology — SEN normalizers for finite exact
 * predication-cohomology carriers.
 *
 * Lean proves the sheaf/cohomology laws; the Node runtime surface carries the
 * finite H0/H1, Laplacian, bigraded, and settling-H1 receipts as serializable
 * witnesses. These terms preserve those carrier fields while making the witness
 * bodies inspectable as SEN.
 */
import { tm, } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { objectTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";

const field = (key) => tm.field(key, tm.var(0));

/** Normalize rank-vanishing witness/obstruction carriers. */
export const rankVanishingTerm = tm.lam(objectTerm([
  ["kind", field("kind")],
  ["rank", field("rank")],
]));

/** Normalize rank-identity witness/obstruction carriers. */
export const rankIdentityTerm = tm.lam(objectTerm([
  ["kind", field("kind")],
  ["left", field("left")],
  ["right", field("right")],
]));

/** Normalize rank-comparison carriers. */
export const rankComparisonTerm = tm.lam(objectTerm([
  ["kind", field("kind")],
  ["left", field("left")],
  ["right", field("right")],
]));

/** Normalize finite predication H0/H1 cohomology carriers. */
export const cohomologyCarrierTerm = tm.lam(objectTerm([
  ["cells", field("cells")],
  ["entities", field("entities")],
  ["firstCohomology", field("firstCohomology")],
  ["kind", field("kind")],
  ["zeroCoboundary", field("zeroCoboundary")],
  ["zeroCohomology", field("zeroCohomology")],
]));

/** Normalize finite Laplacian/SNF rank-identity cohomology carriers. */
export const cohomologyLaplacianTerm = tm.lam(objectTerm([
  ["characteristicPolynomial", field("characteristicPolynomial")],
  ["cohomology", field("cohomology")],
  ["entityLaplacian", field("entityLaplacian")],
  ["firstCohomologyCokernelRank", field("firstCohomologyCokernelRank")],
  ["incidence", field("incidence")],
  ["incidenceRank", field("incidenceRank")],
  ["kind", field("kind")],
  ["laplacianRank", field("laplacianRank")],
  ["zeroCohomologyKernelRank", field("zeroCohomologyKernelRank")],
]));

/** Normalize bigraded settling-cohomology decomposition carriers. */
export const bigradedCohomologyTerm = tm.lam(objectTerm([
  ["collapse", field("collapse")],
  ["contradiction", field("contradiction")],
  ["kind", field("kind")],
  ["truth", field("truth")],
]));

/** Normalize degree-1 settlement-cohomology carriers. */
export const settlingFirstCohomologyTerm = tm.lam(objectTerm([
  ["degree", field("degree")],
  ["generators", field("generators")],
  ["kind", field("kind")],
  ["rank", field("rank")],
  ["vanishing", field("vanishing")],
]));
