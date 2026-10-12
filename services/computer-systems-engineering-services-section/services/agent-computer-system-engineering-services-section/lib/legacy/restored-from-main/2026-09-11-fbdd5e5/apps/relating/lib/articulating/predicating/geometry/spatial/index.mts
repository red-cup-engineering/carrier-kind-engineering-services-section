/**
 * @packageDocumentation
 *
 * geometry/spatial — exact spatial geometry of the predication base.
 *
 * Real quadratic fields ℚ(√d) and the 1-D cut-and-project schemes that produce
 * aperiodic order from an irrational slope and an internal acceptance window.
 * Acceptance is a judgment over a lattice site, not a hidden filter, and
 * `refutePeriod` is a finite sampled judgment over a gap word: these functions
 * return witnesses or obstructions over a bounded carrier, not global
 * aperiodicity proofs.
 *
 * @example
 * ```ts
 * import { predicating } from "@emsenn/relating/articulating";
 * import { fromRatio } from "@emsenn/relating/writing";
 *
 * const { spatial } = predicating.geometry;
 * const slope = spatial.quadraticRational(5, fromRatio(1, 2), fromRatio(1, 2));
 * const scheme = spatial.cutProjectScheme(slope);
 * const window = spatial.acceptanceWindow(
 *   spatial.quadraticFromInts(5, 0, 0),
 *   spatial.quadraticFromInts(5, 1, 0),
 * );
 *
 * spatial.windowAcceptance(scheme, spatial.latticeSite(0, 0), window).kind;
 * spatial.refutePeriod(spatial.gapSpectrum(spatial.modelSet(scheme, window, 4)), 1).kind;
 * ```
 */
export * from "@lenticule-science/articulating/predicating/geometry/spatial/quadratic";
export * from "@lenticule-science/articulating/predicating/geometry/spatial/cut-and-project";
