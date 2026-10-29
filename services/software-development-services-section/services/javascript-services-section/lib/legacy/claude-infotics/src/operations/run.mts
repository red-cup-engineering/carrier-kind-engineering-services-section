/**
 * operations/run — drive the `claude` binary as an MetroPlat operation.
 *
 * The claude-specific analogue of `integrations/git/service`'s
 * `gitWorkspaceOperations`: it reaches the host binary through the SAME
 * `runProcessCommand` child-process boundary the platform uses for git, rather
 * than a bespoke `spawn`. The run's json/stream-json output is folded by the
 * claude-only `events` codec into a summary. MetroPlat derives the CLI/HTTP/MCP
 * faces from this operation; there is no hand-rolled arg parser or bin.
 *
 * The prompt is passed as the trailing positional (`claude --print … "<prompt>"`)
 * because `runProcessCommand` is a `spawnSync` boundary with no stdin channel.
 */
import process from "node:process";
import { operation, type Operation } from "@red-cup-engineering/metroplat/operations";
import { runProcessCommand, processCommandExitCode, processCommandOutputText } from "@red-cup-engineering/metroplat/integrations/process";
import type { FilesystemBinding } from "@red-cup-engineering/metroplat/integrations/filesystem";

import { parseClaudeEvents, summarizeRun } from "./events.mts";

function str(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}
function list(record: Record<string, unknown>, key: string): readonly string[] | undefined {
  const value = record[key];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.length > 0) return value.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  return undefined;
}

/** Project the run request into the `claude` argv (flags, then trailing prompt positional). */
export function claudeArgv(record: Record<string, unknown>): readonly string[] {
  const argv: string[] = ["--print"];
  const of = str(record, "output-format", "outputFormat") ?? "json";
  argv.push("--output-format", of);
  const model = str(record, "model");
  if (model !== undefined) argv.push("--model", model);
  const effort = str(record, "effort");
  if (effort !== undefined) argv.push("--effort", effort);
  const appendSystem = str(record, "append-system-prompt", "appendSystemPrompt");
  if (appendSystem !== undefined) argv.push("--append-system-prompt", appendSystem);
  for (const dir of list(record, "add-dir") ?? list(record, "addDirs") ?? []) argv.push("--add-dir", dir);
  const allowed = list(record, "allowed-tools") ?? list(record, "allowedTools");
  if (allowed !== undefined) argv.push("--allowedTools", allowed.join(","));
  const perm = str(record, "permission-mode", "permissionMode");
  if (perm !== undefined) argv.push("--permission-mode", perm);
  const prompt = str(record, "prompt");
  if (prompt !== undefined) argv.push(prompt); // trailing positional
  return Object.freeze(argv);
}

function inputRecord(input: unknown, args: Record<string, unknown>): Record<string, unknown> {
  const base = input !== null && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  return { ...base, ...args };
}

/** Operations that drive the `claude` binary. `binding` resolves the default cwd. */
export function claudeRunOperations(_binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "claude-run",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Drive the claude binary in print mode and fold its run into a summary.",
      description: "Options: --prompt, --model, --effort, --output-format (json|stream-json|text), --cwd, --bin, --append-system-prompt, --add-dir, --allowed-tools, --permission-mode.",
      options: Object.freeze(["prompt", "model", "effort", "output-format", "cwd", "bin", "append-system-prompt", "add-dir", "allowed-tools", "permission-mode"]),
      run: (input: unknown, args: Record<string, unknown>): unknown => {
        const record = inputRecord(input, args);
        const prompt = str(record, "prompt");
        if (prompt === undefined) return Object.freeze({ ok: false, error: "claude-run: --prompt is required" });
        const outputFormat = str(record, "output-format", "outputFormat") ?? "json";
        const argv = claudeArgv(record);
        const result = runProcessCommand({
          command: str(record, "bin") ?? "claude",
          args: argv,
          cwd: str(record, "cwd") ?? process.cwd(),
        });
        const code = processCommandExitCode(result);
        const stdout = processCommandOutputText(result.stdout);
        const stderr = processCommandOutputText(result.stderr);
        const structured = outputFormat === "json" || outputFormat === "stream-json";
        const events = structured ? parseClaudeEvents(stdout) : Object.freeze([]);
        return Object.freeze({
          ok: code === 0,
          code,
          ...(events.length > 0 ? { summary: summarizeRun(events), events: events.length } : { stdout }),
          ...(stderr.trim().length === 0 ? {} : { stderr }),
          evidence: Object.freeze(["boundary:process-command", `command:claude ${argv.join(" ")}`]),
        });
      },
    }),
  ]);
}
