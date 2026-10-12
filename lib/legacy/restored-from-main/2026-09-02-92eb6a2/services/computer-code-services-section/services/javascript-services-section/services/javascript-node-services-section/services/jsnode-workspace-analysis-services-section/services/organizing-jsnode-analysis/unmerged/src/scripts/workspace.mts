#!/usr/bin/env node
// jsnode-workspace — read the workspace through @red-cup-engineering/organizing-with-jsnode carriers.
//
//   jsnode-workspace graph [--focus <package>] [--up N] [--down N] [--json]
//   jsnode-workspace decommission [--focus <package>] [--include-unmarked-islands] [--no-source] [--no-source-markers] [--json]
//   jsnode-workspace decommissioned-imports [--json] [--fail]
//   jsnode-workspace turtle [--base <iri>]
//
// The command is a projection only: discoverWorkspace() reads package manifests
// into JSNodePackage/JSNodeWorkspace carriers, graph/turtle render those
// carriers. It does not carry its own package graph model.

import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { workspaceTurtle } from "../codecs/index.mjs";
import { workspaceConsumptionIndex } from "../organizing/workspaces/consumption.mjs";
import {
  DECOMMISSION_MARKER_TERMS,
  decommissionSourceMarkerPattern,
  isActionableDecommissionSourceMarker,
  workspaceDecommissionReadiness,
  type PackageDecommissionCandidate,
  type PackageDecommissionLocation,
  type PackageRetirementProofEvidenceInput,
  type PackageSourceMarker,
  type WorkspaceDecommissionReadiness,
} from "../organizing/workspaces/analysis/decommission.mjs";
import {
  workspaceDecommissionedImportAudit,
  type WorkspaceDecommissionedImportAudit,
} from "../organizing/workspaces/analysis/decommissioned-imports.mjs";
import {
  egoGraph,
  workspaceDependencyGraph,
  type WorkspaceDependencyGraph,
} from "../organizing/workspaces/graph.mjs";
import { sourceModuleFiles } from "../organizing/modules/source.mjs";
import { discoverWorkspace, eachWorkspacePackageDir } from "../organizing/workspaces/workspace.mjs";
import { findRepoRoot } from "./repo-root.mjs";

const JSNODE_CORE_PACKAGES = Object.freeze([
  "@emsenn/relating",
  "@emsenn/communicating",
  "@red-cup-engineering/knowing",
  "@red-cup-engineering/playing",
  "@red-cup-engineering/animating",
  "@red-cup-engineering/socializing",
  "@red-cup-engineering/computing",
  "@red-cup-engineering/gaming",
  "@red-cup-engineering/organizing",
] as const);

type ParsedArgs = Readonly<{
  command: string | undefined;
  focus?: string;
  json: boolean;
  root?: string;
  base?: string;
  upDepth: number;
  downDepth: number;
  exclude: readonly string[];
  includeUnmarkedIslands: boolean;
  source: boolean;
  sourceMarkers: boolean;
  fail: boolean;
}>;

function takeValue(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) throw new TypeError(`${flag} requires a value`);
  return value;
}

function parseDepth(value: string, flag: string): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 0) throw new TypeError(`${flag} must be a non-negative integer`);
  return n;
}

function parseArgs(args: readonly string[]): ParsedArgs {
  const [command, ...rest] = args;
  let focus: string | undefined;
  let root: string | undefined;
  let base: string | undefined;
  let json = false;
  let upDepth = 1;
  let downDepth = 1;
  const exclude: string[] = [];
  let includeUnmarkedIslands = false;
  let source = true;
  let sourceMarkers = true;
  let fail = false;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index]!;
    if (arg === "--json") {
      json = true;
    } else if (arg === "--focus") {
      focus = takeValue(rest, index, arg);
      index += 1;
    } else if (arg === "--root") {
      root = takeValue(rest, index, arg);
      index += 1;
    } else if (arg === "--base") {
      base = takeValue(rest, index, arg);
      index += 1;
    } else if (arg === "--up") {
      upDepth = parseDepth(takeValue(rest, index, arg), arg);
      index += 1;
    } else if (arg === "--down") {
      downDepth = parseDepth(takeValue(rest, index, arg), arg);
      index += 1;
    } else if (arg === "--exclude") {
      exclude.push(takeValue(rest, index, arg));
      index += 1;
    } else if (arg === "--include-unmarked-islands") {
      includeUnmarkedIslands = true;
    } else if (arg === "--no-source") {
      source = false;
    } else if (arg === "--no-source-markers") {
      sourceMarkers = false;
    } else if (arg === "--fail") {
      fail = true;
    } else {
      throw new TypeError(`unknown option ${arg}`);
    }
  }

  return {
    command,
    ...(focus === undefined ? {} : { focus }),
    json,
    ...(root === undefined ? {} : { root }),
    ...(base === undefined ? {} : { base }),
    upDepth,
    downDepth,
    exclude,
    includeUnmarkedIslands,
    source,
    sourceMarkers,
    fail,
  };
}

