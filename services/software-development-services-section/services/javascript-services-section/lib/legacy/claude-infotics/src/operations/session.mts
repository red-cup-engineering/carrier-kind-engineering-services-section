/**
 * operations/session — the coding-agent session computer (#15), as operations
 * over the platform's own substrate. No retired stack, no re-implemented store:
 *
 *   claude-finding  — append a durable finding (subject/predicate/note) to the
 *                     journal as an EAVT row (openJournal().appendRows)
 *   claude-recall   — recall findings for a subject (journal.scanCausalTerritory)
 *   claude-impact   — git change-impact: changed files → their reverse-dependents
 *                     (readGitWorkspaceChange + readModuleTopology `importedBy`)
 *
 * A finding is one EAVT datum `[subject, "claude.finding", {predicate,note}, at]`;
 * recall folds the causal territory back, filtered by subject. This is the same
 * journal MetroPlat witnesses every operation through — findings are first-class
 * causal matter, not a side file.
 */
import process from "node:process";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { operation, type Operation } from "@red-cup-engineering/metroplat/operations";
import { openJournal, journal } from "@red-cup-engineering/metroplat/journal";
import { readGitWorkspaceChange } from "@red-cup-engineering/metroplat/integrations/git";
import { readModuleTopology } from "@red-cup-engineering/metroplat/monitoring";
import type { FilesystemBinding } from "@red-cup-engineering/metroplat/integrations/filesystem";

const FINDINGS_FEED = "claude-findings";
const FINDING_ATTR = "claude.finding";

