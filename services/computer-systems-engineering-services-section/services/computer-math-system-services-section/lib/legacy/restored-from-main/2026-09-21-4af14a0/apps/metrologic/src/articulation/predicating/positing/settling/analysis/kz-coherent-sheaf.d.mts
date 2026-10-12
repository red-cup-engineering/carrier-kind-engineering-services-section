/**
 * analysis/kz-coherent-sheaf - finite executable shadow of
 * RelMath.Cohomology.KZCoherentSheaf.
 *
 * Lean defines KZ-coherence as a sheaf-level descent condition equating section
 * maps along KZ-connected parallel 1-cells. In the strict/Scott runtime slice,
 * those KZ 2-cells collapse extensional 1-cells, so every sheaf is coherent.
 */
export interface ZeroCellCarrier {
    readonly kind: "kzSheaf.zeroCell";
    readonly name: string;
}
export interface OneCellCarrier {
    readonly kind: "kzSheaf.oneCell";
    readonly label: string;
    readonly source: string;
    readonly target: string;
    readonly predicateLeg: string;
}
export interface KZ2CellReceipt {
    readonly kind: "kzSheaf.2cell:witness";
    readonly left: OneCellCarrier;
    readonly right: OneCellCarrier;
    readonly parallel: true;
    readonly extensionalEquality: true;
    readonly invertible: true;
}
export interface SheafCarrier {
    readonly kind: "kzSheaf.sheaf";
    readonly zeroCells: readonly ZeroCellCarrier[];
    readonly oneCells: readonly OneCellCarrier[];
    readonly sections: Readonly<Record<string, string>>;
    readonly restId: Readonly<Record<string, string>>;
}
export interface KZCoherenceReceipt {
    readonly kind: "kzSheaf.coherence:witness";
    readonly sheaf: SheafCarrier;
    readonly kzCells: readonly KZ2CellReceipt[];
    readonly identifiesParallel: true;
    readonly everySheafCoherentStrict: true;
}
export interface KZDescentReceipt {
    readonly kind: "kzSheaf.descent:witness";
    readonly source: SheafCarrier;
    readonly restricted: SheafCarrier;
    readonly sourceCoherent: KZCoherenceReceipt;
    readonly restrictedCoherent: KZCoherenceReceipt;
    readonly closedUnderRestriction: true;
    readonly strictRegimeUniversality: true;
}
export interface KZCoherentSheafReceipt {
    readonly kind: "kzSheaf.receipt:witness";
    readonly coherence: KZCoherenceReceipt;
    readonly descent: KZDescentReceipt;
    readonly aperiodicFrontier: "non-trivial aperiodic 2-cells remain proof-side";
    readonly openFrontier: readonly string[];
}
export declare const zeroCell: (name: string) => ZeroCellCarrier;
export declare const oneCell: (label: string, source: string, target: string, predicateLeg: string) => OneCellCarrier;
export declare const oneCellKey: (cell: OneCellCarrier) => string;
export declare const parallel: (left: OneCellCarrier, right: OneCellCarrier) => boolean;
export declare const kzConnected: (left: OneCellCarrier, right: OneCellCarrier) => boolean;
export declare function kz2Cell(left: OneCellCarrier, right: OneCellCarrier): KZ2CellReceipt;
export declare function sheaf(zeroNames: readonly string[], oneCells: readonly OneCellCarrier[], sections: Readonly<Record<string, string>>, restId: Readonly<Record<string, string>>): SheafCarrier;
export declare function kzCoherenceReceipt(carrier: SheafCarrier): KZCoherenceReceipt;
export declare function postcompose(carrier: SheafCarrier, transform: Readonly<Record<string, string>>): SheafCarrier;
export declare function descentReceipt(carrier?: SheafCarrier): KZDescentReceipt;
export declare const defaultSheaf: SheafCarrier;
export declare function receipt(): KZCoherentSheafReceipt;
