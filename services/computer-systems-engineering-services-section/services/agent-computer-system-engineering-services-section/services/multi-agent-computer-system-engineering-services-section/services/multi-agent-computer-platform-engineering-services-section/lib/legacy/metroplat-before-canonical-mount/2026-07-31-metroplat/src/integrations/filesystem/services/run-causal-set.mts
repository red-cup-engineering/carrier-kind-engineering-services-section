/**
 * Service binding for the run-space's sequencing order.
 *
 * Reads a data root's already-admitted `admit-arrival` feed for one day
 * and derives that day's turn diamonds and their sequencing causal set. Pure
 * derivation lives in `core/closure/analysis/run-causal-set`, which knows no
 * harness's own event names; this module owns the filesystem read, the
 * EAVT-to-`RunObservation` reduction, and supplying Claude Code's own turn
 * vocabulary (`CLAUDE_CODE_TURN_VOCABULARY`, from `../../hooks`).
 */
import path from "node:path";

import { dataArtifactAddress } from "../../../lib/addressing/index.mts";
import { operation, type Operation } from "../../../rpc/index.mts";
import type { FilesystemBinding } from "./read-write.mts";
import { journal } from "../../../journal/index.mts";
import { readFileUtf8 } from "../../../lib/filesystem/index.mts";
import {
  runCausalSet,
  closeRunCausalSet,
  turnDiamondsByObservation,
  type RunCausalSetClosure,
  type RunObservation,
  type TurnDiamond,
} from "../../../lib/math/order/run-causal-set.mts";
import type { CausalSet } from "../../../lib/math/order/causal.mts";
import type { EAVT } from "../../../lib/codecs/json/jsonl/eavt/index.mts";
import { parse, type JsonValue } from "../../../lib/codecs/json/core.mts";
import { CLAUDE_CODE_TURN_VOCABULARY } from "../../hooks/schema.mts";

const ARRIVAL_ACTION = "admit-arrival";
const ARRIVAL_SUBJECT = "arrival";

function stringAt(value: unknown, ...keys: readonly string[]): string | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Readonly<Record<string, unknown>>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return undefined;
}

/** Reduce one recorded hook-event EAVT row to a `RunObservation`, or `undefined` when it names no session. */
export function runObservationFromRow(row: EAVT): RunObservation | undefined {
  const [entity, , value, time] = row;
  const session = stringAt(entity, "session") ?? stringAt(value, "sessionId");
  const hookEventName = stringAt(entity, "hookEventName") ?? stringAt(value, "hookEventName");
  const at = typeof time === "string" ? time : undefined;
  if (session === undefined || hookEventName === undefined || at === undefined) return undefined;
  return Object.freeze({ session, hookEventName, at });
}

function recordAt(value: JsonValue, ...keys: readonly string[]): JsonValue | undefined {
  let current: JsonValue | undefined = value;
  for (const key of keys) {
    if (current === undefined || current === null || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Readonly<Record<string, JsonValue>>)[key];
  }
  return current;
}

function packetPathOfArrivalRow(row: EAVT): string | undefined {
  const [, , value] = row;
  return stringAt(recordAt(value, "packet"), "path");
}

function hookEnvelopeOfArrivalRow(row: EAVT, logDir: string): JsonValue | undefined {
  const packetPath = packetPathOfArrivalRow(row);
  if (packetPath === undefined) return undefined;
  try {
    const packet = parse(readFileUtf8(path.join(logDir, packetPath)));
    return recordAt(packet, "presentation", "data", "material", "envelope");
  } catch {
    return undefined;
  }
}

export interface HookArrivalObservations {
  readonly rows: number;
  readonly observations: readonly RunObservation[];
}

export function hookRunObservationsOfArrivalLog(root: string, date: string): HookArrivalObservations {
  const address = dataArtifactAddress({
    root,
    tier: "log",
    encoding: "jsonl",
    at: `${date}T00:00:00.000Z`,
    action: ARRIVAL_ACTION,
    subject: ARRIVAL_SUBJECT,
  });
  const observations: RunObservation[] = [];
  let rows = 0;
  const logDir = path.dirname(address.path);
  journal.scan(address.path, undefined, (_accum, row) => {
    const envelope = hookEnvelopeOfArrivalRow(row, logDir);
    if (envelope === undefined) return undefined;
    const session = stringAt(envelope, "sessionId", "session_id", "session");
    const hookEventName = stringAt(envelope, "hookEventName", "hook_event_name");
    const at = typeof row[3] === "string" ? row[3] : undefined;
    if (session !== undefined && hookEventName !== undefined && at !== undefined) {
      rows += 1;
      observations.push(Object.freeze({ session, hookEventName, at }));
    }
    return undefined;
  });
  observations.sort((left, right) => left.at.localeCompare(right.at));
  return Object.freeze({ rows, observations: Object.freeze(observations) });
}

export interface RunCausalSetRead {
  readonly kind: "metroplat.run.causal-set-read";
  readonly root: string;
  readonly date: string;
  readonly rows: number;
  readonly diamonds: readonly TurnDiamond[];
  /** Turn diamonds and their sequencing seed links; cheap regardless of scale. Settlement is not eager — see `readSessionCausalSet`. */
  readonly causalSet: CausalSet;
}

/**
 * Read one day's `admit-arrival` feed under a data root and derive that
 * day's turn diamonds and their sequencing causal set. Does not settle: a
 * real day's diamond count already exceeds what `closeRunCausalSet` can
 * afford in one call (see its docstring). Settle one session at a time via
 * `readSessionCausalSet` instead.
 */
export function readRunCausalSet(root: string, date: string): RunCausalSetRead {
  const { rows, observations } = hookRunObservationsOfArrivalLog(root, date);
  const diamonds = turnDiamondsByObservation(observations, CLAUDE_CODE_TURN_VOCABULARY);
  return Object.freeze({
    kind: "metroplat.run.causal-set-read" as const,
    root,
    date,
    rows,
    diamonds,
    causalSet: runCausalSet(diamonds),
  });
}

function operationDate(binding: FilesystemBinding, input: unknown): string {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const date = (input as Readonly<Record<string, JsonValue>>)["date"];
    if (typeof date === "string" && date.length > 0) return date;
  }
  return (binding.now?.() ?? new Date().toISOString()).slice(0, 10);
}

export function runCausalSetOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "run-causal-set",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read the day's recorded hook/run causal set.",
      description: "Domain: { date? }. Folds the shared admit-arrival feed into turn diamonds and their sequencing causal set.",
      run: (input: unknown): unknown => {
        const read = readRunCausalSet(binding.dataRoot, operationDate(binding, input));
        return read.rows === 0 ? null : read;
      },
    }),
  ]);
}

/** Settle one session's own turn diamonds out of a day's read — the properly bounded region for settlement, per `SETTLE_EVENT_CAP`'s docstring, rather than the day's diamonds across every session. */
export function readSessionCausalSet(read: RunCausalSetRead, session: string): RunCausalSetClosure {
  return closeRunCausalSet(read.diamonds.filter((diamond) => diamond.session === session));
}
