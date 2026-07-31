#!/usr/bin/env node
/**
 * jsnode-computer CLI — read the package ecosystem from the command line.
 *
 *   workspace [--format json|names|descriptions]   list every package
 *   search <term>                                  rank packages by name>tag>description
 *   describe <name> [--api]                        one package's coordinates (+ API surface)
 *   find-type <substring>                          types across the ecosystem whose name matches
 *   functions-taking <type>                        functions whose domain mentions a type
 *   functions-producing <type>                     functions whose codomain mentions a type
 *   consumers <pkg> [symbol]                        who imports a package (or one symbol of it)
 *   uses <pkg>                                     what a package consumes, as typed uses-* edges
 *   unused-exports <pkg>                           exported functions/classes nothing imports
 *   deprecated-unused                              sweep deprecated packages for unused exports
 *
 * All commands accept --root <dir>; it defaults to the repo root above cwd.
 * All commands accept --exclude <name-pattern> (repeatable) to drop packages
 * from every view — exact names, or `*` wildcards (`@scope/*-experimental`).
 * The type queries read every package's built `dist` — build packages to make
 * them legible. Type matching is substring (so `JsType` also finds
 * `JsType | undefined`), which keeps compound types visible at the cost of
 * exactness.
 */
import process from "node:process";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  discoverWorkspace,
  readJSNodePackage,
  eachWorkspacePackageDir,
  type JSNodeWorkspace,
} from "./workspace.mjs";
import { workspaceTypeIndex } from "./type-index.mjs";
import { auditPackageBoundary } from "./boundary.mjs";
import {
  workspaceConsumptionIndex,
  discoverPackageDirs,
  consumersOfSymbol,
  coarseConsumersOfPackage,
  exportedFunctionsAndClasses,
  classifyUnusedExports,
  resolveConsumptionEdges,
} from "./consumption.mjs";
import {
  searchPackages,
  usesFunctionPredicate,
  usesTypePredicate,
  usesPackagePredicate,
  type ConsumptionEdge,
} from "@emsenn/jsnode/topology";

function usesPredicateOf(kind: ConsumptionEdge["kind"]): string {
  if (kind === "function") return usesFunctionPredicate();
  if (kind === "type") return usesTypePredicate();
  return usesPackagePredicate();
}

// Find a package's directory by exact name, honouring the run's exclusions.
function locatePackageDir(root: string, name: string, exclude: readonly string[]): string | undefined {
  for (const pkg of eachWorkspacePackageDir(root, { exclude })) {
    if (pkg.name === name) return pkg.dir;
  }
  return undefined;
}

// Resolve a user-typed package operand (full `@scope/name` or the unscoped tail)
// to the canonical workspace package name, plus its directory.
function resolvePackage(
  root: string,
  operand: string,
  exclude: readonly string[],
): { name: string; dir: string } | undefined {
  const packages = discoverPackageDirs(root, { exclude });
  return (
    packages.find((p) => p.name === operand) ??
    packages.find((p) => p.name.endsWith(`/${operand}`))
  );
}

function findRepoRoot(from: string): string | undefined {
  let dir = path.resolve(from);
  while (true) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

function usage(): string {
  return [
    "usage: jsnode-computer <command> [--root <dir>] [--exclude <name-pattern>]...",
    "  workspace [--format json|names|descriptions]",
    "  search <term>",
    "  describe <name> [--api]",
    "  find-type <substring>",
    "  functions-taking <type>",
    "  functions-producing <type>",
    "  consumers <pkg> [symbol]",
    "  uses <pkg>",
    "  unused-exports <pkg>",
    "  deprecated-unused",
    "  boundary [dir]                                 audit a package's dist/src boundary (default: cwd)",
    "",
  ].join("\n");
}

type Format = "json" | "names" | "descriptions";

interface ParsedArgs {
  command: string;
  operand: string | undefined;
  operand2: string | undefined;
  root: string | undefined;
  format: Format;
  api: boolean;
  help: boolean;
  exclude: string[];
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  let command = "";
  let operand: string | undefined;
  let operand2: string | undefined;
  let root: string | undefined;
  let format: Format = "json";
  let api = false;
  let help = false;
  const exclude: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    if (arg === "--help" || arg === "-h") help = true;
    else if (arg === "--api") api = true;
    else if (arg === "--root") root = argv[++i];
    else if (arg === "--exclude") {
      const p = argv[++i];
      if (p !== undefined && p !== "") exclude.push(p);
    } else if (arg === "--format") {
      const f = argv[++i];
      if (f === "json" || f === "names" || f === "descriptions") format = f;
      else throw new Error(`--format must be json, names, or descriptions; got: ${String(f)}`);
    } else if (!arg.startsWith("--")) {
      if (command === "") command = arg;
      else if (operand === undefined) operand = arg;
      else if (operand2 === undefined) operand2 = arg;
    }
  }
  return { command, operand, operand2, root, format, api, help, exclude };
}

