import type { SettlementFiltration, SettlingCofinalityCarrier, SettlingStageInputCarrier } from "./object.mjs";
/** Build a settlement filtration from stage inputs and an optional cofinality. */
export declare function settlementFiltration(stages: readonly SettlingStageInputCarrier[], cofinality?: SettlingCofinalityCarrier): SettlementFiltration;
