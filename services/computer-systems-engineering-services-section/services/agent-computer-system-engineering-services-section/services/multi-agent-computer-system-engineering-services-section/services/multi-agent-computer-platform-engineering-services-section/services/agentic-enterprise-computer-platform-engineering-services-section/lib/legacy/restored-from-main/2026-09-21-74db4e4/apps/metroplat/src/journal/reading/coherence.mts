/**
 * @packageDocumentation
 * journal/reading/coherence - same-object-through-many-faces law.
 *
 * This module owns the pure commute-through-pivot law for statement readings:
 * given two independent wire codecs ("readings") of the same statement row or
 * log, checking that each round-trips losslessly and that hopping from one
 * to the other and back loses nothing either.
 *
 * @metroplatSubject journal
 */
import { normalizeStatementLog, sameStatement, sameStatementLog, statementRow, type StatementRow, type StatementValue } from "@lenticule-science/metrologic/settling/records/persistence";

export type StatementLog = readonly StatementRow[];

export interface ReadingDescriptor {
  readonly id: string;
}

export interface LogReadingDescriptor {
  readonly id: string;
}

export interface Reading<Wire> extends ReadingDescriptor {
  readonly toWire: (statement: StatementRow) => Wire;
  readonly fromWire: (wire: Wire) => StatementRow;
}

export interface LogReading<Wire> extends LogReadingDescriptor {
  readonly toWire: (statementLog: StatementLog) => Wire;
  readonly fromWire: (wire: Wire) => StatementLog;
}

export interface CoherenceReport {
  readonly kind: "metroplat.relational.coherence";
  readonly left: string;
  readonly right: string;
  readonly pivot: StatementValue;
  readonly leftIso: boolean;
  readonly rightIso: boolean;
  readonly leftToRight: boolean;
  readonly rightToLeft: boolean;
  readonly ok: boolean;
}

export interface LogCoherenceReport {
  readonly kind: "metroplat.relational.log-coherence";
  readonly left: string;
  readonly right: string;
  /** Frozen legacy report field containing the admitted statement log. */
  readonly statementLog: readonly StatementValue[];
  readonly leftIso: boolean;
  readonly rightIso: boolean;
  readonly leftToRight: boolean;
  readonly rightToLeft: boolean;
  readonly ok: boolean;
}

function isIso<Wire>(reading: Reading<Wire>, statement: StatementRow): boolean {
  return sameStatement(reading.fromWire(reading.toWire(statement)), statement);
}

function isLogIso<Wire>(reading: LogReading<Wire>, statementLog: StatementLog): boolean {
  return sameStatementLog(reading.fromWire(reading.toWire(statementLog)), statementLog);
}

function hopsLosslessly<FromWire, ToWire>(
  from: Reading<FromWire>,
  to: Reading<ToWire>,
  statement: StatementRow,
): boolean {
  const pivot = from.fromWire(from.toWire(statement));
  return sameStatement(to.fromWire(to.toWire(pivot)), statement);
}

function logHopsLosslessly<FromWire, ToWire>(
  from: LogReading<FromWire>,
  to: LogReading<ToWire>,
  statementLog: StatementLog,
): boolean {
  const pivot = from.fromWire(from.toWire(statementLog));
  return sameStatementLog(to.fromWire(to.toWire(pivot)), statementLog);
}

export function cohere<LeftWire, RightWire>(
  left: Reading<LeftWire>,
  right: Reading<RightWire>,
  pivot: StatementRow,
): CoherenceReport {
  const admitted = statementRow(pivot);
  const leftIso = isIso(left, admitted);
  const rightIso = isIso(right, admitted);
  const leftToRight = hopsLosslessly(left, right, admitted);
  const rightToLeft = hopsLosslessly(right, left, admitted);
  return Object.freeze({
    kind: "metroplat.relational.coherence" as const,
    left: left.id,
    right: right.id,
    pivot: admitted as unknown as StatementValue,
    leftIso,
    rightIso,
    leftToRight,
    rightToLeft,
    ok: leftIso && rightIso && leftToRight && rightToLeft,
  });
}

export function cohereLog<LeftWire, RightWire>(
  left: LogReading<LeftWire>,
  right: LogReading<RightWire>,
  statementLog: StatementLog,
): LogCoherenceReport {
  const admittedLog = normalizeStatementLog(statementLog);
  const leftIso = isLogIso(left, admittedLog);
  const rightIso = isLogIso(right, admittedLog);
  const leftToRight = logHopsLosslessly(left, right, admittedLog);
  const rightToLeft = logHopsLosslessly(right, left, admittedLog);
  return Object.freeze({
    kind: "metroplat.relational.log-coherence" as const,
    left: left.id,
    right: right.id,
    statementLog: admittedLog as unknown as readonly StatementValue[],
    leftIso,
    rightIso,
    leftToRight,
    rightToLeft,
    ok: leftIso && rightIso && leftToRight && rightToLeft,
  });
}

export function readingAsLogReading<Wire>(reading: Reading<Wire>): LogReading<Wire> {
  return Object.freeze({
    id: reading.id,
    toWire: (statementLog: StatementLog): Wire => {
      if (statementLog.length !== 1) throw new TypeError(`${reading.id}: 1-block reading requires exactly one statement row`);
      return reading.toWire(statementLog[0]!);
    },
    fromWire: (wire: Wire): StatementLog => Object.freeze([reading.fromWire(wire)]),
  });
}
