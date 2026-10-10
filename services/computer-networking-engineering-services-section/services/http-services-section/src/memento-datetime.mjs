/**
 * projections/memento - RFC 7089 datetime negotiation as state@T over recorded material.
 */

import { canonicalJson } from "@red-cup-engineering/json-services-section";
import {
  mementoSnapshotContract,
  mementoSnapshotSchema,
  timeMapContract,
  timeMapSchema,
} from "./memento-datetime-schema.mjs";
import { eavtKey, eavtRecord } from "@red-cup-engineering/eavt-services-section/row";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import {
  foldStateAccumRow,
  initialStateAccum,
  closeStateAccum,

} from "@red-cup-engineering/eavt-services-section/ledger/state-fold";

export {
  mementoSnapshotContract,
  mementoSnapshotSchema,
  timeMapContract,
  timeMapSchema,
} from "./memento-datetime-schema.mjs";

export const MEMENTO_DATETIME_HEADER = "Memento-Datetime";
export const ACCEPT_DATETIME_HEADER = "Accept-Datetime";

function datetimeOf(value) {
  return typeof value === "string" ? value : canonicalJson(value);
}

function compareDatetime(left, right) {
  const l = typeof left === "string" ? left : datetimeOf(left);
  const r = typeof right === "string" ? right : datetimeOf(right);
  const ld = Date.parse(l);
  const rd = Date.parse(r);
  if (Number.isFinite(ld) && Number.isFinite(rd)) return ld - rd;
  return l.localeCompare(r);
}

function prefixAt(log, asOf) {
  return Object.freeze(log.filter((row) => compareDatetime(eavtRecord(row).t, asOf) <= 0));
}

export function mementoDatetimeSelector(requested) {
  let selected = requested;
  let found = false;
  const push = (row) => {
    const datetime = datetimeOf(eavtRecord(row).t);
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

export function mementoStateAtCollector(functional, asOf) {
  let accum = initialStateAccum;
  const push = (row) => {
    const statement = eavtRecord(row);
    if (compareDatetime(statement.t, asOf) <= 0) accum = foldStateAccumRow(accum, statement, functional);
  };
  return Object.freeze({
    push,
    read: () => mementoSnapshotContract.assert(Object.freeze({
      kind: "metroplat.projections.memento.snapshot",
      datetime: asOf,
      state: closeStateAccum(accum).view,
    }), "memento snapshot"),
  });
}

export function mementoTimeMapCollector(original = "") {
  const counts = new Map();
  const push = (row) => {
    const datetime = datetimeOf(eavtRecord(row).t);
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
        kind: "metroplat.projections.memento.timemap",
        original,
        snapshots: Object.freeze(snapshots),
      }), "memento timemap");
    },
  });
}

export function projectStateAtRows(rows, functional, asOf) {
  const collector = mementoStateAtCollector(functional, asOf);
  for (const row of rows) collector.push(row);
  return collector.read();
}

export function projectStateAt(log, functional, asOf) {
  return projectStateAtRows(log, functional, asOf);
}

export function availableMementoDatetimes(log) {
  const datetimes = new Set();
  for (const row of log) datetimes.add(datetimeOf(eavtRecord(row).t));
  return Object.freeze([...datetimes].sort(compareDatetime));
}

export function timeMap(log, original = "") {
  const collector = mementoTimeMapCollector(original);
  for (const row of log) collector.push(row);
  return collector.read();
}

export function selectMementoDatetime(log, requested) {
  const selector = mementoDatetimeSelector(requested);
  for (const row of log) selector.push(row);
  return selector.read();
}

export function readMementoState(
  log,
  functional,
  request,
) {
  return projectStateAt(log, functional, selectMementoDatetime(log, request.acceptDatetime));
}

// mementoStateResponse lives once, in @red-cup-engineering/relating/ledger; MetroPlat had no
// caller for its own copy (dead code) and adopts relating's if one appears.

export function mementoProjectionMonotone(log, datetimes) {
  let prior = new Set();
  for (const datetime of [...datetimes].sort(compareDatetime)) {
    const current = new Set(prefixAt(log, datetime).map(eavtKey));
    for (const id of prior) if (!current.has(id)) return false;
    prior = current;
  }
  return true;
}

export function mementoSnapshotValue(value) {
  return requireJsonValue(value, "memento snapshot");
}
