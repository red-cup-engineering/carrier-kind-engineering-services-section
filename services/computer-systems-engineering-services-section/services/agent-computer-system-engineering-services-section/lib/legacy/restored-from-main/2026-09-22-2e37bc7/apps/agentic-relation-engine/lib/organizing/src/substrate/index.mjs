import path from "node:path";

import { processIsoNow } from "@red-cup-engineering/node-process-services-section/clock";
import { agent } from "@red-cup-engineering/animating/becoming/doing/working/governing/agent";
import { admitSeed } from "@red-cup-engineering/animating/becoming/descending";
import { directoryEntries, fileExists, readOptionalTextFile, readTextFileSync } from "@red-cup-engineering/computing/admission";
import { carrierFrom, codecs, jsonResource } from "@red-cup-engineering/relating";
import { cell } from "@red-cup-engineering/sign-cell/predication";
import { claim } from "@red-cup-engineering/sign-cell/utterance";
import { predicateOfClaim } from "@red-cup-engineering/sign-cell/predication";
import { mark, token } from "@red-cup-engineering/sign-cell/utterance";
import { readContentTree } from "@red-cup-engineering/relating/ledger/store";

import { assemble } from "../organizing.mjs";
import {
  workItem,
  workTask,
  workTerm,
  predicate,

} from "../work.mjs";

import { readJsonl, readWitnessLog } from "@red-cup-engineering/relating/services/filesystem-store";

const { unfoldJson } = codecs.text.json.jsonl.eavt;

export const SubstratePackageSchema = {
  $id: "organizing/substrate/package",
  title: "OrganizingSubstratePackage",
  type: "object",
  additionalProperties: false,
  required: ["kind", "name", "utterances", "exports", "bins", "scripts", "dependencies"],
  properties: {
    kind: { const: "organizing.substrate.package" },
    name: { type: "string", minLength: 1 },
    term: { type: "string", minLength: 1 },
    layer: { type: "string", minLength: 1 },
    utterances: { type: "array", items: { type: "object" } },
    exports: { type: "array", items: { type: "string" } },
    bins: { type: "array", items: { type: "string" } },
    scripts: { type: "array", items: { type: "string" } },
    dependencies: { type: "array", items: { type: "string" } },
  },
};

export const SubstrateChronicleSchema = {
  $id: "organizing/substrate/chronicle",
  title: "OrganizingSubstrateChronicle",
  type: "object",
  additionalProperties: false,
  required: ["kind", "feed", "path", "witnesses", "sessions"],
  properties: {
    kind: { const: "organizing.substrate.chronicle" },
    feed: { type: "string", minLength: 1 },
    path: { type: "string", minLength: 1 },
    witnesses: { type: "array", items: { type: "object" } },
    sessions: { type: "array", items: { type: "string" } },
  },
};

export const SubstrateContentSchema = {
  $id: "organizing/substrate/content",
  title: "OrganizingSubstrateContent",
  type: "object",
  additionalProperties: false,
  required: ["kind", "root", "resources"],
  properties: {
    kind: { const: "organizing.substrate.content" },
    root: { type: "string", minLength: 1 },
    resources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "bytes"],
        properties: {
          path: { type: "string", minLength: 1 },
          bytes: { type: "integer", minimum: 0 },
        },
      },
    },
  },
};