function renderGraph(graph: WorkspaceDependencyGraph, focus?: string): string {
  const lines: string[] = [];
  lines.push(`${focus === undefined ? "workspace" : focus}: ${graph.nodes.length} package(s), ${graph.edges.length} internal edge(s)`);
  for (const node of graph.nodes) {
    const deps = node.dependencies.length === 0 ? "-" : node.dependencies.join(", ");
    lines.push(`${node.name}\t${node.layer}\t${node.lifecycle}/${node.maturity}\tdeps: ${deps}`);
  }
  if (graph.edges.length > 0) {
    lines.push("");
    for (const edge of graph.edges) lines.push(`${edge.from} -> ${edge.to}`);
  }
  return `${lines.join("\n")}\n`;
}

function renderDecommission(report: WorkspaceDecommissionReadiness): string {
  const lines: string[] = [];
  lines.push(
    `decommission readiness: ${report.candidateCount} candidate(s) across ${report.packageCount} package(s)`,
  );
  lines.push(
    `ready-to-prove ${report.readyToProve}; blocked ${report.blocked}; investigate ${report.investigate}; held ${report.held}; migration debt ${report.migrationDebt.length}`,
  );
  if (report.candidates.length === 0) return `${lines.join("\n")}\n`;
  lines.push("");
  for (const candidate of report.candidates) {
    renderCandidate(lines, candidate);
  }
  return `${lines.join("\n")}\n`;
}

function renderDecommissionedImportAudit(report: WorkspaceDecommissionedImportAudit): string {
  const lines: string[] = [];
  lines.push(`decommissioned import audit: ${report.violationCount} violation(s) across ${report.packageCount} package(s)`);
  lines.push(`decommissioned packages: ${report.decommissionedPackages.length === 0 ? "-" : report.decommissionedPackages.join(", ")}`);
  lines.push(`violating consumers: ${report.violatingConsumers.length === 0 ? "-" : report.violatingConsumers.join(", ")}`);
  if (report.violations.length === 0) return `${lines.join("\n")}\n`;
  lines.push("");
  for (const violation of report.violations.slice(0, 40)) {
    const symbol = violation.name === undefined ? violation.mode : `${violation.mode}:${violation.name}`;
    lines.push(`${violation.consumer} -> ${violation.provider}: ${violation.file} imports ${symbol} from ${violation.specifier}`);
  }
  if (report.violations.length > 40) lines.push(`... ${report.violations.length - 40} more violation(s)`);
  return `${lines.join("\n")}\n`;
}

