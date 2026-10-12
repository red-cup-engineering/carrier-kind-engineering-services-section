/**
 * analysis/formats-four - finite executable shadow of RelMath.Computing.FormatsFour.
 *
 * Serialization formats are classified by two independent FOUR-valued coordinates:
 * a content-commitment corner and a completion regime. The small table here is the
 * finite runtime counterpart of the Lean `Format.all` census.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
export type FormatName = "bytes" | "plaintext" | "json" | "rdf" | "markdown" | "html" | "tex" | "rmnHtml";
export type FormatRegime = "ordinal.closure.regime.finite" | "ordinal.closure.regime.scott" | "ordinal.closure.regime.transfinite" | "ordinal.closure.regime.aperiodic";
export interface FormatFourRow {
    readonly name: FormatName;
    readonly corner: ChargeValueName;
    readonly regime: FormatRegime;
    readonly cost: 0 | 1 | 2 | 3;
    readonly decidable: boolean;
}
export interface FormatsClosureHierarchyReceipt {
    readonly kind: "formatsFour.closureHierarchy:witness";
    readonly formats: readonly FormatFourRow[];
    readonly cardinality: 8;
    readonly cornersOnto: true;
    readonly costRises: readonly [FormatName, FormatName];
    readonly costFalls: readonly [FormatName, FormatName];
    readonly topCornerMultiRegime: readonly FormatName[];
    readonly rmnHtmlRecoversDecidability: true;
}
export declare const formatRows: readonly FormatFourRow[];
/** The finite `FormatsClosureHierarchy` bundle: FOUR x FOUR and non-monotone cost. */
export declare function formatsClosureHierarchy(): FormatsClosureHierarchyReceipt;
