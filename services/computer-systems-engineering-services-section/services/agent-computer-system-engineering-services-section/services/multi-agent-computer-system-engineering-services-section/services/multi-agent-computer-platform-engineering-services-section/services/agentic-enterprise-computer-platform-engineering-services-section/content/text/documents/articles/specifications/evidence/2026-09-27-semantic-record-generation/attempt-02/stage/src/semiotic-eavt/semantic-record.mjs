import {
  JSON_RESOURCE_ENVELOPE,
  admitCanonicalJson,
  canonicalJson,
  canonicalizeJson,
} from "@red-cup-engineering/json-services-section";
import {
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "../semiotic-expression-notation/runtime.mjs";
import { jsonToTerm, termToJson } from "../semiotic-expression-notation/json-codec.mjs";
import { tm } from "../semiotic-expression-notation/notation.mjs";
import { seavtRow } from "./admit-seavt-row.mjs";
import { normalizeSeavtRow } from "./normalize-seavt-row.mjs";
import { journalWitness, parseJournalWitness } from "./journal/event.mjs";
import { addressArtifact, isArtifactRef, verifyArtifact } from "./identity/index.mjs";
import { eavtKey, toEavt } from "@red-cup-engineering/eavt-services-section/row";

const EXPECTED_ENVELOPE = Object.freeze({
  maxSourceBytes: 1048576,
  maxCanonicalBytes: 1048576,
  maxDepth: 64,
  maxNodes: 100000,
  maxObjectMembers: 4096,
  maxArrayLength: 65536,
  maxStringBytes: 262144,
  maxKeyBytes: 1024,
});
const MODERN_CHARGES = Object.freeze(["unknown", "held", "denied", "contested"]);
const LEGACY_CLAIM = tm.mark("semantic-record.legacy-import");
const RELATION_CLAIM = tm.mark("semantic-record.relation");
const UTF8 = new TextEncoder();

function invalid(field) {
  const error = new TypeError(`semantic record ${field} is invalid`);
  error.code = "semantic-record-invalid";
  throw error;
}

function unavailable(field) {
  const error = new TypeError(`semantic record ${field} evidence is unavailable`);
  error.code = "semantic-record-evidence-unavailable";
  throw error;
}
}

function guard(run) {
  try {
    checkEnvelope();
    return run();
  } catch (error) {
    if (error?.code === "semantic-record-invalid" || error?.code === "semantic-record-evidence-unavailable") throw error;
    if (error instanceof TypeError || error instanceof RangeError) invalid("input or constructed value");
    throw error;
  }
}

function checkEnvelope() {
  const actual = JSON_RESOURCE_ENVELOPE;
  const keys = Object.keys(EXPECTED_ENVELOPE);
  if (!actual || Object.keys(actual).length !== keys.length) invalid("JSON resource envelope");
  for (const key of keys) if (actual[key] !== EXPECTED_ENVELOPE[key]) invalid("JSON resource envelope");
  if (Object.keys(actual).some((key) => !Object.hasOwn(EXPECTED_ENVELOPE, key))) invalid("JSON resource envelope");
}

function snapshot(value, field) {
  try {
    return canonicalizeJson(value, JSON_RESOURCE_ENVELOPE).value;
  } catch {
    invalid(field);
  }
}

function result(value) {
  return snapshot(value, "result envelope");
}

function sameKeys(value, keys, field) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) invalid(field);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) invalid(field);
}

function scalar(value, field) {
  if (typeof value !== "string" || value.length === 0 || [...value].length > 512) invalid(field);
  for (let i = 0; i < value.length; i += 1) {
    const unit = value.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) invalid(field);
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) invalid(field);
  }
  return value;
}

function ordinal(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function references(value, field) {
  if (!Array.isArray(value)) invalid(field);
  let previous;
  for (const reference of value) {
    if (typeof reference !== "string" || !isArtifactRef(reference)) invalid(field);
    if (previous !== undefined && ordinal(previous, reference) >= 0) invalid(field);
    previous = reference;
  }
  return value;
}

function equalJson(left, right, field) {
  try {
    return canonicalJson(left, JSON_RESOURCE_ENVELOPE) === canonicalJson(right, JSON_RESOURCE_ENVELOPE);
  } catch {
    invalid(field);
  }
}

function exactTimestamp(value, field = "timestamp") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) invalid(field);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) invalid(field);
  return value;
}

function chargeOf(told) {
  return told.for ? (told.against ? "contested" : "held") : (told.against ? "denied" : "unknown");
}

function canonicalObservationClaim(claim) {
  return canonicalJson(claim, JSON_RESOURCE_ENVELOPE);
}

