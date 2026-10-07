/**
 * @packageDocumentation
 *
 * tex/workspace-service - live TeX-family host-mark scanning.
 *
 * This module owns the filesystem boundary for TeX, Blueprint, and Verso
 * authoring surfaces. Generic TeX text is admitted through
 * the computer-code TeX service; Blueprint and Verso plate decoding and readouts live in
 * `blueprint/codec.mjs`/`blueprint/view.mjs` and `verso/codec.mjs`/`verso/view.mjs`.
 * Process/command execution over these tools is a host-side integration
 * concern that stays with the consuming application.
 */
import path from "node:path";
import { decodeTexPlate } from "@red-cup-engineering/tex-engineering-services-section";
import { decodeBlueprintTexPlate } from "../blueprint/codec.mjs";
import { decodeVersoTexPlate } from "../verso/codec.mjs";
import { texWorkspaceReadContract as texWorkspaceReadSchemaContract, } from "./schema.mjs";
import { blueprintClaimGraph } from "../blueprint/view.mjs";
import { versoExpositionWeldReport } from "../verso/view.mjs";
import { texWorkspaceDefaultBlueprintRoots, texWorkspaceDefaultTexRoots, texWorkspaceDefaultVersoRoots, texWorkspaceShouldSkipDirectory, } from "./workspace.mjs";
import { pathExists, readDirectoryEntries, readFileUtf8, statPathOrNull } from "@red-cup-engineering/computer-system-engine/filesystem";
function collectSources(root, relativeRoots, extensions, options) {
    const maxDepth = options.maxDepth ?? 8;
    const ignore = new Set(options.ignore ?? []);
    const extensionSet = new Set(extensions);
    const files = [];
    const scan = (current, depth) => {
        if (depth > maxDepth)
            return;
        const currentStat = statPathOrNull(current);
        if (currentStat === null)
            return;
        if (currentStat.isFile()) {
            if (extensionSet.has(path.extname(current)))
                files.push(current);
            return;
        }
        if (!currentStat.isDirectory())
            return;
        let entries;
        try {
            entries = readDirectoryEntries(current);
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const target = path.join(current, entry.name);
            if (entry.isDirectory()) {
                if (texWorkspaceShouldSkipDirectory(entry.name, ignore))
                    continue;
                scan(target, depth + 1);
                continue;
            }
            if (!entry.isFile())
                continue;
            if (!extensionSet.has(path.extname(entry.name)))
                continue;
            files.push(target);
        }
    };
    for (const relativeRoot of [...new Set(relativeRoots)].sort()) {
        const absolute = path.join(root, relativeRoot);
        if (pathExists(absolute))
            scan(absolute, 0);
    }
    return Object.freeze([...new Set(files)].sort().map((file) => Object.freeze({
        path: path.relative(root, file).replace(/\\/gu, "/"),
        text: readFileUtf8(file),
    })));
}
/** Read a live TeX/Blueprint/Verso authoring tree into one admitted TeX workspace read. */
export function readTexWorkspace(root, options = {}) {
    const absoluteRoot = path.resolve(root);
    const texSources = collectSources(absoluteRoot, options.texRoots ?? texWorkspaceDefaultTexRoots, [".tex"], options);
    const blueprintSources = collectSources(absoluteRoot, options.blueprintRoots ?? texWorkspaceDefaultBlueprintRoots, [".tex"], options);
    const versoSources = collectSources(absoluteRoot, options.versoRoots ?? texWorkspaceDefaultVersoRoots, [".lean"], options);
    const texPlates = Object.freeze(texSources.map((source) => decodeTexPlate(source.text, { source: source.path, format: "generic-tex" })));
    const blueprintPlates = Object.freeze(blueprintSources.map((source) => decodeBlueprintTexPlate(source.text, source.path)));
    const versoPlates = Object.freeze(versoSources.map((source) => decodeVersoTexPlate(source.text, source.path)));
    const claimGraph = blueprintClaimGraph(blueprintPlates);
    const weldReport = versoExpositionWeldReport(versoPlates, {
        blueprint: claimGraph,
        ...(options.leanDeclarations === undefined ? {} : { leanDeclarations: options.leanDeclarations }),
    });
    return texWorkspaceReadSchemaContract.assert(Object.freeze({
        kind: "metroplat.tex.workspace",
        operation: "read-tex-workspace",
        root: absoluteRoot,
        texSources,
        blueprintSources,
        versoSources,
        texPlates,
        blueprintPlates,
        versoPlates,
        blueprintClaimGraph: claimGraph,
        versoExpositionWeldReport: weldReport,
    }), "TeX workspace read");
}