export const DirectorySubstrateSchema = {
  $id: "organizing/substrate/directory",
  title: "OrganizingDirectorySubstrate",
  description: "A frozen organizing intake reading of a directory as governed substrate.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "root", "readAt", "packages", "chronicles", "content", "constituents", "workItems"],
  properties: {
    kind: { const: "organizing.substrate.directory" },
    root: { type: "string", minLength: 1 },
    readAt: { type: "string", minLength: 1 },
    packages: { type: "array", items: SubstratePackageSchema },
    chronicles: { type: "array", items: SubstrateChronicleSchema },
    content: SubstrateContentSchema,
    constituents: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "utteranceCount"],
        properties: {
          name: { type: "string", minLength: 1 },
          utteranceCount: { type: "integer", minimum: 0 },
        },
      },
    },
    workItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "title", "status"],
        properties: {
          term: {},
          title: { type: "string", minLength: 1 },
          status: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

export const substratePackageCarrier = carrierFrom(SubstratePackageSchema);
export const substrateChronicleCarrier = carrierFrom(SubstrateChronicleSchema);
export const substrateContentCarrier = carrierFrom(SubstrateContentSchema);
export const directorySubstrateCarrier = carrierFrom(DirectorySubstrateSchema);

export function readDirectorySubstrate(root, options = {}) {
  const resolvedRoot = path.resolve(root);
  const workspace = options.workspace ?? options.readWorkspace?.(resolvedRoot) ?? readWorkspaceSubstrate(resolvedRoot);
  const dataRoot = options.dataRoot === undefined ? defaultDataRoot(resolvedRoot) : path.resolve(resolvedRoot, options.dataRoot);
  const contentRoot = options.contentRoot === undefined ? path.join(resolvedRoot, "content") : path.resolve(resolvedRoot, options.contentRoot);
  const packages = workspace.packages.map(packageReading);
  const chronicles = [readAgentEventsChronicle(dataRoot)];
  const content = readGovernedContent(contentRoot, options.contentLimit ?? 64);
  const constituents = Object.freeze([
    ...workspace.packages.map(packageConstituent),
    ...chronicles.flatMap(chronicleConstituents),
    ...content.resources.map(contentConstituent),
  ]);
  const agents = Object.freeze(constituents.map((constituent) =>
    agent(`${constituent.name}|governed-substrate`, {
      identity: constituent.name,
      goal: { predicate: "governed-substrate" },
    })));
  const workItems = Object.freeze([
    ...packages.map((pkg) => substrateWorkItem(["package", pkg.name], `Package ${pkg.name}`)),
    ...chronicles.map((chronicle) => substrateWorkItem(["chronicle", chronicle.feed], `Chronicle ${chronicle.feed}`)),
    ...content.resources.map((resource) => substrateWorkItem(["content", resource.path], `Content ${resource.path}`)),
  ]);
  const reading = {
    kind: "organizing.substrate.directory",
    root: resolvedRoot,
    readAt: options.readAt ?? processIsoNow(),
    packages,
    chronicles,
    content,
    constituents: constituents.map((constituent) => ({
      name: constituent.name,
      utteranceCount: constituent.utterances.length,
    })),
    workItems: workItems.map((item) => ({
      term: item.term.mark.value,
      title: workItemTitle(item),
      status: "active",
    })),
  };
  directorySubstrateCarrier.assert(jsonResource(reading), "directory substrate");
  return Object.freeze({
    ...reading,
    organizationInput: Object.freeze({ constituents, agents, workItems }),
  });
}

export function assembleDirectorySubstrate(
  reading,
  options = {},
) {
  return assemble(reading.organizationInput.agents, options);
}

export function directorySubstrateResource(reading) {
  const { organizationInput: _organizationInput, ...resource } = reading;
  return directorySubstrateCarrier.assert(jsonResource(resource), "directory substrate resource");
}

function readWorkspaceSubstrate(root) {
  const packages = packageManifestFiles(root)
    .map((file) => packageSubstrateFromManifest(root, file))
    .filter((pkg) => pkg !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));
  return Object.freeze({ root, packages: Object.freeze(packages) });
}

function packageManifestFiles(root) {
  const out = [];
  for (const stratum of ["apps", "lib", "services", "sites"]) {
    const dir = path.join(root, stratum);
    const entries = directoryEntries(dir);
    for (const entry of entries) {
      if (!entry.directory) continue;
      const manifest = path.join(dir, entry.name, "package.json");
      if (fileExists(manifest)) out.push(manifest);
    }
  }
  return Object.freeze(out.sort((a, b) => a.localeCompare(b)));
}

function packageSubstrateFromManifest(root, file) {
  const parsed = JSON.parse(readTextFileSync(file));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
  const manifest = parsed;
  const name = typeof manifest.name === "string" ? manifest.name.trim() : "";
  if (name === "") return undefined;
  const dir = path.dirname(file);
  const layer = path.relative(root, dir).split(path.sep)[0] ?? "workspace";
  const exports = manifestExports(manifest.exports);
  const bins = manifestBins(manifest.bin, name);
  const scripts = Object.keys(recordValue(manifest.scripts)).sort();
  const dependencies = ["dependencies", "peerDependencies", "optionalDependencies"]
    .flatMap((field) => Object.keys(recordValue(manifest[field])))
    .sort((a, b) => a.localeCompare(b));
  const facts = [
    `${name}|layer:${layer}`,
    ...exports.map((item) => `${name}|exports:${item}`),
    ...bins.map((item) => `${name}|bin:${item}`),
    ...scripts.map((item) => `${name}|script:${item}`),
    ...dependencies.map((item) => `${name}|depends:${item}`),
  ];
  return Object.freeze({
    name,
    term: `package:${name}`,
    layer,
    utterances: admitSeed(facts.join("\n")),
    exports: Object.freeze(exports),
    dependencies: Object.freeze(dependencies),
    manifest: Object.freeze({
      bins: Object.freeze(bins),
      scripts: Object.freeze(scripts),
    }),
  });
}

