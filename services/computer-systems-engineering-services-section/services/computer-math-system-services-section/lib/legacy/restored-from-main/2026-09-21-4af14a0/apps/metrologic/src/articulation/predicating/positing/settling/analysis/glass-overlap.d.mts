/**
 * analysis/glass-overlap - finite configuration overlap.
 *
 * Executable carrier for `RelMath.Glass.Overlap`: a configuration assigns a
 * local state to each finite site, and overlap counts the listed sites on which
 * two configurations agree. This is the finite Hamming/replica-overlap shadow;
 * probability-valued Parisi order parameters stay outside this carrier.
 */
export type ConfigurationState = string | number | boolean | null;
export type Configuration = Readonly<Record<string, ConfigurationState>>;
export interface OverlapJudgment {
    readonly kind: "glass.overlap.count:witness";
    readonly sites: readonly string[];
    readonly left: Configuration;
    readonly right: Configuration;
    readonly count: number;
    readonly length: number;
}
export interface GlassOverlapReceipt {
    readonly kind: "glass.overlap.receipt:witness";
    readonly sourceModule: "RelMath.Glass.Overlap";
    readonly theorems: readonly [
        "RelMath.Glass.Configuration",
        "RelMath.Glass.overlapCount",
        "RelMath.Glass.overlapCount_nil",
        "RelMath.Glass.overlapCount_self",
        "RelMath.Glass.overlapCount_symm",
        "RelMath.Glass.overlapCount_le_length"
    ];
    readonly sample: OverlapJudgment;
    readonly self: OverlapJudgment;
    readonly symmetric: OverlapJudgment;
    readonly nil: OverlapJudgment;
    readonly selfOverlapsEverywhere: true;
    readonly overlapSymmetric: true;
    readonly overlapLeLength: true;
}
/** Count listed sites where two finite configurations carry equal local state. */
export declare function overlapCount(sites: readonly string[], left: Configuration, right: Configuration): OverlapJudgment;
/** Finite carrier for `RelMath.Glass.Overlap`. */
export declare function receipt(): GlassOverlapReceipt;
export interface BasinGraphCarrier {
    readonly kind: "glass.basinGraph.carrier";
    readonly basins: readonly string[];
    readonly transitions: Readonly<Record<string, readonly string[]>>;
    readonly energy: Readonly<Record<string, number>>;
}
export interface DescendChainJudgment {
    readonly kind: "glass.basinGraph.descendChain:witness";
    readonly chain: readonly string[];
    readonly startEnergy: number;
    readonly endEnergy: number;
    readonly energyDecreases: true;
}
export interface BasinGraphReceipt {
    readonly kind: "glass.basinGraph.receipt:witness";
    readonly sourceModule: "RelMath.Glass.BasinGraph";
    readonly theorems: readonly [
        "RelMath.Glass.BasinGraph",
        "RelMath.Glass.BasinGraph.Descends",
        "RelMath.Glass.BasinGraph.DescendChain",
        "RelMath.Glass.BasinGraph.descendChain_energy_lt",
        "RelMath.Glass.BasinGraph.no_descending_cycle",
        "RelMath.Glass.BasinGraph.descend_asymm"
    ];
    readonly graph: BasinGraphCarrier;
    readonly chain: DescendChainJudgment;
    readonly noDescendingCycle: true;
    readonly descendAsymmetric: true;
}
export declare function descends(graph: BasinGraphCarrier, source: string, target: string): boolean;
export declare function descendChain(graph: BasinGraphCarrier, chain: readonly string[]): DescendChainJudgment;
/** Finite carrier for `RelMath.Glass.BasinGraph`. */
export declare function basinGraphReceipt(): BasinGraphReceipt;
export interface DynamicHeterogeneityReceipt {
    readonly kind: "glass.dynamicHeterogeneity.receipt:witness";
    readonly sourceModule: "RelMath.Glass.DynamicHeterogeneity";
    readonly theorems: readonly [
        "RelMath.Glass.changedOn",
        "RelMath.Glass.mobilityCount",
        "RelMath.Glass.mobility_zero_iff_agree_on_support",
        "RelMath.Glass.mobility_self"
    ];
    readonly sites: readonly string[];
    readonly left: Configuration;
    readonly right: Configuration;
    readonly mobilityCount: number;
    readonly overlapCount: number;
    readonly mobilityPlusOverlap: number;
    readonly mobilitySelf: 0;
    readonly zeroMobilityIffAgree: true;
}
export declare function changedOn(left: Configuration, right: Configuration, site: string): boolean;
export declare function mobilityCount(sites: readonly string[], left: Configuration, right: Configuration): number;
/** Finite carrier for `RelMath.Glass.DynamicHeterogeneity`. */
export declare function dynamicHeterogeneityReceipt(): DynamicHeterogeneityReceipt;
export type ActiveField = Readonly<Record<string, boolean>>;
export interface KcmReceipt {
    readonly kind: "glass.kcm.receipt:witness";
    readonly sourceModule: "RelMath.Glass.KCM";
    readonly theorems: readonly [
        "RelMath.Glass.activateStep",
        "RelMath.Glass.activateStep_infl",
        "RelMath.Glass.activateStep_mono",
        "RelMath.Glass.activateStep_fixed",
        "RelMath.Glass.ActiveClosure",
        "RelMath.Glass.activation_is_facilitation_closure"
    ];
    readonly sites: readonly string[];
    readonly facilitation: Readonly<Record<string, readonly string[]>>;
    readonly seed: ActiveField;
    readonly afterOneStep: ActiveField;
    readonly closure: ActiveField;
    readonly activationInflationary: true;
    readonly activationMonotone: true;
    readonly closureFixed: true;
    readonly seedExtendsToClosure: true;
}
export declare function activateStep(sites: readonly string[], facilitation: Readonly<Record<string, readonly string[]>>, active: ActiveField): ActiveField;
export declare function activeClosure(sites: readonly string[], facilitation: Readonly<Record<string, readonly string[]>>, seed: ActiveField): ActiveField;
/** Finite carrier for `RelMath.Glass.KCM`. */
export declare function kcmReceipt(): KcmReceipt;
