import { leanLakefileContract, } from "../schema.mjs";
export { leanLakefileContract, leanLakefileSchema, } from "../schema.mjs";
export function decodeLeanLakefileToml(text) {
    const root = parseTomlAssignments(text);
    const libraries = parseTomlTables(text, "lean_lib")
        .map((table) => ({
        name: table.name ?? "",
        roots: table.roots === undefined ? Object.freeze([]) : splitTomlArray(table.roots),
        ...(table.srcDir === undefined ? {} : { sourceDir: table.srcDir }),
    }))
        .filter((library) => library.name !== "");
    const requires = parseTomlTables(text, "require")
        .map((table) => ({
        name: table.name ?? "",
        ...(table.path === undefined && table.git === undefined ? {} : { source: table.path ?? table.git }),
        ...(table.scope === undefined ? {} : { scope: table.scope }),
    }))
        .filter((requirement) => requirement.name !== "");
    return leanLakefileContract.assert({
        kind: "metroplat.lean.lakefile",
        name: root.name ?? "unknown",
        ...(root.version === undefined ? {} : { version: root.version }),
        defaultTargets: Object.freeze(root.defaultTargets === undefined ? [] : splitTomlArray(root.defaultTargets)),
        requires: Object.freeze(requires),
        libraries: Object.freeze(libraries),
        mediaType: "application/vnd.lean.lakefile+toml",
    }, "Lean lakefile");
}
function parseTomlAssignments(text) {
    const out = {};
    for (const line of text.split(/\r?\n/u)) {
        if (/^\s*\[\[/u.test(line))
            break;
        const match = /^\s*([A-Za-z0-9_-]+)\s*=\s*(.+?)\s*$/u.exec(line);
        if (match?.[1] !== undefined && match[2] !== undefined)
            out[match[1]] = unquoteToml(match[2]);
    }
    return out;
}
function parseTomlTables(text, name) {
    const tables = [];
    let current;
    for (const line of text.split(/\r?\n/u)) {
        const header = /^\s*\[\[([A-Za-z0-9_-]+)\]\]\s*$/u.exec(line)?.[1];
        if (header !== undefined) {
            current = header === name ? {} : undefined;
            if (current !== undefined)
                tables.push(current);
            continue;
        }
        if (current === undefined)
            continue;
        const match = /^\s*([A-Za-z0-9_-]+)\s*=\s*(.+?)\s*$/u.exec(line);
        if (match?.[1] !== undefined && match[2] !== undefined)
            current[match[1]] = unquoteToml(match[2]);
    }
    return Object.freeze(tables);
}
function splitTomlArray(value) {
    const trimmed = value.trim();
    if (!trimmed.startsWith("[") || !trimmed.endsWith("]"))
        return Object.freeze(trimmed === "" ? [] : [trimmed]);
    return Object.freeze(trimmed.slice(1, -1).split(",").map((item) => unquoteToml(item.trim())).filter(Boolean));
}
function unquoteToml(value) {
    return value.trim().replace(/^["']|["']$/gu, "");
}
