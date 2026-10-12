import { leanEnvironmentContract, } from "../schema.mjs";
import { decodeLeanDeclarationIndex } from "./declaration-index.mjs";
import { decodeLeanLakefileToml } from "./lakefile.mjs";
import { decodeLeanModule } from "./module.mjs";
import { decodeLeanToolchain } from "./toolchain.mjs";
export { leanEnvironmentContract, leanEnvironmentSchema, } from "../schema.mjs";
export function leanEnvironment(input) {
    return leanEnvironmentContract.assert({
        kind: "metroplat.lean.environment",
        rootModule: input.rootModule,
        ...(input.toolchain === undefined ? {} : { toolchain: input.toolchain }),
        ...(input.lakefile === undefined ? {} : { lakefile: input.lakefile }),
        ...(input.declarationIndex === undefined ? {} : { declarationIndex: input.declarationIndex }),
        modules: Object.freeze([...input.modules].sort((left, right) => left.id.localeCompare(right.id))),
        mediaType: "application/vnd.metroplat.lean.environment+json",
    }, "Lean environment");
}
export function leanEnvironmentFromSources(input) {
    return leanEnvironment({
        rootModule: input.rootModule ?? "Obsmetrologia",
        modules: Object.freeze(input.modules.map((source) => decodeLeanModule(source.text, source.module, source.path))),
        ...(input.toolchainText === undefined ? {} : { toolchain: decodeLeanToolchain(input.toolchainText) }),
        ...(input.lakefileToml === undefined ? {} : { lakefile: decodeLeanLakefileToml(input.lakefileToml) }),
        ...(input.declarationIndexText === undefined ? {} : {
            declarationIndex: decodeLeanDeclarationIndex(input.declarationIndexText, input.declarationIndexSource ?? "lean_decls"),
        }),
    });
}