function renderCandidate(lines: string[], candidate: PackageDecommissionCandidate): void {
  lines.push(`[${candidate.readiness}] ${candidate.package} (${candidate.layer}, ${candidate.lifecycle}/${candidate.maturity})`);
  if (candidate.packageDir !== null) lines.push(`  directory: ${candidate.packageDir}`);
  lines.push(`  investigation: ${candidate.investigationKind}`);
  if (candidate.investigationSignals.length > 0) {
    lines.push(`  signals: ${candidate.investigationSignals.join("; ")}`);
  }
  lines.push(`  reasons: ${candidate.reasons.length === 0 ? "-" : candidate.reasons.join(", ")}`);
  lines.push(`  blockers: ${candidate.blockers.length === 0 ? "-" : candidate.blockers.join(", ")}`);
  lines.push(`  runtime dependents: ${candidate.runtimeDependents.length === 0 ? "-" : candidate.runtimeDependents.join(", ")}`);
  if (candidate.declaredDependents.length > 0) {
    const shown = candidate.declaredDependents.slice(0, 5).map((edge) => `${edge.package}:${edge.kind}`);
    const suffix = candidate.declaredDependents.length > shown.length ? ` (+${candidate.declaredDependents.length - shown.length} more)` : "";
    lines.push(`  declared dependents: ${shown.join(", ")}${suffix}`);
  }
  lines.push(`  source consumers: ${candidate.sourceConsumers.length === 0 ? "-" : candidate.sourceConsumers.join(", ")}`);
  if (candidate.coarseSourceConsumers.length > 0) {
    lines.push(`  coarse source consumers: ${candidate.coarseSourceConsumers.join(", ")}`);
  }
  if (candidate.sourceMarkers.length > 0) {
    const shown = candidate.sourceMarkers.slice(0, 3).map((marker) => `${marker.file}:${marker.line}:${marker.term}`);
    const suffix = candidate.sourceMarkers.length > shown.length ? ` (+${candidate.sourceMarkers.length - shown.length} more)` : "";
    lines.push(`  source markers: ${shown.join(", ")}${suffix}`);
  }
  if (candidate.sourceImportFiles.length > 0) {
    const shown = candidate.sourceImportFiles.slice(0, 5).map((file) => {
      const specs = file.specifiers.slice(0, 3).join(", ");
      const suffix = file.specifiers.length > 3 ? `, +${file.specifiers.length - 3} more` : "";
      return `${file.file} (${file.imports} import${file.imports === 1 ? "" : "s"} from ${specs}${suffix})`;
    });
    const suffix = candidate.sourceImportFiles.length > shown.length ? ` (+${candidate.sourceImportFiles.length - shown.length} more file${candidate.sourceImportFiles.length - shown.length === 1 ? "" : "s"})` : "";
    lines.push(`  blocker files: ${shown.join("; ")}${suffix}`);
  }
  if (candidate.sourceImports.length > 0) {
    const shown = candidate.sourceImports.slice(0, 4).map((edge) => {
      const symbol = edge.name === undefined ? edge.mode : `${edge.mode}:${edge.name}`;
      return `${edge.file}: ${edge.consumer} imports ${symbol} from ${edge.specifier}`;
    });
    const suffix = candidate.sourceImports.length > shown.length ? ` (+${candidate.sourceImports.length - shown.length} more)` : "";
    lines.push(`  import blockers: ${shown.join("; ")}${suffix}`);
  }
  if (candidate.bins.length > 0) lines.push(`  bins: ${candidate.bins.join(", ")}`);
  if (candidate.exports > 0) lines.push(`  exports: ${candidate.exports}`);
  if (candidate.runtimeDependencies.length > 0) {
    lines.push(`  runtime deps: ${candidate.runtimeDependencies.join(", ")}`);
  }
  if (candidate.declaredDependencies.length > candidate.runtimeDependencies.length) {
    lines.push(`  declared deps: ${dependencyKindSummary(candidate.declaredDependencies)}`);
  }
  if (candidate.proofObligations.length > 0) {
    const shown = candidate.proofObligations.slice(0, 4).map((obligation) => `${obligation.kind}:${obligation.surface}`);
    const suffix = candidate.proofObligations.length > shown.length ? ` (+${candidate.proofObligations.length - shown.length} more)` : "";
    lines.push(`  proof: ${shown.join(", ")}${suffix}`);
  }
  if (candidate.proofEvidence.length > 0) {
    const shown = candidate.proofEvidence.slice(0, 4).map((evidence) => `${evidence.kind}:${evidence.state}`);
    const suffix = candidate.proofEvidence.length > shown.length ? ` (+${candidate.proofEvidence.length - shown.length} more)` : "";
    lines.push(`  proof evidence: ${shown.join(", ")}${suffix}`);
  }
  if (candidate.nextEvidence.length > 0) lines.push(`  next: ${candidate.nextEvidence[0]}`);
  lines.push("");
}

