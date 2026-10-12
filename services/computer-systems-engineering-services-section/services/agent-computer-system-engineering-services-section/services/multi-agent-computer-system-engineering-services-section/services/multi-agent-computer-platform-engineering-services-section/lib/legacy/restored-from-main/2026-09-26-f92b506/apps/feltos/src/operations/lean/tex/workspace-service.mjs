/**
 * @packageDocumentation
 *
 * integrations/lean/tex/workspace-service - TeX/Blueprint/Verso runtime tool
 * command instruments.
 *
 * Reading a live TeX/Blueprint/Verso authoring tree into plates and joined
 * claim/weld reports is host-neutral domain logic that now lives in
 * `@red-cup-engineering/lean-system-services-section` (`readTexWorkspace`,
 * published at its `/tex/workspace-service` subpath) — real consumers import
 * it from there directly. This module keeps only what is genuinely
 * metroplat's own: running the TeX engine, `leanblueprint`, and Lake/Verso
 * build tools as service-bound, lifecycle-recorded process instruments.
 */
import path from "node:path";

import {
  texToolReportContract,
  texWorkspaceToolObservationContract,

} from "@red-cup-engineering/lean-system-services-section/tex/schema";

import { executeJavascriptNodeCommand } from "@red-cup-engineering/execute-javascript-node-command-service";
import { processIsoNow } from "@red-cup-engineering/node-process-services-section/clock";
import { processCommandExitCode, processCommandLifecycleRecord, processDiagnosticLines } from "@red-cup-engineering/node-process-services-section/command";

import {
  recordServiceLifecycleRecord,

} from "@red-cup-engineering/feltos/dashboards/service-lifecycle";

/** The TeX-family tool kinds a workspace command instrument observes; matches
 *  `metroplat/tex/tool-report`'s `tool` enum in the Lean system section's TeX schema. */

export function runTexWorkspaceCommand(root, options = {}) {
  return runTexToolCommand("tex-engine", "run-tex-workspace-command", root, {
    command: options.command ?? "latexmk",
    args: options.args ?? ["-pdf"],
    ...options,
  });
}

export function runBlueprintWorkspaceCommand(root, options = {}) {
  return runTexToolCommand("blueprint-tool", "run-blueprint-workspace-command", root, {
    command: options.command ?? "leanblueprint",
    args: options.args ?? ["web"],
    ...options,
  });
}

export function runVersoWorkspaceCommand(root, options = {}) {
  return runTexToolCommand("verso-tool", "run-verso-workspace-command", root, {
    command: options.command ?? "lake",
    args: options.args ?? ["build"],
    ...options,
  });
}

function runTexToolCommand(
  tool,
  operation,
  root,
  options,
) {
  const rootAbs = path.resolve(root);
  const commandContext = { command: options.command, args: options.args, cwd: rootAbs };
  const receipt = executeJavascriptNodeCommand({
    type: "JavascriptNodeCommandExecutionRequest",
    version: 1,
    command: options.command,
    arguments: [...options.args],
    directory: rootAbs,
    environment: null,
    input: null,
  });
  const { result } = receipt;
  const lifecycle = processCommandLifecycleRecord(
    commandContext,
    result,
    typeof options.at === "string" ? options.at : processIsoNow(),
    `services/tex-workspace:${operation}`,
  );
  for (const event of lifecycle.events) options.lifecycle?.(event);
  if (options.lifecyclePersistence !== undefined) {
    recordServiceLifecycleRecord(options.lifecyclePersistence, lifecycle);
  }
  const exitCode = processCommandExitCode(result);
  const { stdout, stderr } = result;
  const report = texToolReportContract.assert({
    kind: "metroplat.tex.tool-report",
    tool,
    command: options.command,
    args: Object.freeze([...options.args]),
    exitCode,
    stdout,
    stderr: stderr || result.error || "",
    succeeded: exitCode === 0,
    errors: processDiagnosticLines(`${stdout}\n${stderr}\n${result.error ?? ""}`, "error"),
    warnings: processDiagnosticLines(`${stdout}\n${stderr}`, "warning"),
    mediaType: "application/vnd.metroplat.tex.tool-report+json",
  }, "TeX-family tool report");
  return texWorkspaceToolObservationContract.assert(Object.freeze({
    kind: "metroplat.tex.workspace-tool-observation",
    operation,
    root: rootAbs,
    report,
  }), "TeX workspace tool observation");
}

// No service verbs live here: workspace reads are derived views for the
// filesystem `read` and now come from
// @red-cup-engineering/lean-system-services-section's `readTexWorkspace`
// directly; the TeX/Blueprint/Verso runtimes remain in-package process
// instruments (`runTexWorkspaceCommand` and kin) for callers like
// src/integrations/lean/workspace/service.mts and
// src/integrations/filesystem/services/read-write.mts.
