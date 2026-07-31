/**
 * @emsenn/meme-topology/internal — the engine, not the contract.
 *
 * Everything in every module is reachable from here, including plumbing that
 * the curated barrels deliberately withhold (coincidence booleans, carrier
 * assembly constructors, closure-engine internals, unspecified modal
 * operators, set-encoding internals). NO SEMVER PROMISE attaches to this
 * subpath: importing it is forking, not extending. If you need something
 * here, raise it for promotion instead of depending on it quietly.
 */

export * from "@emsenn/meme-algebra";
export * from "@emsenn/meme-logic";
export * from "./predication-fiber.mjs";
export * from "./ordinal-closure.mjs";
export * from "./predication-cohomology.mjs";
export * from "./predication-settling.mjs";
export * from "./predication-firing.mjs";
export * from "./predication-valuation-consistency.mjs";
export * from "./predication-valuation-sheaf.mjs";
export * from "./predication-valuation-closure.mjs";
export * from "./predication-valuation-fixed-point-gap.mjs";
export * from "./predication-valuation-fixed-point.mjs";
export * from "./substitution-dynamics.mjs";
export * from "./meme-topology-fixed-point-reading.mjs";
export * from "./meme-topology.mjs";
export * from "./meme-topology-section.mjs";
export * from "./meme-topology-serialization.mjs";
