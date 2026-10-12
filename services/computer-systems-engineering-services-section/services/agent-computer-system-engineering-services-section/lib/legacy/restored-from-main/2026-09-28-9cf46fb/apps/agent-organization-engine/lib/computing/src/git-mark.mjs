/**
 * git-mark - pure git carriers/codecs/reflections over the computing substrate.
 *
 * The host edge is read-git.mjs's gitStatus/gitLog/gitRefs/gitRemotes (through
 * admission.mjs's readGitStdout, the one place raw git stdout is actually read). This module
 * only decodes those strings, admits the decoded facts into carriers, and reflects commit
 * history as causal order -- moved out of this file so its own purity does not depend on that
 * effect (data/records/house-architecture-norms.json, "hull-never-imports-kernel").
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { canonical, requireJsonValue } from "@red-cup-engineering/json-services-section";
import { evidence, utterance } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/cell";

import { lightObservationCarrier } from "./holographic-compute.mjs";
import { observeLabels } from "./operating.mjs";

const hashPattern = "^[A-Fa-f0-9]{7,64}$";
const idSchema = { type: "string", minLength: 1 };

export const GitStatusEntrySchema = {
  $id: "computing/git/status-entry",
  title: "GitStatusEntry",
  type: "object",
  required: ["status", "path", "raw"],
  additionalProperties: false,
  properties: {
    status: { type: "string", minLength: 2, maxLength: 2 },
    path: idSchema,
    raw: { type: "string" },
  },
};

export const gitStatusEntryCarrier = schemaFrom(GitStatusEntrySchema);

export const GitCommitEntrySchema = {
  $id: "computing/git/commit-entry",
  title: "GitCommitEntry",
  type: "object",
  required: ["hash", "abbrev", "parents", "authorName", "authorEmail", "authorDate", "subject"],
  additionalProperties: false,
  properties: {
    hash: { type: "string", minLength: 1, pattern: hashPattern },
    abbrev: { type: "string", minLength: 1, pattern: hashPattern },
    parents: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    authorName: { type: "string" },
    authorEmail: { type: "string" },
    authorDate: { type: "string" },
    subject: { type: "string" },
  },
};

export const gitCommitEntryCarrier = schemaFrom(GitCommitEntrySchema);

export const GitRefEntrySchema = {
  $id: "computing/git/ref-entry",
  title: "GitRefEntry",
  type: "object",
  required: ["name", "objectName", "kind", "shorthand"],
  additionalProperties: false,
  properties: {
    name: idSchema,
    objectName: { type: "string", minLength: 1, pattern: hashPattern },
    kind: { enum: ["branch", "remote", "tag", "head", "other"] },
    shorthand: idSchema,
  },
};

export const gitRefEntryCarrier = schemaFrom(GitRefEntrySchema);

export const GitRemoteEntrySchema = {
  $id: "computing/git/remote-entry",
  title: "GitRemoteEntry",
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: idSchema,
    fetchUrl: { type: "string" },
    pushUrl: { type: "string" },
  },
};

export const gitRemoteEntryCarrier = schemaFrom(GitRemoteEntrySchema);

export const LOG_FIELD_SEP = "\x1f";
export const LOG_RECORD_SEP = "\x1e";
export const LOG_PRETTY_FORMAT =
  `%H${LOG_FIELD_SEP}%h${LOG_FIELD_SEP}%P${LOG_FIELD_SEP}%an${LOG_FIELD_SEP}%ae${LOG_FIELD_SEP}%aI${LOG_FIELD_SEP}%s${LOG_RECORD_SEP}`;

export function normalizeRelativePath(path) {
  return path.replace(/\\/gu, "/").replace(/^\.\//u, "").replace(/\/{2,}/gu, "/");
}

export function parseStatusLine(line) {
  const status = line.slice(0, 2);
  const rawPath = line.slice(3).trim();
  const path = rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1) ?? rawPath : rawPath;
  return gitStatusEntryCarrier.assert(Object.freeze({ status, path: normalizeRelativePath(path), raw: line }), "git status line");
}

export function parseStatus(stdout) {
  return stdout.split("\n").filter((line) => line.length > 0).map(parseStatusLine);
}

export function isUntracked(entry) {
  return entry.status === "??";
}

export function stagedCode(entry) {
  const code = entry.status[0];
  return code === undefined || code === " " ? undefined : code;
}

export function worktreeCode(entry) {
  const code = entry.status[1];
  return code === undefined || code === " " ? undefined : code;
}

export function parseLogRecord(record) {
  const [hash = "", abbrev = "", parents = "", authorName = "", authorEmail = "", authorDate = "", subject = ""] =
    record.split(LOG_FIELD_SEP);
  return gitCommitEntryCarrier.assert(Object.freeze({
    hash: hash.trim(),
    abbrev: abbrev.trim(),
    parents: parents.trim().length > 0 ? parents.trim().split(" ") : [],
    authorName,
    authorEmail,
    authorDate: authorDate.trim(),
    subject,
  }), "git log record");
}

export function parseLog(stdout) {
  return stdout
    .split(LOG_RECORD_SEP)
    .map((record) => record.replace(/^\n/u, ""))
    .filter((record) => record.trim().length > 0)
    .map(parseLogRecord);
}

export function isMerge(entry) {
  return entry.parents.length > 1;
}

export function refKind(name) {
  if (name === "HEAD") return "head";
  if (name.startsWith("refs/heads/")) return "branch";
  if (name.startsWith("refs/remotes/")) return "remote";
  if (name.startsWith("refs/tags/")) return "tag";
  return "other";
}

export function refShorthand(name) {
  return name
    .replace(/^refs\/heads\//u, "")
    .replace(/^refs\/remotes\//u, "")
    .replace(/^refs\/tags\//u, "");
}

export function parseRefLine(line) {
  const space = line.indexOf(" ");
  const objectName = space === -1 ? "" : line.slice(0, space);
  const name = space === -1 ? line.trim() : line.slice(space + 1).trim();
  return gitRefEntryCarrier.assert(Object.freeze({ name, objectName, kind: refKind(name), shorthand: refShorthand(name) }), "git ref line");
}

export function parseRefs(stdout) {
  return stdout.split("\n").filter((line) => line.trim().length > 0).map(parseRefLine);
}

export function parseRemotes(stdout) {
  const order = [];
  const fetch = new Map();
  const push = new Map();
  for (const line of stdout.split("\n")) {
    if (line.trim().length === 0) continue;
    const tab = line.indexOf("\t");
    if (tab === -1) continue;
    const name = line.slice(0, tab);
    const rest = line.slice(tab + 1).trim();
    const open = rest.lastIndexOf(" (");
    const url = open === -1 ? rest : rest.slice(0, open);
    const direction = open === -1 ? "" : rest.slice(open + 2).replace(/\)$/u, "");
    if (!order.includes(name)) order.push(name);
    if (direction === "push") push.set(name, url);
    else fetch.set(name, url);
  }
  return order.map((name) => {
    const fetchUrl = fetch.get(name);
    const pushUrl = push.get(name);
    return gitRemoteEntryCarrier.assert(Object.freeze({
      name,
      ...(fetchUrl === undefined ? {} : { fetchUrl }),
      ...(pushUrl === undefined ? {} : { pushUrl }),
    }), "git remote line");
  });
}

/** A working tree's dirtiness as told evidence: its entry count witnesses for (dirty) or against (clean). */
export function dirtinessEvidence(entries) {
  const witness = Object.freeze({ reading: "git.working-tree-dirty", count: entries.length });
  return entries.length > 0 ? evidence({ for: [witness] }) : evidence({ against: [witness] });
}

