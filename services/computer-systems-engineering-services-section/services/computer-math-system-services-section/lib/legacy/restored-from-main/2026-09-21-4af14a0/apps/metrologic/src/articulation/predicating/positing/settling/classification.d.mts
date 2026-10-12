import type { SettlementFiltration, SettlingClassification, SettlingFiniteStageJudgment, SettlingStageOrdinalCarrier } from "./object.mjs";
/** The classification of a settling: depth, regime, cofinality, limit stages, non-Scott firings. */
export declare function readClassificationOfSettlementFiltration(carrier: SettlementFiltration): SettlingClassification;
/** The settling depth: the ordinal of its last firing. */
export declare const readDepthOfSettlementFiltration: (carrier: SettlementFiltration) => SettlingStageOrdinalCarrier;
/** The finite-stage judgment on a settling's depth. */
export declare const readDepthFiniteStageJudgmentOfSettlementFiltration: (carrier: SettlementFiltration) => SettlingFiniteStageJudgment;
