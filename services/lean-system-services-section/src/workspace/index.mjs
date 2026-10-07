import path from "node:path";
export function leanWorkspaceRootModuleFromLakefile(lakefile, fallback) {
    const firstLibrary = lakefile?.libraries[0];
    if (firstLibrary?.roots?.[0] !== undefined)
        return firstLibrary.roots[0];
    if (firstLibrary?.name !== undefined)
        return firstLibrary.name;
    return lakefile?.name ?? fallback;
}
export function leanWorkspaceModuleNameFromPath(root, file, moduleRoots) {
    const relative = path.relative(root, file).replace(/\\/gu, "/");
    const withoutExtension = relative.replace(/\.lean$/u, "");
    for (const moduleRoot of moduleRoots) {
        const prefix = `${moduleRoot.replace(/\\/gu, "/").replace(/\/+$/u, "")}/`;
        if (withoutExtension.startsWith(prefix))
            return withoutExtension.slice(prefix.length).replace(/\//gu, ".");
    }
    return withoutExtension.replace(/\//gu, ".");
}
export function leanWorkspaceDefaultModuleRoots() {
    return Object.freeze(["lean", "."]);
}
export const leanWorkspaceIgnoredDirectories = Object.freeze([
    ".git",
    ".lake",
    ".tmp",
    "build",
    "conformance",
    "dist",
    "node_modules",
]);
export const leanWorkspaceDefaultDeclarationIndexPaths = Object.freeze([
    "lean/docs/blueprint/lean_decls",
    "lean/docs/blueprint/src/lean_decls",
    "docs/blueprint/lean_decls",
    "docs/blueprint/src/lean_decls",
    "blueprint/lean_decls",
    "lean_decls",
    "lean-decls.txt",
    "declarations.txt",
]);
export const leanWorkspaceDefaultReferenceRoots = Object.freeze([
    "lean/docs/blueprint",
    "lean/docs/verso",
    "docs/blueprint",
    "docs/verso",
    "src",
    "lib",
    "services",
    "apps",
    "test",
    "dev",
]);
export const leanWorkspaceDefaultReferenceExtensions = Object.freeze([
    ".mts",
    ".ts",
    ".mjs",
    ".js",
    ".md",
    ".tex",
    ".lean",
]);
export function leanWorkspaceLakeLibraryRoots(lakefile) {
    return [...new Set((lakefile?.libraries ?? []).flatMap((library) => (library.roots ?? []).length === 0 ? [library.name] : [...(library.roots ?? [])]))].sort();
}
export function leanWorkspaceScanRootCandidates(root, lakefile) {
    if (leanWorkspaceLakeLibraryRoots(lakefile).length === 0) {
        return Object.freeze([path.join(root, "lean"), root]);
    }
    const roots = [];
    for (const library of lakefile?.libraries ?? []) {
        const names = (library.roots ?? []).length === 0 ? [library.name] : [...(library.roots ?? [])];
        const sourceDirs = library.sourceDir === undefined ? [".", "lean"] : [library.sourceDir];
        for (const sourceDir of sourceDirs) {
            for (const name of names) {
                roots.push(path.join(root, sourceDir, name));
                roots.push(path.join(root, sourceDir, `${name}.lean`));
            }
        }
    }
    return [...new Set(roots)].sort();
}
export function leanWorkspaceShouldSkipDirectory(name, ignore = new Set()) {
    return leanWorkspaceIgnoredDirectories.includes(name) || ignore.has(name);
}
export function leanWorkspaceShouldSkipSource(root, target) {
    const relative = path.relative(root, target).replace(/\\/gu, "/");
    return relative === "lean/docs" || relative.startsWith("lean/docs/");
}
/** Project an admitted Lean-workspace read-options material to the read options used by the reader. */
export function leanWorkspaceReadOptionsFromMaterial(material) {
    return Object.freeze({
        ...(material.rootModule === undefined ? {} : { rootModule: material.rootModule }),
        ...(material.maxDepth === undefined ? {} : { maxDepth: material.maxDepth }),
        ...(material.ignore === undefined ? {} : { ignore: material.ignore }),
        ...(material.moduleRoots === undefined ? {} : { moduleRoots: material.moduleRoots }),
        ...(material.declarationIndexPaths === undefined ? {} : { declarationIndexPaths: material.declarationIndexPaths }),
        ...(material.referenceRoots === undefined ? {} : { referenceRoots: material.referenceRoots }),
        ...(material.referenceExtensions === undefined ? {} : { referenceExtensions: material.referenceExtensions }),
        ...(material.includeTexWorkspaceFibers === undefined ? {} : { includeTexWorkspaceFibers: material.includeTexWorkspaceFibers }),
        ...(material.texRoots === undefined ? {} : { texRoots: material.texRoots }),
        ...(material.blueprintRoots === undefined ? {} : { blueprintRoots: material.blueprintRoots }),
        ...(material.versoRoots === undefined ? {} : { versoRoots: material.versoRoots }),
    });
}
