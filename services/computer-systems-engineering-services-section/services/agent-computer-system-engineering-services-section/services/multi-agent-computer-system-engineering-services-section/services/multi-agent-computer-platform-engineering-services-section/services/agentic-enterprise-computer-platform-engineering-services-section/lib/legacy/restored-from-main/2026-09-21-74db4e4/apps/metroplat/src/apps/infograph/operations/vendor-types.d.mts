/**
 * @packageDocumentation
 * Ambient types for exact-pinned operations/ deps that ship none of their
 * own (ask-eavt-cell-service 0.1.1, ask-eavt-trace-cell-service 0.2.0,
 * count-eavt-trace-contested-cells-service 0.1.1; verified: no `types`
 * field, no `.d.mts` in any published tarball).
 */
declare module "@red-cup-engineering/ask-eavt-cell-service" {
  export interface EavtCellSettledEntry {
    readonly predicate: string;
    readonly object: unknown;
  }

  export interface EavtCellSettledSection {
    readonly affirmed: readonly EavtCellSettledEntry[];
    readonly denied: readonly EavtCellSettledEntry[];
    readonly contradicted: readonly EavtCellSettledEntry[];
  }

  export interface EavtCellAnswer {
    readonly type: "EavtCellAnswer";
    readonly entity: string;
    readonly attribute: string | null;
    readonly asserted: number;
    readonly saturated: number;
    readonly settled: EavtCellSettledSection;
    readonly contested: boolean;
  }

  export interface EavtCellRequest {
    readonly rows: readonly unknown[];
    readonly entity: string;
    readonly attribute?: string;
  }

  export function askEavtCell(request: EavtCellRequest): EavtCellAnswer;
}

declare module "@red-cup-engineering/ask-eavt-trace-cell-service" {
  import type { EavtCellAnswer } from "@red-cup-engineering/ask-eavt-cell-service";

  export interface EavtTraceCellAnswer {
    readonly type: "EavtTraceCellAnswer";
    readonly trace: string;
    readonly rows: number;
    readonly answer: EavtCellAnswer;
  }

  export interface EavtTraceAbsent {
    readonly type: "EavtTraceAbsent";
    readonly trace: string;
  }

  export interface EavtTraceCellRequest {
    readonly trace: string;
    readonly entity: string;
    readonly attribute?: string;
  }

  export function askEavtTraceCell(request: EavtTraceCellRequest): EavtTraceCellAnswer | EavtTraceAbsent;
}

declare module "@red-cup-engineering/count-eavt-trace-contested-cells-service" {
  export interface EavtContestedCell {
    readonly predicate: string;
    readonly object: unknown;
  }

  export interface EavtContestedEntity {
    readonly entity: string;
    readonly cells: readonly EavtContestedCell[];
  }

  export interface EavtContestedCellsCount {
    readonly type: "EavtContestedCellsCount";
    readonly entities: number;
    readonly contestedEntities: number;
    readonly contestedCells: number;
    readonly contested: readonly EavtContestedEntity[];
  }

  export interface EavtTraceContestedCellsCount {
    readonly type: "EavtTraceContestedCellsCount";
    readonly trace: string;
    readonly rows: number;
    readonly count: EavtContestedCellsCount;
  }

  export interface EavtTraceAbsent {
    readonly type: "EavtTraceAbsent";
    readonly trace: string;
  }

  export interface EavtTraceContestedCellsRequest {
    readonly trace: string;
  }

  export function countEavtTraceContestedCells(
    request: EavtTraceContestedCellsRequest,
  ): EavtTraceContestedCellsCount | EavtTraceAbsent;
}