function dependencyKindSummary(deps: PackageDecommissionCandidate["declaredDependencies"]): string {
  const counts = new Map<string, number>();
  for (const dep of deps) counts.set(dep.kind, (counts.get(dep.kind) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([kind, count]) => `${kind}:${count}`).join(", ");
}

function readPackageSourceMarkers(root: string, exclude: readonly string[]): readonly PackageSourceMarker[] {
  const pattern = decommissionSourceMarkerPattern(DECOMMISSION_MARKER_TERMS);
  const markers: PackageSourceMarker[] = [];
  for (const found of eachWorkspacePackageDir(root, { exclude })) {
    const files = sourceModuleFiles(found.dir, { excludeDirs: ["data", "store", "working", "memory"] });
    for (const file of files) {
      let text: string;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const relative = path.relative(root, file).split(path.sep).join("/");
      const lines = text.split(/\r?\n/u);
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index]!;
        if (!isSourceCommentLine(line)) continue;
        const match = pattern.exec(line);
        if (match?.[1] === undefined) continue;
        const excerpt = line.trim().replace(/\s+/g, " ").slice(0, 160);
        const term = match[1].toLowerCase();
        if (!isActionableDecommissionSourceMarker(term, excerpt, relative)) continue;
        markers.push(Object.freeze({
          package: found.name,
          file: relative,
          line: index + 1,
          term,
          excerpt,
        }));
      }
    }
  }
  markers.sort((a, b) => a.package.localeCompare(b.package) || a.file.localeCompare(b.file) || a.line - b.line);
  return Object.freeze(markers);
}

function readPackageLocations(root: string, exclude: readonly string[]): readonly PackageDecommissionLocation[] {
  const locations = [...eachWorkspacePackageDir(root, { exclude })].map((found) => {
    const packageDir = path.relative(root, found.dir).split(path.sep).join("/");
    return Object.freeze({
      package: found.name,
      packageDir,
      manifestPath: `${packageDir}/package.json`,
    });
  });
  locations.sort((a, b) => a.package.localeCompare(b.package));
  return Object.freeze(locations);
}

function readRetirementProofEvidence(
  root: string,
  locations: readonly PackageDecommissionLocation[],
): readonly PackageRetirementProofEvidenceInput[] {
  const lockfile = readOptionalText(path.join(root, "pnpm-lock.yaml"));
  const gitmodules = readOptionalText(path.join(root, ".gitmodules"));
  const evidence: PackageRetirementProofEvidenceInput[] = [];

  for (const location of locations) {
    evidence.push({
      package: location.package,
      kind: "lockfile-importer",
      surface: "pnpm-lock.yaml",
      state: lockfile === undefined ? "requires-check" : lockfileHasImporter(lockfile, location.packageDir) ? "observed" : "absent",
      evidence: lockfile === undefined
        ? []
        : [lockfileHasImporter(lockfile, location.packageDir) ? `lockfile importer exists for ${location.packageDir}` : `no lockfile importer found for ${location.packageDir}`],
      gaps: lockfile === undefined ? ["pnpm-lock.yaml was not readable"] : ["remove or update this importer during an actual retirement"],
    });

    const localGit = path.join(root, location.packageDir, ".git");
    const moduleMetadata = path.join(root, ".git", "modules", ...location.packageDir.split("/"));
    const submoduleListed = gitmodules?.includes(`path = ${location.packageDir}`) === true;
    const localGitPresent = existsSync(localGit);
    const moduleMetadataPresent = existsSync(moduleMetadata);
    evidence.push({
      package: location.package,
      kind: "submodule-state",
      surface: ".gitmodules and package-local .git metadata",
      state: gitmodules === undefined ? "requires-check" : submoduleListed || localGitPresent || moduleMetadataPresent ? "observed" : "absent",
      evidence: [
        gitmodules === undefined ? ".gitmodules was not readable" : submoduleListed ? `.gitmodules lists ${location.packageDir}` : `.gitmodules does not list ${location.packageDir}`,
        localGitPresent ? `${location.packageDir}/.git exists` : `${location.packageDir}/.git is absent`,
        moduleMetadataPresent ? `.git/modules/${location.packageDir} exists` : `.git/modules/${location.packageDir} is absent`,
      ],
      gaps: submoduleListed || localGitPresent || moduleMetadataPresent
        ? ["submodule metadata must be deinitialized or retargeted during an actual retirement"]
        : [],
    });
  }

  return Object.freeze(evidence.map((item) => Object.freeze({
    ...item,
    evidence: Object.freeze([...item.evidence]),
    gaps: Object.freeze([...item.gaps]),
  })));
}

