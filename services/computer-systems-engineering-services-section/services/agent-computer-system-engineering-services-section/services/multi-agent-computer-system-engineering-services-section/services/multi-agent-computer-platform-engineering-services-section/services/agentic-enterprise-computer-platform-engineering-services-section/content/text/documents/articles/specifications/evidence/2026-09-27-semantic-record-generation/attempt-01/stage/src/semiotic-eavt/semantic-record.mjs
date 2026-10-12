import {
  canonicalizeJson,
  admitCanonicalJson,
  canonicalJson,
  JSON_RESOURCE_ENVELOPE,
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
import {
  addressArtifact,
  verifyArtifact,
  isArtifactRef,
} from "./identity/index.mjs";
import { eavtKey, toEavt } from "@red-cup-engineering/eavt-services-section/row";

const ENVELOPE = Object.freeze({
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
const LEGACY_KIND = "metroplat.journal.legacy-seavt-row";
const LEGACY_CLAIM = "semantic-record.legacy-import";
const OBSERVATION_KIND = "metroplat.journal.observation";
const ordinal = (left, right) => left < right ? -1 : left > right ? 1 : 0;

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
    return run();
  } catch (error) {
    if (error?.code === "semantic-record-invalid" || error?.code === "semantic-record-evidence-unavailable") throw error;
    if (error instanceof TypeError || error instanceof RangeError) invalid("input or witness");
    throw error;
  }
}

function snapshot(value, field) {
  try {
    return canonicalizeJson(value, JSON_RESOURCE_ENVELOPE).value;
  } catch {
    invalid(field);
  }
}

function checkEnvelope() {
  const actual = JSON_RESOURCE_ENVELOPE;
  const keys = Object.keys(ENVELOPE);
  if (actual === null || typeof actual !== "object") invalid("JSON resource envelope");
  const actualKeys = Object.keys(actual);
  if (actualKeys.length !== keys.length || keys.some((key) => !Object.hasOwn(actual, key) || actual[key] !== ENVELOPE[key])) {
    invalid("JSON resource envelope");
  }
}

function exactKeys(value, keys, field) {
  if (value === null || Array.isArray(value) || typeof value !== "object") invalid(field);
  const actual = Object.keys(value).sort(ordinal);
  const expected = [...keys].sort(ordinal);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) invalid(field);
}

function scalar(value, field) {
  if (typeof value !== "string" || value.length === 0 || [...value].length > 512) invalid(field);
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) invalid(field);
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) invalid(field);
  }
  return value;
}

function references(value, field) {
  if (!Array.isArray(value)) invalid(field);
  let previous;
  for (const ref of value) {
    if (!isArtifactRef(ref) || (previous !== undefined && ordinal(previous, ref) >= 0)) invalid(field);
    previous = ref;
  }
  return value;
}

function frozenResult(value) {
  try {
    return canonicalizeJson(value, JSON_RESOURCE_ENVELOPE).value;
  } catch {
    invalid("result resource envelope");
  }
}

function witnessForRow(row, seat, claim, causes) {
  const payload = toEavt(row);
  return journalWitness({
    kind: OBSERVATION_KIND,
    payload,
    address: tm.mark(eavtKey(payload)),
    time: String(row.t),
    seat,
    claim,
    causes,
  });
}

function chargeOfTold(told) {
  return told.for
    ? (told.against ? "contested" : "held")
    : (told.against ? "denied" : "unknown");
}

function exactTimestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function artifactValue(pair, field) {
  exactKeys(pair, ["ref", "canonicalText"], `${field} fields`);
  if (typeof pair.ref !== "string" || typeof pair.canonicalText !== "string") invalid(field);
  const verified = verifyArtifact(pair.ref, pair.canonicalText);
  if (verified.canonical.text !== pair.canonicalText) invalid(`${field} canonical text`);
  return verified.canonical.value;
}

