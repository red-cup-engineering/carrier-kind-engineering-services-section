import { appOpticDescriptorContract, versoAppDocumentContract, } from "../apps-schema.mjs";
export function versoAppOptic() {
    return appOpticDescriptorContract.assert(Object.freeze({
        kind: "metroplat.apps.optic",
        id: "metroplat.apps.verso.exposition-weld",
        app: "verso",
        optic: "verso-exposition-weld",
        mode: "inspector",
        domain: "metroplat/verso/exposition-weld-report",
        codomain: "metroplat/apps/verso/document",
        evidence: Object.freeze(["apps/verso:versoAppDocument"]),
    }), "Verso app optic descriptor");
}
/** Assemble an authored Verso optic from an admitted exposition weld report. */
export function versoAppDocument(report) {
    const checks = Object.freeze([
        Object.freeze({
            name: "lean-catalog",
            checked: report.leanCatalogChecked,
            missing: report.missingLeanDeclarations,
        }),
        Object.freeze({
            name: "blueprint-graph",
            checked: report.blueprintGraphChecked,
            missing: report.missingBlueprintNodes,
        }),
    ]);
    const obstructions = Object.freeze([
        ...report.missingLeanDeclarations.map((name) => `missing-lean:${name}`),
        ...report.missingBlueprintNodes.map((name) => `missing-blueprint:${name}`),
        ...(report.leanCatalogChecked ? [] : ["unchecked-lean-catalog"]),
        ...(report.blueprintGraphChecked ? [] : ["unchecked-blueprint-graph"]),
    ]);
    return versoAppDocumentContract.assert(Object.freeze({
        kind: "metroplat.apps.verso.document",
        optic: "verso-exposition-weld",
        sources: report.sources,
        imports: report.imports,
        includes: report.includes,
        theoremReferences: report.leanDeclarations,
        claimOccurrences: report.claimOccurrences,
        blueprintNodes: report.blueprintNodes,
        checkedLeanBlocks: report.checkedLeanBlocks,
        checks,
        ok: report.ok && obstructions.length === 0,
        obstructions,
        evidence: Object.freeze([
            ...report.evidence,
            `verso-sources:${report.sources.length}`,
            `obstructions:${obstructions.length}`,
        ]),
    }), "Verso app document");
}