export function recordValue(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function manifestExports(value) {
  if (typeof value === "string") return Object.freeze([value]);
  if (Array.isArray(value)) return Object.freeze(value.filter((item) => typeof item === "string"));
  if (value !== null && typeof value === "object") return Object.freeze(Object.keys(value).sort());
  return Object.freeze([]);
}

function manifestBins(value, packageName) {
  if (typeof value === "string" && value.trim() !== "") return Object.freeze([packageName]);
  if (value !== null && typeof value === "object" && !Array.isArray(value)) return Object.freeze(Object.keys(value).sort());
  return Object.freeze([]);
}

function defaultDataRoot(root) {
  return path.join(root, "sites", "dev.bare-cedar-fog.emsenn.net", "data");
}

function packageReading(pkg) {
  return Object.freeze({
    kind: "organizing.substrate.package",
    name: pkg.name,
    ...(pkg.term === undefined ? {} : { term: pkg.term }),
    ...(pkg.layer === undefined ? {} : { layer: pkg.layer }),
    utterances: jsonResource([...pkg.utterances], "substrate package utterances"),
    exports: Object.freeze([...(pkg.exports ?? [])]),
    bins: Object.freeze([...(pkg.manifest?.bins ?? [])]),
    scripts: Object.freeze([...(pkg.manifest?.scripts ?? [])]),
    dependencies: Object.freeze([...(pkg.dependencies ?? [])]),
  });
}

function packageConstituent(pkg) {
  return Object.freeze({
    name: `package:${pkg.name}`,
    utterances: Object.freeze([...pkg.utterances]),
  });
}

function readAgentEventsChronicle(dataRoot) {
  const store = witnessStore(dataRoot);
  const feed = "agent-events";
  const eavtRows = readWitnessLog(store, feed);
  const rows = eavtRows.length > 0 ? eavtRows : readJsonl(path.join(store.logDir, `${feed}.jsonl`)).flatMap((row) =>
    unfoldJson(row, { base: feed, t: eventTime(row) }));
  return Object.freeze({
    kind: "organizing.substrate.chronicle",
    feed,
    path: path.join(store.logDir, `${feed}.jsonl`),
    witnesses: Object.freeze(rows),
    sessions: Object.freeze(uniqueStrings(rows.map(sessionOfWitness).filter((value) => value !== undefined))),
  });
}

function witnessStore(dataRoot) {
  return Object.freeze({
    logDir: path.join(dataRoot, "logs"),
    stateDir: path.join(dataRoot, "state"),
    recordDir: path.join(dataRoot, "records"),
    contentDir: path.join(dataRoot, "content"),
  });
}

function eventTime(row) {
  if (row !== null && typeof row === "object" && !Array.isArray(row) && typeof row.at === "string") return row.at;
  return "unknown";
}

function sessionOfWitness(row) {
  if (row.a !== "session") return undefined;
  return typeof row.v === "string" && row.v.trim() !== "" ? row.v : undefined;
}

function chronicleConstituents(chronicle) {
  const bySession = new Map();
  for (const witness of chronicle.witnesses) {
    const session = typeof witness.e === "string" ? witness.e : "agent-events";
    const existing = bySession.get(session) ?? [];
    existing.push(witness);
    bySession.set(session, existing);
  }
  return Object.freeze([...bySession.entries()].map(([session, witnesses]) => Object.freeze({
    name: `chronicle:${session}`,
    utterances: admitSeed(witnesses.map((witness) =>
      `${session}|witnesses:${String(witness.a)}`).join("\n")),
  })));
}

function readGovernedContent(root, limit) {
  const resources = readContentTree(root, "", { limit }).map((resource) => Object.freeze({
    path: resource.path,
    bytes: resource.content.length,
  }));
  return Object.freeze({
    kind: "organizing.substrate.content",
    root,
    resources: Object.freeze(resources),
  });
}

function contentConstituent(resource) {
  return Object.freeze({
    name: `content:${resource.path}`,
    utterances: admitSeed(`content:${resource.path}|governed-material\ncontent:${resource.path}|bytes:${resource.bytes}`),
  });
}

function substrateWorkItem(key, title) {
  const term = workTerm(["substrate", ...key]);
  const goal = cell(term, predicateOfClaim(claim(mark("governed-substrate"))), token(mark(title)));
  const task = workTask({
    term: workTerm(["task", ...key]),
    goals: [goal],
    evidence: [workTerm(["title", title]), predicate("directory-substrate")],
  });
  return workItem({
    term,
    task,
    evidence: [workTerm(["title", title]), workTerm(["status", "active"])],
  });
}

function workItemTitle(item) {
  for (const evidence of item.evidence ?? []) {
    if (typeof evidence === "object" && evidence !== null && "kind" in evidence && "mark" in evidence && evidence.kind === "utterance.token") {
      const value = evidence.mark.value;
      if (Array.isArray(value) && value[0] === "title" && typeof value[1] === "string") return value[1];
    }
  }
  return JSON.stringify(item.term.mark.value);
}

function uniqueStrings(values) {
  return Object.freeze([...new Set(values)].sort());
}
