/**
 * @packageDocumentation
 *
 * integrations/lean/tex/workspace-service - live TeX-family host-mark scanning and tool observations.
 *
 * This service owns filesystem and process boundaries for TeX, Blueprint, and
 * Verso authoring surfaces. Generic TeX text is admitted through
 * `src/integrations/lean/tex/generic.mts`; Blueprint and Verso plate
 * decoding and readouts live in `src/integrations/lean/{blueprint,verso}/codec.mts`
 * and `src/integrations/lean/{blueprint,verso}/view.mts`; command
 * execution remains a service-bound instrument observation.
 */
import path from "node:path";

import { decodeTexPlate } from "./generic.mts";
import { decodeBlueprintTexPlate } from "../blueprint/codec.mts";
import { decodeVersoTexPlate } from "../verso/codec.mts";
import {
  texToolReportContract,
  texWorkspaceReadContract as texWorkspaceReadSchemaContract,
  texWorkspaceReadRequestContract,
  texWorkspaceToolObservationContract,
  texWorkspaceToolObservationRequestContract,
  type TexToolReport,
  type TexWorkspaceRead,
  type TexWorkspaceReadRequest,
  type TexWorkspaceSource,
  type TexWorkspaceToolObservation,
  type TexWorkspaceToolObservationRequest,
} from "./schema.mts";
import { blueprintClaimGraph } from "../blueprint/view.mts";
import { versoExpositionWeldReport } from "../verso/view.mts";
import type { LeanDeclarationCatalog } from "../view.mts";
import type { ContractValue } from "../../../lib/contracts/index.mts";
import type { Operation } from "../../../rpc/index.mts";
import {
  texWorkspaceDefaultBlueprintRoots,
  texWorkspaceDefaultTexRoots,
  texWorkspaceDefaultVersoRoots,
  texWorkspaceIgnoredDirectories,
  texWorkspaceShouldSkipDirectory,
  type TexWorkspaceToolKind,
} from "./workspace.mts";
import {
  processCommandExitCode,
  processCommandLifecycleRecord,
  processCommandOutputText,
  processDiagnosticLines,
  processIsoNow,
  runProcessCommand,
  type ProcessCommandRunner,
} from "../../process/services/index.mts";
import type { ServiceLifecycleEvent } from "../../process/services/lifecycle-schema/schema.mts";
import {
  recordServiceLifecycleRecord,
  type ServiceLifecyclePersistence,
} from "../../../dashboards/service-lifecycle/index.mts";
import { uniqueSortedStrings as uniqueSorted } from "../../../lib/values/unique-sorted-strings.mts";
import { pathExists, readDirectoryEntries, readFileUtf8, statPathOrNull } from "../../../lib/filesystem/index.mts";

export type {
  TexWorkspaceReadRequest,
  TexWorkspaceSource,
  TexWorkspaceRead,
  TexWorkspaceToolObservation,
  TexWorkspaceToolObservationRequest,
} from "./schema.mts";

export interface TexWorkspaceReadOptions {
  readonly maxDepth?: number;
  readonly ignore?: readonly string[];
  readonly texRoots?: readonly string[];
  readonly blueprintRoots?: readonly string[];
  readonly versoRoots?: readonly string[];
  readonly leanDeclarations?: LeanDeclarationCatalog;
  readonly at?: ContractValue;
  readonly caller?: ContractValue;
}

export interface TexCommandRunner extends ProcessCommandRunner {}

export interface TexCommandOptions extends TexCommandRunner {
  readonly command?: string;
  readonly args?: readonly string[];
  readonly at?: ContractValue;
  readonly caller?: ContractValue;
  readonly lifecycle?: ((event: ServiceLifecycleEvent) => void) | undefined;
  readonly lifecyclePersistence?: ServiceLifecyclePersistence | undefined;
}

type TexToolKind = TexWorkspaceToolKind;
type TexToolOperation = "run-tex-workspace-command" | "run-blueprint-workspace-command" | "run-verso-workspace-command";

