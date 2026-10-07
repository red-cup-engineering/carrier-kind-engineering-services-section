import { versoExpositionWeldReportContract, } from "./schema.mjs";
export { versoExpositionWeldReportContract, versoExpositionWeldReportSchema, } from "./schema.mjs";
export function versoExpositionWeldReport(input, options = {}) {
    const plates = Array.isArray(input) ? input : [input];
    const sources = [...new Set(plates.map((plate) => plate.source))].sort();
    const imports = [...new Set(plates.flatMap((plate) => [...plate.imports]))].sort();
    const includes = [...new Set(plates.flatMap((plate) => [...plate.includes]))].sort();
    const leanDeclarations = [...new Set(plates.flatMap((plate) => [...plate.leanDeclarations]))].sort();
    const claimOccurrences = [...new Set(plates.flatMap((plate) => [...plate.claimOccurrences]))].sort();
    const blueprintNodes = [...new Set(plates.flatMap((plate) => [...plate.blueprintNodes]))].sort();
    const leanDeclarationSet = options.leanDeclarations === undefined
        ? undefined
        : new Set(options.leanDeclarations.entries.map((entry) => entry.name));
    const blueprintNodeSet = options.blueprint === undefined
        ? undefined
        : new Set(options.blueprint.nodes.map((node) => node.id));
    const missingLeanDeclarations = leanDeclarationSet === undefined
        ? []
        : leanDeclarations.filter((name) => !leanDeclarationSet.has(name));
    const missingBlueprintNodes = blueprintNodeSet === undefined
        ? []
        : blueprintNodes.filter((node) => !blueprintNodeSet.has(node));
    const evidence = [
        ...sources.map((source) => `verso-plate:${source}`),
        options.leanDeclarations === undefined ? "lean-declaration-catalog:unchecked" : `lean-declaration-catalog:${options.leanDeclarations.rootModule}`,
        options.blueprint === undefined ? "blueprint-claim-graph:unchecked" : `blueprint-claim-graph:${options.blueprint.sources.length}`,
    ];
    return versoExpositionWeldReportContract.assert({
        kind: "metroplat.verso.exposition-weld-report",
        sources,
        imports,
        includes,
        leanDeclarations,
        claimOccurrences,
        blueprintNodes,
        checkedLeanBlocks: plates.reduce((sum, plate) => sum + plate.checkedLeanBlocks, 0),
        leanCatalogChecked: leanDeclarationSet !== undefined,
        blueprintGraphChecked: blueprintNodeSet !== undefined,
        missingLeanDeclarations: Object.freeze(missingLeanDeclarations),
        missingBlueprintNodes: Object.freeze(missingBlueprintNodes),
        ok: missingLeanDeclarations.length === 0 && missingBlueprintNodes.length === 0,
        evidence: Object.freeze(evidence),
        mediaType: "application/vnd.metroplat.verso.exposition-weld-report+json",
    }, "Verso exposition weld report");
}
