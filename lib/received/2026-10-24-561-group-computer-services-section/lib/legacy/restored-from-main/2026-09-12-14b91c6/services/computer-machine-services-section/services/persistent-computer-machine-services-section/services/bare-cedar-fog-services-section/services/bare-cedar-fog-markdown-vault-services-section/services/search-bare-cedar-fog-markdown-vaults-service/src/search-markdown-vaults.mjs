import { spawn } from "node:child_process";
import { realpath } from "node:fs/promises";
import { posix } from "node:path";
import {
  DEFAULT_POLICY_PATH,
  admitVaultPolicy,
  generationForPath,
  readVaultPolicy,
  vaultForPath,
} from "../../observe-bare-cedar-fog-markdown-vaults-service/src/vault-catalog.mjs";

function searchArguments({ policy, query, caseSensitive, regularExpression, regions }) {
  const args = ["--json", "--line-number", "--column", "--with-filename", "--hidden", "--no-ignore"];
  if (!caseSensitive) args.push("--ignore-case");
  if (!regularExpression) args.push("--fixed-strings");
  for (const extension of policy.extensions) args.push("--glob", `*.${extension}`);
  for (const name of policy.excludedDirectoryNames) args.push("--glob", `!**/${name}/**`);
  args.push("--", query, ...regions);
  return args;
}

function eventPath(data) {
  return data.path?.text ?? (data.path?.bytes ? Buffer.from(data.path.bytes, "base64").toString("utf8") : null);
}

function eventLine(data) {
  return data.lines?.text ?? (data.lines?.bytes ? Buffer.from(data.lines.bytes, "base64").toString("utf8") : "");
}

export async function searchBareCedarFogMarkdownVaults({
  root,
  query,
  policy,
  policyPath = DEFAULT_POLICY_PATH,
  vaultIds,
  paths,
  generation = "all",
  caseSensitive = false,
  regularExpression = false,
  limit = 50,
  command = "rg",
} = {}) {
  if (typeof root !== "string" || root.length === 0) throw new TypeError("root is required");
  if (typeof query !== "string" || query.length === 0) throw new TypeError("query must be a nonempty string");
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError("limit must be a positive integer");
  if (!["all", "current", "legacy", "reference", "triage"].includes(generation)) throw new TypeError("generation must be all, current, legacy, reference, or triage");
  const admittedPolicy = policy ? admitVaultPolicy(policy) : await readVaultPolicy(policyPath);
  const selected = vaultIds === undefined ? admittedPolicy.vaults.map(({ id }) => id) : vaultIds;
  if (!Array.isArray(selected) || selected.length === 0) throw new TypeError("vaultIds must be a nonempty array when supplied");
  const known = new Set(admittedPolicy.vaults.map(({ id }) => id));
  for (const id of selected) if (!known.has(id)) throw new TypeError(`unknown vault id ${id}`);
  const selectedSet = new Set(selected);
  const selectedVaults = admittedPolicy.vaults.filter(({ id }) => selectedSet.has(id));
  let admittedPaths;
  if (paths !== undefined) {
    if (!Array.isArray(paths) || paths.length === 0) throw new TypeError("paths must be a nonempty array when supplied");
    admittedPaths = [...new Set(paths.map((path) => {
      if (typeof path !== "string" || path.length === 0 || path.includes("\\")) throw new TypeError("each narrowed path must be a nonempty POSIX path");
      const normalized = posix.normalize(path.replace(/^\.\//u, ""));
      if (posix.isAbsolute(normalized) || normalized === ".." || normalized.startsWith("../")) throw new TypeError(`narrowed path escapes root: ${path}`);
      return normalized;
    }))];
  }
  const broadSearch = selectedVaults.some(({ fallback }) => fallback);
  const regions = admittedPaths ?? (broadSearch ? ["."] : selectedVaults.map(({ region }) => region));
  const admittedRoot = await realpath(root);
  const args = searchArguments({ policy: admittedPolicy, query, caseSensitive, regularExpression, regions });
  return new Promise((fulfill, reject) => {
    const child = spawn(command, args, { cwd: admittedRoot, stdio: ["ignore", "pipe", "pipe"] });
    const matches = [];
    let pending = "";
    let stderr = "";
    let acceptedBeyondLimit = false;
    function accept(line) {
      if (!line) return;
      let event;
      try { event = JSON.parse(line); } catch (error) { reject(new Error(`invalid ${command} JSON event: ${error.message}`)); child.kill(); return; }
      if (event.type !== "match") return;
      const path = eventPath(event.data)?.replace(/^\.\//u, "");
      if (!path) return;
      const vault = vaultForPath(path, admittedPolicy);
      const pathGeneration = generationForPath(path);
      if (!selectedSet.has(vault.id) || (generation !== "all" && generation !== pathGeneration)) return;
      if (matches.length >= limit) { acceptedBeyondLimit = true; child.kill(); return; }
      matches.push(Object.freeze({
        vaultId: vault.id,
        generation: pathGeneration,
        path,
        line: event.data.line_number,
        column: (event.data.submatches?.[0]?.start ?? 0) + 1,
        text: eventLine(event.data).replace(/\r?\n$/u, ""),
        submatches: Object.freeze((event.data.submatches ?? []).map((match) => Object.freeze({
          start: match.start,
          end: match.end,
          text: match.match?.text ?? "",
        }))),
      }));
    }
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      pending += chunk;
      let newline;
      while ((newline = pending.indexOf("\n")) >= 0) {
        accept(pending.slice(0, newline));
        pending = pending.slice(newline + 1);
      }
    });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (pending) accept(pending);
      if (code !== 0 && code !== 1 && !(signal && acceptedBeyondLimit)) {
        reject(new Error(`${command} search failed (${code ?? signal}): ${stderr.trim()}`));
        return;
      }
      fulfill(Object.freeze({
        type: "BareCedarFogMarkdownVaultSearchResult",
        root: admittedRoot,
        query,
        options: Object.freeze({
          vaultIds: Object.freeze([...selected]),
          generation,
          caseSensitive,
          regularExpression,
          limit,
          narrowedPaths: admittedPaths ? admittedPaths.length : null,
        }),
        matches: Object.freeze(matches),
        matchedDocuments: new Set(matches.map(({ path }) => path)).size,
        truncated: acceptedBeyondLimit,
        supplier: Object.freeze({ command, mode: "--json --hidden --no-ignore" }),
      }));
    });
  });
}