function validateLegacyValue(value) {
  exactKeys(value, ["kind", "version", "source", "line", "offset", "length", "raw", "row"], "legacy artifact fields");
  if (value.kind !== LEGACY_KIND || value.version !== 1) invalid("legacy artifact kind or version");
  exactKeys(value.source, ["path", "sha256", "bytes"], "legacy source fields");
  const { path, sha256, bytes } = value.source;
  if (typeof path !== "string" || path.length === 0 || path.startsWith("/") || path.includes("\\") || path.includes("\0")) invalid("legacy source path");
  const parts = path.split("/");
  if (parts.some((part) => part.length === 0 || part === "." || part === "..")) invalid("legacy source path components");
  if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(sha256)) invalid("legacy source digest");
  if (!Number.isSafeInteger(bytes) || bytes < 0) invalid("legacy source byte count");
  for (const [field, minimum] of [["line", 1], ["offset", 0], ["length", 0]]) {
    if (!Number.isSafeInteger(value[field]) || value[field] < minimum) invalid(`legacy ${field}`);
  }
  if (!Number.isSafeInteger(value.offset + value.length) || value.offset + value.length > bytes) invalid("legacy source span");
  if (typeof value.raw !== "string" || value.raw.includes("\n")) invalid("legacy raw line");
  if (/[^\u0020\u0009\u000d]/u.test(value.raw) === false) invalid("legacy blank line");
  if (new TextEncoder().encode(value.raw).byteLength !== value.length) invalid("legacy raw byte length");
  const parsed = admitCanonicalJson(value.raw, JSON_RESOURCE_ENVELOPE).value;
  const normalized = normalizeSeavtRow(parsed);
  if (canonicalJson(normalized, JSON_RESOURCE_ENVELOPE) !== canonicalJson(value.row, JSON_RESOURCE_ENVELOPE)) invalid("legacy normalized row correspondence");
  return value;
}

function makeLegacyImport(rowArtifact, options) {
  exactKeys(options, ["operator", "importedAt", "causes"], "legacy import options fields");
  const operator = scalar(options.operator, "legacy import operator");
  if (!exactTimestamp(options.importedAt)) invalid("legacy import timestamp");
  const causes = references(options.causes, "legacy import causes");
  const witness = journalWitness({
    kind: OBSERVATION_KIND,
    seat: operator,
    claim: tm.mark(LEGACY_CLAIM),
    address: tm.mark(rowArtifact.ref),
    time: options.importedAt,
    causes,
    payload: { kind: "metroplat.journal.legacy-import", version: 1, row: rowArtifact.ref },
    referencedArtifacts: [rowArtifact.ref],
  });
  return frozenResult({ witness, artifacts: [rowArtifact] });
}

export function semanticRecordCandidates(input) {
  return guard(() => {
    checkEnvelope();
    const value = snapshot(input, "input JSON");
    exactKeys(value, ["objectKind", "category", "record", "recordedAt", "told", "relation", "causes", "origin"].filter((key) => Object.hasOwn(value, key)), "candidate input fields");
    for (const key of ["objectKind", "category", "record", "recordedAt", "told"]) {
      if (!Object.hasOwn(value, key)) invalid(`candidate ${key}`);
    }
    const objectKind = scalar(value.objectKind, "objectKind");
    const category = scalar(value.category, "category");
    exactKeys(value.told, ["for", "against"], "told fields");
    if (typeof value.told.for !== "boolean" || typeof value.told.against !== "boolean") invalid("told booleans");
    const told = value.told;
    const causes = value.causes === undefined ? [] : references(value.causes, "causes");
    const origin = value.origin === undefined ? objectKind : scalar(value.origin, "origin");
    let relation;
    if (Object.hasOwn(value, "relation")) {
      exactKeys(value.relation, ["subject", "predicate", "object"], "relation fields");
      relation = value.relation;
    }
    const record = value.record;
    const identity = identifyJsonSemanticContent({ objectKind, value: record, witnessRoot: EMPTY_WITNESS_ROOT });
    const row = seavtRow({
      e: jsonToTerm(identity.id),
      a: jsonToTerm(category),
      v: jsonToTerm(record),
      t: value.recordedAt,
    });
    const witnesses = [witnessForRow(
      row,
      origin,
      tm.mark(`semantic-record.${chargeOfTold(told)}`),
      causes,
    )];
    if (relation !== undefined) {
      const relationRow = seavtRow({
        e: jsonToTerm(relation.subject),
        a: jsonToTerm(relation.predicate),
        v: jsonToTerm(relation.object),
        t: value.recordedAt,
      });
      witnesses.push(witnessForRow(relationRow, origin, tm.mark("semantic-record.relation"), causes));
    }
    return frozenResult({ id: identity.id, objectKind, told, witnesses });
  });
}

