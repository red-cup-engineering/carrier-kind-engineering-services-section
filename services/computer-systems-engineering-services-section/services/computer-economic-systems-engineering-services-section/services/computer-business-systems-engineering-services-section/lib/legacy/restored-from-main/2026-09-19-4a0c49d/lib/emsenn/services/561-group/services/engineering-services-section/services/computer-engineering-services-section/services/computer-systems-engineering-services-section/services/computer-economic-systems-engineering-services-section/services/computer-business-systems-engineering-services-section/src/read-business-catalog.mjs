import { join, posix } from "node:path";
import { walkPosixPaths } from "@red-cup-engineering/path-walking-service";
import { readTextFile } from "@red-cup-engineering/read-text-file-service";
import { parse } from "@red-cup-engineering/computer-data-engine/json";
import { termToJson } from "@red-cup-engineering/relation-model-notation-json-codec";
import { deriveBusinessCatalog } from "./business-catalog.mjs";

const EXCLUDES = [".git", ".agents", ".claude", ".codex", ".lake", ".wrangler", "node_modules", "legacy", "dist", "build", "coverage", "generated", "test", "tests", "fixtures", "tmp"];
const ACCOUNT = /^(Assets|Liabilities|Equity|Income|Expenses):[^\s]+$/u;
const ID_KEYS = new Set(["id", "name", "title", "program", "platform", "subject", "object", "seats"]);
const ACCOUNT_KEYS = new Set(["account", "accounts", "accountId", "incomeAccount", "assetAccount", "liabilityAccount", "expenseAccount"]);
const URL_KEYS = new Set(["url", "homepage", "website", "site", "endpoint", "sourceUrl", "feedUrl"]);

