export const texWorkspaceIgnoredDirectories = Object.freeze([
    ".git",
    ".lake",
    ".tmp",
    "build",
    "dist",
    "node_modules",
]);
export const texWorkspaceDefaultTexRoots = Object.freeze(["tex", "docs/tex"]);
export const texWorkspaceDefaultBlueprintRoots = Object.freeze(["docs/blueprint/src", "lean/docs/blueprint/src", "blueprint"]);
export const texWorkspaceDefaultVersoRoots = Object.freeze(["docs/verso", "lean/docs/verso"]);
export function texWorkspaceShouldSkipDirectory(name, ignore = new Set()) {
    return texWorkspaceIgnoredDirectories.includes(name) || ignore.has(name);
}
