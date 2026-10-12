/**
 * analysis/bitopological-settling-site - finite executable shadow of
 * RelMath.Cohomology.BitopologicalSettlingSite.
 *
 * The site is built from the pairwise-Stone clopen Boolean algebra already
 * carried by `pairwise-stone-clopen`: objects vary by predicate, settling
 * stratum, and clopen; covers are fixed-fiber finite clopen join-covers.
 */
import { type ClopenUp, type ClopenLatticeReceipt } from "./pairwise-stone-clopen.mjs";
export interface SiteObjectCarrier {
    readonly kind: "bitopologicalSettlingSite.object";
    readonly predicate: string;
    readonly tau: number;
    readonly clopen: ClopenUp;
}
export interface FiberCoverReceipt {
    readonly kind: "bitopologicalSettlingSite.cover:witness";
    readonly target: ClopenUp;
    readonly family: readonly ClopenUp[];
    readonly join: ClopenUp;
    readonly everyMemberSubTarget: true;
    readonly joinEqualsTarget: true;
}
export interface TemporalCoverReceipt {
    readonly kind: "bitopologicalSettlingSite.noTemporalCovers:witness";
    readonly source: SiteObjectCarrier;
    readonly target: SiteObjectCarrier;
    readonly advances: true;
    readonly strictAdvance: boolean;
    readonly sameClopen: true;
    readonly fiberCoverSeenByJ: FiberCoverReceipt;
    readonly topologyMentionsTau: false;
    readonly temporalContentInMorphismsNotCovers: true;
}
export interface BitopologicalSettlingSiteReceipt {
    readonly kind: "bitopologicalSettlingSite.receipt:witness";
    readonly clopens: readonly ClopenUp[];
    readonly lattice: ClopenLatticeReceipt;
    readonly identityCover: FiberCoverReceipt;
    readonly pulledBackCover: FiberCoverReceipt;
    readonly transitiveCover: FiberCoverReceipt;
    readonly temporal: TemporalCoverReceipt;
    readonly clopenSubPartialOrder: true;
    readonly advancesPreorder: true;
    readonly grothendieckBasisAxioms: true;
    readonly strictRegimeFiniteFiber: true;
    readonly noTemporalCovers: true;
    readonly frontier: "general predicate reindexing and non-finite Grothendieck sites remain proof/kernel obligations";
}
export declare const sameClopen: (left: ClopenUp, right: ClopenUp) => boolean;
export declare const sub: (left: ClopenUp, right: ClopenUp) => boolean;
export declare const advances: (tau: number, tauPrime: number) => boolean;
export declare function siteObject(predicate: string, tauInput: number, clopen: ClopenUp): SiteObjectCarrier;
export declare function joinList(family: readonly ClopenUp[]): ClopenUp;
export declare function covers(target: ClopenUp, family: readonly ClopenUp[]): boolean;
export declare function coverReceipt(target: ClopenUp, familyInput: readonly ClopenUp[]): FiberCoverReceipt;
export declare function pullbackCover(target: ClopenUp, coverFamily: readonly ClopenUp[], along: ClopenUp): FiberCoverReceipt;
export declare function temporalCoverReceipt(source?: SiteObjectCarrier, target?: SiteObjectCarrier): TemporalCoverReceipt;
export declare function receipt(): BitopologicalSettlingSiteReceipt;
