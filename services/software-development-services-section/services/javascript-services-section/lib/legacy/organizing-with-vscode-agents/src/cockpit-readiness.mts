/**
 * Cockpit readiness evaluation. A cockpit declares readiness checks; this module
 * evaluates each against the workspace through a provider-supplied observer
 * registry. Generic observer builders (workspace visibility, MCP/LSP config) live
 * here; provider packages add their own (e.g. upstream-package-built).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { CockpitReadinessCheck, VsCodeAgentCockpit } from "./cockpit.mjs";

export type CockpitReadinessStatus = "pass" | "fail";

export type CockpitReadinessObservation = Readonly<{
  observed: readonly string[];
  missing: readonly string[];
}>;

export type CockpitReadinessObserver = (root: string) => CockpitReadinessObservation;

export type CockpitReadinessObservers = Readonly<Record<string, CockpitReadinessObserver>>;

export type CockpitReadinessEvaluation = Readonly<{
  kind: "organizing.vscode.readiness-evaluation";
  check: CockpitReadinessCheck;
  status: CockpitReadinessStatus;
  observed: readonly string[];
  missing: readonly string[];
}>;

export type CockpitReadinessReport = Readonly<{
  kind: "organizing.vscode.readiness-report";
  subject: string;
  status: CockpitReadinessStatus;
  root: string;
  evaluations: readonly CockpitReadinessEvaluation[];
}>;

export type EvaluateCockpitReadinessOptions = Readonly<{
  root: string;
  cockpit: VsCodeAgentCockpit;
  observers: CockpitReadinessObservers;
}>;

export function readText(root: string, relativePath: string): string | null {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, "utf8");
}

export function fileExists(root: string, relativePath: string): boolean {
  return existsSync(path.join(root, relativePath));
}

export function validJson(root: string, relativePath: string): boolean {
  const text = readText(root, relativePath);
  if (text === null) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function observation(observed: string[], missing: string[]): CockpitReadinessObservation {
  return Object.freeze({ observed: Object.freeze(observed), missing: Object.freeze(missing) });
}

/** Observe that `pnpm-workspace.yaml` exists and lists each required package path. */
export function workspaceVisibleObserver(requiredPackages: readonly string[]): CockpitReadinessObserver {
  return (root) => {
    const workspace = readText(root, "pnpm-workspace.yaml");
    const observed: string[] = [];
    const missing: string[] = [];
    if (workspace === null) {
      missing.push("pnpm-workspace.yaml");
      return observation(observed, missing);
    }
    observed.push("pnpm-workspace.yaml");
    for (const workspacePackage of requiredPackages) {
      if (workspace.includes(workspacePackage)) observed.push(`workspace package: ${workspacePackage}`);
      else missing.push(`workspace package: ${workspacePackage}`);
    }
    return observation(observed, missing);
  };
}

/** Observe that the listed MCP/LSP attachment files are present and valid JSON. */
export function mcpConfiguredObserver(
  configPaths: readonly string[] = [".mcp.json", ".lsp-mcp.json", ".vscode/mcp.json"],
): CockpitReadinessObserver {
  return (root) => {
    const observed: string[] = [];
    const missing: string[] = [];
    for (const configPath of configPaths) {
      if (validJson(root, configPath)) observed.push(`valid JSON: ${configPath}`);
      else missing.push(`valid JSON: ${configPath}`);
    }
    return observation(observed, missing);
  };
}

export function evaluateCockpitReadiness(options: EvaluateCockpitReadinessOptions): CockpitReadinessReport {
  const root = path.resolve(options.root);
  const evaluations = options.cockpit.readinessChecks.map((check) => {
    const observer = options.observers[check.id];
    const observed = observer
      ? observer(root)
      : observation([], [`no evaluator for readiness check: ${check.id}`]);
    return Object.freeze({
      kind: "organizing.vscode.readiness-evaluation" as const,
      check,
      status: observed.missing.length === 0 ? "pass" : "fail",
      observed: observed.observed,
      missing: observed.missing,
    } satisfies CockpitReadinessEvaluation);
  });
  return Object.freeze({
    kind: "organizing.vscode.readiness-report" as const,
    subject: options.cockpit.subject,
    status: evaluations.every((evaluation) => evaluation.status === "pass") ? "pass" : "fail",
    root: path.basename(root),
    evaluations: Object.freeze(evaluations),
  });
}
