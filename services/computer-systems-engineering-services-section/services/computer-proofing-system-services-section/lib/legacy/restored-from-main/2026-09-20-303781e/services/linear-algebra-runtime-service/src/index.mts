/**
 * algebra holds exact rational-number and linear-algebra readings used by the corpus.
 *
 * math/rational/internal-real.mts was deliberately left in @red-cup-engineering/feltos and is
 * not re-exported here: it imports feltos's own math/tilings/chromatic-lorentzian.mts (a
 * non-idempotent causal-chain settling module, owned by the sheaf/predication/topology/causal
 * cluster, not this generic algebra cluster).
 */
export * as arithmetic from "@lenticule-science/articulating/predicating/positing/settling/analysis/arithmetic";
export * as exactNumber from "@lenticule-science/articulating/predicating/positing/settling/analysis/exact-number";
export * as linearAlgebra from "./linear-algebra.mjs";
