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
import { readFileSync } from "node:fs";
import path from "node:path";

import { dataArtifactAddress } from "@red-cup-engineering/eavt/data-artifact-address";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";

import { journal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import {
  runCausalSet,
  closeRunCausalSet,
  turnDiamondsByObservation,

} from "@red-cup-engineering/metrologic/models/order/run-causal-set";

import { parse } from "@red-cup-engineering/json-services-section";
import { CLAUDE_CODE_TURN_VOCABULARY } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/hooks/schema";
export { isArrivalLogPath } from "./arrival-feed.mjs";

const ARRIVAL_ACTION = "admit-arrival";
const ARRIVAL_SUBJECT = "arrival";

function stringAt(value, ...keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return undefined;
}

/** Reduce one recorded hook-event EAVT row to a `RunObservation`, or `undefined` when it names no session. */
export function runObservationFromRow(row) {
  const [entity, , value, time] = row;
  const session = stringAt(entity, "session") ?? stringAt(value, "sessionId");
  const hookEventName = stringAt(entity, "hookEventName") ?? stringAt(value, "hookEventName");
  const at = typeof time === "string" ? time : undefined;
  if (session === undefined || hookEventName === undefined || at === undefined) return undefined;
  return Object.freeze({ session, hookEventName, at });
}

function recordAt(value, ...keys) {
  let current = value;
  for (const key of keys) {
    if (current === undefined || current === null || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current)[key];
  }
  return current;
}

function packetPathOfArrivalRow(row) {
  const [, , value] = row;
  return stringAt(recordAt(value, "packet"), "path");
}

/** The admitted hook arrival a row names: its CloudEvent identity (a content address) and the
 *  hook envelope its packet carries, or undefined. */
export function hookArrivalOfArrivalRow(row, logDir, options = {}) {
  const packetPath = packetPathOfArrivalRow(row);
  if (packetPath === undefined) return undefined;
  try {
    const packet = parse((options.readFileUtf8 ?? ((file) => readFileSync(file, "utf8")))(path.join(logDir, packetPath)));
    const envelope = recordAt(packet, "presentation", "data", "material", "envelope");
    const identity = recordAt(packet, "presentation", "id");
    return envelope === undefined ? undefined : Object.freeze({ identity, envelope });
  } catch {
    return undefined;
  }
}

/** The hook envelope an admitted arrival row carries in its packet, or undefined. */
export function hookEnvelopeOfArrivalRow(row, logDir, options = {}) {
  return hookArrivalOfArrivalRow(row, logDir, options)?.envelope;
}

/** The path of one day's admit-arrival log under a data root. */
export function arrivalLogPath(root, date) {
  return dataArtifactAddress({ root, tier: "log", encoding: "jsonl", at: `${date}T00:00:00.000Z`, action: ARRIVAL_ACTION, subject: ARRIVAL_SUBJECT }).path;
}

/** Whether a daily feed path is the hook catchment: every harness event lands there, so it is most
 *  of a day's bytes, and it holds no claims, work items or citations for a work reader to fold. */
export function hookRunObservationsOfArrivalLog(root, date, options) {
  const address = dataArtifactAddress({
    root,
    tier: "log",
    encoding: "jsonl",
    at: `${date}T00:00:00.000Z`,
    action: ARRIVAL_ACTION,
    subject: ARRIVAL_SUBJECT,
  });
  const observations = [];
  let rows = 0;
  const logDir = path.dirname(address.path);
  journal.scan(address.path, undefined, (_accum, row) => {
    const envelope = hookEnvelopeOfArrivalRow(row, logDir, options);
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

  

/**
 * Read one day's `admit-arrival` feed under a data root and derive that
 * day's turn diamonds and their sequencing causal set. Does not settle: a
 * real day's diamond count already exceeds what `closeRunCausalSet` can
 * afford in one call (see its docstring). Settle one session at a time via
 * `readSessionCausalSetCarrier` instead.
 */
export function readRunCausalSet(root, date, options) {
  const { rows, observations } = hookRunObservationsOfArrivalLog(root, date, options);
  const diamonds = turnDiamondsByObservation(observations, CLAUDE_CODE_TURN_VOCABULARY);
  return Object.freeze({
    kind: "metroplat.run.causal-set-read",
    root,
    date,
    rows,
    diamonds,
    causalSet: runCausalSet(diamonds),
  });
}

function operationDate(binding, input) {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const date = (input)["date"];
    if (typeof date === "string" && date.length > 0) return date;
  }
  return binding.now().slice(0, 10);
}

export function runCausalSetOperations(binding) {
  return Object.freeze([
    operation({
      verb: "run-causal-set",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read the day's recorded hook/run causal set.",
      description: "Domain: { date? }. Folds the shared admit-arrival feed into turn diamonds and their sequencing causal set.",
      run: (input) => {
        const read = readRunCausalSet(binding.dataRoot, operationDate(binding, input), binding);
        return read.rows === 0 ? null : read;
      },
    }),
  ]);
}

/** Settle one session's own turn diamonds out of a day's read — the properly bounded region for settlement, per `SETTLE_EVENT_CAP`'s docstring, rather than the day's diamonds across every session. */
export function readSessionCausalSetCarrier(read, session) {
  return closeRunCausalSet(read.diamonds.filter((diamond) => diamond.session === session));
}