export function legacySemanticRowArtifact(value) {
  return guard(() => {
    checkEnvelope();
    const input = snapshot(value, "legacy artifact input");
    validateLegacyValue(input);
    const addressed = addressArtifact(input);
    return frozenResult({ ref: addressed.ref, canonicalText: addressed.canonical.text });
  });
}

export function legacySemanticImport(rowArtifact, options) {
  return guard(() => {
    checkEnvelope();
    const pair = snapshot(rowArtifact, "legacy row artifact");
    const artifact = artifactValue(pair, "legacy row artifact");
    validateLegacyValue(artifact);
    const expected = addressArtifact(artifact);
    if (expected.ref !== pair.ref || expected.canonical.text !== pair.canonicalText) invalid("legacy row artifact correspondence");
    return makeLegacyImport(pair, snapshot(options, "legacy import options"));
  });
}

function observationClaim(witness) {
  return canonicalJson(witness.observation.claim, JSON_RESOURCE_ENVELOPE);
}

function rowFromObservation(witness, field) {
  const observation = witness.observation;
  if (!Array.isArray(observation.payload)) invalid(`${field} payload`);
  const row = normalizeSeavtRow(observation.payload);
  if (canonicalJson(toEavt(row), JSON_RESOURCE_ENVELOPE) !== canonicalJson(observation.payload, JSON_RESOURCE_ENVELOPE)) invalid(`${field} payload row`);
  if (observation.address === null || canonicalJson(observation.address, JSON_RESOURCE_ENVELOPE) !== canonicalJson(tm.mark(eavtKey(toEavt(row))), JSON_RESOURCE_ENVELOPE)) invalid(`${field} address`);
  if (observation.time !== String(row.t)) invalid(`${field} time`);
  if (typeof observation.seat !== "string" || observation.seat.length === 0 || [...observation.seat].length > 512) invalid(`${field} seat`);
  if (!Array.isArray(witness.core.causes)) invalid(`${field} causes`);
  return row;
}

function resolveRowArtifact(resolveArtifact, ref) {
  let pair;
  try {
    pair = resolveArtifact(ref);
  } catch (error) {
    throw error;
  }
  if (pair === null || pair === undefined) unavailable("legacy row artifact");
  if (pair && typeof pair.then === "function") invalid("synchronous artifact resolver");
  const copy = snapshot(pair, "resolved artifact pair");
  const value = artifactValue(copy, "resolved artifact pair");
  validateLegacyValue(value);
  if (copy.ref !== ref) invalid("resolved artifact reference");
  const addressed = addressArtifact(value);
  if (addressed.ref !== copy.ref || addressed.canonical.text !== copy.canonicalText) invalid("resolved artifact correspondence");
  return { pair: copy, value };
}

function compareWitnesses(left, right) {
  return ordinal(canonicalJson(left, JSON_RESOURCE_ENVELOPE), canonicalJson(right, JSON_RESOURCE_ENVELOPE));
}

