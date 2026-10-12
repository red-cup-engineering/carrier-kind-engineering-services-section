/**
 * positing/modal-kripke-four-valued — finite FOUR-valued Kripke frames.
 *
 * Executable shadow of `RelMath.Positing.ModalKripkeFourValued`.
 *
 * The Lean carrier is a finite fibration whose fiber at a cell is the list of
 * cells accessible from it. Runtime parity stores that relation directly:
 * `accessibility[world] = accessible worlds`. Possibility is the knowledge join
 * over a fiber; necessity is the knowledge meet over a fiber.
 */
import { type ChargeValueName } from "../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
export type KripkeFrameClass = "K" | "T" | "S4" | "S5";
export type KripkeValuation = Readonly<Record<string, ChargeValueName>>;
export interface ModalKripkeFrame {
    readonly kind: "positing.modalKripke.frame";
    readonly worlds: readonly string[];
    readonly accessibility: Readonly<Record<string, readonly string[]>>;
    readonly reflexive: boolean;
    readonly transitive: boolean;
    readonly symmetric: boolean;
    readonly frameClass: KripkeFrameClass;
}
export interface TwistSplit {
    readonly kind: "positing.modalKripke.twistSplit";
    readonly value: ChargeValueName;
    readonly positive: boolean;
    readonly negative: boolean;
}
export interface ModalKripkeReceipt {
    readonly kind: "positing.modalKripke.receipt:witness";
    readonly frame: ModalKripkeFrame;
    readonly valuation: KripkeValuation;
    readonly possibilized: KripkeValuation;
    readonly necessitated: KripkeValuation;
    readonly kPossibilizeMonotone: true;
    readonly kNecessitateMonotone: true;
    readonly tPossibilizeInflationary: boolean;
    readonly tNecessitateDeflationary: boolean;
    readonly s4BoxInterior: boolean;
    readonly s4DiamondClosure: boolean;
    readonly s4BoxIdempotent: boolean;
    readonly s4DiamondIdempotent: boolean;
    readonly s5ForgetsToS4: boolean;
    readonly s5PossibilizeAdjointNecessitate: boolean;
    readonly s5Commutating: boolean;
    readonly s5ClosureEqualsPossibilize: boolean;
    readonly s5ClosureInflationary: boolean;
    readonly s5ClosureMonotone: boolean;
    readonly s5ClosureIdempotent: boolean;
    readonly hierarchy: readonly KripkeFrameClass[];
    readonly twistSplit: readonly TwistSplit[];
    readonly twistSplitNegate: true;
}
export interface ModalPairAdjunctionReceipt {
    readonly kind: "positing.modalPairAdjunction.receipt:witness";
    readonly theorem: "RelMath.Valuation.ModalFrame.possibilize_adjoint_necessitate" | "RelMath.Valuation.ModalFrame.closureOp_is_closure";
    readonly frame: ModalKripkeFrame;
    readonly valuation: KripkeValuation;
    readonly possibilized: KripkeValuation;
    readonly necessitated: KripkeValuation;
    readonly closure: KripkeValuation;
    readonly modalFrameS5: true;
    readonly possibilizeInflationary: true;
    readonly necessitateDeflationary: true;
    readonly possibilizeMonotone: true;
    readonly necessitateMonotone: true;
    readonly possibilizeAdjointNecessitate: true;
    readonly adjunctionUnit: true;
    readonly adjunctionCounit: true;
    readonly necessitatePossibilizeLe: true;
    readonly closureEqualsPossibilize: true;
    readonly closureInflationary: true;
    readonly closureMonotone: true;
    readonly closureIdempotent: true;
    readonly settled: KripkeValuation;
    readonly settleFixed: true;
    readonly settleLeast: true;
}
export declare function modalKripkeFrame(worlds: readonly string[], accessibility: Readonly<Record<string, readonly string[]>>): ModalKripkeFrame;
export declare function possibilize(frame: ModalKripkeFrame, valuation: KripkeValuation): KripkeValuation;
export declare function necessitate(frame: ModalKripkeFrame, valuation: KripkeValuation): KripkeValuation;
export declare function closureOp(frame: ModalKripkeFrame, valuation: KripkeValuation): KripkeValuation;
export declare function twistSplit(value: ChargeValueName): TwistSplit;
export declare function modalKripkeReceipt(frame: ModalKripkeFrame, valuation: KripkeValuation): ModalKripkeReceipt;
/** Bundle the finite Node shadow of `RelMath.Closure.ModalPairAdjunction`. */
export declare function modalPairAdjunctionReceipt(frame: ModalKripkeFrame, valuation: KripkeValuation): ModalPairAdjunctionReceipt;
