/**
 * codecs/text/json/time-anchor - OpenTimestamps/RFC-3161 as externally verifiable T.
 *
 * This is a structural model, not an OpenTimestamps calendar client and not an
 * RFC-3161 TSA implementation. The attestation is a deterministic commitment
 * over the statement hash, calendar, authority, and attested time.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import { canonicalBytes } from "../../identity/index.mts";

import { sha256Hex } from "../../identity/index.mts";
import {
  timeAnchorContract,
  timeAnchorVerificationContract,
  timeAnchorVerificationSchema,
  timeAnchorSchema,
  timestampedStatementContract,
  timestampedStatementSchema,
} from "./schema.mts";
import { eavtId, eavtObject, toEavt, type EAVT, type EAVTObject } from "../json/jsonl/eavt/index.mts";
import type { Datom } from "../json/jsonl/eavt/datom/index.mts";
import { requireJsonValue, type JsonValue } from "../json/core.mts";


export {
  timeAnchorContract,
  timeAnchorVerificationContract,
  timeAnchorVerificationSchema,
  timeAnchorSchema,
  timestampedStatementContract,
  timestampedStatementSchema,
} from "./schema.mts";

type TimeAnchorBase = FromJsonSchema<typeof timeAnchorSchema>;
export type TimeAnchor = Omit<TimeAnchorBase, "statementCoordinate"> & { readonly statementCoordinate: JsonValue };

type TimestampedStatementBase = FromJsonSchema<typeof timestampedStatementSchema>;
export type TimestampedStatement = Omit<TimestampedStatementBase, "statement" | "anchor"> & {
  readonly statement: EAVT;
  readonly anchor: TimeAnchor;
};

type TimeAnchorVerificationBase = FromJsonSchema<typeof timeAnchorVerificationSchema>;
export type TimeAnchorVerification = Omit<TimeAnchorVerificationBase, "anchor"> & { readonly anchor: TimeAnchor };

function digest(value: JsonValue): string {
  return sha256Hex(canonicalBytes(value));
}

function commitmentPayload(statementHash: string): JsonValue {
  return requireJsonValue({ kind: "metroplat.codecs.text.json.time-anchor.commitment", statementHash }, "time-anchor commitment");
}

function attestationPayload(anchor: Omit<TimeAnchor, "digest">): JsonValue {
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

export type TimeAnchorInput = {
  readonly calendar: string;
  readonly authority: string;
  readonly attestedTime: string;
};

export function anchorStatementTime(row: EAVT | EAVTObject, input: TimeAnchorInput): TimestampedStatement {
  const statement = eavtObject(row);
  const statementHash = eavtId(statement);
  const base = Object.freeze({
    kind: "metroplat.codecs.text.json.time-anchor.anchor" as const,
    standard: "opentimestamps/rfc3161.structural" as const,
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
  }), "time anchor") as TimeAnchor;
  return timestampedStatementContract.assert(Object.freeze({
    kind: "metroplat.codecs.text.json.time-anchor.timestamped-witness" as const,
    statement: toEavt(statement),
    anchor,
  }), "timestamped statement") as TimestampedStatement;
}

export function verifyTimestampedStatement(value: TimestampedStatement): boolean {
  try {
    timestampedStatementContract.assert(value, "timestamped statement");
    const statement = eavtObject(value.statement);
    const statementHash = eavtId(value.statement);
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
      canonicalBytes(anchor.statementCoordinate) === canonicalBytes(statement.t) &&
      anchor.commitment === digest(commitmentPayload(statementHash)) &&
      anchor.digest === digest(attestationPayload(expectedBase));
  } catch {
    return false;
  }
}

export function timestampedStatementToDatom(value: TimestampedStatement): Datom {
  const statement = eavtObject(value.statement);
  const reading = timeAnchorVerificationContract.assert(Object.freeze({
    kind: "metroplat.codecs.text.json.time-anchor.verification" as const,
    standard: "opentimestamps/rfc3161.structural" as const,
    anchor: value.anchor,
    verified: verifyTimestampedStatement(value),
  }), "time-anchor verification") as TimeAnchorVerification;
  return Object.freeze([statement.e, statement.a, statement.v, statement.t, reading as unknown as JsonValue]);
}

export function externallyAnchoredTime(value: TimestampedStatement): string {
  if (!verifyTimestampedStatement(value)) throw new Error("externallyAnchoredTime: invalid time anchor");
  return value.anchor.attestedTime;
}

function compareDatetime(left: string, right: string): number {
  const l = Date.parse(left);
  const r = Date.parse(right);
  if (Number.isFinite(l) && Number.isFinite(r)) return l - r;
  return left.localeCompare(right);
}

export function anchoredTimeMonotone(values: readonly TimestampedStatement[]): boolean {
  let prior: string | undefined;
  for (const value of values) {
    if (!verifyTimestampedStatement(value)) return false;
    const current = value.anchor.attestedTime;
    if (prior !== undefined && compareDatetime(prior, current) > 0) return false;
    prior = current;
  }
  return true;
}
