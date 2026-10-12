/**
 * analysis/bigraded-diamond - finite executable shadow of
 * RelMath.Positing.BigradedDiamond and the FOUR instance of
 * RelMath.Positing.NucleusAndCommutingNuclei.
 *
 * Lean proves that the charge knowledge order is a Heyting algebra, that
 * raising by knowledge-join toward a charge is a nucleus, that any two such
 * nuclei commute, and that the true/false two-fiber family varies. This module
 * turns those finite FOUR facts into carrier receipts.
 */
import { type ChargeValueName, type GaugeElementName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type CrossOrderNucleusFinding } from "../../valuation-fiber-algebra.mjs";
export type BigradedDiamondCornerName = "potential" | "active" | "stable" | "absurd";
export type BigradedDiamondFiberName = "true" | "false";
export type K4GradeName = "id" | "neg" | "conf" | "negConf";
export type FourCornerPair = readonly [knowledgeAxis: boolean, truthAxis: boolean];
export interface KnowledgeHeytingReceipt {
    readonly kind: "bigradedDiamond.knowledgeHeyting:witness";
    readonly carrier: readonly ChargeValueName[];
    readonly bottom: "absurd";
    readonly top: "stable";
    readonly meetCommutative: true;
    readonly meetAssociative: true;
    readonly meetIdempotent: true;
    readonly implicationAdjunction: true;
    readonly modusPonens: true;
}
export interface KnowledgeNucleusReceipt {
    readonly kind: "bigradedDiamond.knowledgeNucleus:witness";
    readonly pole: ChargeValueName;
    readonly action: Readonly<Record<ChargeValueName, ChargeValueName>>;
    readonly fixed: readonly ChargeValueName[];
    readonly inflationary: true;
    readonly idempotent: true;
    readonly meetPreserving: true;
    readonly monotone: true;
    readonly fixedImplicationClosed: true;
    readonly topFixed: true;
}
export interface CornerActionReceipt {
    readonly corner: BigradedDiamondCornerName;
    readonly action: Readonly<Record<ChargeValueName, ChargeValueName>>;
    readonly imageAtKnowledgeBottom: ChargeValueName;
}
export interface NuclearSquareReceipt {
    readonly kind: "bigradedDiamond.nuclearSquare:witness";
    readonly leftPole: ChargeValueName;
    readonly rightPole: ChargeValueName;
    readonly left: KnowledgeNucleusReceipt;
    readonly right: KnowledgeNucleusReceipt;
    readonly piAction: Readonly<Record<ChargeValueName, ChargeValueName>>;
    readonly jointFixed: readonly ChargeValueName[];
    readonly corners: readonly CornerActionReceipt[];
    readonly cornerCount: 4;
    readonly commutes: true;
    readonly compositeIsNucleus: true;
    readonly fixPiIffFixBoth: true;
}
export interface VaryingFamilyReceipt {
    readonly kind: "bigradedDiamond.varyingFamily:witness";
    readonly fibers: Readonly<Record<BigradedDiamondFiberName, NuclearSquareReceipt>>;
    readonly varies: true;
    readonly witness: {
        readonly leftFiber: "true";
        readonly rightFiber: "false";
        readonly differingNucleus: "j1";
        readonly at: "absurd";
        readonly leftValue: "potential";
        readonly rightValue: "stable";
    };
}
export interface BigradedDiamondReceipt {
    readonly kind: "bigradedDiamond.receipt:witness";
    readonly heyting: KnowledgeHeytingReceipt;
    readonly family: VaryingFamilyReceipt;
    readonly finiteNuclearQuartetDischarged: true;
}
export interface GradePoleReceipt {
    readonly grade: K4GradeName;
    readonly gaugeElement: GaugeElementName;
    readonly knowledgeAxis: boolean;
    readonly truthAxis: boolean;
    readonly fourCorner: FourCornerPair;
    readonly corner: BigradedDiamondCornerName;
    readonly leftPole: ChargeValueName;
    readonly rightPole: ChargeValueName;
    readonly square: NuclearSquareReceipt;
}
export interface BigradedDiamondTowerReceipt {
    readonly kind: "bigradedDiamond.tower:witness";
    readonly grades: readonly GradePoleReceipt[];
    readonly gradeCount: 4;
    readonly cornerCount: 4;
    readonly axesAssemble: true;
    readonly axesIndependent: true;
    readonly everyGradeSameOrderSquare: true;
    readonly everyGradeFixPiIff: true;
    readonly crossOrderForbidsCoNucleus: CrossOrderNucleusFinding;
}
export declare function knowledgeImplication(antecedentInput: string, consequentInput: string): ChargeValueName;
export declare const knowledgeNucleusToward: (poleInput: string, valueInput: string) => ChargeValueName;
export declare function knowledgeHeytingReceipt(): KnowledgeHeytingReceipt;
export declare function knowledgeNucleusReceipt(poleInput: string): KnowledgeNucleusReceipt;
export declare function nuclearSquareReceipt(leftPoleInput: string, rightPoleInput: string): NuclearSquareReceipt;
export declare function varyingFamilyReceipt(): VaryingFamilyReceipt;
export declare function receipt(): BigradedDiamondReceipt;
export declare const knowledgeBit: (grade: K4GradeName) => boolean;
export declare const truthBit: (grade: K4GradeName) => boolean;
export declare function toFourCorner(grade: K4GradeName): FourCornerPair;
export declare function ofFourCorner(corner: FourCornerPair): K4GradeName;
export declare function fourCornerToCorner(corner: FourCornerPair): BigradedDiamondCornerName;
export declare function gradePoles(grade: K4GradeName): readonly [leftPole: ChargeValueName, rightPole: ChargeValueName];
export declare function towerReceipt(): BigradedDiamondTowerReceipt;
