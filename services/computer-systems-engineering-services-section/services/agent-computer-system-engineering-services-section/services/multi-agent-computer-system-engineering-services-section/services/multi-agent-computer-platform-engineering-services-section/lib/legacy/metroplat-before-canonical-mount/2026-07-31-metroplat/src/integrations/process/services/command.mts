import { spawnSync, type SpawnSyncReturns } from "node:child_process";

/**
 * Node child-process command boundary.
 */

import type { ServiceLifecycleRecord } from "./lifecycle-schema/schema.mts";
import { processIsoNow } from "./clock.mts";
import { serviceLifecycleEvent, serviceLifecycleRecord } from "./lifecycle.mts";

export type ProcessCommandResult = SpawnSyncReturns<string>;

export interface ProcessCommandRunner {
  readonly spawnSync?: (
    command: string,
    args: readonly string[],
    options: Readonly<{ cwd: string; encoding: "utf8" }>,
  ) => ProcessCommandResult;
}

export interface ProcessCommandOptions extends ProcessCommandRunner {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

/** Run one child command at a service boundary with UTF-8 stdio decoding. */
export function runProcessCommand(options: ProcessCommandOptions): ProcessCommandResult {
  const runner = options.spawnSync ?? ((command: string, args: readonly string[], runnerOptions: Readonly<{ cwd: string; encoding: "utf8" }>): ProcessCommandResult =>
    spawnSync(command, [...args], runnerOptions) as ProcessCommandResult);
  return runner(options.command, options.args, { cwd: options.cwd, encoding: "utf8" });
}

/** Summarize one child-process service run as a lifecycle record. */
export function processCommandLifecycleRecord(
  options: ProcessCommandOptions,
  result: ProcessCommandResult,
  at: string = processIsoNow(),
  service = "src/integrations/process/services/command:runProcessCommand",
): ServiceLifecycleRecord {
  const code = processCommandExitCode(result);
  const evidence = Object.freeze(["src/integrations/process/services/command.mts", service]);
  return serviceLifecycleRecord({
    service,
    boundary: "child-process",
    events: Object.freeze([
      serviceLifecycleEvent({
        service,
        boundary: "child-process",
        event: "spawn",
        at,
        ok: true,
        detail: { command: options.command, args: [...options.args], cwd: options.cwd },
        evidence,
      }),
      serviceLifecycleEvent({
        service,
        boundary: "child-process",
        event: "exit",
        at,
        ok: code === 0,
        code,
        signal: result.signal ?? null,
        detail: {
          command: options.command,
          args: [...options.args],
          cwd: options.cwd,
          stderr: processCommandOutputText(result.stderr),
        },
        evidence,
      }),
    ]),
  });
}

/** Interpret Node's child-process status/error pair as the service exit code. */
export function processCommandExitCode(result: ProcessCommandResult): number {
  return result.status ?? (result.error === undefined ? 0 : 1);
}

/** Normalize one child-process output channel to text. */
export function processCommandOutputText(value: string | Buffer | null | undefined): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : value.toString("utf8");
}

/** Select trimmed process-output lines carrying one diagnostic level marker. */
export function processDiagnosticLines(text: string, level: "error" | "warning"): readonly string[] {
  return Object.freeze(text.split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().includes(`${level}:`)));
}
