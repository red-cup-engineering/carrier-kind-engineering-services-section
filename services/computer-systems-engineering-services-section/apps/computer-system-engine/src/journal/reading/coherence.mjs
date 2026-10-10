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
import { normalizeStatementLog, sameStatement, sameStatementLog, statementRow } from "@red-cup-engineering/eavt-services-section/statement";

function isIso(reading, statement) {
  return sameStatement(reading.fromWire(reading.toWire(statement)), statement);
}

function isLogIso(reading, statementLog) {
  return sameStatementLog(reading.fromWire(reading.toWire(statementLog)), statementLog);
}

function hopsLosslessly(
  from,
  to,
  statement,
) {
  const pivot = from.fromWire(from.toWire(statement));
  return sameStatement(to.fromWire(to.toWire(pivot)), statement);
}

function logHopsLosslessly(
  from,
  to,
  statementLog,
) {
  const pivot = from.fromWire(from.toWire(statementLog));
  return sameStatementLog(to.fromWire(to.toWire(pivot)), statementLog);
}

export function cohere(
  left,
  right,
  pivot,
) {
  const admitted = statementRow(pivot);
  const leftIso = isIso(left, admitted);
  const rightIso = isIso(right, admitted);
  const leftToRight = hopsLosslessly(left, right, admitted);
  const rightToLeft = hopsLosslessly(right, left, admitted);
  return Object.freeze({
    kind: "metroplat.relational.coherence",
    left: left.id,
    right: right.id,
    pivot: admitted,
    leftIso,
    rightIso,
    leftToRight,
    rightToLeft,
    ok: leftIso && rightIso && leftToRight && rightToLeft,
  });
}

export function cohereLog(
  left,
  right,
  statementLog,
) {
  const admittedLog = normalizeStatementLog(statementLog);
  const leftIso = isLogIso(left, admittedLog);
  const rightIso = isLogIso(right, admittedLog);
  const leftToRight = logHopsLosslessly(left, right, admittedLog);
  const rightToLeft = logHopsLosslessly(right, left, admittedLog);
  return Object.freeze({
    kind: "metroplat.relational.log-coherence",
    left: left.id,
    right: right.id,
    statementLog: admittedLog,
    leftIso,
    rightIso,
    leftToRight,
    rightToLeft,
    ok: leftIso && rightIso && leftToRight && rightToLeft,
  });
}

export function readingAsLogReading(reading) {
  return Object.freeze({
    id: reading.id,
    toWire: (statementLog) => {
      if (statementLog.length !== 1) throw new TypeError(`${reading.id}: 1-block reading requires exactly one statement row`);
      return reading.toWire(statementLog[0]);
    },
    fromWire: (wire) => Object.freeze([reading.fromWire(wire)]),
  });
}