function str(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function merge(input: unknown, args: Record<string, unknown>): Record<string, unknown> {
  return { ...(isRecord(input) ? input : {}), ...args };
}

/**
 * The git repository root at or above `from`. Needed because `git status
 * --porcelain` reports paths relative to the REPO root, while module topology
 * reports them relative to the read root — matching the two demands a common
 * (absolute) basis, not a raw string compare.
 */
export function gitRepoRoot(from: string): string {
  let dir = path.resolve(from);
  for (;;) {
    if (existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(from);
    dir = parent;
  }
}

/** The nearest package.json at or above `from`, bounded by `stopAt`. */
export function nearestPackage(from: string, stopAt: string): { readonly dir: string; readonly name?: string; readonly scripts: Record<string, unknown> } | undefined {
  const ceiling = path.resolve(stopAt);
  let dir = path.resolve(from);
  for (;;) {
    const manifest = path.join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        const parsed = JSON.parse(readFileSync(manifest, "utf8")) as Record<string, unknown>;
        const name = typeof parsed["name"] === "string" ? parsed["name"] : undefined;
        const scripts = isRecord(parsed["scripts"]) ? parsed["scripts"] : {};
        return { dir, ...(name === undefined ? {} : { name }), scripts };
      } catch { /* unreadable manifest — keep walking */ }
    }
    if (dir === ceiling) return undefined;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

const IMPACT_SCRIPTS = ["check", "test", "build"] as const;

/**
 * Commands worth running for the affected files: for each owning package, the
 * subset of check/test/build it actually declares. Derived from real manifests,
 * not guessed — a package with no `test` script is never told to run one.
 */
export function suggestedCommands(affectedAbsolute: readonly string[], repoRoot: string): readonly string[] {
  const byDir = new Map<string, { name?: string; scripts: Record<string, unknown> }>();
  for (const file of affectedAbsolute) {
    const pkg = nearestPackage(file, repoRoot);
    if (pkg !== undefined && !byDir.has(pkg.dir)) byDir.set(pkg.dir, { ...(pkg.name === undefined ? {} : { name: pkg.name }), scripts: pkg.scripts });
  }
  const commands: string[] = [];
  for (const [dir, pkg] of [...byDir.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const target = pkg.name !== undefined ? `--filter ${pkg.name}` : `-C ${path.relative(repoRoot, dir) || "."}`;
    for (const script of IMPACT_SCRIPTS) {
      if (typeof pkg.scripts[script] === "string") commands.push(`pnpm ${target} ${script}`);
    }
  }
  return Object.freeze(commands);
}

/** The session-computer operations. (Named to avoid clashing with the platform's
 *  own `claudeSessionOperations`, which reads transcripts and is reused as-is.) */
export function claudeSessionComputerOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "claude-finding",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Record a durable session finding to the journal (append-only).",
      description: "Options: --subject (required), --predicate (required), --note. Stored as an EAVT row for later recall.",
      options: Object.freeze(["subject", "predicate", "note"]),
      run: (input: unknown, args: Record<string, unknown>): unknown => {
        const record = merge(input, args);
        const subject = str(record, "subject");
        const predicate = str(record, "predicate");
        if (subject === undefined || predicate === undefined) {
          return Object.freeze({ ok: false, error: "claude-finding: --subject and --predicate are required" });
        }
        const at = new Date().toISOString();
        const note = str(record, "note");
        const value = Object.freeze({ kind: FINDING_ATTR, predicate, ...(note === undefined ? {} : { note }) });
        const row = [subject, FINDING_ATTR, value, at] as const;
        const result = openJournal(binding.dataRoot).appendRows(
          FINDINGS_FEED,
          Object.freeze([row]),
          { at, subject: FINDINGS_FEED },
        );
        return Object.freeze({ ok: true, subject, predicate, at, rows: result.rows });
      },
    }),

    operation({
      verb: "claude-recall",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Recall the durable findings recorded for a subject.",
      description: "Options: --subject (required). Folds the journal's causal territory back to this subject's findings.",
      options: Object.freeze(["subject"]),
      run: (input: unknown, args: Record<string, unknown>): unknown => {
        const record = merge(input, args);
        const subject = str(record, "subject");
        if (subject === undefined) return Object.freeze({ ok: false, error: "claude-recall: --subject is required" });
        const folded = journal.scanCausalTerritory(binding.dataRoot, [] as Record<string, unknown>[], (acc, row) => {
          const value = row[2];
          if (row[0] === subject && isRecord(value) && value["kind"] === FINDING_ATTR) {
            acc.push({ predicate: value["predicate"], ...(value["note"] === undefined ? {} : { note: value["note"] }), at: row[3] });
          }
          return acc;
        });
        return Object.freeze({ ok: true, subject, count: folded.result.length, findings: folded.result });
      },
    }),

    operation({
      verb: "claude-impact",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Git change-impact: changed files and their reverse-dependents.",
      description: "Options: --root (default: package root). Composes git worktree change with the module reverse-dependency graph (importedBy). Git paths (repo-relative) and module paths (root-relative) are matched on a common absolute basis.",
      options: Object.freeze(["root"]),
      run: (input: unknown, args: Record<string, unknown>): unknown => {
        const record = merge(input, args);
        const root = path.resolve(str(record, "root") ?? binding.packageRoot ?? process.cwd());
        const change = readGitWorkspaceChange(root);
        const repoRoot = gitRepoRoot(root);
        // git reports repo-relative; topology reports root-relative — compare absolutes.
        const changedAbsolute = new Set(change.files.map((file) => path.resolve(repoRoot, file.path)));
        const topology = readModuleTopology(root) as { readonly modules?: readonly { readonly path: string; readonly importedBy?: readonly string[] }[] };
        const modules = topology.modules ?? [];
        const changedModules = modules.filter((module) => changedAbsolute.has(path.resolve(root, module.path)));
        const dependents = new Set<string>();
        for (const module of changedModules) for (const dep of module.importedBy ?? []) dependents.add(dep);
        // Commands are derived from the affected packages' real manifests.
        const affected = [
          ...changedModules.map((module) => path.resolve(root, module.path)),
          ...[...dependents].map((dep) => path.resolve(root, dep)),
        ];
        return Object.freeze({
          ok: change.ok,
          root,
          repoRoot,
          changedFiles: change.files.length,
          changedModules: changedModules.map((module) => module.path),
          dependents: [...dependents].sort(),
          suggestedCommands: suggestedCommands(affected, repoRoot),
          evidence: Object.freeze(["boundary:process-command", "read:module-topology", "read:package-manifests"]),
        });
      },
    }),
  ]);
}
