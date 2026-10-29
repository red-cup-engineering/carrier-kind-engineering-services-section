import type { EAVT, JsonValue } from "@emsenn/relating/writing";

import {
  appendEavtLog,
  eavtLogPath,
  eavtStatePath,
  ensureEavtLogStateDirs,
  operationsManifoldEavtLogState,
  readEavtLog,
  timeOfEavtMetadata,
  writeJsonState,
  type EavtLogStatePaths,
} from "../../../recording/events/stating/library/eavt-log-state.mts";

const CONTEXT_LOG_STATE: EavtLogStatePaths = operationsManifoldEavtLogState("context");
export const CONTEXT_LOG_RELATIVE = CONTEXT_LOG_STATE.log;
export const CONTEXT_STATE_RELATIVE = CONTEXT_LOG_STATE.state;

export type ContextLogEventValue = Readonly<Record<string, unknown>>;

export function contextLogEvent(entity: string, attribute: string, value: ContextLogEventValue, at: string, eventId: string): EAVT {
  return Object.freeze([
    entity,
    attribute,
    value as unknown as JsonValue,
    Object.freeze({ at, eventId }) as JsonValue,
  ]);
}

export async function appendContextEvent(repoRoot: string, event: EAVT): Promise<string> {
  return appendEavtLog(repoRoot, CONTEXT_LOG_STATE, [event]);
}

export async function readContextLog(repoRoot: string): Promise<readonly EAVT[]> {
  return readEavtLog(repoRoot, CONTEXT_LOG_STATE);
}

export async function writeContextSnapshot(repoRoot: string, snapshot: unknown): Promise<void> {
  return writeJsonState(repoRoot, CONTEXT_LOG_STATE, snapshot);
}

export async function ensureContextDirs(repoRoot: string): Promise<void> {
  return ensureEavtLogStateDirs(repoRoot, CONTEXT_LOG_STATE);
}

export function contextLogPath(repoRoot: string): string {
  return eavtLogPath(repoRoot, CONTEXT_LOG_STATE);
}

export function contextStatePath(repoRoot: string): string {
  return eavtStatePath(repoRoot, CONTEXT_LOG_STATE);
}

export function timeOf(value: JsonValue, isRecord: (value: JsonValue) => value is Readonly<Record<string, JsonValue>>): string | null {
  return timeOfEavtMetadata(value, isRecord);
}