function formatWorkspace(workspace: JSNodeWorkspace, format: Format): string {
  if (format === "names") return workspace.packages.map((p) => p.name).join("\n") + "\n";
  if (format === "descriptions") {
    return workspace.packages.map((p) => `${p.name}\t${p.description}`).join("\n") + "\n";
  }
  return JSON.stringify(workspace.packages, null, 2) + "\n";
}

function requireOperand(parsed: ParsedArgs): string {
  if (parsed.operand === undefined || parsed.operand === "") {
    throw new Error(`${parsed.command} needs an argument\n${usage()}`);
  }
  return parsed.operand;
}

export async function runCli(
  argv: readonly string[] = process.argv.slice(2),
  io: { cwd?: string; stdout?: { write(s: string): void }; stderr?: { write(s: string): void } } = {},
): Promise<number> {
  const out = io.stdout ?? process.stdout;
  const err = io.stderr ?? process.stderr;
  try {
    const parsed = parseArgs(argv);
    if (parsed.help || parsed.command === "") {
      out.write(usage());
      return parsed.help ? 0 : 1;
    }
    const cwd = io.cwd ?? process.cwd();
    const root = parsed.root !== undefined ? path.resolve(cwd, parsed.root) : findRepoRoot(cwd);
    if (root === undefined) throw new Error("could not locate repo root (no pnpm-workspace.yaml found)");
    const exclude = parsed.exclude;

    switch (parsed.command) {
      case "boundary": {
        const dir = path.resolve(cwd, parsed.operand ?? ".");
        const result = await auditPackageBoundary(dir);
        if (result.ok) {
          out.write(`${result.name}: package boundary ok\n`);
          return 0;
        }
        err.write(`${result.name} has package-boundary failures:\n${result.failures.map((f) => `- ${f}`).join("\n")}\n`);
        return 1;
      }
      case "workspace": {
        const workspace = await discoverWorkspace(root, { exclude });
        out.write(formatWorkspace(workspace, parsed.format));
        return 0;
      }
      case "search": {
        const term = requireOperand(parsed);
        const workspace = await discoverWorkspace(root, { exclude });
        const matches = searchPackages(workspace.packages, term);
        if (matches.length === 0) {
          out.write(`no package matches "${term}"\n`);
          return 0;
        }
        for (const m of matches) {
          const where = m.field === "tag" ? `tag:${m.tag ?? ""}` : m.field;
          out.write(`[${where}] ${m.package.name}\n    ${m.package.description}\n`);
        }
        return 0;
      }
      case "describe": {
        const name = requireOperand(parsed);
        const workspace = await discoverWorkspace(root, { exclude });
        const found = workspace.packages.find((p) => p.name === name || p.name.endsWith(`/${name}`));
        if (!found) {
          out.write(`no package named "${name}"\n`);
          return 1;
        }
        // re-read with introspection when --api is asked, by locating its dir.
        let pkg = found;
        if (parsed.api) {
          const dir = locatePackageDir(root, found.name, exclude);
          const detail = dir ? await readJSNodePackage(dir, { introspect: true }) : undefined;
          if (detail) pkg = detail;
        }
        out.write(`${pkg.name}  (${pkg.layer})\n`);
        out.write(`  ${pkg.description}\n`);
        if (pkg.tags.length) out.write(`  tags: ${pkg.tags.join(", ")}\n`);
        out.write(`  exports: ${pkg.exports.join(", ") || "(none)"}\n`);
        out.write(`  depends-on: ${pkg.dependencies.join(", ") || "(none)"}\n`);
        if (pkg.api) {
          out.write(`  types (${pkg.api.types.length}): ${pkg.api.types.map((t) => `${t.name}:${t.kind}`).join(", ")}\n`);
          out.write(`  functions (${pkg.api.functions.length}): ${pkg.api.functions.map((f) => f.name).join(", ")}\n`);
        } else if (parsed.api) {
          out.write(`  (no API surface — package has no built dist; run its build)\n`);
        }
        return 0;
      }
      case "find-type": {
        const needle = requireOperand(parsed).toLowerCase();
        const index = workspaceTypeIndex(root, { exclude });
        const hits = index.types.filter((t) => t.name.toLowerCase().includes(needle));
        if (hits.length === 0) {
          out.write(`no exported type matches "${needle}"\n`);
          return 0;
        }
        for (const t of hits) out.write(`${t.pkg} : ${t.name} (${t.kind})\n`);
        return 0;
      }
      case "functions-taking":
      case "functions-producing": {
        const needle = requireOperand(parsed);
        const index = workspaceTypeIndex(root, { exclude });
        const taking = parsed.command === "functions-taking";
        const hits = index.functions.filter((f) =>
          taking
            ? f.domain.some((d) => d.includes(needle))
            : f.codomain !== undefined && f.codomain.includes(needle),
        );
        if (hits.length === 0) {
          out.write(`no function ${taking ? "takes" : "produces"} a type matching "${needle}"\n`);
          return 0;
        }
        for (const f of hits) {
          const cod = f.codomain !== undefined ? ` -> ${f.codomain}` : "";
          out.write(`${f.pkg} : ${f.name}(${f.domain.join(", ")})${cod}\n`);
        }
        return 0;
      }
      case "consumers": {
        const operand = requireOperand(parsed);
        const resolved = resolvePackage(root, operand, exclude);
        if (!resolved) {
          out.write(`no package named "${operand}"\n`);
          return 1;
        }
        const index = workspaceConsumptionIndex(root, { exclude });
        const symbol = parsed.operand2;
        if (symbol !== undefined && symbol !== "") {
          const consumers = consumersOfSymbol(index, resolved.name, symbol);
          if (consumers.length === 0) {
            out.write(`nothing imports ${resolved.name}:${symbol}\n`);
          } else {
            out.write(`${consumers.length} package(s) import ${resolved.name}:${symbol}\n`);
            for (const c of consumers) {
              out.write(`  ${c.consumer}${c.typeOnly ? " (type-only)" : ""}\n`);
            }
          }
          const coarse = coarseConsumersOfPackage(index, resolved.name);
          if (coarse.length > 0) {
            out.write(`  + ${coarse.length} package(s) reach ${resolved.name} via namespace/star/dynamic import — usage of ${symbol} indeterminate\n`);
          }
          return 0;
        }
        // No symbol: every named symbol consumed, plus coarse reaches.
        const named = new Map<string, Set<string>>();
        for (const e of index.edges) {
          if (e.provider !== resolved.name || e.name === undefined) continue;
          let s = named.get(e.name);
          if (!s) named.set(e.name, (s = new Set()));
          s.add(e.consumer);
        }
        const coarse = coarseConsumersOfPackage(index, resolved.name);
        if (named.size === 0 && coarse.length === 0) {
          out.write(`nothing in the workspace imports ${resolved.name}\n`);
          return 0;
        }
        for (const [name, consumers] of [...named].sort((a, b) => a[0].localeCompare(b[0]))) {
          out.write(`${name}: ${[...consumers].sort().join(", ")}\n`);
        }
        if (coarse.length > 0) {
          out.write(`(coarse) ${coarse.map((c) => `${c.consumer}:${c.mode}`).join(", ")}\n`);
        }
        return 0;
      }
      case "uses": {
        const operand = requireOperand(parsed);
        const resolved = resolvePackage(root, operand, exclude);
        if (!resolved) {
          out.write(`no package named "${operand}"\n`);
          return 1;
        }
        // The demand half of the graph, classified against the supply half:
        // each edge is the same uses-function/uses-type/uses-package utterance
        // the topology settles, rendered as `consumer  predicate  provider:name`.
        const index = workspaceConsumptionIndex(root, { exclude });
        const typeIndex = workspaceTypeIndex(root, { exclude });
        const edges = resolveConsumptionEdges(index, typeIndex).filter((e) => e.consumer === resolved.name);
        if (edges.length === 0) {
          out.write(`${resolved.name} consumes nothing from the workspace\n`);
          return 0;
        }
        const lines = new Set<string>();
        for (const e of edges) {
          const object = e.name !== undefined ? `${e.provider}:${e.name}` : e.provider;
          lines.add(`${usesPredicateOf(e.kind)}  ${object}`);
        }
        for (const line of [...lines].sort()) out.write(`${line}\n`);
        return 0;
      }
      case "unused-exports": {
        const operand = requireOperand(parsed);
        const resolved = resolvePackage(root, operand, exclude);
        if (!resolved) {
          out.write(`no package named "${operand}"\n`);
          return 1;
        }
        const built = existsSync(path.join(resolved.dir, "dist"));
        if (!built) {
          out.write(`${resolved.name} has no built dist — cannot read its exports; run its build first\n`);
          return 1;
        }
        const index = workspaceConsumptionIndex(root, { exclude });
        const typeIndex = workspaceTypeIndex(root, { exclude });
        const exports = exportedFunctionsAndClasses(typeIndex, resolved.name);
        const report = classifyUnusedExports(index, resolved.name, exports, built);
        if (report.indeterminate) {
          const coarse = coarseConsumersOfPackage(index, resolved.name);
          out.write(`${resolved.name}: usage-indeterminate — reached by ${coarse.map((c) => `${c.consumer}:${c.mode}`).join(", ")}\n`);
          out.write(`  cannot certify any of its ${exports.length} export(s) unused\n`);
          return 0;
        }
        if (exports.length === 0) {
          out.write(`${resolved.name} exports no functions or classes\n`);
          return 0;
        }
        if (report.unused.length === 0) {
          out.write(`${resolved.name}: all ${exports.length} exported functions/classes are imported somewhere\n`);
          return 0;
        }
        out.write(`${resolved.name}: ${report.unused.length}/${exports.length} exported functions/classes have no importer\n`);
        for (const s of report.unused) out.write(`  ${s.kind} ${s.name}\n`);
        return 0;
      }
      case "deprecated-unused": {
        const workspace = await discoverWorkspace(root, { exclude });
        const deprecated = workspace.packages.filter((p) => p.tags.includes("deprecated"));
        if (deprecated.length === 0) {
          out.write(`no package carries the "deprecated" keyword\n`);
          return 0;
        }
        const index = workspaceConsumptionIndex(root, { exclude });
        const typeIndex = workspaceTypeIndex(root, { exclude });
        out.write(`${deprecated.length} deprecated package(s):\n\n`);
        for (const pkg of deprecated) {
          const dir = locatePackageDir(root, pkg.name, exclude);
          const built = dir ? existsSync(path.join(dir, "dist")) : false;
          if (!built) {
            out.write(`${pkg.name} — NOT BUILT; cannot read exports (run its build to analyze)\n\n`);
            continue;
          }
          const exports = exportedFunctionsAndClasses(typeIndex, pkg.name);
          const report = classifyUnusedExports(index, pkg.name, exports, built);
          if (report.indeterminate) {
            const coarse = coarseConsumersOfPackage(index, pkg.name);
            out.write(`${pkg.name} — usage-indeterminate (reached by ${coarse.map((c) => `${c.consumer}:${c.mode}`).join(", ")}); cannot certify unused\n\n`);
            continue;
          }
          if (report.unused.length === 0) {
            out.write(`${pkg.name} — every exported function/class still has an importer\n\n`);
            continue;
          }
          out.write(`${pkg.name} — ${report.unused.length}/${exports.length} exports importable for removal:\n`);
          for (const s of report.unused) out.write(`  ${s.kind} ${s.name}\n`);
          out.write("\n");
        }
        return 0;
      }
      default:
        throw new Error(usage());
    }
  } catch (error) {
    err.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function isMain(): boolean {
  return process.argv[1] !== undefined &&
    new URL(import.meta.url).pathname === path.resolve(process.argv[1]);
}

if (isMain()) {
  runCli().then(
    (code) => { process.exitCode = code; },
    (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    },
  );
}