export function gitFact(subject, predicate, object) {
  return utterance({ subject, object }, predicate);
}

export function gitObservation(utterances) {
  return observeLabels(utterances.map(utteranceObservationLabel));
}

function utteranceObservationLabel(uttered, index) {
  const tokenValue = uttered.token;
  const claimValue = uttered.claim;
  const object =
    tokenValue !== null &&
    typeof tokenValue === "object" &&
    !Array.isArray(tokenValue) &&
    "object" in tokenValue
      ? (tokenValue).object
      : tokenValue;
  return {
    id: `git.utterance.${index}.${canonical(requireJsonValue(tokenValue, "utterance token"))}`,
    reading: "potential",
    predicate: String(claimValue),
    object: canonical(requireJsonValue(object, "utterance object")),
  };
}

export function worktreeCarrier(entries) {
  const utterances = entries.map((entry) => gitFact(entry.path, `git.status:${entry.status.trim() || "??"}`, entry));
  return Object.freeze({
    kind: "computing.git.worktree",
    entries,
    utterances,
    observation: gitObservation(utterances),
    dirtiness: dirtinessEvidence(entries),
  });
}

export function stagedEntries(carrier) {
  return carrier.entries.filter((entry) => !isUntracked(entry) && stagedCode(entry) !== undefined);
}

