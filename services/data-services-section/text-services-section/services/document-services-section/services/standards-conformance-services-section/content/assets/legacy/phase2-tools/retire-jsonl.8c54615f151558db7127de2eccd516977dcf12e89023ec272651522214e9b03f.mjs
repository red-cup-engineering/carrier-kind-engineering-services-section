#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { semanticId } from "@emsenn/rmn-semantic-conformance";
import { recordLocalRwil, relationalRwilDocument } from "@emsenn/rwil-rdf-services/client";

const SKIP = new Set([".git", ".lake", "node_modules", "dist", "out", "cache", ".static"]);
function candidates(root, current = root, result = []) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(current, entry.name); if (path.includes(`${sep}content${sep}assets${sep}legacy${sep}`)) continue;
    if (entry.isDirectory()) candidates(root, path, result); else if (entry.isFile() && path.endsWith(".jsonl")) result.push(path);
  }
  return result;
}
function settlementRoot(workspace, path) {
  let current = dirname(path);
  while (current === workspace || current.startsWith(`${workspace}${sep}`)) {
    const manifest = join(current, "package.json");
    if (existsSync(manifest)) {
      const value = JSON.parse(readFileSync(manifest, "utf8"));
      const nodeId = value["x-agentic-metro-enterprise"]?.["node-id"];
      if (nodeId) return { root: current, nodeId, manifest: value };
    }
    if (current === workspace) break; current = dirname(current);
  }
  throw new Error(`JSONL has no sovereign settlement membrane: ${path}`);
}
async function digest(path) {
  const hash = createHash("sha256"); for await (const chunk of createReadStream(path)) hash.update(chunk); return hash.digest("base64url");
}
function binding(owner) {
  const path = join(owner.root, "content/evm/accounts/eip155-31337.json");
  if (!existsSync(path)) throw new Error(`${owner.nodeId} has no eip155:31337 smart-account binding`);
  const value = JSON.parse(readFileSync(path, "utf8"));
  if (value.profile !== "org.emsenn.evm.sovereign-enterprise-account.v2") throw new Error(`${owner.nodeId} account profile is not v2`);
  return value.account.caip10;
}

export async function planJsonlRetirement(workspace) {
  const root = resolve(workspace), owners = new Map();
  for (const source of candidates(root).sort()) {
    const owner = settlementRoot(root, source), sha256 = await digest(source), sourceRelative = relative(owner.root, source);
    const destination = join(owner.root, "content/assets/legacy/phase2-jsonl", sourceRelative.replace(/\.jsonl$/u, `.${sha256}.jsonl`));
    const item = Object.freeze({ source, sourceRelative, destination, destinationRelative: relative(owner.root, destination), sha256: `ni:///sha-256;${sha256}`, bytes: statSync(source).size });
    const group = owners.get(owner.root) ?? { ...owner, account: binding(owner), files: [] }; group.files.push(item); owners.set(owner.root, group);
  }
  return Object.freeze({ workspace: root, files: [...owners.values()].reduce((sum, owner) => sum + owner.files.length, 0), bytes: [...owners.values()].flatMap((owner) => owner.files).reduce((sum, file) => sum + file.bytes, 0), owners: Object.freeze([...owners.values()].sort((left, right) => left.root.localeCompare(right.root))) });
}

export async function retireJsonlTerritory({ workspace, rwilAgentUrl }) {
  if (!rwilAgentUrl) throw new Error("RWIL_RDF_AGENT is required");
  const plan = await planJsonlRetirement(workspace), receipts = [];
  for (const owner of plan.owners) {
    const moved = [];
    try {
      for (const file of owner.files) {
        if (existsSync(file.destination)) throw new Error(`retirement destination already exists: ${file.destination}`);
        mkdirSync(dirname(file.destination), { recursive: true }); renameSync(file.source, file.destination); moved.push(file);
      }
      const graph = semanticId(["vector", ...owner.files.map(({ sha256 }) => ["mark", sha256])]);
      await recordLocalRwil({ agentUrl: rwilAgentUrl, root: join(owner.root, "data"), nodeId: owner.nodeId, batch: {
        settlement: owner.account, graph, recordedAt: new Date().toISOString(),
        document: relationalRwilDocument({ type: "JsonlTerritoryRetirement", method: "lossless-owner-local-rename-after-sha256", files: owner.files.map(({ sourceRelative, destinationRelative, sha256, bytes }) => ({ sourceRelative, destinationRelative, sha256, bytes })) }),
        assertions: owner.files.map(({ sha256, sourceRelative }) => ({ subject: sha256, predicate: "urn:emsenn:displaced-jsonl-path", object: { kind: "literal", value: sourceRelative } })),
      }});
      receipts.push(Object.freeze({ owner: owner.nodeId, settlement: owner.account, graph, files: owner.files.length, bytes: owner.files.reduce((sum, file) => sum + file.bytes, 0) }));
    } catch (error) {
      for (const file of moved.reverse()) {
        if (existsSync(file.source)) throw new Error(`cannot roll back JSONL retirement because source was recreated: ${file.source}`, { cause: error });
        renameSync(file.destination, file.source);
      }
      throw error;
    }
  }
  return Object.freeze({ type: "JsonlTerritoryRetirement", files: plan.files, bytes: plan.bytes, owners: receipts });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const workspace = process.argv[2]; if (!workspace) throw new Error("usage: retire-jsonl-territory <workspace> [--apply]");
  if (process.argv.includes("--apply")) process.stdout.write(`${JSON.stringify(await retireJsonlTerritory({ workspace, rwilAgentUrl: process.env.RWIL_RDF_AGENT }), null, 2)}\n`);
  else { const plan = await planJsonlRetirement(workspace); process.stdout.write(`${JSON.stringify({ type: "JsonlTerritoryRetirementPlan", files: plan.files, bytes: plan.bytes, owners: plan.owners.map(({ nodeId, account, files }) => ({ nodeId, account, files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0) })) }, null, 2)}\n`); }
}
