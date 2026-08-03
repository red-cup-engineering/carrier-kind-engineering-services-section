// witness-journal-entry-service — pure entry law.
//
// A witness-journal entry is SEAVT (Semiotic EAVT). E, A, and V are Semiotic
// Resource Name surfaces whose readout derives closed RMN path claims; T is
// stored time. The generic JSON constructor below is retained as
// an explicit compatibility boundary for callers not yet migrated to that
// source law. An entry carries no charge (a charge is a
// reading, a projection computed over entries by the state service, never a
// field stored on one entry) and no stored trace (a trace is an entry's
// ordinal in its journal, computed by the log service at read time, never
// carried by the entry itself). This module only builds and validates
// entries; it performs no I/O and knows nothing about a journal's append
// order.
//
// `seavt` is the strict constructor. `entry`/`isEntry` are the explicitly
// non-semantic general-JSON compatibility shape, including its optional
// predicate hook.

import { isJsonValue, canonical } from "@red-cup-engineering/json-file-codec-service";
import { addressSemioticResourceName } from "@red-cup-engineering/semiotic-resource-name-addressing-service";
import { jsonToTerm } from "@red-cup-engineering/relation-model-notation-json-codec";
import { inferTy } from "@red-cup-engineering/relation-model-notation-typing";
import {
  EMPTY_WITNESS_ROOT,
  identifyNormalizedSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";
import {
  eavtRecord,
  isEavtShape,
} from "@red-cup-engineering/json-file-codec-service/jsonl/eavt";

/**
 * @typedef {{ readonly e: import("@red-cup-engineering/json-file-codec-service").JsonValue,
 *             readonly a: import("@red-cup-engineering/json-file-codec-service").JsonValue,
 *             readonly v: import("@red-cup-engineering/json-file-codec-service").JsonValue,
 *             readonly t: import("@red-cup-engineering/json-file-codec-service").JsonValue }} WitnessJournalEntry
 */

/**
 * @typedef {{ readonly e: string, readonly a: string, readonly v: string,
 *             readonly t: import("@red-cup-engineering/json-file-codec-service").JsonValue }} Seavt
 */

/**
 * @typedef {{ readonly e: readonly unknown[], readonly a: readonly unknown[], readonly v: readonly unknown[],
 *             readonly t: import("@red-cup-engineering/json-file-codec-service").JsonValue }} SeavtReadout
 */

/**
 * @typedef {{ readonly e: import("@red-cup-engineering/semiotic-resource-name-addressing-service").SemioticResourceNameAddress,
 *             readonly a: import("@red-cup-engineering/semiotic-resource-name-addressing-service").SemioticResourceNameAddress,
 *             readonly v: import("@red-cup-engineering/semiotic-resource-name-addressing-service").SemioticResourceNameAddress,
 *             readonly t: import("@red-cup-engineering/json-file-codec-service").JsonValue }} AddressedSeavtReadout
 */

function present(value) {
  return value !== undefined;
}

/**
 * Assert that a value is shaped like a witness-journal entry: an object with
 * present, JSON-valued `e`, `a`, `v`, `t`, or the four-element tuple spelling
 * `[e, a, v, t]`. Throws a `TypeError` naming the first law it breaks.
 *
 * @param {unknown} value
 */
export function assertValidEntry(value) {
  if (Array.isArray(value)) {
    if (value.length !== 4) {
      throw new TypeError("witness-journal entry: tuple spelling must have exactly four parts [e, a, v, t]");
    }
    if (!isEavtShape(value)) {
      throw new TypeError("witness-journal entry: tuple parts must all be JSON values");
    }
    return;
  }
  if (typeof value !== "object" || value === null) {
    throw new TypeError("witness-journal entry: must be an object with e, a, v, t or a four-element tuple");
  }
  for (const field of /** @type {const} */ (["e", "a", "v", "t"])) {
    if (!present(/** @type {Record<string, unknown>} */ (value)[field])) {
      throw new TypeError(`witness-journal entry: field "${field}" is required`);
    }
    if (!isJsonValue(/** @type {Record<string, unknown>} */ (value)[field])) {
      throw new TypeError(`witness-journal entry: field "${field}" must be a JSON value`);
    }
  }
}

/**
 * Whether a value is shaped like a witness-journal entry (object or tuple
 * spelling). Never throws.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isEntry(value) {
  try {
    assertValidEntry(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a valid tuple-or-object row into the canonical `{e, a, v, t}`
 * entry record. Throws if the row is not entry-shaped.
 *
 * @param {unknown} row
 * @returns {WitnessJournalEntry}
 */
export function asEntry(row) {
  assertValidEntry(row);
  return /** @type {WitnessJournalEntry} */ (eavtRecord(/** @type {any} */ (row)));
}

/**
 * Build one witness-journal entry, subject-predicate-object-time.
 *
 * `predicateIsValid`, if supplied, is consulted after presence/JSON-value
 * checks — the seam a future RMN-term checker plugs into without this
 * package needing to depend on the notation section.
 *
 * @param {import("@red-cup-engineering/json-file-codec-service").JsonValue} subject
 * @param {import("@red-cup-engineering/json-file-codec-service").JsonValue} predicate
 * @param {import("@red-cup-engineering/json-file-codec-service").JsonValue} object
 * @param {import("@red-cup-engineering/json-file-codec-service").JsonValue} time
 * @param {{ readonly predicateIsValid?: (predicate: import("@red-cup-engineering/json-file-codec-service").JsonValue) => boolean }} [options]
 * @returns {WitnessJournalEntry}
 */
export function entry(subject, predicate, object, time, options = {}) {
  const candidate = { e: subject, a: predicate, v: object, t: time };
  assertValidEntry(candidate);
  if (options.predicateIsValid !== undefined && !options.predicateIsValid(predicate)) {
    throw new TypeError("witness-journal entry: predicate (A) failed the supplied RMN-term check");
  }
  return /** @type {WitnessJournalEntry} */ (eavtRecord(candidate));
}

/**
 * Whether two entries are the same witness by canonical content, irrespective
 * of field order or tuple-vs-object spelling.
 *
 * @param {unknown} left
 * @param {unknown} right
 * @returns {boolean}
 */
export function sameEntry(left, right) {
  return canonical(/** @type {any} */ (asEntry(left))) === canonical(/** @type {any} */ (asEntry(right)));
}

function deriveSemioticCoordinate(field, surface) {
  if (typeof surface !== "string") {
    throw new TypeError(`SEAVT row: field "${field}" must be an SRN surface string`);
  }
  try {
    return addressSemioticResourceName(surface);
  } catch {
    throw new TypeError(`SEAVT row: field "${field}" must derive to a closed RMN path term`);
  }
}

/**
 * Assert that a row belongs to SEAVT. E, A, and
 * V must be canonical Three-Dots-and-a-Dash source surfaces that derive to
 * RMN paths. T deliberately remains caller-supplied JSON/time material.
 *
 * `assertValidEntry` remains a separate generic compatibility law.
 *
 * @param {unknown} value
 */
export function assertValidSeavt(value) {
  const row = asEntry(value);
  deriveSemioticCoordinate("e", row.e);
  deriveSemioticCoordinate("a", row.a);
  deriveSemioticCoordinate("v", row.v);
}

/**
 * Whether a value belongs to SEAVT. Never throws.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isSeavt(value) {
  try {
    assertValidSeavt(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a SEAVT row to its source record. E/A/V remain their
 * original SRN surface strings; use `readSeavt` for their RMN meanings.
 *
 * @param {unknown} row
 * @returns {Seavt}
 */
export function asSeavt(row) {
  assertValidSeavt(row);
  return /** @type {Seavt} */ (asEntry(row));
}

/**
 * Build one SEAVT source row. It does not store identity, charge, or trace.
 * Semantic identity is earned separately by `identifySeavtSemanticContent`.
 *
 * @param {string} entity
 * @param {string} attribute
 * @param {string} value
 * @param {import("@red-cup-engineering/json-file-codec-service").JsonValue} time
 * @returns {Seavt}
 */
export function seavt(entity, attribute, value, time) {
  return asSeavt(entry(entity, attribute, value, time));
}

/**
 * Pure strict-profile readout: derive the RMN claims directly from the stored
 * SRN source surfaces. No identity is decoded, and the source row is not
 * mutated.
 *
 * @param {unknown} row
 * @returns {SeavtReadout}
 */
export function readSeavt(row) {
  const source = asSeavt(row);
  return Object.freeze({
    e: deriveSemioticCoordinate("e", source.e).claim.term,
    a: deriveSemioticCoordinate("a", source.a).claim.term,
    v: deriveSemioticCoordinate("v", source.v).claim.term,
    t: source.t,
  });
}

/**
 * Addressed SEAVT readout. Each source surface remains visible beside the
 * typed RMN claim it denotes and the opaque NI token committing to that
 * claim. The source row itself remains the four-field SEAVT value.
 *
 * @param {unknown} row
 * @returns {AddressedSeavtReadout}
 */
export function readAddressedSeavt(row) {
  const source = asSeavt(row);
  return Object.freeze({
    e: deriveSemioticCoordinate("e", source.e),
    a: deriveSemioticCoordinate("a", source.a),
    v: deriveSemioticCoordinate("v", source.v),
    t: source.t,
  });
}

/**
 * Identify one strict SEAVT witness under explicit custody.
 *
 * E/A/V enter as their complete addressed coordinates: visible SRN surface,
 * typed RMN claim, and opaque commitment. Time and custody remain separate
 * witness material. No FOUR charge is inferred or stored here.
 *
 * Generic JSON EAVT has no path through this function: `asSeavt` must first
 * admit all three semantic coordinates.
 *
 * @param {unknown} row
 * @param {import("@red-cup-engineering/json-file-codec-service").JsonValue} custody
 */
export function identifySeavtSemanticContent(row, custody) {
  if (!isJsonValue(custody)) {
    throw new TypeError("SEAVT semantic content: custody witness must be a JSON value");
  }
  const source = asSeavt(row);
  const addressed = readAddressedSeavt(source);
  const immutable = (value) => {
    const copy = structuredClone(value);
    const freeze = (node) => {
      if (node !== null && typeof node === "object") {
        for (const member of Object.values(node)) freeze(member);
        Object.freeze(node);
      }
      return node;
    };
    return freeze(copy);
  };
  const witness = immutable({
    kind: "witness-journal.seavt.time-custody-witness",
    version: 1,
    time: source.t,
    custody,
  });
  const witnessTerm = jsonToTerm(witness);
  const witnessType = inferTy([], witnessTerm);
  if (witnessType === null) {
    throw new TypeError("SEAVT semantic content: time/custody witness did not infer an RMN type");
  }
  const witnessIdentity = identifyNormalizedSemanticContent({
    objectKind: "witness-journal.seavt.time-custody-witness",
    semanticType: witnessType,
    term: witnessTerm,
    witnessRoot: EMPTY_WITNESS_ROOT,
  });
  const material = Object.freeze({
    kind: "witness-journal.seavt.semantic-content",
    version: 2,
    coordinates: Object.freeze({ e: addressed.e, a: addressed.a, v: addressed.v }),
    witness,
  });
  const term = jsonToTerm(material);
  const semanticType = inferTy([], term);
  if (semanticType === null) {
    throw new TypeError("SEAVT semantic content: admitted witness material did not infer an RMN type");
  }
  const identity = identifyNormalizedSemanticContent({
    objectKind: "witness-journal.seavt",
    semanticType,
    term,
    witnessRoot: witnessIdentity.token,
  });
  return Object.freeze({ ...identity, source, material, witnessIdentity });
}
