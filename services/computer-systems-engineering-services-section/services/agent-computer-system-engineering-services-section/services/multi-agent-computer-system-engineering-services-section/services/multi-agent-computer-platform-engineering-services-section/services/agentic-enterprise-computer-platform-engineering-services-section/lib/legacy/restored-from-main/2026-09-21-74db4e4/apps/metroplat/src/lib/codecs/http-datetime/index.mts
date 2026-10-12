/**
 * projections/memento - RFC 7089 datetime negotiation as state@T over recorded material.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";

import { canonicalBytes } from "../../identity/index.mts";
import {
  mementoSnapshotContract,
  mementoSnapshotSchema,
  timeMapContract,
  timeMapSchema,
} from "./schema.mts";
import { eavtId, eavtObject, type EAVT } from "../json/jsonl/eavt/index.mts";
import { requireJsonValue, type JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import {
  foldStateAccumRow,
  initialStateAccum,
  closeStateAccum,
  type StateAccum,
  type StateView,
} from "../../fixpoint/state-fold.mts";

export {
  mementoSnapshotContract,
  mementoSnapshotSchema,
  timeMapContract,
  timeMapSchema,
} from "./schema.mts";

export const MEMENTO_DATETIME_HEADER = "Memento-Datetime";
export const ACCEPT_DATETIME_HEADER = "Accept-Datetime";

type MementoSnapshotBase = FromJsonSchema<typeof mementoSnapshotSchema>;
export type MementoSnapshot = Omit<MementoSnapshotBase, "state"> & { readonly state: StateView };

export type TimeMap = FromJsonSchema<typeof timeMapSchema>;

function datetimeOf(value: JsonValue): string {
  return typeof value === "string" ? value : canonicalBytes(value);
}

function compareDatetime(left: JsonValue | string, right: JsonValue | string): number {
  const l = typeof left === "string" ? left : datetimeOf(left);
  const r = typeof right === "string" ? right : datetimeOf(right);
  const ld = Date.parse(l);
  const rd = Date.parse(r);
  if (Number.isFinite(ld) && Number.isFinite(rd)) return ld - rd;
  return l.localeCompare(r);
}

function prefixAt(log: readonly EAVT[], asOf: string): readonly EAVT[] {
  return Object.freeze(log.filter((row) => compareDatetime(eavtObject(row).t, asOf) <= 0));
}

export interface MementoDatetimeSelector {
  push(row: EAVT): void;
  read(): string;
}

export function mementoDatetimeSelector(requested: string): MementoDatetimeSelector {
  let selected = requested;
  let found = false;
  const push = (row: EAVT): void => {
    const datetime = datetimeOf(eavtObject(row).t);
    if (compareDatetime(datetime, requested) > 0) return;
    if (!found || compareDatetime(selected, datetime) < 0) {
      selected = datetime;
      found = true;
    }
  };
  return Object.freeze({
    push,
    read: () => selected,
  });
}

export interface MementoStateAtCollector {
  push(row: EAVT): void;
  read(): MementoSnapshot;
}

export function mementoStateAtCollector(functional: ReadonlySet<string>, asOf: string): MementoStateAtCollector {
  let accum: StateAccum = initialStateAccum;
  const push = (row: EAVT): void => {
    const statement = eavtObject(row);
    if (compareDatetime(statement.t, asOf) <= 0) accum = foldStateAccumRow(accum, statement, functional);
  };
  return Object.freeze({
    push,
    read: () => mementoSnapshotContract.assert(Object.freeze({
      kind: "metroplat.projections.memento.snapshot" as const,
      datetime: asOf,
      state: closeStateAccum(accum).view,
    }), "memento snapshot") as MementoSnapshot,
  });
}

export interface MementoTimeMapCollector {
  push(row: EAVT): void;
  read(): TimeMap;
}

export function mementoTimeMapCollector(original = ""): MementoTimeMapCollector {
  const counts = new Map<string, number>();
  const push = (row: EAVT): void => {
    const datetime = datetimeOf(eavtObject(row).t);
    counts.set(datetime, (counts.get(datetime) ?? 0) + 1);
  };
  return Object.freeze({
    push,
    read: () => {
      let statements = 0;
      const snapshots = [...counts.entries()]
        .sort(([left], [right]) => compareDatetime(left, right))
        .map(([datetime, count]) => {
          statements += count;
          return Object.freeze({ datetime, statements });
        });
      return timeMapContract.assert(Object.freeze({
        kind: "metroplat.projections.memento.timemap" as const,
        original,
        snapshots: Object.freeze(snapshots),
      }), "memento timemap");
    },
  });
}

export function projectStateAtRows(rows: Iterable<EAVT>, functional: ReadonlySet<string>, asOf: string): MementoSnapshot {
  const collector = mementoStateAtCollector(functional, asOf);
  for (const row of rows) collector.push(row);
  return collector.read();
}

export function projectStateAt(log: readonly EAVT[], functional: ReadonlySet<string>, asOf: string): MementoSnapshot {
  return projectStateAtRows(log, functional, asOf);
}

export function availableMementoDatetimes(log: Iterable<EAVT>): readonly string[] {
  const datetimes = new Set<string>();
  for (const row of log) datetimes.add(datetimeOf(eavtObject(row).t));
  return Object.freeze([...datetimes].sort(compareDatetime));
}

export function timeMap(log: Iterable<EAVT>, original = ""): TimeMap {
  const collector = mementoTimeMapCollector(original);
  for (const row of log) collector.push(row);
  return collector.read();
}

export function selectMementoDatetime(log: Iterable<EAVT>, requested: string): string {
  const selector = mementoDatetimeSelector(requested);
  for (const row of log) selector.push(row);
  return selector.read();
}

export type MementoRequest = {
  readonly acceptDatetime: string;
  readonly original?: string;
  readonly timegate?: string;
  readonly timemap?: string;
};

export interface MementoResponse {
  readonly status: number;
  readonly type: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body: string;
}

export function readMementoState(
  log: readonly EAVT[],
  functional: ReadonlySet<string>,
  request: MementoRequest,
): MementoSnapshot {
  return projectStateAt(log, functional, selectMementoDatetime(log, request.acceptDatetime));
}

function linkHeader(request: MementoRequest, datetime: string): string {
  const links = [
    request.original === undefined ? undefined : `<${request.original}>; rel="original"`,
    request.timegate === undefined ? undefined : `<${request.timegate}>; rel="timegate"`,
    request.timemap === undefined ? undefined : `<${request.timemap}>; rel="timemap"; type="application/json"`,
    `<${request.original ?? ""}>; rel="memento"; datetime="${datetime}"`,
  ].filter((value): value is string => value !== undefined);
  return links.join(", ");
}

export function mementoStateResponse(
  log: readonly EAVT[],
  functional: ReadonlySet<string>,
  request: MementoRequest,
): MementoResponse {
  const snapshot = readMementoState(log, functional, request);
  const headers: Record<string, string> = {
    [MEMENTO_DATETIME_HEADER]: snapshot.datetime,
    vary: ACCEPT_DATETIME_HEADER,
  };
  const link = linkHeader(request, snapshot.datetime);
  if (link.length > 0) headers.link = link;
  return {
    status: 200,
    type: "application/json; charset=utf-8",
    headers,
    body: `${JSON.stringify(snapshot, null, 2)}\n`,
  };
}

export function mementoProjectionMonotone(log: readonly EAVT[], datetimes: readonly string[]): boolean {
  let prior = new Set<string>();
  for (const datetime of [...datetimes].sort(compareDatetime)) {
    const current = new Set(prefixAt(log, datetime).map(eavtId));
    for (const id of prior) if (!current.has(id)) return false;
    prior = current;
  }
  return true;
}

export function mementoSnapshotValue(value: MementoSnapshot): JsonValue {
  return requireJsonValue(value, "memento snapshot");
}
