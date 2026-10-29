import type { EAVT } from "@emsenn/relating/writing";

import {
  appendEavtLog,
  eavtLogPath,
  eavtStatePath,
  ensureEavtLogStateDirs,
  operationsManifoldEavtLogState,
  readEavtLog,
  writeJsonState,
  type EavtLogStatePaths,
} from "../../../events/stating/library/eavt-log-state.mts";

const OPERATIONS_LOG_STATE: EavtLogStatePaths = operationsManifoldEavtLogState("operations");
export const OPERATIONS_LOG_RELATIVE = OPERATIONS_LOG_STATE.log;
export const OPERATIONS_STATE_RELATIVE = OPERATIONS_LOG_STATE.state;

export async function ensureOperationDirs(repoRoot: string): Promise<void> {
  return ensureEavtLogStateDirs(repoRoot, OPERATIONS_LOG_STATE);
}

export async function appendOperationEvents(repoRoot: string, events: readonly EAVT[]): Promise<string> {
  return appendEavtLog(repoRoot, OPERATIONS_LOG_STATE, events);
}

export async function readOperationLog(repoRoot: string): Promise<readonly EAVT[]> {
  return readEavtLog(repoRoot, OPERATIONS_LOG_STATE);
}

export async function writeOperationSnapshot(repoRoot: string, snapshot: unknown): Promise<void> {
  return writeJsonState(repoRoot, OPERATIONS_LOG_STATE, snapshot);
}

export function operationLogPath(repoRoot: string): string {
  return eavtLogPath(repoRoot, OPERATIONS_LOG_STATE);
}

export function operationStatePath(repoRoot: string): string {
  return eavtStatePath(repoRoot, OPERATIONS_LOG_STATE);
}
