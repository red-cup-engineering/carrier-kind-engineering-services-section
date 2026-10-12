import type { BlueprintClaimGraph } from "./schema.mjs";
import { type AppOpticDescriptor } from "../apps-schema.mjs";
export interface BlueprintAppNode {
    readonly id: string;
    readonly title?: string;
    readonly statementKind: string;
    readonly status: "settled" | "frontier" | "unstated";
    readonly source: string;
    readonly line: number;
    readonly leanDeclarations: readonly string[];
    readonly uses: readonly string[];
    readonly usedBy: readonly string[];
}
export interface BlueprintAppSection {
    readonly status: "settled" | "frontier" | "unstated";
    readonly nodes: readonly BlueprintAppNode[];
}
export interface BlueprintAppDocument {
    readonly kind: "metroplat.apps.blueprint.document";
    readonly optic: "blueprint-claim-frontier";
    readonly sources: readonly string[];
    readonly settled: number;
    readonly frontier: number;
    readonly unstated: number;
    readonly missingDependencies: readonly string[];
    readonly sections: readonly BlueprintAppSection[];
    readonly edges: BlueprintClaimGraph["edges"];
    readonly evidence: readonly string[];
}
export declare function blueprintAppOptic(): AppOpticDescriptor;
/** Assemble an authored Blueprint optic from an admitted claim graph. */
export declare function blueprintAppDocument(graph: BlueprintClaimGraph): BlueprintAppDocument;
