import { type LeanMetaprogrammingDeclaration, type LeanMetaprogrammingModule, type LeanMetaprogrammingModuleRequest } from "./schema.mjs";
export type { LeanMetaprogrammingDeclaration, LeanMetaprogrammingModule, LeanMetaprogrammingModuleRequest, } from "./schema.mjs";
/** Validate one typed declaration before rendering it as Lean source. */
export declare function leanMetaprogrammingDeclaration(input: LeanMetaprogrammingDeclaration): LeanMetaprogrammingDeclaration;
/**
 * Render a typed request into Lean source and immediately read that source
 * through the canonical Lean module codec. This function is pure: host writes
 * and Lean process execution belong to their existing governed integrations.
 */
export declare function renderLeanMetaprogrammingModule(input: LeanMetaprogrammingModuleRequest): LeanMetaprogrammingModule;
