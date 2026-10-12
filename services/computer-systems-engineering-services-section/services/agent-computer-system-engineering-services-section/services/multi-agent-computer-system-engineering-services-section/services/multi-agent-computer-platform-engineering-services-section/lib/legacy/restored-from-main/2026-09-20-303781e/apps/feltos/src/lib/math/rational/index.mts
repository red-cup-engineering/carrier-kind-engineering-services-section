/**
 * rational now holds only internal-real witnesses (plus passthrough external arithmetic/exact-
 * number re-exports). linear-algebra.mts was cannibalized into
 * @lenticule-science/algebra-services-section on 2026-09-11; a consumer wanting exact linear
 * algebra imports that package directly. internal-real.mts itself imports this app's own
 * math/tilings/chromatic-lorentzian.mts, which is why it was not moved alongside
 * linear-algebra.mts -- it belongs with the sheaf/predication/topology/causal cluster's own
 * migration, not this generic-math one.
 */
export * as arithmetic from "@lenticule-science/articulating/predicating/positing/settling/analysis/arithmetic";
export * as exactNumber from "@lenticule-science/articulating/predicating/positing/settling/analysis/exact-number";
export * as internalReal from "./internal-real.mts";
