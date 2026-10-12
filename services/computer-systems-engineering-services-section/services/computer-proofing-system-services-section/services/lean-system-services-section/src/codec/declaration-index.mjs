import { leanDeclarationIndexContract, } from "../schema.mjs";
export { leanDeclarationIndexContract, leanDeclarationIndexSchema, } from "../schema.mjs";
export function decodeLeanDeclarationIndex(text, source = "lean_decls") {
    const declarations = text
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));
    return leanDeclarationIndexContract.assert({
        kind: "metroplat.lean.declaration-index",
        source,
        declarations: Object.freeze([...new Set(declarations)].sort((left, right) => left.localeCompare(right))),
        mediaType: "text/vnd.lean.declarations",
    }, "Lean declaration index");
}
