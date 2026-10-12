/**
 * aperiodic-tilings holds aperiodic tiling autocorrelation, Jeandel-Rao witnesses, and tile
 * charge/cover structure.
 *
 * math/tilings/{aperiodic-classification,chromatic-lorentzian,chromatic-marking,sofic}.mts were
 * deliberately left in @red-cup-engineering/feltos and are not re-exported here: they import
 * feltos's own math/order/causal.mts, math/topology/bigraded-diamond.mts, and
 * fixpoint/value-category.mts, all owned by the sheaf/predication/topology/causal cluster being
 * handled separately, not this generic aperiodic-tilings cluster.
 */
export * from "../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/mathematics/aperiodic-autocorrelation.mjs";
export * from "../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/mathematics/jeandel-rao-witness.mjs";
export * from "./tile.mjs";
