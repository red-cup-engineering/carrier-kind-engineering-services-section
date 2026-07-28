#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { encodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";

const SKIP_PARTS = new Set([".git", ".lake", ".tmp", "node_modules", "dist", "out", "cache", ".static"]);
const TEXT_EXTENSIONS = new Set([".cjs", ".js", ".json", ".mjs", ".mts", ".sol", ".toml", ".ts", ".yaml", ".yml"]);

function extension(path) { const dot = path.lastIndexOf("."); return dot < 0 ? "" : path.slice(dot); }
function skipped(path) {
  const parts = path.split(sep);
  if (parts.some((part) => SKIP_PARTS.has(part))) return true;
  return path.includes(`${sep}content${sep}assets${sep}legacy${sep}`);
}
function files(root, current = root, output = []) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const path = resolve(current, entry.name); if (skipped(path)) continue;
    if (entry.isDirectory()) files(root, path, output); else if (entry.isFile()) output.push(path);
  }
  return output;
}
function lineOf(text, index) { return text.slice(0, index).split("\n").length; }
function operationalInstructionCarrier(path) {
  const local = path.replaceAll("\\", "/");
  return /(?:^|\/)(?:SKILL|AGENTS|CLAUDE)\.md$/u.test(local);
}
function operationalCarrier(path) {
  const local = path.replaceAll("\\", "/");
  if (operationalInstructionCarrier(local)) return true;
  if (/(?:^|\/)(?:content|data)(?:\/|$)/u.test(local)) return false;
  return /(?:^|\/)(?:src|bin|scripts|test)(?:\/|$)/u.test(local) || local.endsWith("/package.json") || local === "package.json";
}
function liveLawCarrier(path) {
  const local = path.replaceAll("\\", "/");
  return operationalCarrier(local) || /\/content\/contracts\//u.test(`/${local}`) || /\/lib\/schemas\//u.test(`/${local}`);
}

