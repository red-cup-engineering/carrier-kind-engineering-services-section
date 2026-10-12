/**
 * models/reaction - counted chemical reaction network realizations.
 *
 * Seven realizations of `Obsmetrologia.Relational.Reaction.*`: mass-action
 * rates, support projection (Boolean firing), free-energy descent, network
 * invariants (mass balance, catalysis), reachability/coverability, reversible
 * detailed balance, and entropy through the shared Boltzmann H (imported from
 * `../kinetic-theory/boltzmann-entropy.mjs`, which stays in `kinetic-theory/`
 * as `Obsmetrologia.Relational.Thermo.BoltzmannEntropy` - a different subject).
 */
export * from "./mass-action-rate.mts";
export * from "./support-projection.mts";
export * from "./free-energy-descent.mts";
export * from "./reaction-network.mts";
export * from "./reaction-reachability.mts";
export * from "./reaction-entropy.mts";
export * from "./detailed-balance.mts";
