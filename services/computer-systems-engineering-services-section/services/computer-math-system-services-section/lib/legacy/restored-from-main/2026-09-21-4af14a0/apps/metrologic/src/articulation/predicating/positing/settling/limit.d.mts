import type { NonScottSettlingFiringsCarrier, SettlementFiltration, SettlingLimitStagesCarrier } from "./object.mjs";
/** The limit-shaped stages of a filtration, with their count. */
export declare const readLimitStagesOfSettlementFiltration: (carrier: SettlementFiltration) => SettlingLimitStagesCarrier;
/** The cell-adding firings whose source is a limit stage, with their count. */
export declare const readNonScottFiringsOfSettlementFiltration: (carrier: SettlementFiltration) => NonScottSettlingFiringsCarrier;