function sourceKind(path) {
  if (posix.basename(path) === "package.json") return "package";
  if (posix.basename(path) === "channel-spec.json") return "channel";
  if (posix.basename(path) === "catalog.json") return "catalog";
  if (posix.basename(path) === "witness-journal-seavt.jsonl") return "founding";
  if (!path.endsWith(".json")) return null;
  if (/(^|\/)content\/products\//u.test(path)) return "product";
  if (/(^|\/)content\/offers\//u.test(path)) return "offer";
  if (/(^|\/)content\/agent-cards\//u.test(path)) return "agent-card";
  if (/(^|\/)content\/config\/([^/]*channel[^/]*|pipeline)\.json$/u.test(path)) return "channel";
  return null;
}

function publicUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      && !url.search && !url.hash ? url.href : null;
  } catch { return null; }
}

// Only named identity, account and public locator fields cross this boundary.
// An arbitrary configuration value is never copied into the discovery surface.
function evidence(value) {
  const result = { ids: new Set(), accounts: new Set(), urls: new Set(), repositories: new Set() };
  function collect(node, key = "") {
    if (typeof node === "string") {
      if (node && ID_KEYS.has(key)) result.ids.add(node);
      if (ACCOUNT_KEYS.has(key) && ACCOUNT.test(node)) result.accounts.add(node);
      const url = publicUrl(node);
      if (url && URL_KEYS.has(key)) result.urls.add(url);
      if (url && key === "repository") result.repositories.add(url);
    } else if (Array.isArray(node)) {
      for (const item of node) collect(item, key);
    } else if (node && typeof node === "object") {
      for (const [childKey, child] of Object.entries(node)) {
        if (key === "repository" && childKey === "url") collect(child, "repository");
        else collect(child, childKey);
      }
    }
  }
  collect(value);
  return Object.fromEntries(Object.entries(result).map(([key, values]) => [key, [...values].sort()]));
}

/** Read declared business sources once; retain scan limits and missing evidence. */
export async function readBusinessCatalogSources({ root, maxEntries = 1000000, maxBytes = 1048576 } = {}) {
  for (const [key, value] of Object.entries({ maxEntries, maxBytes })) {
    if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${key} must be a positive safe integer`);
  }
  const walk = await walkPosixPaths({
    root, maxEntries, excludes: EXCLUDES, symlinks: "skip", unreadable: "skip",
    paths: "relative", result: "entries", includeFile: ({ path }) => sourceKind(path) !== null,
  });
  const records = [], findings = [], manifests = new Map(), sources = [];
  let readCount = 0;
  for (const file of walk.files) {
    if (file.kind !== "file") continue;
    const kind = sourceKind(file.path);
    if (file.bytes > maxBytes) {
      findings.push({ path: file.path, reason: "file-too-large", bytes: file.bytes });
      continue;
    }
    let text;
    try {
      text = (await readTextFile({ path: join(walk.root, file.path) })).text;
      if (Buffer.byteLength(text) > maxBytes) {
        findings.push({ path: file.path, reason: "file-too-large" });
        continue;
      }
      readCount++;
    } catch {
      findings.push({ path: file.path, reason: "unreadable-source" });
      continue;
    }
    const lines = kind === "founding" ? text.split(/\r?\n/u) : [text];
    for (const [index, line] of lines.entries()) {
      if (kind === "founding" && !line.trim()) continue;
      const sourcePath = kind === "founding" ? `${file.path}#line=${index + 1}` : file.path;
      try {
        const decoded = parse(line);
        // Journal rows carry E/A/V directly as RMN terms; business discovery
        // reads only the decoded V data and never treats the coordinates as
        // text or content addresses.
        const value = kind === "founding" && decoded?.v && Array.isArray(decoded.e)
          && Array.isArray(decoded.a) && typeof decoded.t === "string" ? termToJson(decoded.v) : decoded;
        if (!value || typeof value !== "object") throw new TypeError("source must be structured");
        if (kind === "package") {
          if (typeof value.name !== "string" || !value.name || typeof value.version !== "string") {
            findings.push({ path: file.path, reason: "missing-package-identity" });
          } else {
            manifests.set(posix.dirname(file.path), value);
            // Public custody is a discoverable service declaration, including
            // applications without a product catalog. It does not imply sales.
            if (file.path.split("/").includes("public-services-section")) {
              sources.push({ filePath: file.path, sourcePath, kind: "public-service", value: {
                name: value.name, homepage: value.homepage, repository: value.repository,
              } });
            }
          }
        } else if (kind !== "founding" || value.type === "561GroupProgramFoundingReceipt" || value.kind === "561GroupProgramFoundingReceipt") {
          sources.push({ filePath: file.path, sourcePath, kind, value });
        }
      } catch {
        findings.push({ path: sourcePath, reason: "malformed-source" });
      }
    }
  }
  for (const source of sources) {
    let owner = posix.dirname(source.filePath);
    while (!manifests.has(owner) && owner !== ".") owner = posix.dirname(owner);
    const manifest = manifests.get(owner);
    if (!manifest) {
      findings.push({ path: source.sourcePath, reason: "missing-package-owner" });
      continue;
    }
    const declared = evidence(source.value);
    const metadata = evidence({ homepage: manifest.homepage, repository: manifest.repository });
    records.push({
      sourcePath: source.sourcePath, kind: source.kind,
      package: { path: owner, name: manifest.name, version: manifest.version },
      ...declared,
      urls: [...new Set([...declared.urls, ...metadata.urls])].sort(),
      repositories: [...new Set([...declared.repositories, ...metadata.repositories])].sort(),
    });
  }
  return {
    records,
    scan: {
      root: walk.root, scannedAt: new Date().toISOString(), maxEntries, maxBytes,
      scanned: walk.scanned, selectedFiles: walk.files.length, readFiles: readCount,
      packages: manifests.size, sourceRecords: sources.length, retainedRecords: records.length,
      truncated: walk.truncated, excludedBasenames: EXCLUDES, skipped: walk.skipped, findings,
      coverage: "selected declarations; deployments, receipts and income require separate observations",
    },
  };
}

export async function readBusinessCatalog({ root, maxEntries, maxBytes, ...filters } = {}) {
  const { records, scan } = await readBusinessCatalogSources({ root, maxEntries, maxBytes });
  return { ...deriveBusinessCatalog({ records, ...filters }), scan };
}
