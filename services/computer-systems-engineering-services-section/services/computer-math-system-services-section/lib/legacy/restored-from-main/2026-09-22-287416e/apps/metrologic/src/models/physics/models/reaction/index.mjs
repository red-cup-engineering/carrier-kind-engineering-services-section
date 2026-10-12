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
export * from "./mass-action-rate.mjs";
export * from "./support-projection.mjs";
export * from "./free-energy-descent.mjs";
export * from "./reaction-network.mjs";
export * from "./reaction-reachability.mjs";
export * from "./reaction-entropy.mjs";
export * from "./detailed-balance.mjs";
