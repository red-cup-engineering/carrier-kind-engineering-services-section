/**
 * xml-svg holds XML serialization primitives and the SVG family built on top of them.
 * It may import values, schema, records, logic, fixpoint, math, and lower codec families, but it must not import capability, contracts, rendering, search, runtime, integrations, interfaces, or apps.
 */
export * from "./core.mts";
export * as svg from "./svg/index.mts";
