/**
 * analysis/weave-draft - plain-weave drafts as bilattice-coloured sofic shifts.
 *
 * Executable shadow of RelMath.Aperiodic.WeaveDraft: the over/under alternation
 * graph is the two-colour complete graph, crossing data is a FOUR charge, and
 * a defect-free plain-weave word relabels to a charge-coloured sofic image.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type PathJudgment, type SoficImageJudgment } from "./sofic.mjs";
export type WeaveWord = readonly boolean[];
export type WeaveSwatch = readonly (readonly boolean[])[];
export interface WeaveDraftReceipt {
    readonly kind: "aperiodic.weaveDraft.receipt:witness";
    readonly warpWord: WeaveWord;
    readonly warpPath: PathJudgment;
    readonly chargeWord: readonly ChargeValueName[];
    readonly chargeImage: SoficImageJudgment;
    readonly swatch: WeaveSwatch;
    readonly warpAltEqualsCompleteGraph: true;
    readonly warpAltForbidsFloat: true;
    readonly warpSofic: true;
    readonly holeIsKBot: true;
    readonly miscrossingIsKTop: true;
    readonly overUnderSwapIsNegate: true;
    readonly defectFreeDefinite: true;
    readonly miscrossingIsInconsistency: true;
    readonly defectFreeConsistent: true;
    readonly overUnderSwapFixesDefect: true;
    readonly chargeColouredSofic: true;
    readonly columnsComplement: true;
    readonly mapNotInvolutive: true;
    readonly entropyCollapse: true;
}
export declare const plainWeaveGraph: any;
export declare const warpAlt: (left: boolean, right: boolean) => boolean;
export declare const completeGraphBool: (left: boolean, right: boolean) => boolean;
export declare function warpPath(word: WeaveWord): PathJudgment;
export declare const noFloat: (word: WeaveWord) => boolean;
export declare function crossingCharge(warpOver: boolean, weftOver: boolean): ChargeValueName;
export declare const chargeColour: (crossing: boolean) => ChargeValueName;
export declare function chargeColourWord(word: WeaveWord): readonly ChargeValueName[];
export declare function chargeColouredSofic(word: WeaveWord): SoficImageJudgment;
export declare const complementRow: (row: WeaveWord) => WeaveWord;
export declare function columnsComplement(swatch: WeaveSwatch): boolean;
export declare function plainWeaveSwatch(swatch: WeaveSwatch): boolean;
export declare function entropyCollapse(swatch: WeaveSwatch): boolean;
export declare function receipt(warpWord?: WeaveWord, swatch?: WeaveSwatch): WeaveDraftReceipt;
