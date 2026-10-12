/**
 * codecs/text/json/time-anchor - OpenTimestamps/RFC-3161 as externally verifiable T.
 *
 * This is a structural model, not an OpenTimestamps calendar client and not an
 * RFC-3161 TSA implementation. The attestation is a deterministic commitment
 * over the statement hash, calendar, authority, and attested time.
 */

import { canonicalJson } from "@red-cup-engineering/json-services-section";

import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import {
  timeAnchorContract,
  timeAnchorVerificationContract,
  timeAnchorVerificationSchema,
  timeAnchorSchema,
  timestampedStatementContract,
  timestampedStatementSchema,
} from "./schema.mjs";
import { eavtKey, eavtRecord, toEavt } from "@red-cup-engineering/eavt/row";

import { requireJsonValue } from "@red-cup-engineering/json-services-section";

export {
  timeAnchorContract,
  timeAnchorVerificationContract,
  timeAnchorVerificationSchema,
  timeAnchorSchema,
  timestampedStatementContract,
  timestampedStatementSchema,
} from "./schema.mjs";

function digest(value) {
  return sha256Hex(canonicalJson(value));
}

function commitmentPayload(statementHash) {
  return requireJsonValue({ kind: "metroplat.codecs.text.json.time-anchor.commitment", statementHash }, "time-anchor commitment");
}

function attestationPayload(anchor) {
  return requireJsonValue({
    kind: anchor.kind,
    standard: anchor.standard,
    calendar: anchor.calendar,
    authority: anchor.authority,
    statementHash: anchor.statementHash,
    statementCoordinate: anchor.statementCoordinate,
    attestedTime: anchor.attestedTime,
    commitment: anchor.commitment,
  }, "time-anchor attestation payload");
}

export function anchorStatementTime(row, input) {
  const statement = eavtRecord(row);
  const statementHash = eavtKey(statement);
  const base = Object.freeze({
    kind: "metroplat.codecs.text.json.time-anchor.anchor",
    standard: "opentimestamps/rfc3161.structural",
    calendar: input.calendar,
    authority: input.authority,
    statementHash,
    statementCoordinate: statement.t,
    attestedTime: input.attestedTime,
    commitment: digest(commitmentPayload(statementHash)),
  });
  const anchor = timeAnchorContract.assert(Object.freeze({
    ...base,
    digest: digest(attestationPayload(base)),
  }), "time anchor");
  return timestampedStatementContract.assert(Object.freeze({
    kind: "metroplat.codecs.text.json.time-anchor.timestamped-witness",
    statement: toEavt(statement),
    anchor,
  }), "timestamped statement");
}

export function verifyTimestampedStatement(value) {
  try {
    timestampedStatementContract.assert(value, "timestamped statement");
    const statement = eavtRecord(value.statement);
    const statementHash = eavtKey(value.statement);
    const anchor = value.anchor;
    const expectedBase = Object.freeze({
      kind: anchor.kind,
      standard: anchor.standard,
      calendar: anchor.calendar,
      authority: anchor.authority,
      statementHash: anchor.statementHash,
      statementCoordinate: anchor.statementCoordinate,
      attestedTime: anchor.attestedTime,
      commitment: anchor.commitment,
    });
    return anchor.statementHash === statementHash &&
      canonicalJson(anchor.statementCoordinate) === canonicalJson(statement.t) &&
      anchor.commitment === digest(commitmentPayload(statementHash)) &&
      anchor.digest === digest(attestationPayload(expectedBase));
  } catch {
    return false;
  }
}

export function timestampedStatementToDatom(value) {
  const statement = eavtRecord(value.statement);
  const reading = timeAnchorVerificationContract.assert(Object.freeze({
    kind: "metroplat.codecs.text.json.time-anchor.verification",
    standard: "opentimestamps/rfc3161.structural",
    anchor: value.anchor,
    verified: verifyTimestampedStatement(value),
  }), "time-anchor verification");
  return Object.freeze([statement.e, statement.a, statement.v, statement.t, reading]);
}

export function externallyAnchoredTime(value) {
  if (!verifyTimestampedStatement(value)) throw new Error("externallyAnchoredTime: invalid time anchor");
  return value.anchor.attestedTime;
}

function compareDatetime(left, right) {
  const l = Date.parse(left);
  const r = Date.parse(right);
  if (Number.isFinite(l) && Number.isFinite(r)) return l - r;
  return left.localeCompare(right);
}

export function anchoredTimeMonotone(values) {
  let prior;
  for (const value of values) {
    if (!verifyTimestampedStatement(value)) return false;
    const current = value.anchor.attestedTime;
    if (prior !== undefined && compareDatetime(prior, current) > 0) return false;
    prior = current;
  }
  return true;
}
