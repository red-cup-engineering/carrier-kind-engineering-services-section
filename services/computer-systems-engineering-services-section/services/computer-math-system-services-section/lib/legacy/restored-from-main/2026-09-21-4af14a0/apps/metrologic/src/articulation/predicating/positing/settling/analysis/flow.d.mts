/**
 * analysis/flow - finite closure-flow and firing reads.
 *
 * Executable carrier shadows for the green `RelMath.Flow` successor-time
 * cluster. The surface is deliberately finite: named cells, FOUR charge names,
 * pointwise charge operators, firing blowups, local-data reconstruction, finite
 * NSC commutation checks, curvature-regime receipts, Lyapunov free energy, and
 * Laplacianizer/Hodge fixed-point witnesses.
 *
 * Genuine arbitrary `Ord.limit` continuity and transfinite NSC firing classes
 * remain proof-side. The runtime surface only claims finite/canonical shadows
 * that can be checked over the package FOUR carrier.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
export type FlowCharge = ChargeValueName;
export type FiringTypeName = "tSide" | "fSide" | "top";
export type ClosureRegimeName = "ordinal.closure.regime.finite" | "ordinal.closure.regime.scott" | "ordinal.closure.regime.transfinite" | "ordinal.closure.regime.aperiodic";
export interface ChargeOperatorCarrier {
    readonly kind: "flow.chargeOperator";
    readonly map: Readonly<Record<FlowCharge, FlowCharge>>;
}
export interface FiniteValuation {
    readonly kind: "flow.valuation";
    readonly cells: readonly string[];
    readonly values: Readonly<Record<string, FlowCharge>>;
}
export interface CellLocalData {
    readonly cell: string;
    readonly incidence: boolean;
    readonly firingType: FiringTypeName | null;
    readonly consistencyFailure: FlowCharge | null;
}
export interface FiringBlowupWitness {
    readonly kind: "flow.firingBlowup:witness";
    readonly step: number;
    readonly predecessor: FiniteValuation;
    readonly actual: FiniteValuation;
    readonly leqKnowledge: true;
    readonly trivial: boolean;
    readonly nontrivial: boolean;
    readonly identityBlowup: boolean;
    readonly localData: readonly CellLocalData[];
    readonly reconstructedActual: FiniteValuation;
    readonly classified: true;
}
export interface NscFiringWitness {
    readonly kind: "flow.nscFiring:witness";
    readonly operator: ChargeOperatorCarrier;
    readonly family: readonly FlowCharge[];
    readonly supBefore: FlowCharge;
    readonly opSup: FlowCharge;
    readonly supAfterMap: FlowCharge;
    readonly commutes: false;
    readonly isNsc: true;
    readonly regime: "ordinal.closure.regime.transfinite";
    readonly cohomologyVanishes: false;
}
export interface NscFiringObstruction {
    readonly kind: "flow.nscFiring-obstruction";
    readonly operator: ChargeOperatorCarrier;
    readonly family: readonly FlowCharge[];
    readonly supBefore: FlowCharge;
    readonly opSup: FlowCharge;
    readonly supAfterMap: FlowCharge;
    readonly commutes: true;
    readonly isNsc: false;
    readonly reason: "scott-continuous-on-family";
}
export type NscFiringJudgment = NscFiringWitness | NscFiringObstruction;
export interface ScottClosureWitness {
    readonly kind: "flow.scottClosureNoNsc:witness";
    readonly operator: ChargeOperatorCarrier;
    readonly inflationary: boolean;
    readonly monotone: boolean;
    readonly idempotent: boolean;
    readonly closureLike: boolean;
    readonly directedFamiliesChecked: number;
    readonly nscCount: 0;
    readonly scottContinuous: true;
}
export interface ScottClosureObstruction {
    readonly kind: "flow.scottClosureNoNsc-obstruction";
    readonly operator: ChargeOperatorCarrier;
    readonly inflationary: boolean;
    readonly monotone: boolean;
    readonly idempotent: boolean;
    readonly closureLike: boolean;
    readonly directedFamiliesChecked: number;
    readonly nscCount: number;
    readonly scottContinuous: boolean;
}
export type ScottClosureJudgment = ScottClosureWitness | ScottClosureObstruction;
export interface ClosureFlowDynamicsWitness {
    readonly kind: "flow.closureFlowDynamics:witness";
    readonly orbit: readonly FiniteValuation[];
    readonly firingSteps: readonly number[];
    readonly smoothSteps: readonly number[];
    readonly smoothTailTerminal: boolean;
    readonly monotoneAscent: boolean;
    readonly settlesAt: number | null;
}
export interface CurvatureRegimeWitness {
    readonly kind: "flow.curvatureRegime:witness";
    readonly regime: ClosureRegimeName;
    readonly flat: boolean;
    readonly curved: boolean;
    readonly cohomologyVanishes: boolean;
    readonly curvatureRank: 0 | null;
    readonly terminatesByOmega: boolean;
    readonly curvedOmegaTerminating: false;
}
export interface FreeEnergyLyapunovWitness {
    readonly kind: "flow.freeEnergyLyapunov:witness";
    readonly cells: readonly string[];
    readonly orbit: readonly FiniteValuation[];
    readonly settled: FiniteValuation;
    readonly energies: readonly number[];
    readonly antitone: boolean;
    readonly strictDropsAtFirings: boolean;
    readonly equilibriumEnergy: 0;
    readonly boundedSteps: number;
    readonly hardClosure: true;
}
export interface EvidenceFlowStepReceipt {
    readonly kind: "flow.evidenceFlowStepReceipt:witness";
    readonly step: number;
    readonly predecessor: FiniteValuation;
    readonly actual: FiniteValuation;
    readonly flux: number;
    readonly commitments: number;
    readonly mints: number;
    readonly jumps: number;
    readonly truthRegisterLosses: number;
    readonly inconsistencyRegisterGains: number;
    readonly decomposed: true;
    readonly truthLossAccounted: true;
}
export interface EvidenceFlowLedgerNoetherWitness {
    readonly kind: "flow.evidenceFlowLedgerNoether:witness";
    readonly ordinary: EvidenceFlowStepReceipt;
    readonly negated: EvidenceFlowStepReceipt;
    readonly conflatedReverse: EvidenceFlowStepReceipt;
    readonly negationPreservesFlux: true;
    readonly negationPreservesRegisters: true;
    readonly conflationPreservesFlux: true;
    readonly conflationExchangesCommitmentsAndMints: true;
    readonly conflationPreservesJumps: true;
}
export interface OperationalAccountingLedger {
    readonly kind: "flow.operationalAccountingLedger:witness";
    readonly operator: ChargeOperatorCarrier;
    readonly cells: readonly string[];
    readonly seed: FiniteValuation;
    readonly settled: FiniteValuation;
    readonly horizon: number;
    readonly orbit: readonly FiniteValuation[];
    readonly initialCost: number;
    readonly receipts: readonly EvidenceFlowStepReceipt[];
    readonly accumulatedFlux: number;
    readonly residue: number;
    readonly balanced: true;
    readonly quiescent: boolean;
    readonly closed: boolean;
    readonly closesAtQuiescence: true;
    readonly noether: readonly EvidenceFlowLedgerNoetherWitness[];
}
export interface OperationalAccountingLawReceipt {
    readonly kind: "flow.operationalAccountingLawReceipt:witness";
    readonly staged: OperationalAccountingLedger;
    readonly jumped: OperationalAccountingLedger;
    readonly conservation: true;
    readonly itemization: true;
    readonly truthLossAccounting: true;
    readonly closesAtQuiescence: true;
    readonly noether: true;
    readonly leanTheorems: readonly ["Obsmetrologia.Valuation.stage_ledger", "Obsmetrologia.Valuation.truth_loss_is_record_gain", "Obsmetrologia.Valuation.ledger_noether"];
}
export interface LaplacianizerWitness {
    readonly kind: "flow.laplacianizer:witness";
    readonly operator: ChargeOperatorCarrier;
    readonly seed: FiniteValuation;
    readonly settled: FiniteValuation;
    readonly laplacianIsClosure: boolean;
    readonly hodgeIsoDegree0: true;
    readonly harmonicEqualsFixed: true;
    readonly settledIsLeastHarmonic: boolean;
}
export interface LawvereKernelH0Receipt {
    readonly kind: "flow.lawvereKernelH0.receipt:witness";
    readonly operator: ChargeOperatorCarrier;
    readonly seed: FiniteValuation;
    readonly harmonic: FiniteValuation;
    readonly globalSectionSeed: FiniteValuation;
    readonly globalSectionImage: FiniteValuation;
    readonly imageIsHarmonicByIdempotence: true;
    readonly harmonicIsOwnImage: true;
    readonly membershipIff: true;
    readonly toH0FromKernelRoundTrip: true;
    readonly fromH0ToKernelRoundTrip: true;
    readonly hodgeIso: true;
}
export interface LawvereLaplacianSpectralGapReceipt {
    readonly kind: "flow.lawvereLaplacianSpectralGap.receipt:witness";
    readonly sourceModule: "RelMath.Flow.LawvereLaplacianSpectralGap";
    readonly theorems: readonly [
        "RelMath.LawvereLaplacian.laplacian_is_closure",
        "RelMath.LawvereLaplacian.harmonic_kernel_is_fixed_quiescent",
        "RelMath.LawvereLaplacian.diffusion_converges_to_harmonic",
        "RelMath.LawvereLaplacian.diffusion_spectral_gap_bound"
    ];
    readonly laplacianizer: LaplacianizerWitness;
    readonly kernelH0: LawvereKernelH0Receipt;
    readonly dynamics: ClosureFlowDynamicsWitness;
    readonly lyapunov: FreeEnergyLyapunovWitness;
    readonly laplacianIsClosure: true;
    readonly harmonicKernelIsFixedQuiescent: true;
    readonly diffusionMonotone: true;
    readonly spectralGapBound: number;
    readonly boundary: "finite FOUR strict-regime spectral-gap carrier; enriched weighted-limit sheaf proof remains Lean-side";
}
export interface TransfiniteOmegaContinuityWitness {
    readonly kind: "flow.transfiniteOmegaContinuity:witness";
    readonly finiteChain: readonly FiniteValuation[];
    readonly omegaValue: FiniteValuation;
    readonly monotoneChain: boolean;
    readonly omegaIsLub: boolean;
    readonly noNscAtOmega: true;
    readonly boundary: "canonical-omega-only";
}
export interface NonScottContinuousFiringReceipt {
    readonly kind: "flow.nonScottContinuousFiring.receipt:witness";
    readonly sourceModule: "RelMath.Flow.NonScottContinuousFiring";
    readonly theorems: readonly [
        "no_nsc_firing_of_closure",
        "scott_continuous_iff_no_nsc_firing",
        "no_nsc_firing_iff_omega_regime",
        "forallAnteOp_isNSC",
        "nsc_firing_source_of_aperiodic"
    ];
    readonly closureNoNsc: ScottClosureWitness;
    readonly nscFiring: NscFiringWitness;
    readonly nonScottRegime: CurvatureRegimeWitness;
    readonly finiteClosureBoundary: "finite charge-closures are Scott-continuous; NSC requires a non-closure firing operator";
}
export interface ClosureFlowCurvatureRegimeReceipt {
    readonly kind: "flow.closureFlowCurvatureRegime.receipt:witness";
    readonly sourceModule: "RelMath.Flow.ClosureFlowCurvatureRegime";
    readonly theorems: readonly [
        "flat_iff_not_curved",
        "vanishes_iff_flat",
        "nonvanishes_iff_curved",
        "no_curved_omega_terminating",
        "rank_zero_iff_flat",
        "rank_nonzero_has_nsc_firing",
        "curvature_regime_correspondence"
    ];
    readonly flat: CurvatureRegimeWitness;
    readonly curved: CurvatureRegimeWitness;
    readonly rankNonzeroWitness: NscFiringWitness;
    readonly partition: true;
    readonly cohomologyIsCurvatureModule: true;
}
export interface TransfiniteClosureFlowReceipt {
    readonly kind: "flow.transfiniteClosureFlow.receipt:witness";
    readonly sourceModule: "RelMath.Flow.TransfiniteClosureFlow";
    readonly theorems: readonly [
        "smooth_not_nsc",
        "continuous_no_nsc_firing",
        "no_nsc_firing_of_smooth",
        "tflowOf_continuousAt_omega",
        "tflowOf_no_nsc_firing_omega",
        "transfinite_settling_continuity"
    ];
    readonly dynamics: ClosureFlowDynamicsWitness;
    readonly omegaContinuity: TransfiniteOmegaContinuityWitness;
    readonly smoothAtOmega: true;
    readonly boundary: "canonical omega chain over the finite FOUR carrier";
}
export interface BlowupClassificationReceipt {
    readonly kind: "flow.blowupClassification.receipt:witness";
    readonly sourceModule: "RelMath.Flow.BlowupClassification";
    readonly theorems: readonly [
        "cellType_none_iff",
        "reconstruct_cellType",
        "reconstruct_actual",
        "blowup_classified",
        "modelSingularity_nonIdentity"
    ];
    readonly blowup: FiringBlowupWitness;
    readonly localDataComplete: true;
    readonly reconstructedActual: FiniteValuation;
    readonly modelSingularity: boolean;
}
export declare function valuation(cells: readonly string[], values: Readonly<Record<string, FlowCharge>>): FiniteValuation;
export declare function constantValuation(cells: readonly string[], value: FlowCharge): FiniteValuation;
export declare function leqValuation(left: FiniteValuation, right: FiniteValuation): boolean;
export declare function joinFamily(family: readonly FlowCharge[]): FlowCharge;
export declare const identityOperator: ChargeOperatorCarrier;
export declare const closureToStableOperator: ChargeOperatorCarrier;
export declare const truthSideClosureOperator: ChargeOperatorCarrier;
export declare function joinClosureOperator(target: FlowCharge): ChargeOperatorCarrier;
/** Finite carrier shadow of the `∀`-antecedent NSC operator: top maps to bottom, all else to top. */
export declare const forallAntecedentOperator: ChargeOperatorCarrier;
export declare const botTopPrefix: readonly FlowCharge[];
export declare function applyChargeOperator(operator: ChargeOperatorCarrier, value: FlowCharge): FlowCharge;
export declare function applyOperator(operator: ChargeOperatorCarrier, input: FiniteValuation): FiniteValuation;
export declare function orbit(operator: ChargeOperatorCarrier, seed: FiniteValuation, length: number): readonly FiniteValuation[];
export declare function settledValue(operator: ChargeOperatorCarrier, seed: FiniteValuation, maxSteps?: number): FiniteValuation;
export declare function cellType(before: FlowCharge, after: FlowCharge): FiringTypeName | null;
export declare function reconstruct(before: FlowCharge, type: FiringTypeName | null): FlowCharge;
export declare function localData(predecessor: FiniteValuation, actual: FiniteValuation): readonly CellLocalData[];
export declare function reconstructActual(predecessor: FiniteValuation, data: readonly CellLocalData[]): FiniteValuation;
export declare function firingBlowup(operator: ChargeOperatorCarrier, seed: FiniteValuation, step: number): FiringBlowupWitness;
export declare function nscFiring(operator: ChargeOperatorCarrier, family: readonly FlowCharge[]): NscFiringJudgment;
export declare function operatorInflationary(operator: ChargeOperatorCarrier): boolean;
export declare function operatorMonotone(operator: ChargeOperatorCarrier): boolean;
export declare function operatorIdempotent(operator: ChargeOperatorCarrier): boolean;
export declare function scottClosureNoNsc(operator: ChargeOperatorCarrier): ScottClosureJudgment;
export declare function closureFlowDynamics(operator: ChargeOperatorCarrier, seed: FiniteValuation, steps: number): ClosureFlowDynamicsWitness;
export declare function cohomologyVanishes(regime: ClosureRegimeName): boolean;
export declare function curvatureRegime(regime: ClosureRegimeName): CurvatureRegimeWitness;
export declare function kHeight(value: FlowCharge): number;
export declare function deficit(cells: readonly string[], value: FiniteValuation, settled: FiniteValuation): number;
export declare function evidenceFlowStepReceipt(cells: readonly string[], predecessor: FiniteValuation, actual: FiniteValuation, step?: number): EvidenceFlowStepReceipt;
export declare function evidenceFlowLedgerNoether(cells: readonly string[], predecessor: FiniteValuation, actual: FiniteValuation, step?: number): EvidenceFlowLedgerNoetherWitness;
export declare function operationalAccountingLedger(operator: ChargeOperatorCarrier, seed: FiniteValuation, horizon?: number, cells?: readonly string[]): OperationalAccountingLedger;
export declare function operationalAccountingLawReceipt(): OperationalAccountingLawReceipt;
export declare function freeEnergyLyapunov(operator: ChargeOperatorCarrier, seed: FiniteValuation, cells?: string[]): FreeEnergyLyapunovWitness;
export declare function laplacianizer(operator: ChargeOperatorCarrier, seed: FiniteValuation): LaplacianizerWitness;
export declare function lawvereKernelH0(operator: ChargeOperatorCarrier, seed: FiniteValuation): LawvereKernelH0Receipt;
export declare function lawvereLaplacianSpectralGapReceipt(operator?: ChargeOperatorCarrier, seed?: FiniteValuation): LawvereLaplacianSpectralGapReceipt;
export declare function transfiniteOmegaContinuity(operator: ChargeOperatorCarrier, seed: FiniteValuation): TransfiniteOmegaContinuityWitness;
export declare function nonScottContinuousFiringReceipt(): NonScottContinuousFiringReceipt;
export declare function closureFlowCurvatureRegimeReceipt(): ClosureFlowCurvatureRegimeReceipt;
export declare function transfiniteClosureFlowReceipt(operator: ChargeOperatorCarrier, seed: FiniteValuation): TransfiniteClosureFlowReceipt;
export declare function blowupClassificationReceipt(operator: ChargeOperatorCarrier, seed: FiniteValuation, step: number): BlowupClassificationReceipt;
