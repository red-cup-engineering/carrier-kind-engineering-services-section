/**
 * rational holds exact arithmetic, internal-real witnesses, vectors, matrices, and number representations used by the corpus.
 * It may import values and schema, but it must not import graph, topology, order, tiling, number, physics, codecs, capability, rendering, search, integrations, or services.
 */
export * as arithmetic from "./arithmetic.mts";
export * as exactNumber from "./exact-number.mts";
export * as internalReal from "./internal-real.mts";
export * as linearAlgebra from "./linear-algebra.mts";
