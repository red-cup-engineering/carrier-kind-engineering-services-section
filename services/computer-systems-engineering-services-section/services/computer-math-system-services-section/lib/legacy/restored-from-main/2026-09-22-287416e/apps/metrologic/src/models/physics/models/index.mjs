/**
 * physics/models holds subject models for dense matter, fluids, glass, kinetic theory, liquid, plasma, quantum condensates, quantum contextuality, and reactions.
 * It may import the rest of math plus values, schema, records, logic, and fixpoint, but it must not import codecs, capability, rendering, search, integrations, or services.
 */
export * as denseMatter from "./dense-matter/index.mjs";
export * as fluid from "./fluid.mjs";
export * as glass from "./glass/index.mjs";
export * as kineticTheory from "./kinetic-theory/index.mjs";
export * as liquid from "./liquid/index.mjs";
export * as plasma from "./plasma/index.mjs";
export * as quantumCondensate from "./quantum-condensate/index.mjs";
export * as quantumContextuality from "./quantum-contextuality/index.mjs";
export * as reaction from "./reaction/index.mjs";
