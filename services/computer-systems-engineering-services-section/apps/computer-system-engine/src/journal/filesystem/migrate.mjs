/**
 * Carry a journal root written under an earlier artifact identity into the current one.
 *
 * Journals admitted before artifacts were named by RFC 6920 ni URIs cite their causes and
 * referenced artifacts as `metroplat:artifact:1:rfc8785-jcs:sha-256:<hex>`. The current code
 * re-derives every witness from its observation, so such a root reads as corrupt. Migration reads
 * each stored witness (checking that every stored source is the text its old name digests),
 * renames the witnesses it cites and the artifacts it references, and admits the same observation
 * (address, claim, payload, seat, time) into the new root in causal order. The old root is only
 * read.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { addressArtifact } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { journalWitness } from "@red-cup-engineering/semiotic-eavt-services-section/journal/event";
import { admitEvents } from "./write-journal-store.mjs";

const LEGACY = /^metroplat:artifact:1:rfc8785-jcs:sha-256:([0-9a-f]{64})$/u;
const STATEMENTS = ".statements";

function* walk(directory) {
  let entries;
  try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

/** Every stored witness under a root: its feed log path (relative to the root) and its record. */
function storedWitnesses(root) {
  const witnesses = [];
  for (const file of walk(root)) {
    if (!file.endsWith(".json")) continue;
    const at = file.indexOf(`${STATEMENTS}${path.sep}sha-256${path.sep}`);
    if (at < 0 || file.includes(`${path.sep}received${path.sep}`)) continue;
    let record;
    try { record = JSON.parse(fs.readFileSync(file, "utf8")); } catch { continue; }
    if (record?.kind !== "metroplat.journal.witness" || typeof record.id !== "string") continue;
    witnesses.push({ log: path.relative(root, file.slice(0, at)), record });
  }
  return witnesses;
}

const digestHex = (text) => createHash("sha256").update(text, "utf8").digest("hex");

/** A legacy witness is intact when every stored source (and its core) is the text its old name digests. */
function intact(record) {
  const named = LEGACY.exec(record.id);
  if (named === null) return true;
  if (digestHex(record.bytes) !== named[1]) return false;
  return (record.sources ?? []).every((source) => {
    const old = LEGACY.exec(source.ref ?? "");
    return old === null || digestHex(source.canonicalText) === old[1];
  });
}

/** The legacy object store indexed by hex digest (walked once). */
function legacyObjects(root) {
  const byHex = new Map();
  for (const file of walk(root)) {
    const match = /rfc8785-jcs\/sha-256\/([0-9a-f]{64})\.json$/u.exec(file.split(path.sep).join("/"));
    if (match !== null) byHex.set(match[1], file);
  }
  return byHex;
}

/**
 * Migrate the journal root `from` into the empty root `to` (both settlement roots holding `data/`).
 * @returns {{ witnesses: number, copies: number, admitted: number, blocked: number, skipped: { log: string, id: string, reason: string }[] }}
 */
export function migrateJournalRoot(from, to, { onProgress } = {}) {
  if (fs.existsSync(path.join(to, "data", "journals")) && fs.readdirSync(path.join(to, "data", "journals")).length > 0) {
    throw new TypeError(`migration target ${to} already holds journals`);
  }
  const stored = storedWitnesses(from);
  const objects = legacyObjects(from);
  const renamedArtifacts = new Map();
  const artifactOf = (ref) => {
    const named = LEGACY.exec(ref);
    if (named === null) return { ref };
    if (!renamedArtifacts.has(ref)) {
      const file = objects.get(named[1]);
      if (file === undefined) throw new TypeError(`artifact ${ref} is missing from the old object store`);
      const text = fs.readFileSync(file, "utf8");
      if (digestHex(text) !== named[1]) throw new TypeError(`artifact ${ref} is not the text its name digests`);
      const addressed = addressArtifact(JSON.parse(text));
      renamedArtifacts.set(ref, { ref: addressed.ref, source: Object.freeze({ ref: addressed.ref, canonicalText: addressed.canonical.text }) });
    }
    return renamedArtifacts.get(ref);
  };

  // One witness may be published in several feeds; it is admitted into each of them.
  const byId = new Map(stored.map((witness) => [witness.record.id, witness]));
  const logsOf = new Map();
  for (const { log, record } of stored) logsOf.set(record.id, [...new Set([...(logsOf.get(record.id) ?? []), log])]);
  const renamed = new Map();
  const skipped = [];
  const ordered = [];
  const state = new Map();
  // Causes first: a depth-first walk over each witness's cited causes.
  const visit = (id) => {
    if (state.get(id) === "done") return true;
    if (state.get(id) === "open") return false;
    const witness = byId.get(id);
    if (witness === undefined) return false;
    state.set(id, "open");
    for (const cause of witness.record.observation?.causes ?? []) {
      if (byId.has(cause) && !visit(cause)) { state.set(id, "done"); return false; }
    }
    state.set(id, "done");
    ordered.push(witness);
    return true;
  };
  for (const witness of stored) visit(witness.record.id);

  const batches = new Map();
  for (const { log, record } of ordered) {
    if (!intact(record)) { skipped.push({ log, id: record.id, reason: "stored sources do not digest to their names" }); continue; }
    const observation = record.observation;
    const causes = (observation.causes ?? []).map((cause) => renamed.get(cause) ?? cause);
    if (causes.some((cause) => LEGACY.test(cause))) { skipped.push({ log, id: record.id, reason: "cites a witness absent from the root" }); continue; }
    let artifacts;
    try { artifacts = (observation.referencedArtifacts ?? []).map(artifactOf); }
    catch (error) { skipped.push({ log, id: record.id, reason: error.message }); continue; }
    let witness;
    try {
      witness = journalWitness(Object.freeze({
        ...observation,
        causes,
        ...(observation.referencedArtifacts === undefined ? {} : { referencedArtifacts: artifacts.map((artifact) => artifact.ref) }),
      }));
    } catch (error) { skipped.push({ log, id: record.id, reason: error.message }); continue; }
    renamed.set(record.id, witness.id);
    for (const feed of logsOf.get(record.id)) {
      if (!batches.has(feed)) batches.set(feed, { statements: [], artifacts: [] });
      const batch = batches.get(feed);
      batch.statements.push(witness);
      for (const artifact of artifacts) if (artifact.source !== undefined) batch.artifacts.push(artifact.source);
    }
  }

  // Admission resolves causes across feeds itself, re-queuing a witness once its causes are in.
  let admitted = 0;
  let blocked = 0;
  let done = 0;
  for (const [log, batch] of batches) {
    const results = admitEvents(path.join(to, log), batch.statements, batch.artifacts);
    for (const result of results) {
      if (result.admission === "admitted") admitted += 1;
      else if (result.admission === "blocked") blocked += 1;
    }
    done += batch.statements.length;
    onProgress?.({ log, done, total: ordered.length });
  }
  return Object.freeze({ witnesses: byId.size, copies: stored.length, admitted, blocked, skipped: Object.freeze(skipped) });
}
