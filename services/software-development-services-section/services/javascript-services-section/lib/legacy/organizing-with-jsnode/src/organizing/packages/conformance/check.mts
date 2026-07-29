// Package quality readings over a JSNode package directory.
//
// This module is intentionally a library surface, not a package-local script
// convention. It reads package/source evidence and returns charged findings.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { differential } from "@emsenn/relating/analysis";
import { INVARIANTS } from "@emsenn/561-group-conformance-algebra";
import { sourceModuleFiles } from "../../modules/source.mjs";
import { readJSNodePackageManifest } from "../../workspaces/workspace.mjs";
import { detectPackageKind, type PackageKind } from "../kind.mjs";
import { CONFORMANCE_LAYERS, type ConformanceLayer } from "./layer.mjs";

export type PackageLintReport = Readonly<{
  packageDir: string;
  layer: ConformanceLayer;
  packageKind: PackageKind;
  findings: readonly Finding[];
  settled: Readonly<Record<string, number>>;
}>;

export type CheckReport = PackageLintReport;
type Finding = differential.Finding;
type Norm = differential.Norm;
const { finding } = differential;

type Manifest = Readonly<Record<string, unknown>>;
export type { PackageKind } from "../kind.mjs";

function inv(id: string): Norm {
  const found = INVARIANTS.find((i) => i.id === id);
  if (found === undefined) throw new TypeError(`unknown invariant ${id}`);
  return found;
}

export function layerOf(packageDir: string): ConformanceLayer {
  const parent = path.basename(path.dirname(path.resolve(packageDir)));
  const layer = CONFORMANCE_LAYERS.find((l) => l === parent);
  if (layer === undefined) {
    throw new TypeError(
      `package directory ${packageDir} is not under lib/, apps/, services/, or sites/`,
    );
  }
  return layer;
}

