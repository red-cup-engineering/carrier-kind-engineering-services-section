import { NI_URI as NI, rawNiUri } from "@red-cup-engineering/rmn-semantic-conformance-die/canonical-cbor";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";

const RUN_FILE = /^[0-9a-f-]{36}\.jsonl$/u;

const byteIdentity = rawNiUri;

function semanticDocument(value) {
  return relationalWitnessJournalDocument(value);
}

function semanticIdentity(value) {
  return semanticId(semanticDocument(value));
}

function semanticCarrier(value) {
  return semanticBytes(semanticDocument(value));
}

function writeSemanticCarrier(root, identity, bytes) {
  if (!NI.test(identity)) throw new Error("semantic carrier has no canonical RMN identity");
  const digest = identity.slice("ni:///sha-256;".length);
  const directory = join(root, "rmn", "sha-256", digest.slice(0, 2));
  const path = join(directory, `${digest}.rmn.cbor`);
  mkdirSync(directory, { recursive: true });
  if (existsSync(path)) {
    if (!readFileSync(path).equals(bytes)) throw new Error(`semantic carrier collision for ${identity}`);
    return path;
  }
  writeFileSync(path, bytes, { flag: "wx" });
  return path;
}

function readSource(path, run) {
  const bytes = readFileSync(path);
  const lines = bytes.toString("utf8").trim().split("\n").filter(Boolean);
  if (lines.length === 0) throw new Error(`source run ${run} is empty`);
  const events = [];
  for (const [index, line] of lines.entries()) {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      throw new Error(`source run ${run} event ${index} is not JSON`);
    }
    if (event?.run !== run || event.sequence !== index || !NI.test(event.id ?? "")) {
      throw new Error(`source run ${run} event ${index} has an invalid run, sequence, or identity`);
    }
    if (event.previous !== (index === 0 ? null : events[index - 1].id)) {
      throw new Error(`source run ${run} event ${index} breaks its predecessor chain`);
    }
    events.push(event);
  }
  return { bytes, events };
}

function correctedEvent(event, corrections, run) {
  const applicable = corrections.filter((correction) => correction.run === run && correction.sequence === event.sequence);
  if (applicable.length === 0) return event;
  const corrected = structuredClone(event);
  for (const correction of applicable) {
    if (!Array.isArray(correction.path) || correction.path.length === 0
        || correction.path.some((segment) => typeof segment !== "string" || segment === "")) {
      throw new Error(`correction for run ${run} sequence ${event.sequence} has an invalid path`);
    }
    let parent = corrected;
    for (const segment of correction.path.slice(0, -1)) {
      if (!parent || typeof parent !== "object" || !(segment in parent)) {
        throw new Error(`correction for run ${run} sequence ${event.sequence} names an absent path`);
      }
      parent = parent[segment];
    }
    const leaf = correction.path.at(-1);
    if (!parent || typeof parent !== "object" || !(leaf in parent)
        || JSON.stringify(parent[leaf]) !== JSON.stringify(correction.expected)) {
      throw new Error(`correction for run ${run} sequence ${event.sequence} does not match expected source data`);
    }
    parent[leaf] = correction.replacement;
  }
  return corrected;
}

function stageLawRules(stageLawMigrations) {
  if (!Array.isArray(stageLawMigrations)) {
    throw new Error("run-history stage-law migrations must be an array");
  }
  const seen = new Set();
  return stageLawMigrations.map((rule, index) => {
    if (!rule || typeof rule !== "object"
        || ![rule.from, rule.to, rule.unresolvedTo].every((value) => typeof value === "string" && value !== "")
        || rule.from === rule.to || rule.from === rule.unresolvedTo || rule.to === rule.unresolvedTo
        || !rule.when || typeof rule.when !== "object") {
      throw new Error(`stage-law migration ${index} is invalid`);
    }
    const urlPrefix = rule.when.observationUrlPrefix;
    const fields = rule.when.requiredObservationFields;
    const hasUrl = typeof urlPrefix === "string" && urlPrefix !== "";
    const hasFields = Array.isArray(fields) && fields.length > 0
      && fields.every((field) => typeof field === "string" && field !== "");
    if (hasUrl === hasFields) {
      throw new Error(`stage-law migration ${index} must declare exactly one evidence predicate`);
    }
    const key = JSON.stringify([rule.from, rule.to]);
    if (seen.has(key)) throw new Error(`duplicate stage-law migration ${rule.from} -> ${rule.to}`);
    seen.add(key);
    return structuredClone(rule);
  });
}

function observationRule(observation, rules, from) {
  if (!observation || typeof observation !== "object") return null;
  const matches = rules.filter((rule) => rule.from === from && (
    typeof rule.when.observationUrlPrefix === "string"
      ? typeof observation.url === "string" && observation.url.startsWith(rule.when.observationUrlPrefix)
      : rule.when.requiredObservationFields.every((field) => Object.hasOwn(observation, field))
  ));
  if (matches.length > 1) throw new Error(`stage ${from} evidence matches several replacement laws`);
  return matches[0] ?? null;
}

function eventObservation(event) {
  return event?.result?.observation
    ?? event?.result
    ?? event?.evidence?.observation
    ?? event?.knowledge?.evidence
    ?? null;
}

function replaceObstruction(value, rule) {
  if (typeof value !== "string" || !value.startsWith(`${rule.from}:`)) return value;
  return `${rule.to}:${value.slice(rule.from.length + 1)}`;
}