export function unstagedEntries(carrier) {
  return carrier.entries.filter((entry) => !isUntracked(entry) && worktreeCode(entry) !== undefined);
}

export function untrackedEntries(carrier) {
  return carrier.entries.filter(isUntracked);
}

export function commitGraphCarrier(commits) {
  const utterances = commits.flatMap((commit) =>
    commit.parents.length > 0
      ? commit.parents.map((parent) => gitFact(commit.hash, "git.commit:parent", parent))
      : [gitFact(commit.hash, "git.commit:root", commit.hash)],
  );
  return Object.freeze({
    kind: "computing.git.commit-graph",
    commits,
    utterances,
    observation: gitObservation(utterances),
    light: commitGraphLightObservation(commits),
  });
}

export function commitGraphLightObservation(commits) {
  const nodes = new Set();
  const edges = [];
  const inbound = new Map();
  for (const commit of commits) {
    nodes.add(commit.hash);
    inbound.set(commit.hash, inbound.get(commit.hash) ?? 0);
    for (const parent of commit.parents) {
      nodes.add(parent);
      edges.push(Object.freeze({ from: parent, to: commit.hash }));
      inbound.set(parent, inbound.get(parent) ?? 0);
      inbound.set(commit.hash, (inbound.get(commit.hash) ?? 0) + 1);
    }
  }
  const sortedNodes = [...nodes].sort((left, right) => left.localeCompare(right));
  const sortedEdges = edges.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));
  const causalOrder = !hasDirectedCycle(sortedEdges);
  return lightObservationCarrier.assert(Object.freeze({
    kind: "computing.light-observation",
    nodes: Object.freeze(sortedNodes),
    edges: Object.freeze(sortedEdges),
    boundaryHashes: Object.freeze(sortedNodes.filter((node) => (inbound.get(node) ?? 0) === 0)),
    causalOrder,
    h1: causalOrder ? 0 : 1,
  }), "git commit light observation");
}

export function tipCommit(carrier) {
  return carrier.commits[0];
}

export function rootCommits(carrier) {
  return carrier.commits.filter((commit) => commit.parents.length === 0);
}

export function mergeCommits(carrier) {
  return carrier.commits.filter(isMerge);
}

export function refCarrier(refs) {
  const utterances = refs.map((ref) => gitFact(ref.name, `git.ref:${ref.kind}`, ref.objectName));
  return Object.freeze({
    kind: "computing.git.refs",
    refs,
    utterances,
    observation: gitObservation(utterances),
  });
}

export function refsOfKind(carrier, kind) {
  return carrier.refs.filter((ref) => ref.kind === kind);
}

export function branches(carrier) {
  return refsOfKind(carrier, "branch");
}

export function tags(carrier) {
  return refsOfKind(carrier, "tag");
}

export function remoteCarrier(remotes) {
  const utterances = remotes.map((remote) => gitFact(remote.name, "git.remote:fetch", remote.fetchUrl ?? remote.pushUrl ?? ""));
  return Object.freeze({
    kind: "computing.git.remotes",
    remotes,
    utterances,
    observation: gitObservation(utterances),
  });
}

export function remoteNamed(carrier, name) {
  return carrier.remotes.find((remote) => remote.name === name);
}

function hasDirectedCycle(edges) {
  const outgoing = new Map();
  for (const edge of edges) {
    const next = outgoing.get(edge.from) ?? [];
    next.push(edge.to);
    outgoing.set(edge.from, next);
    if (!outgoing.has(edge.to)) outgoing.set(edge.to, []);
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (node) => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of outgoing.get(node) ?? []) if (visit(next)) return true;
    visiting.delete(node);
    visited.add(node);
    return false;
  };
  return [...outgoing.keys()].some(visit);
}