function checkManifest(dir: string, manifest: Manifest, layer: ConformanceLayer, kind: PackageKind): Finding[] {
  const out: Finding[] = [];
  const dirName = path.basename(path.resolve(dir));
  const name = manifest["name"];
  const expectedNames = kind === "content-records"
    ? [`@emsenn/${dirName}`, `@emsenn/${dirName}-content`]
    : [`@emsenn/${dirName}`];

  if (typeof name !== "string" || !/^@emsenn\/.+$/.test(name)) {
    out.push(finding(inv("M1"), "active", `name ${String(name)} is not @emsenn/<dir>`));
  } else if (!expectedNames.includes(name)) {
    out.push(finding(inv("M1"), "active", `name ${name} does not match ${expectedNames.join(" or ")}`));
  } else {
    out.push(finding(inv("M1"), "potential", `name ${name} matches ${kind} package identity`));
  }

  const m2Faults: string[] = [];
  if (manifest["private"] !== true) m2Faults.push("private is not true");
  if (kind === "jsnode") {
    if (manifest["type"] !== "module") m2Faults.push('type is not "module"');
    if (manifest["sideEffects"] !== false) m2Faults.push("sideEffects is not false");
  } else if (kind === "emacs-app" || kind === "site-scaffold") {
    if (manifest["type"] !== undefined && manifest["type"] !== "module") {
      m2Faults.push('type is present but not "module"');
    }
  } else if (manifest["type"] !== undefined && manifest["type"] !== "module") {
    m2Faults.push('type is present but not "module"');
  }
  out.push(m2Faults.length > 0
    ? finding(inv("M2"), "active", m2Faults.join("; "))
    : finding(inv("M2"), "potential", kind === "jsnode"
      ? "module, private, side-effect-free"
      : kind === "content-records"
        ? "private content package; no JavaScript side-effect boundary required"
        : kind === "emacs-app"
          ? "private Emacs application package; no JavaScript side-effect boundary required"
          : "private scaffold package; no JavaScript side-effect boundary required"));

  if (kind !== "jsnode") {
    out.push(finding(inv("M3"), "potential",
      kind === "content-records"
        ? "content records are the boundary; no JS exports map required"
        : kind === "emacs-app"
          ? "Emacs lisp/bin/files are the boundary; no JS exports map required"
          : "scaffold prose is the boundary until source exists; no JS exports map required"));
    if (kind === "content-records") {
      out.push(finding(inv("M4"), "potential", "content package has no JS lifecycle script requirement"));
      return out;
    }
    if (kind === "site-scaffold") {
      const scripts = (manifest["scripts"] ?? {}) as Readonly<Record<string, unknown>>;
      const declared = Object.keys(scripts);
      out.push(declared.length > 0
        ? finding(inv("M4"), "active", `scaffold declares lifecycle scripts before implementation exists: ${declared.join(", ")}`)
        : finding(inv("M4"), "potential", "scaffold package has no lifecycle scripts until implementation exists"));
      return out;
    }
    const scripts = (manifest["scripts"] ?? {}) as Readonly<Record<string, unknown>>;
    const wanted = ["check", "test"];
    const absent = wanted.filter((s) => typeof scripts[s] !== "string");
    out.push(absent.length > 0
      ? finding(inv("M4"), "active", `missing scripts: ${absent.join(", ")}`)
      : finding(inv("M4"), "potential", `scripts present: ${wanted.join(", ")}`));
    return out;
  }

  const exportsMap = manifest["exports"];
  if (typeof exportsMap !== "object" || exportsMap === null) {
    out.push(finding(inv("M3"), "active", "no exports map"));
  } else {
    const keys = Object.keys(exportsMap);
    const missing = [".", "./package.json"].filter((k) => !keys.includes(k));
    out.push(missing.length > 0
      ? finding(inv("M3"), "active", `exports map missing ${missing.join(", ")}`)
      : finding(inv("M3"), "potential", `exports map declares ${keys.length} boundary points`));
  }

  const scripts = (manifest["scripts"] ?? {}) as Readonly<Record<string, unknown>>;
  const wanted = layer === "lib" ? ["check", "test", "verify"] : ["check", "test"];
  const absent = wanted.filter((s) => typeof scripts[s] !== "string");
  out.push(absent.length > 0
    ? finding(inv("M4"), "active", `missing scripts: ${absent.join(", ")}`)
    : finding(inv("M4"), "potential", `scripts present: ${wanted.join(", ")}`));

  return out;
}

function checkLayering(dir: string, manifest: Manifest, layer: ConformanceLayer, repoRoot: string): Finding[] {
  const out: Finding[] = [];
  const deps = Object.entries((manifest["dependencies"] ?? {}) as Record<string, string>);
  const workspaceDeps = deps.filter(([n]) => n.startsWith("@emsenn/"));

  const badProtocol = workspaceDeps.filter(([, v]) => v !== "workspace:*");
  out.push(badProtocol.length > 0
    ? finding(inv("M5"), "active", `workspace deps without workspace:*: ${badProtocol.map(([n]) => n).join(", ")}`)
    : finding(inv("M5"), "potential", `${workspaceDeps.length} workspace deps, all workspace:*`));

  const allowed: Readonly<Record<ConformanceLayer, readonly ConformanceLayer[]>> = {
    lib: ["lib"],
    apps: ["lib"],
    services: ["lib", "apps"],
    sites: ["lib", "services"],
  };
  const inversions: string[] = [];
  for (const [depName] of workspaceDeps) {
    const short = depName.split("/")[1] ?? "";
    const home = CONFORMANCE_LAYERS.find((l) => existsSync(path.join(repoRoot, l, short)));
    if (home !== undefined && !allowed[layer].includes(home)) inversions.push(`${depName} lives in ${home}/`);
  }
  const lId = layer === "lib" ? "L1" : layer === "apps" ? "L2" : "L3";
  out.push(inversions.length > 0
    ? finding(inv(lId), "active", `layering inversions: ${inversions.join("; ")}`)
    : finding(inv(lId), "potential", `dependency directions lawful for ${layer}/`));

  if (layer === "lib" && /-codecs(-|$)/.test(path.basename(path.resolve(dir)))) {
    out.push(deps.length > 0
      ? finding(inv("L4"), "active", `codec package declares ${deps.length} runtime deps; codecs are geometric morphisms and carry nothing`)
      : finding(inv("L4"), "potential", "codec is zero-dep"));
  }

  out.push(deps.length > 8
    ? finding(inv("L5"), "active", `${deps.length} direct dependencies - the god-package smell`)
    : finding(inv("L5"), "potential", `${deps.length} direct dependencies`));
  return out;
}

