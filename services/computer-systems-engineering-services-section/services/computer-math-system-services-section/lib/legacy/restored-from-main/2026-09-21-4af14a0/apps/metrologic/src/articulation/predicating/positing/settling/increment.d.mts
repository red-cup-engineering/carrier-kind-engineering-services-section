import type { SettlementFiltration, SettlingIncrement } from "./object.mjs";
/** The cells added at each stage relative to the previous (all designated at stage 0). */
export declare function readIncrementsOfSettlementFiltration(carrier: SettlementFiltration): readonly SettlingIncrement[];
/** The increments that actually add cells (non-empty added set). */
export declare const readFiringsOfSettlementFiltration: (carrier: SettlementFiltration) => readonly SettlingIncrement[];