function migrateKnowledge(value, rules) {
  if (Array.isArray(value)) return value.map((entry) => migrateKnowledge(entry, rules));
  if (!value || typeof value !== "object") return value;
  const migrated = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, migrateKnowledge(entry, rules)]),
  );
  if (typeof migrated.obstruction === "string") {
    const from = migrated.obstruction.split(":", 1)[0];
    const rule = observationRule(migrated.evidence, rules, from);
    if (rule) migrated.obstruction = replaceObstruction(migrated.obstruction, rule);
  }
  return migrated;
}

function migrateStageLaws(events, rules) {
  if (rules.length === 0) return events;
  const targets = new Map();
  for (const [index, event] of events.entries()) {
    if (typeof event.stage !== "string") continue;
    const rule = observationRule(eventObservation(event), rules, event.stage);
    if (rule) targets.set(index, rule);
  }
  for (const [index, event] of events.entries()) {
    if (event.type !== "stage-started" || typeof event.stage !== "string") continue;
    for (let cursor = index + 1; cursor < events.length; cursor += 1) {
      const candidate = events[cursor];
      if (candidate.type === "stage-started" && candidate.stage === event.stage) break;
      const rule = targets.get(cursor);
      if (rule && candidate.stage === event.stage) {
        targets.set(index, rule);
        break;
      }
    }
  }
  const runTargets = new Map();
  for (const [index, rule] of targets) {
    if (events[index].type === "stage-started") continue;
    const set = runTargets.get(rule.from) ?? new Set();
    set.add(rule.to);
    runTargets.set(rule.from, set);
  }
  const unresolved = new Map();
  for (const rule of rules) {
    const prior = unresolved.get(rule.from);
    if (prior && prior !== rule.unresolvedTo) {
      throw new Error(`stage ${rule.from} has contradictory unresolved replacements`);
    }
    unresolved.set(rule.from, rule.unresolvedTo);
  }
  return events.map((source, index) => {
    const event = migrateKnowledge(source, rules);
    const rule = targets.get(index);
    if (rule) {
      event.stage = rule.to;
      if (Object.hasOwn(event, "obstruction")) {
        event.obstruction = replaceObstruction(event.obstruction, rule);
      }
    }
    if (Array.isArray(event.result?.stages)) {
      event.result.stages = event.result.stages.map((stage) => {
        const candidates = runTargets.get(stage);
        if (!candidates) return unresolved.get(stage) ?? stage;
        return candidates.size === 1 ? [...candidates][0] : unresolved.get(stage);
      });
    }
    return event;
  });
}

function migrateEvents(events, corrections, stageLawMigrations, run) {
  const mappings = [];
  const migrated = [];
  let previous = null;
  const corrected = events.map((event) => correctedEvent(event, corrections, run));
  const projected = migrateStageLaws(corrected, stageLawMigrations);
  for (const [index, event] of projected.entries()) {
    const before = events[index].id;
    const { id: _id, ...body } = event;
    const replacement = { ...body, previous };
    replacement.id = semanticIdentity(replacement);
    const canonical = { id: replacement.id, ...body, previous };
    migrated.push(canonical);
    mappings.push({ sequence: event.sequence, before, after: canonical.id });
    previous = canonical.id;
  }
  return { events: migrated, mappings };
}

export function migrateFabricationRunHistory({
  sourceRuns,
  targetRoot,
  receiptPath,
  migratedAt,
  corrections = [],
  stageLawMigrations = [],
}) {
  const source = resolve(sourceRuns);
  const target = resolve(targetRoot);
  const receipt = resolve(receiptPath);
  if (source === target) throw new Error("run-history migration refuses an in-place rewrite");
  if (existsSync(target)) throw new Error("canonical run-history target already exists");
  if (existsSync(receipt)) throw new Error("run-history migration receipt already exists");
  if (!Array.isArray(corrections)) throw new Error("run-history migration corrections must be an array");
  const lawMigrations = stageLawRules(stageLawMigrations);
  const files = readdirSync(source).filter((name) => RUN_FILE.test(name)).sort();
  if (files.length === 0) throw new Error("run-history migration source has no admitted JSONL runs");

  const temporary = `${target}.migrating`;
  if (existsSync(temporary)) throw new Error("run-history migration temporary target already exists");
  mkdirSync(join(temporary, "runs"), { recursive: true });
  const runs = [];
  try {
    for (const name of files) {
      const run = name.slice(0, -6);
      const observed = readSource(join(source, name), run);
      const migrated = migrateEvents(observed.events, corrections, lawMigrations, run);
      const targetBytes = Buffer.from(`${migrated.events.map((event) => JSON.stringify(event)).join("\n")}\n`);
      writeFileSync(join(temporary, "runs", name), targetBytes, { flag: "wx" });
      const carriers = migrated.events.map((event) => {
        const bytes = semanticCarrier(event);
        const identity = semanticIdentity(event);
        writeSemanticCarrier(temporary, identity, bytes);
        return { event: event.id, carrier: identity, bytes: byteIdentity(bytes) };
      });
      runs.push({
        run,
        eventCount: migrated.events.length,
        headBefore: observed.events.at(-1).id,
        headAfter: migrated.events.at(-1).id,
        source: byteIdentity(observed.bytes),
        target: byteIdentity(targetBytes),
        events: migrated.mappings,
        carriers,
      });
    }
    const receiptBody = {
      type: "CapabilityCellFabricationRunHistoryMigration",
      migratedAt,
      sourceRuns: source,
      targetRoot: target,
      corrections,
      stageLawMigrations: lawMigrations,
      runs,
    };
    const result = { id: semanticIdentity(receiptBody), ...receiptBody };
    mkdirSync(dirname(receipt), { recursive: true });
    writeFileSync(receipt, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
    renameSync(temporary, target);
    return Object.freeze(result);
  } catch (error) {
    error.migrationTemporaryTarget = temporary;
    throw error;
  }
}