function readOptionalText(file: string): string | undefined {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
}

function lockfileHasImporter(lockfile: string, packageDir: string): boolean {
  return new RegExp(`\\n  ${escapeRegExp(packageDir)}:\\r?\\n`, "u").test(lockfile);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isSourceCommentLine(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");
}

async function workspaceMain(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const root = path.resolve(parsed.root ?? findRepoRoot(process.cwd()));

  if (parsed.command === undefined || parsed.command === "help" || parsed.command === "--help") {
    process.stdout.write([
      "jsnode-workspace graph [--focus <package>] [--up N] [--down N] [--json] [--root <repo>] [--exclude <pattern>]",
      "jsnode-workspace decommission [--focus <package>] [--include-unmarked-islands] [--no-source] [--no-source-markers] [--json] [--root <repo>] [--exclude <pattern>]",
      "jsnode-workspace decommissioned-imports [--json] [--fail] [--root <repo>] [--exclude <pattern>]",
      "jsnode-workspace turtle [--base <iri>] [--root <repo>] [--exclude <pattern>]",
      "",
    ].join("\n"));
    return;
  }

  const workspace = await discoverWorkspace(root, { exclude: parsed.exclude });

  if (parsed.command === "graph") {
    const full = workspaceDependencyGraph(workspace);
    const graph = parsed.focus === undefined
      ? full
      : egoGraph(full, parsed.focus, { upDepth: parsed.upDepth, downDepth: parsed.downDepth });
    process.stdout.write(parsed.json ? `${JSON.stringify(graph, null, 2)}\n` : renderGraph(graph, parsed.focus));
    return;
  }

  if (parsed.command === "decommission") {
    const graph = workspaceDependencyGraph(workspace);
    const consumption = parsed.source ? workspaceConsumptionIndex(root, { exclude: parsed.exclude }) : undefined;
    const sourceMarkers = parsed.sourceMarkers ? readPackageSourceMarkers(root, parsed.exclude) : undefined;
    const packageLocations = readPackageLocations(root, parsed.exclude);
    const proofEvidence = readRetirementProofEvidence(root, packageLocations);
    const report = workspaceDecommissionReadiness(workspace, graph, consumption, {
      corePackages: JSNODE_CORE_PACKAGES,
      includeUnmarkedIslands: parsed.includeUnmarkedIslands,
      markerTerms: DECOMMISSION_MARKER_TERMS,
      packageLocations,
      proofEvidence,
      ...(parsed.focus === undefined ? {} : { focus: [parsed.focus] }),
      ...(sourceMarkers === undefined ? {} : { sourceMarkers }),
    });
    process.stdout.write(parsed.json ? `${JSON.stringify(report, null, 2)}\n` : renderDecommission(report));
    return;
  }

  if (parsed.command === "decommissioned-imports" || parsed.command === "audit") {
    const consumption = workspaceConsumptionIndex(root, { exclude: parsed.exclude });
    const report = workspaceDecommissionedImportAudit(workspace, consumption);
    process.stdout.write(parsed.json ? `${JSON.stringify(report, null, 2)}\n` : renderDecommissionedImportAudit(report));
    if (parsed.fail && report.violationCount > 0) process.exitCode = 1;
    return;
  }

  if (parsed.command === "turtle") {
    process.stdout.write(workspaceTurtle(workspace, parsed.base === undefined ? {} : { base: parsed.base }));
    return;
  }

  throw new TypeError(`unknown command ${parsed.command}`);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  workspaceMain().catch((error: unknown) => {
    process.stderr.write(`jsnode-workspace: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