export const RULES = Object.freeze([
  { id: "authoritative-jsonl", scope: "file-jsonl", message: "authoritative JSONL is forbidden; preserve bytes by digest and cut to RWIL/RDF" },
  { id: "jsonl-operation", scope: "operational", pattern: /\.jsonl\b/giu, message: "operational JSONL creation, reading, schema, or fixture is forbidden; use typed RMN and RWIL/RDF" },
  { id: "jsonl-instruction", scope: "instructions", pattern: /(?:\b(?:use|uses|using|write|writes|writing|read|reads|reading|scan|scans|scanning|append|appends|appending|dated|emit|emits|emitting)\b[^\n.]{0,120}\bJSONL\b|\bdispatch-jsonl(?:\.mjs)?\b)/giu, message: "operational instructions may not direct JSONL work; use typed RMN and the hired RWIL/RDF provider" },
  { id: "metroplat-umbrella", scope: "operational", pattern: /(?:@emsenn\/metroplat\b|\burn:ame:metroplat\b|\bMETROPLAT_DATA_ROOT\b|(?:^|["'`/])src\/apps\/metroplat(?:["'`/]|$))/gmu, message: "the dissolved MetroPlat package, actor, runtime, and source route are forbidden; contract directly with the canonical faculty provider" },
  { id: "metroplat-law-namespace", scope: "live-law", pattern: /\bmetroplat\.(?:contract|energetic-obligation)\b/gu, message: "the dissolved MetroPlat namespace cannot define live law; use the normalized RMN law identity" },
  { id: "legacy-path", scope: "file-legacy-path", message: "live compatibility or legacy path is forbidden" },
  { id: "legacy-switch", scope: "text", pattern: /(?:\blegacyCompatibility\s*:\s*true|"legacyCompatibility"\s*:\s*true|\bback(?:ward)?Compat(?:ibility)?\b|\blegacyFallback\b|\bfallbackShim\b)/giu, message: "compatibility or fallback switch is forbidden" },
  { id: "four-ordinal", scope: "text", pattern: /\b(?:four|outcome|charge|truthValue)\s*[:=]\s*[0-3]\b/giu, message: "FOUR must be two explicit evidence bits, never an ordinal" },
  { id: "flat-effect-scale", scope: "operational", pattern: /\bscale\s*:\s*["'](?:enterprise|service|task|function|syscall)["']/gu, message: "operational scale enums are forbidden; derive program, model, circuit, die, enterprise, nation, or colony readings from recursive membrane topology" },
  { id: "retired-rmn-core-profile", scope: "live-law", pattern: /\borg\.emsenn\.rmn\.core\.v2\b/gu, message: "RMN core v2 is retired; live law and operations must use the recursive v3 carrier" },
  { id: "flat-circuit-residue-profile", scope: "live-law", pattern: /(?:\borg\.emsenn\.rmn\.typed-circuit-residue\.v2\b|\b(?:conform|assay)CircuitResidues\b|\bCIRCUIT_RESIDUE_TYPE\b)/gu, message: "flat receipt-list residue assays are retired; residues must be closed traces over verified hierarchical par nets" },
  { id: "retired-enterprise-account-profile", scope: "live-law", pattern: /\borg\.emsenn\.evm\.sovereign-enterprise-account\.v2\b/gu, message: "enterprise account v2 is displaced; live settlement bindings and operations must use the RMN-v3-bound ERC-4337 account profile v3" },
  { id: "duplicate-manifest-account", scope: "manifest", pattern: /"account"\s*:\s*"eip155:[1-9][0-9]*:0x[0-9a-fA-F]{40}"/gu, message: "package manifests may not copy a settlement account; resolve the settlement-owned standard account binding" },
  { id: "sorted-json-canonicalization", scope: "operational", pattern: /\b(?:canonicalJson|canonicalJSON|stableStringify|sortedJson|sortObjectKeys)\b/gu, message: "JSON may not act as canonical semantic bytes" },
  { id: "eoa-execution", scope: "text", pattern: /\b(?:privateKeyToAccount|eth_sendTransaction|--private-key|sendTransaction\s*\([^)]*privateKey)\b/gu, message: "operational EOA execution is forbidden" },
  { id: "direct-x402-implementation", scope: "x402-consumer", pattern: /from\s+["']@x402\/(?:core|evm|express|fetch)(?:\/[^"']*)?["']/gu, message: "x402 consumers must hire the x402 provider" },
  { id: "custom-x402-envelope", scope: "text", pattern: /\b(?:X-PAYMENT|x-payment-response|x-payment-required|X_PAYMENT)\b/gu, message: "custom or v1 x402 envelopes are forbidden" },
  { id: "holonomy-ledger", scope: "operational", pattern: /\bHolonomySeamLedger\b/gu, message: "the hard-coded holonomy ledger is superseded" },
  { id: "die-operation-cardinality", scope: "manifest-structure", message: "one leaf settlement must declare exactly one independently contractable semantic operation" },
  { id: "unproved-board-runtime", scope: "manifest-structure", message: "a package containing child settlements must be realized by an explicit hierarchical circuit, sovereign assembly, and one public circuit face" },
]);

function ruleCarrier(rule) { return { id: rule.id, scope: rule.scope, pattern: rule.pattern?.source ?? null, flags: rule.pattern?.flags ?? null, message: rule.message }; }
const ruleset = encodeRelationalValue({ profile: "org.emsenn.phase2.closed-conformance-rules.v1", rules: RULES.map(ruleCarrier) });
export const PHASE2_RULESET_ID = semanticId(["ascribe", ruleset.type, ruleset.term]);

function fileApplies(rule, path) {
  if (rule.scope === "file-jsonl") return path.endsWith(".jsonl");
  if (rule.scope === "file-legacy-path") return operationalCarrier(path) && TEXT_EXTENSIONS.has(extension(path)) && /(?:^|\/)(?:legacy|compat|compatibility|fallback|shims?)(?:\/|\.|-|$)/iu.test(path.replaceAll("\\", "/"));
  return false;
}
function textApplies(rule, path) {
  if (rule.scope === "operational") return operationalCarrier(path);
  if (rule.scope === "instructions") return operationalInstructionCarrier(path);
  if (rule.scope === "live-law") return liveLawCarrier(path);
  if (rule.scope === "manifest") return path.endsWith("package.json");
  if (rule.scope === "x402-consumer") return !path.replaceAll("\\", "/").includes("/x402-services-section/");
  return rule.scope === "text";
}

function structuralManifestViolations(path, absolutePath, text) {
  let manifest;
  try { manifest = JSON.parse(text); } catch { return []; }
  const law = manifest?.["x-agentic-metro-enterprise"];
  const catalog = law?.["operation-catalog"] && Object.getPrototypeOf(law["operation-catalog"]) === Object.prototype
    ? law["operation-catalog"] : {};
  const output = [];
  const packageRoot = resolve(absolutePath, "..");
  const childRoot = resolve(packageRoot, "services");
  const hasChildSettlement = existsSync(childRoot) && readdirSync(childRoot, { withFileTypes: true })
    .some((entry) => {
      if (!entry.isDirectory()) return false;
      try { return typeof JSON.parse(readFileSync(resolve(childRoot, entry.name, "package.json"), "utf8"))?.["x-agentic-metro-enterprise"]?.["node-id"] === "string"; }
      catch { return false; }
    });
  if (law && !hasChildSettlement && Object.keys(catalog).length !== 1) output.push({
    rule: "die-operation-cardinality", path, line: null,
    message: `one leaf settlement must declare exactly one independently contractable semantic operation; found ${Object.keys(catalog).length}`,
  });
  if (law && hasChildSettlement) {
    const circuit = resolve(packageRoot, "content", "circuits", "implementation.rml");
    const assembly = resolve(packageRoot, "content", "circuits", "assembly.rml");
    const cards = resolve(packageRoot, "content", "agent-cards");
    const cardCount = existsSync(cards) ? readdirSync(cards, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".json")).length : 0;
    if (!existsSync(circuit) || !existsSync(assembly) || cardCount !== 1) output.push({
        rule: "unproved-board-runtime", path, line: null,
        message: "parent settlement has child settlements but lacks its circuit implementation, sovereign assembly, or one public circuit face",
      });
  }
  return output;
}

function owningSettlement(territory, localPath, cache) {
  let current = resolve(territory, localPath);
  if (!existsSync(current) || !statSync(current).isDirectory()) current = resolve(current, "..");
  while (current === territory || current.startsWith(`${territory}${sep}`)) {
    if (cache.has(current)) return cache.get(current);
    const manifestPath = resolve(current, "package.json");
    if (existsSync(manifestPath)) try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (typeof manifest?.["x-agentic-metro-enterprise"]?.["node-id"] === "string") {
        const value = relative(territory, current) || "."; cache.set(current, value); return value;
      }
    } catch {}
    if (current === territory) break;
    current = resolve(current, "..");
  }
  return null;
}

export function scanTerritory(root) {
  const territory = resolve(root), violations = [];
  for (const path of files(territory).sort()) {
    const local = relative(territory, path);
    const isScannerFixture = path.replaceAll("\\", "/").includes("/standards-conformance-services-section/")
      && /\/(?:src\/scan-territory|test\/scan-territory\.test)\.mjs$/u.test(`/${local.replaceAll("\\", "/")}`);
    for (const rule of RULES) if (fileApplies(rule, local)) violations.push(Object.freeze({ rule: rule.id, path: local, line: null, message: rule.message }));
    if (isScannerFixture || (!TEXT_EXTENSIONS.has(extension(path)) && !operationalInstructionCarrier(local)) || statSync(path).size > 8 * 1024 * 1024) continue;
    const text = readFileSync(path, "utf8");
    if (local.endsWith("package.json")) violations.push(...structuralManifestViolations(local, path, text));
    for (const rule of RULES) if (rule.pattern && textApplies(rule, local)) {
      rule.pattern.lastIndex = 0; for (const match of text.matchAll(rule.pattern)) violations.push(Object.freeze({ rule: rule.id, path: local, line: lineOf(text, match.index), message: rule.message }));
    }
  }
  const settlementCache = new Map();
  const located = violations.map((violation) => Object.freeze({ ...violation, settlement: owningSettlement(territory, violation.path, settlementCache) }));
  const byRule = Object.fromEntries([...new Set(located.map(({ rule }) => rule))].sort().map((rule) => [rule, located.filter((item) => item.rule === rule).length]));
  const groups = new Map();
  for (const violation of located) {
    const key = violation.settlement ?? "(unseated territory)";
    const group = groups.get(key) ?? { settlement: violation.settlement, violationCount: 0, rules: new Set(), paths: new Set() };
    group.violationCount += 1; group.rules.add(violation.rule); group.paths.add(violation.path); groups.set(key, group);
  }
  // canonical-cut-ni-identity key-order-independent-cut-identity repeatable-cut-identity material-change-changes-cut-identity
  const CUT_PROFILE = "org.emsenn.phase2.territory-cut.v1";
  const cutFrontier = [...groups.values()].map((group) => {
    const rules = Object.freeze([...group.rules].sort());
    const paths = Object.freeze([...group.paths].sort());
    const settlement = group.settlement;
    const violationCount = group.violationCount;
    const encoded = encodeRelationalValue({ profile: CUT_PROFILE, ruleset: PHASE2_RULESET_ID, settlement, violationCount, rules, paths });
    const cutId = semanticId(["ascribe", encoded.type, encoded.term]);
    return Object.freeze({ settlement, violationCount, rules, paths, cutId });
  }).sort((left, right) => right.violationCount - left.violationCount || String(left.settlement).localeCompare(String(right.settlement)));
  return Object.freeze({ type: "Phase2TerritoryConformanceReport", ruleset: PHASE2_RULESET_ID, territory, conforming: located.length === 0, violationCount: located.length, byRule: Object.freeze(byRule), cutFrontier: Object.freeze(cutFrontier), violations: Object.freeze(located) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2]; if (!root) throw new Error("usage: scan-phase2-territory <absolute-territory> [--enforce]");
  const report = scanTerritory(root); process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (process.argv.includes("--enforce") && !report.conforming) process.exitCode = 1;
}
