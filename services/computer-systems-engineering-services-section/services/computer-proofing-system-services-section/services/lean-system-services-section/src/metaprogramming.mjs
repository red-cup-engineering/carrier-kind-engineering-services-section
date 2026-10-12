import { leanMetaprogrammingDeclarationContract, leanMetaprogrammingModuleContract, leanMetaprogrammingModuleRequestContract, } from "./schema.mjs";
import { decodeLeanModule } from "./codec/module.mjs";
const leanQualifiedNamePattern = /^[A-Za-z_][A-Za-z0-9_']*(?:\.[A-Za-z_][A-Za-z0-9_']*)*$/u;
/** Validate one typed declaration before rendering it as Lean source. */
export function leanMetaprogrammingDeclaration(input) {
    const declaration = leanMetaprogrammingDeclarationContract.assert(input, "Lean metaprogramming declaration");
    assertLeanQualifiedName(declaration.name, "Lean declaration name");
    for (const attribute of declaration.attributes ?? [])
        assertLeanAttribute(attribute);
    if (declaration.signature.includes("\n"))
        throw new TypeError("Lean declaration signature must be one line");
    if (declaration.body.trim() === "")
        throw new TypeError("Lean declaration body must be non-empty");
    return declaration;
}
/**
 * Render a typed request into Lean source and immediately read that source
 * through the canonical Lean module codec. This function is pure: host writes
 * and Lean process execution belong to their existing governed integrations.
 */
export function renderLeanMetaprogrammingModule(input) {
    const request = leanMetaprogrammingModuleRequestContract.assert(input, "Lean metaprogramming module request");
    assertLeanQualifiedName(request.module, "Lean module name");
    for (const imported of request.imports ?? [])
        assertLeanQualifiedName(imported, "Lean import");
    if (request.namespace !== undefined)
        assertLeanQualifiedName(request.namespace, "Lean namespace");
    const path = request.path ?? `${request.module.replace(/\./gu, "/")}.lean`;
    const declarations = request.declarations.map(leanMetaprogrammingDeclaration);
    const text = renderLeanModuleSource({
        imports: request.imports ?? [],
        ...(request.namespace === undefined ? {} : { namespace: request.namespace }),
        declarations,
    });
    const decodedModule = decodeLeanModule(text, request.module, path);
    return leanMetaprogrammingModuleContract.assert({
        kind: "metroplat.lean.metaprogramming-module",
        module: request.module,
        path,
        text,
        declarations: Object.freeze(decodedModule.declarations.map((declaration) => declaration.name)),
        decodedModule,
        mediaType: "text/vnd.lean4",
    }, "Lean metaprogramming module");
}
function renderLeanModuleSource(input) {
    const parts = [];
    const imports = [...new Set(input.imports)].sort((left, right) => left.localeCompare(right));
    if (imports.length > 0)
        parts.push(imports.map((imported) => `import ${imported}`).join("\n"));
    if (input.namespace !== undefined)
        parts.push(`namespace ${input.namespace}`);
    parts.push(input.declarations.map(renderLeanDeclaration).join("\n\n"));
    if (input.namespace !== undefined)
        parts.push(`end ${input.namespace}`);
    return `${parts.filter((part) => part.trim() !== "").join("\n\n")}\n`;
}
function renderLeanDeclaration(declaration) {
    const attributes = (declaration.attributes ?? []).map((attribute) => `@[${attribute}]`);
    const modifiers = declaration.modifiers ?? [];
    const prefix = [...modifiers, declaration.kind].join(" ");
    return [
        ...attributes,
        `${prefix} ${declaration.name}${declaration.signature} := ${normalizeLeanBody(declaration.body)}`,
    ].join("\n");
}
function normalizeLeanBody(body) {
    return body.trim().replace(/\r\n/gu, "\n");
}
function assertLeanQualifiedName(value, label) {
    if (!leanQualifiedNamePattern.test(value))
        throw new TypeError(`${label}: expected a Lean qualified name`);
}
function assertLeanAttribute(value) {
    if (value.includes("\n") || value.includes("\r") || value.trim() === "") {
        throw new TypeError("Lean attribute must be non-empty one-line text");
    }
}