function collectSources(
  root: string,
  relativeRoots: readonly string[],
  extensions: readonly string[],
  options: TexWorkspaceReadOptions,
): readonly TexWorkspaceSource[] {
  const maxDepth = options.maxDepth ?? 8;
  const ignore = new Set(options.ignore ?? []);
  const extensionSet = new Set(extensions);
  const files: string[] = [];

  const scan = (current: string, depth: number): void => {
    if (depth > maxDepth) return;
    const currentStat = statPathOrNull(current);
    if (currentStat === null) return;
    if (currentStat.isFile()) {
      if (extensionSet.has(path.extname(current))) files.push(current);
      return;
    }
    if (!currentStat.isDirectory()) return;
    let entries;
    try {
      entries = readDirectoryEntries(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (texWorkspaceShouldSkipDirectory(entry.name, ignore)) continue;
        scan(target, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!extensionSet.has(path.extname(entry.name))) continue;
      files.push(target);
    }
  };

  for (const relativeRoot of uniqueSorted(relativeRoots)) {
    const absolute = path.join(root, relativeRoot);
    if (pathExists(absolute)) scan(absolute, 0);
  }

  return Object.freeze(uniqueSorted(files).map((file) => Object.freeze({
    path: path.relative(root, file).replace(/\\/gu, "/"),
    text: readFileUtf8(file),
  })));
}

export function readTexWorkspace(root: string, options: TexWorkspaceReadOptions = {}): TexWorkspaceRead {
  const absoluteRoot = path.resolve(root);
  const texSources = collectSources(absoluteRoot, options.texRoots ?? texWorkspaceDefaultTexRoots, [".tex"], options);
  const blueprintSources = collectSources(absoluteRoot, options.blueprintRoots ?? texWorkspaceDefaultBlueprintRoots, [".tex"], options);
  const versoSources = collectSources(absoluteRoot, options.versoRoots ?? texWorkspaceDefaultVersoRoots, [".lean"], options);
  const texPlates = Object.freeze(texSources.map((source) =>
    decodeTexPlate(source.text, { source: source.path, format: "generic-tex" })));
  const blueprintPlates = Object.freeze(blueprintSources.map((source) =>
    decodeBlueprintTexPlate(source.text, source.path)));
  const versoPlates = Object.freeze(versoSources.map((source) =>
    decodeVersoTexPlate(source.text, source.path)));
  const claimGraph = blueprintClaimGraph(blueprintPlates);
  const weldReport = versoExpositionWeldReport(versoPlates, {
    blueprint: claimGraph,
    ...(options.leanDeclarations === undefined ? {} : { leanDeclarations: options.leanDeclarations }),
  });
  const boundary = Object.freeze({
    root: absoluteRoot,
    texSources: texSources.length,
    blueprintSources: blueprintSources.length,
    versoSources: versoSources.length,
    texPlates: texPlates.length,
    blueprintPlates: blueprintPlates.length,
    versoPlates: versoPlates.length,
    blueprintNodes: claimGraph.nodes.length,
    versoOk: weldReport.ok,
  });
  return texWorkspaceReadSchemaContract.assert(Object.freeze({
    kind: "metroplat.tex.workspace" as const,
    operation: "read-tex-workspace" as const,
    root: absoluteRoot,
    texSources,
    blueprintSources,
    versoSources,
    texPlates,
    blueprintPlates,
    versoPlates,
    blueprintClaimGraph: claimGraph,
    versoExpositionWeldReport: weldReport,
  }), "TeX workspace read") as TexWorkspaceRead;
}

export function runTexWorkspaceCommand(root: string, options: TexCommandOptions = {}): TexWorkspaceToolObservation {
  return runTexToolCommand("tex-engine", "run-tex-workspace-command", root, {
    command: options.command ?? "latexmk",
    args: options.args ?? ["-pdf"],
    ...options,
  });
}

export function runBlueprintWorkspaceCommand(root: string, options: TexCommandOptions = {}): TexWorkspaceToolObservation {
  return runTexToolCommand("blueprint-tool", "run-blueprint-workspace-command", root, {
    command: options.command ?? "leanblueprint",
    args: options.args ?? ["web"],
    ...options,
  });
}

export function runVersoWorkspaceCommand(root: string, options: TexCommandOptions = {}): TexWorkspaceToolObservation {
  return runTexToolCommand("verso-tool", "run-verso-workspace-command", root, {
    command: options.command ?? "lake",
    args: options.args ?? ["build"],
    ...options,
  });
}

function runTexToolCommand(
  tool: TexToolKind,
  operation: TexToolOperation,
  root: string,
  options: Required<Pick<TexCommandOptions, "command" | "args">> & TexCommandOptions,
): TexWorkspaceToolObservation {
  const rootAbs = path.resolve(root);
  const commandOptions = {
    command: options.command,
    args: options.args,
    cwd: rootAbs,
    ...(options.spawnSync === undefined ? {} : { spawnSync: options.spawnSync }),
  };
  const result = runProcessCommand(commandOptions);
  const lifecycle = processCommandLifecycleRecord(
    commandOptions,
    result,
    typeof options.at === "string" ? options.at : processIsoNow(),
    `services/tex-workspace:${operation}`,
  );
  for (const event of lifecycle.events) options.lifecycle?.(event);
  if (options.lifecyclePersistence !== undefined) {
    recordServiceLifecycleRecord(options.lifecyclePersistence, lifecycle);
  }
  const exitCode = processCommandExitCode(result);
  const stdout = processCommandOutputText(result.stdout);
  const stderr = processCommandOutputText(result.stderr);
  const report = texToolReportContract.assert({
    kind: "metroplat.tex.tool-report",
    tool,
    command: options.command,
    args: Object.freeze([...options.args]),
    exitCode,
    stdout,
    stderr: stderr || result.error?.message || "",
    succeeded: exitCode === 0,
    errors: processDiagnosticLines(`${stdout}\n${stderr}\n${result.error?.message ?? ""}`, "error"),
    warnings: processDiagnosticLines(`${stdout}\n${stderr}`, "warning"),
    mediaType: "application/vnd.metroplat.tex.tool-report+json",
  }, "TeX-family tool report") as TexToolReport;
  const boundary = Object.freeze({
    root: rootAbs,
    tool,
    command: options.command,
    args: Object.freeze([...options.args]),
    exitCode: report.exitCode,
    succeeded: report.succeeded,
    errors: report.errors.length,
    warnings: report.warnings.length,
  });
  return texWorkspaceToolObservationContract.assert(Object.freeze({
    kind: "metroplat.tex.workspace-tool-observation" as const,
    operation,
    root: rootAbs,
    report,
  }), "TeX workspace tool observation") as TexWorkspaceToolObservation;
}

// No service verbs live here: workspace reads are derived views for the
// filesystem `read`, and the TeX/Blueprint/Verso runtimes remain in-package
// process instruments (`runTexWorkspaceCommand` and kin) for callers like
// src/integrations/lean/workspace/service.mts.