function modernClaim(claim) {
  const text = canonicalObservationClaim(claim);
  for (const charge of MODERN_CHARGES) {
    if (text === canonicalObservationClaim(tm.mark(`semantic-record.${charge}`))) return charge;
  }
  return null;
}

function rowPayload(row) {
  return toEavt(row);
}

function witnessForRow(row, origin, causes, claim) {
  const payload = rowPayload(row);
  return journalWitness({
    kind: "metroplat.journal.observation",
    payload,
    address: tm.mark(eavtKey(payload)),
    time: String(row.t),
    seat: origin,
    causes,
    claim,
  });
}

function validateArtifactValue(value) {
  sameKeys(value, ["kind", "version", "source", "line", "offset", "length", "raw", "row"], "legacy artifact fields");
  if (value.kind !== "metroplat.journal.legacy-seavt-row" || value.version !== 1) invalid("legacy artifact kind or version");
  sameKeys(value.source, ["path", "sha256", "bytes"], "legacy source fields");
  const path = value.source.path;
  if (typeof path !== "string" || path.length === 0 || path.startsWith("/") || path.includes("\\") || path.includes("\0")) invalid("legacy source path");
  const components = path.split("/");
  if (components.some((part) => part === "" || part === "." || part === "..")) invalid("legacy source path");
  if (typeof value.source.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(value.source.sha256)) invalid("legacy source digest");
  for (const [field, minimum] of [["bytes", 0], ["line", 1], ["offset", 0], ["length", 0]]) {
    const owner = field === "bytes" ? value.source : value;
    const number = owner[field];
    if (!Number.isSafeInteger(number) || number < minimum) invalid(`legacy ${field}`);
  }
  const end = value.offset + value.length;
  if (!Number.isSafeInteger(end) || end > value.source.bytes) invalid("legacy source span");
  if (typeof value.raw !== "string" || value.raw.includes("\n") || /^[ \t\r]*$/u.test(value.raw)) invalid("legacy raw row");
  if (UTF8.encode(value.raw).byteLength !== value.length) invalid("legacy raw byte length");
  let parsed;
  try {
    parsed = admitCanonicalJson(value.raw, JSON_RESOURCE_ENVELOPE).value;
  } catch {
    invalid("legacy raw JSON");
  }
  let normalized;
  try {
    normalized = normalizeSeavtRow(parsed);
  } catch {
    invalid("legacy normalized row");
  }
  if (!equalJson(normalized, value.row, "legacy row equality")) invalid("legacy row correspondence");
  return value;
}

function artifactPair(value) {
  sameKeys(value, ["ref", "canonicalText"], "artifact pair fields");
  if (typeof value.ref !== "string" || !isArtifactRef(value.ref) || typeof value.canonicalText !== "string") invalid("artifact pair");
  let verified;
  try {
    verified = verifyArtifact(value.ref, value.canonicalText);
  } catch {
    invalid("artifact reference or body");
  }
  if (verified.canonical.text !== value.canonicalText) invalid("artifact canonical text");
  validateArtifactValue(verified.canonical.value);
  const expected = addressArtifact(verified.canonical.value);
  if (expected.ref !== value.ref || expected.canonical.text !== value.canonicalText) invalid("artifact identity");
  return { ref: value.ref, canonicalText: value.canonicalText, value: verified.canonical.value };
}

function buildLegacyImport(rowArtifact, options) {
  const artifact = artifactPair(rowArtifact);
  sameKeys(options, ["operator", "importedAt", "causes"], "legacy import options");
  const operator = scalar(options.operator, "operator");
  const importedAt = exactTimestamp(options.importedAt, "importedAt");
  const causes = references(options.causes, "causes");
  const witness = journalWitness({
    kind: "metroplat.journal.observation",
    seat: operator,
    claim: LEGACY_CLAIM,
    address: tm.mark(artifact.ref),
    time: importedAt,
    causes,
    payload: { kind: "metroplat.journal.legacy-import", version: 1, row: artifact.ref },
    referencedArtifacts: [artifact.ref],
  });
  return { witness, artifacts: [{ ref: artifact.ref, canonicalText: artifact.canonicalText }] };
}