export function projectSemanticRecords(input, resolveArtifact) {
  return guard(() => {
    checkEnvelope();
    const selected = snapshot(input, "projection input");
    exactKeys(selected, ["objectKind", "category", "witnesses"], "projection input fields");
    const objectKind = scalar(selected.objectKind, "objectKind");
    const category = scalar(selected.category, "category");
    if (!Array.isArray(selected.witnesses) || typeof resolveArtifact !== "function") invalid("projection witnesses or resolver");
    const byId = new Map();
    const records = [];
    const legacyClaim = canonicalJson(tm.mark(LEGACY_CLAIM), JSON_RESOURCE_ENVELOPE);
    const modernClaims = new Map(MODERN_CHARGES.map((charge) => [canonicalJson(tm.mark(`semantic-record.${charge}`), JSON_RESOURCE_ENVELOPE), charge]));

    for (const supplied of selected.witnesses) {
      const witness = parseJournalWitness(supplied);
      const claim = observationClaim(witness);
      const charge = modernClaims.get(claim);
      const isLegacy = claim === legacyClaim;
      if (charge === undefined && !isLegacy) continue;

      if (isLegacy) {
        const observation = witness.observation;
        exactKeys(observation, ["kind", "seat", "claim", "address", "time", "causes", "payload", "referencedArtifacts"], "legacy observation fields");
        if (observation.kind !== OBSERVATION_KIND || !exactTimestamp(observation.time)) invalid("legacy observation timestamp");
        const payload = observation.payload;
        exactKeys(payload, ["kind", "version", "row"], "legacy payload fields");
        if (payload.kind !== "metroplat.journal.legacy-import" || payload.version !== 1 || !isArtifactRef(payload.row)) invalid("legacy payload");
        scalar(observation.seat, "legacy operator");
        references(observation.causes, "legacy causes");
        if (!Array.isArray(observation.referencedArtifacts) || observation.referencedArtifacts.length !== 1 || observation.referencedArtifacts[0] !== payload.row) invalid("legacy referenced artifact");
        if (canonicalJson(observation.address, JSON_RESOURCE_ENVELOPE) !== canonicalJson(tm.mark(payload.row), JSON_RESOURCE_ENVELOPE)) invalid("legacy address");
        const resolved = resolveRowArtifact(resolveArtifact, payload.row);
        const reconstructed = makeLegacyImport(
          { ref: resolved.pair.ref, canonicalText: resolved.pair.canonicalText },
          { operator: observation.seat, importedAt: observation.time, causes: observation.causes },
        );
        const reconstructedWitness = parseJournalWitness(reconstructed.witness);
        if (canonicalJson(witness, JSON_RESOURCE_ENVELOPE) !== canonicalJson(reconstructedWitness, JSON_RESOURCE_ENVELOPE)) invalid("legacy witness reconstruction");
        const row = resolved.value.row;
        const decodedId = termToJson(row.e);
        const decodedCategory = termToJson(row.a);
        const record = termToJson(row.v);
        if (decodedCategory !== category) continue;
        const identity = identifyJsonSemanticContent({ objectKind, value: record, witnessRoot: EMPTY_WITNESS_ROOT });
        if (identity.id !== decodedId) invalid("legacy content identity");
        const source = resolved.value.source;
        records.push({
          result: {
            id: decodedId,
            objectKind,
            category: decodedCategory,
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
              operator: observation.seat,
              importedAt: observation.time,
              causes: observation.causes,
              rowArtifact: resolved.pair.ref,
              source: source.path,
              line: resolved.value.line,
              offset: resolved.value.offset,
              length: resolved.value.length,
            },
          },
          time: row.t,
          event: witness.id,
          identity: witness.id,
          witness,
        });
        if (byId.has(witness.id)) {
          if (compareWitnesses(byId.get(witness.id), witness) !== 0) invalid("conflicting witness identity");
          records.pop();
        } else byId.set(witness.id, witness);
        continue;
      }

      const row = rowFromObservation(witness, "modern record");
      const observation = witness.observation;
      if (observation.kind !== OBSERVATION_KIND || !Array.isArray(observation.causes)) invalid("modern observation");
      const decodedId = termToJson(row.e);
      const decodedCategory = termToJson(row.a);
      const record = termToJson(row.v);
      if (decodedCategory !== category) continue;
      const identity = identifyJsonSemanticContent({ objectKind, value: record, witnessRoot: EMPTY_WITNESS_ROOT });
      if (identity.id !== decodedId) invalid("modern content identity");
      const told = {
        for: charge === "held" || charge === "contested",
        against: charge === "denied" || charge === "contested",
      };
      records.push({
        result: {
          id: decodedId,
          objectKind,
          category: decodedCategory,
          recordedAt: row.t,
          record,
          told,
          event: witness.id,
          origin: observation.seat,
          causes: witness.core.causes,
          attribution: { kind: "witnessed" },
          custody: null,
        },
        time: row.t,
        event: witness.id,
        identity: witness.id,
        witness,
      });
      if (byId.has(witness.id)) {
        if (compareWitnesses(byId.get(witness.id), witness) !== 0) invalid("conflicting witness identity");
        records.pop();
      } else byId.set(witness.id, witness);
    }

    records.sort((left, right) => {
      const leftTimed = exactTimestamp(left.time);
      const rightTimed = exactTimestamp(right.time);
      if (leftTimed !== rightTimed) return leftTimed ? -1 : 1;
      if (leftTimed) return ordinal(left.time, right.time) || ordinal(left.identity, right.identity);
      return ordinal(canonicalJson(left.time, JSON_RESOURCE_ENVELOPE), canonicalJson(right.time, JSON_RESOURCE_ENVELOPE))
        || ordinal(left.identity, right.identity);
    });
    return frozenResult(records.map(({ result }) => result));
  });
}