type LawFinding = Readonly<{ law: string; line: number; text: string; allowed: boolean }>;

const FALLBACK_LAWS: readonly Readonly<{ key: string; id: string; re: RegExp }>[] = [
  { key: "wall-clock-as-data", id: "S1", re: /\bDate\.now\(\)|new Date\(\)/ },
  { key: "delete-not-trace", id: "S2", re: /\b(unlinkSync|rmSync|rmdirSync)\b|\.\s*(unlink|rm)\(|\bdelete\s+[a-zA-Z_$][\w$.[\]]*/ },
  { key: "stringify-not-identity", id: "S3", re: /JSON\.stringify[\s\S]{0,80}?(sha256|assertionId|contentKey|append|writeFile)/ },
  { key: "ungated-admit", id: "S4", re: /\b(admitLog|federate|mergeWorlds|mergeLog)\s*\(/ },
  { key: "domain-throw", id: "S5", re: /throw new Error\(\s*["'`][^"'`]*(not.?found|denied|conflict|missing|unauthorized)/i },
];

async function scanLaws(files: readonly string[]): Promise<Map<string, LawFinding[]>> {
  const byId = new Map<string, LawFinding[]>();
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const lines = text.split("\n");
    for (const law of FALLBACK_LAWS) {
      lines.forEach((lineText, i) => {
        if (!law.re.test(lineText)) return;
        const allowed = /law-allow:\s*[\w-]+/.test(lineText);
        const list = byId.get(law.id) ?? [];
        list.push({ law: law.key, line: i + 1, text: `${path.relative(process.cwd(), file)}:${i + 1}`, allowed });
        byId.set(law.id, list);
      });
    }
  }
  return byId;
}

function checkKindStrings(texts: readonly Readonly<{ file: string; text: string }>[]): Finding[] {
  const bad: string[] = [];
  let total = 0;
  for (const { file, text } of texts) {
    for (const match of text.matchAll(/kind:\s*["'`]([^"'`]+)["'`]/g)) {
      total += 1;
      const kindValue = match[1] ?? "";
      if (kindValue.includes("_")) continue;
      if (!/^[a-z0-9]+([.:-][a-z0-9]+)*$/.test(kindValue)) bad.push(`${path.basename(file)}: "${kindValue}"`);
    }
  }
  if (total === 0) return [finding(inv("A3"), "absurd", "no kind strings found")];
  return bad.length > 0
    ? [finding(inv("A3"), "active", `non-conformant kind strings: ${bad.slice(0, 6).join("; ")}${bad.length > 6 ? ` (+${bad.length - 6})` : ""}`)]
    : [finding(inv("A3"), "potential", `${total} kind strings conformant`)];
}

function checkBooleanJudgments(layer: ConformanceLayer, texts: readonly Readonly<{ file: string; text: string }>[]): Finding[] {
  if (layer !== "lib") return [];
  const hits: string[] = [];
  for (const { file, text } of texts) {
    for (const match of text.matchAll(/export (?:function|const) ((?:is|has|can)[A-Z]\w*)[^\n]*?:\s*boolean/g)) {
      hits.push(`${path.basename(file)}: ${match[1]}`);
    }
  }
  return hits.length > 0
    ? [finding(inv("A1"), "active", `boolean judgments in lib exports (judgments carry witness or obstruction): ${hits.slice(0, 6).join("; ")}`)]
    : [finding(inv("A1"), "potential", "no bare boolean judgments in exports")];
}

const RECORD_LIKE_NAME = /(Config|Options|Input|Output|Request|Response|Result|Report|Snapshot|Payload|Record|Dto|DTO)$/;
const DESCENDED_NAME = /(Carrier|Projection|Reading|Finding|Judgment|Witness|Obstruction|Norm|Control|Charge|Morphism|Trace|Utterance|Mark|Cell|Section|Topology|Algebra|Codec|Wire|Json|Html|Rdf|Turtle|Toml|Resource|Entry|View)$/;
const DESCENT_TEXT = /\b(Mark|Utterance|UtteranceCarrier|dehydrateUtterances|rehydrateUtterances|relational carrier|relationality|bedrock|trace|projection|descent|descend|normalize back|normalizes? .*carrier|settled? topology|meme-topology)\b/i;

function lineOfOffset(text: string, offset: number): number {
  return text.slice(0, offset).split("\n").length;
}

function declarationWindow(text: string, index: number): string {
  const beforeStart = Math.max(0, text.lastIndexOf("\n\n", index - 1));
  const afterEnd = text.indexOf("\n\n", index);
  return text.slice(beforeStart, afterEnd === -1 ? Math.min(text.length, index + 1200) : afterEnd);
}

function checkRelationalDescent(texts: readonly Readonly<{ file: string; text: string }>[]): Finding[] {
  const hits: string[] = [];
  let checked = 0;
  for (const { file, text } of texts) {
    const re = /export\s+(?:interface|type)\s+([A-Z][A-Za-z0-9_]*)/g;
    for (const match of text.matchAll(re)) {
      const name = match[1] ?? "";
      if (!RECORD_LIKE_NAME.test(name)) continue;
      if (DESCENDED_NAME.test(name)) continue;
      checked += 1;
      const window = declarationWindow(text, match.index ?? 0);
      if (/law-allow:\s*relational-boundary/.test(window)) continue;
      if (DESCENT_TEXT.test(window)) continue;
      hits.push(`${path.basename(file)}:${lineOfOffset(text, match.index ?? 0)} ${name}`);
    }
  }
  if (hits.length > 0) {
    return [finding(inv("A2"), "active",
      `record-like exports lack visible Mark/Utterance descent: ${hits.slice(0, 6).join("; ")}${hits.length > 6 ? ` (+${hits.length - 6})` : ""}`,
      hits)];
  }
  return [finding(inv("A2"), "potential", checked === 0
    ? "no exported standalone record-like structures found"
    : `${checked} exported record-like structure(s) declare relational descent or a lawful boundary`)];
}

function checkServiceTick(layer: ConformanceLayer, texts: readonly Readonly<{ file: string; text: string }>[]): Finding[] {
  if (layer !== "services") return [];
  const hits: string[] = [];
  for (const { file, text } of texts) {
    const lines = text.split("\n");
    lines.forEach((lineText, i) => {
      if (/setInterval\s*\(/.test(lineText) && !/law-allow:\s*polling-fallback/.test(lineText)) {
        hits.push(`${path.basename(file)}:${i + 1}`);
      }
    });
  }
  return hits.length > 0
    ? [finding(inv("S6"), "active", `wall-clock tick without polling-fallback annotation: ${hits.join("; ")} - a tick is a witness-driven ordinal advance`)]
    : [finding(inv("S6"), "potential", "no unannotated wall-clock ticks")];
}

async function checkReadme(dir: string, kind: PackageKind): Promise<Finding[]> {
  const p = path.join(dir, "README.md");
  if (!existsSync(p)) {
    if (kind !== "content-records") return [finding(inv("D1"), "active", "no README.md")];
    const dirName = path.basename(path.resolve(dir));
    const recordFiles = [`${dirName}.md`, "CLAUDE.md"]
      .map((name) => path.join(dir, name))
      .filter((candidate) => existsSync(candidate));
    if (recordFiles.length === 0) {
      return [finding(inv("D1"), "active", "content package has no README.md, CLAUDE.md, or root record markdown")];
    }
    const lineCounts = await Promise.all(recordFiles.map(async (file) => {
      const text = await readFile(file, "utf8");
      return text.split("\n").filter((l) => l.trim().length > 0).length;
    }));
    const lines = lineCounts.reduce((sum, count) => sum + count, 0);
    return lines >= 10
      ? [finding(inv("D1"), "potential", `content records present (${lines} lines)`)]
      : [finding(inv("D1"), "active", `content records are ${lines} non-empty lines; not substantive`)];
  }
  const text = await readFile(p, "utf8");
  const lines = text.split("\n").filter((l) => l.trim().length > 0).length;
  return lines >= 10
    ? [finding(inv("D1"), "potential", `README.md present (${lines} lines)`)]
    : [finding(inv("D1"), "active", `README.md is ${lines} non-empty lines; not substantive`)];
}

export async function lintPackage(packageDir: string, repoRoot?: string): Promise<PackageLintReport> {
  const dir = path.resolve(packageDir);
  const root = repoRoot ?? path.resolve(dir, "..", "..");
  const layer = layerOf(dir);
  const manifestPath = path.join(dir, "package.json");
  if (!existsSync(manifestPath)) throw new TypeError(`no package.json at ${manifestPath}`);
  const manifest = readJSNodePackageManifest(dir);
  if (manifest === undefined) throw new TypeError(`no readable package.json at ${manifestPath}`);
  const kind = detectPackageKind(dir, manifest);

  const srcDir = path.join(dir, "src");
  const files = kind === "jsnode" && existsSync(srcDir) ? sourceModuleFiles(srcDir, { includeTests: false }) : [];
  const texts = await Promise.all(files.map(async (file) => ({ file, text: await readFile(file, "utf8") })));

  const findings: Finding[] = [
    ...checkManifest(dir, manifest, layer, kind),
    ...checkLayering(dir, manifest, layer, root),
    ...(kind === "jsnode" ? checkKindStrings(texts) : []),
    ...(kind === "jsnode" ? checkBooleanJudgments(layer, texts) : []),
    ...(kind === "jsnode" ? checkRelationalDescent(texts) : []),
    ...(kind === "jsnode" ? checkServiceTick(layer, texts) : []),
    ...(await checkReadme(dir, kind)),
  ];

  const laws = await scanLaws(files);
  for (const lawId of ["S1", "S2", "S3", "S4", "S5"]) {
    const hits = laws.get(lawId) ?? [];
    if (hits.length === 0) {
      findings.push(finding(inv(lawId), "potential", "no occurrences"));
      continue;
    }
    const held = hits.filter((h) => h.allowed);
    const live = hits.filter((h) => !h.allowed);
    if (live.length > 0) {
      findings.push(finding(inv(lawId), "active",
        `${live.length} unannotated occurrence(s)`, live.slice(0, 8).map((h) => h.text)));
    }
    if (held.length > 0) {
      findings.push(finding(inv(lawId), "stable",
        `${held.length} occurrence(s) held under law-allow - visible, not fatal`, held.slice(0, 8).map((h) => h.text)));
    }
  }

  const settled: Record<string, number> = { potential: 0, active: 0, stable: 0, absurd: 0 };
  for (const f of findings) settled[f.charge] = (settled[f.charge] ?? 0) + 1;
  return Object.freeze({ packageDir: dir, layer, packageKind: kind, findings: Object.freeze(findings), settled: Object.freeze(settled) });
}

export const checkPackage = lintPackage;