/** Construct unpersisted modern record and optional relation witness candidates. */
export function semanticRecordCandidates(input) {
  return guard(() => {
    const value = snapshot(input, "input JSON");
    sameKeys(value, ["objectKind", "category", "record", "recordedAt", "told", "relation", "causes", "origin"].filter((key) => Object.hasOwn(value, key)), "input fields");
    for (const required of ["objectKind", "category", "record", "recordedAt", "told"]) if (!Object.hasOwn(value, required)) invalid(`${required} field`);
    const objectKind = scalar(value.objectKind, "objectKind");
    const category = scalar(value.category, "category");
    sameKeys(value.told, ["for", "against"], "told fields");
    if (typeof value.told.for !== "boolean" || typeof value.told.against !== "boolean") invalid("told booleans");
    const told = value.told;
    const causes = Object.hasOwn(value, "causes") ? references(value.causes, "causes") : [];
    const origin = scalar(Object.hasOwn(value, "origin") ? value.origin : objectKind, "origin");
    let relation;
    if (Object.hasOwn(value, "relation")) {
      relation = value.relation;
      sameKeys(relation, ["subject", "predicate", "object"], "relation fields");
    }
    const identity = identifyJsonSemanticContent({ objectKind, value: value.record, witnessRoot: EMPTY_WITNESS_ROOT });
    const recordRow = seavtRow({ e: jsonToTerm(identity.id), a: jsonToTerm(category), v: jsonToTerm(value.record), t: value.recordedAt });
    const witnesses = [witnessForRow(recordRow, origin, causes, tm.mark(`semantic-record.${chargeOf(told)}`))];
    if (relation !== undefined) {
      const relationRow = seavtRow({ e: jsonToTerm(relation.subject), a: jsonToTerm(relation.predicate), v: jsonToTerm(relation.object), t: value.recordedAt });
      witnesses.push(witnessForRow(relationRow, origin, causes, RELATION_CLAIM));
    }
    return result({ id: identity.id, objectKind, told, witnesses });
  });
}

/** Turn one exact historical SEAVT line occurrence into a content-addressed artifact. */
export function legacySemanticRowArtifact(value) {
  return guard(() => {
    const admitted = snapshot(value, "legacy artifact JSON");
    validateArtifactValue(admitted);
    const addressed = addressArtifact(admitted);
    return result({ ref: addressed.ref, canonicalText: addressed.canonical.text });
  });
}

/** Construct the migration observation for a verified historical row artifact. */
export function legacySemanticImport(rowArtifact, options) {
  return guard(() => {
    const artifactInput = snapshot(rowArtifact, "legacy artifact pair JSON");
    const optionsInput = snapshot(options, "legacy import options JSON");
    const built = buildLegacyImport(artifactInput, optionsInput);
    return result(built);
  });
}

function verifiedWitness(value) {
  const admitted = snapshot(value, "witness JSON");
  try {
    return parseJournalWitness(admitted);
  } catch {
    invalid("journal witness structure");
  }
}

function modernResult(witness, objectKind, category, charge) {
  const observation = witness.observation;
  const payload = observation.payload;
  if (!Array.isArray(payload) || payload.length !== 4) invalid("modern row payload");
  let row;
  try {
    row = normalizeSeavtRow(payload);
  } catch {
    invalid("modern SEAVT row");
  }
  const normalizedPayload = toEavt(row);
  if (!equalJson(normalizedPayload, payload, "modern payload normalization")) invalid("modern payload normalization");
  if (!equalJson(observation.address, tm.mark(eavtKey(normalizedPayload)), "modern row address")) invalid("modern row address");
  if (observation.time !== String(row.t)) invalid("modern row time");
  scalar(observation.seat, "modern origin");
  const causes = references(observation.causes, "modern causes");
  const id = termToJson(row.e);
  const rowCategory = termToJson(row.a);
  const record = termToJson(row.v);
  let computed;
  try {
    computed = identifyJsonSemanticContent({ objectKind, value: record, witnessRoot: EMPTY_WITNESS_ROOT }).id;
  } catch {
    invalid("modern content identity");
  }
  if (id !== computed) invalid("modern content identity");
  if (rowCategory !== category) return null;
  const told = {
    unknown: { for: false, against: false },
    held: { for: true, against: false },
    denied: { for: false, against: true },
    contested: { for: true, against: true },
  }[charge];
  return {
    id,
    objectKind,
    category,
    recordedAt: row.t,
    record,
    told,
    event: witness.id,
    origin: observation.seat,
    causes,
    attribution: { kind: "witnessed" },
    custody: null,
  };
}

