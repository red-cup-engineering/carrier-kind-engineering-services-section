import { type LeanDeclarationIndex, type LeanEnvironment, type LeanLakefile, type LeanModule, type LeanToolchain } from "../schema.mjs";
import { type LeanSourceText } from "./module.mjs";
export { leanEnvironmentContract, leanEnvironmentSchema, type LeanEnvironment, } from "../schema.mjs";
export type { LeanSourceText } from "./module.mjs";
/** Host-neutral Lean project material supplied to the package phase. */
export type LeanEnvironmentSources = Readonly<{
    rootModule?: string;
    toolchainText?: string;
    lakefileToml?: string;
    declarationIndexText?: string;
    declarationIndexSource?: string;
    modules: readonly LeanSourceText[];
}>;
export declare function leanEnvironment(input: Readonly<{
    rootModule: string;
    modules: readonly LeanModule[];
    toolchain?: LeanToolchain;
    lakefile?: LeanLakefile;
    declarationIndex?: LeanDeclarationIndex;
}>): LeanEnvironment;
export declare function leanEnvironmentFromSources(input: LeanEnvironmentSources): LeanEnvironment;
