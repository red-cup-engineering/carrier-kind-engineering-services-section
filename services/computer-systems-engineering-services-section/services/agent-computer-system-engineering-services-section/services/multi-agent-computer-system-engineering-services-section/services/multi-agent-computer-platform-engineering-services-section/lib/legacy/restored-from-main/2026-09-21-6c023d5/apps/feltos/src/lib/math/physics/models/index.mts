/**
 * physics/models holds subject models for dense matter, fluids, glass, kinetic theory, liquid, plasma, quantum condensates, quantum contextuality, and reactions.
 * It may import the rest of math plus values, schema, records, logic, and fixpoint, but it must not import codecs, capability, rendering, search, integrations, or services.
 */
export * as denseMatter from "./dense-matter/index.mts";
export * as fluid from "./fluid.mts";
export * as glass from "./glass/index.mts";
export * as kineticTheory from "./kinetic-theory/index.mts";
export * as liquid from "./liquid/index.mts";
export * as plasma from "./plasma/index.mts";
export * as quantumCondensate from "./quantum-condensate/index.mts";
export * as quantumContextuality from "./quantum-contextuality/index.mts";
export * as reaction from "./reaction/index.mts";