function validateLegacyWitness(witness, resolveArtifact) {
  const observation = witness.observation;
  sameKeys(observation, ["kind", "seat", "claim", "address", "time", "causes", "payload", "referencedArtifacts"], "legacy observation fields");
  if (observation.kind !== "metroplat.journal.observation" || !equalJson(observation.claim, LEGACY_CLAIM, "legacy claim")) invalid("legacy claim");
  const operator = scalar(observation.seat, "legacy operator");
  const importedAt = exactTimestamp(observation.time, "legacy importedAt");
  const causes = references(observation.causes, "legacy causes");
  const payload = observation.payload;
  sameKeys(payload, ["kind", "version", "row"], "legacy payload fields");
  if (payload.kind !== "metroplat.journal.legacy-import" || payload.version !== 1 || typeof payload.row !== "string" || !isArtifactRef(payload.row)) invalid("legacy payload");
  if (!equalJson(observation.address, tm.mark(payload.row), "legacy address")) invalid("legacy address");
  if (!Array.isArray(observation.referencedArtifacts) || observation.referencedArtifacts.length !== 1 || observation.referencedArtifacts[0] !== payload.row) invalid("legacy artifact references");
  let resolved;
  try {
    resolved = resolveArtifact(payload.row);
  } catch (error) {
    throw { resolverFailure: true, error };
  }
  if (resolved === null || resolved === undefined) unavailable("legacy row body");
  const pair = snapshot(resolved, "resolved artifact JSON");
  const artifact = artifactPair(pair);
  if (artifact.ref !== payload.row) invalid("resolved artifact reference");
  const reconstructed = buildLegacyImport(pair, { operator, importedAt, causes });
  if (!equalJson(witness, reconstructed.witness, "legacy witness reconstruction")) invalid("legacy witness reconstruction");
  return { artifact, operator, importedAt, causes };
}

function timestampSortValue(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value ? value : null;
}

function compareResults(left, right) {
  const leftTime = timestampSortValue(left.recordedAt);
  const rightTime = timestampSortValue(right.recordedAt);
  if (leftTime !== null && rightTime === null) return -1;
  if (leftTime === null && rightTime !== null) return 1;
  let compared;
  if (leftTime !== null) compared = ordinal(leftTime, rightTime);
  else compared = ordinal(canonicalJson(left.recordedAt, JSON_RESOURCE_ENVELOPE), canonicalJson(right.recordedAt, JSON_RESOURCE_ENVELOPE));
  if (compared !== 0) return compared;
  const leftEvent = left.event ?? left.custody.event;
  const rightEvent = right.event ?? right.custody.event;
  return ordinal(leftEvent, rightEvent);
}

/** Project one already admitted witness view into selected semantic records. */
export function projectSemanticRecords(input, resolveArtifact) {
  let resolverThrew = false;
  let resolverThrown;
  try {
    return guard(() => {
      const value = snapshot(input, "projection input JSON");
      sameKeys(value, ["objectKind", "category", "witnesses"], "projection input fields");
      const objectKind = scalar(value.objectKind, "objectKind");
      const category = scalar(value.category, "category");
      if (!Array.isArray(value.witnesses)) invalid("witnesses");
      if (typeof resolveArtifact !== "function") invalid("artifact resolver");
      const byId = new Map();
      for (const supplied of value.witnesses) {
        const witness = verifiedWitness(supplied);
        const claim = witness.observation.claim;
        const charge = modernClaim(claim);
        let projected = null;
        if (charge !== null) {
          projected = modernResult(witness, objectKind, category, charge);
        } else if (equalJson(claim, LEGACY_CLAIM, "claim comparison")) {
          let custody;
          try {
            custody = validateLegacyWitness(witness, resolveArtifact);
          } catch (error) {
            if (error?.resolverFailure === true) {
              resolverThrew = true;
              resolverThrown = error.error;
              throw error.error;
            }
            throw error;
          }
          const row = custody.artifact.value.row;
          const id = termToJson(row.e);
          const rowCategory = termToJson(row.a);
          const record = termToJson(row.v);
          let expectedId;
          try {
            expectedId = identifyJsonSemanticContent({ objectKind, value: record, witnessRoot: EMPTY_WITNESS_ROOT }).id;
          } catch {
            invalid("legacy content identity");
          }
          if (id !== expectedId) invalid("legacy content identity");
          if (rowCategory === category) {
            const source = custody.artifact.value.source;
            projected = {
              id,
              objectKind,
              category,
              recordedAt: row.t,
              record,
              told: null,
              event: null,
              origin: null,
              causes: null,
              attribution: { kind: "unavailable", reason: "legacy-row" },
              custody: {
                kind: "legacy-import",
                event: witness.id,
                operator: custody.operator,
                importedAt: custody.importedAt,
                causes: custody.causes,
                rowArtifact: custody.artifact.ref,
                source,
                line: custody.artifact.value.line,
                offset: custody.artifact.value.offset,
                length: custody.artifact.value.length,
              },
            };
          }
        }
        if (projected === null) continue;
        const normalized = result(projected);
        const existing = byId.get(witness.id);
        if (existing !== undefined) {
          if (!equalJson(existing.normalized, witness, "duplicate witness identity")) invalid("conflicting witness identity");
          continue;
        }
        byId.set(witness.id, { normalized, witness });
      }
      return result([...byId.values()].map((entry) => entry.normalized).sort(compareResults));
    });
  } catch (error) {
    if (resolverThrew) throw resolverThrown;
    throw error;
  }
}
