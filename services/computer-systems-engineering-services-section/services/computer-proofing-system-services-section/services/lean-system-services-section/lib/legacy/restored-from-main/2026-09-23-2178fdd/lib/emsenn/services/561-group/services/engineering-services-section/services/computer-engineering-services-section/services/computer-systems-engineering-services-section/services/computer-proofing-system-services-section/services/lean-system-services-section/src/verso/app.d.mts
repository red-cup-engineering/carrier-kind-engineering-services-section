import type { VersoExpositionWeldReport } from "./schema.mjs";
import { type AppOpticDescriptor } from "../apps-schema.mjs";
export interface VersoAppCheck {
    readonly name: "lean-catalog" | "blueprint-graph";
    readonly checked: boolean;
    readonly missing: readonly string[];
}
export interface VersoAppDocument {
    readonly kind: "metroplat.apps.verso.document";
    readonly optic: "verso-exposition-weld";
    readonly sources: readonly string[];
    readonly imports: readonly string[];
    readonly includes: readonly string[];
    readonly theoremReferences: readonly string[];
    readonly claimOccurrences: readonly string[];
    readonly blueprintNodes: readonly string[];
    readonly checkedLeanBlocks: number;
    readonly checks: readonly VersoAppCheck[];
    readonly ok: boolean;
    readonly obstructions: readonly string[];
    readonly evidence: readonly string[];
}
export declare function versoAppOptic(): AppOpticDescriptor;
/** Assemble an authored Verso optic from an admitted exposition weld report. */
export declare function versoAppDocument(report: VersoExpositionWeldReport): VersoAppDocument;
