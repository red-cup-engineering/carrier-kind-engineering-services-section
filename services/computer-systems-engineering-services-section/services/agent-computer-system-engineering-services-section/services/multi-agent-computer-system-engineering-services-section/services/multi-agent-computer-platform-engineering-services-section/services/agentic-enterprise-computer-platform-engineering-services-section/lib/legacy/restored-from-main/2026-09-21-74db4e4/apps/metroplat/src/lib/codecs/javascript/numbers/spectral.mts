/**
 * codecs/host/javascript/numbers/spectral — native-number boundary helpers for spectral polynomial
 * records. The polynomial arithmetic stays exact (Integer coefficients); these
 * read coefficients to/from native integers only at the representation boundary.
 */
import { integerPolynomial, type IntegerPolynomial } from "@lenticule-science/metrologic/graph/spectral";
import { fromInt, toInt, type Integer } from "@red-cup-engineering/computer-data-engine/exact-number";

/** Build an IntegerPolynomial from native integer coefficients (ascending degree). */
export const polyFromInts = (values: readonly number[]): IntegerPolynomial =>
  integerPolynomial(values.map(fromInt));

/** Read an IntegerPolynomial's coefficients as native integers (ascending degree). */
export const polyToInts = (poly: readonly Integer[]): readonly number[] =>
  Object.freeze(poly.map(toInt));
