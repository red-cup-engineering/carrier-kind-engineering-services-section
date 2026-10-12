import {
  addressArtifact,
  isArtifactRef,
  verifyArtifact,
} from "../identity/index.mjs";
import {
  JSON_RESOURCE_ENVELOPE,
  canonicalizeJson,
} from "@red-cup-engineering/json-services-section";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

const REFERENCE_KIND = "metroplat.journal.packet-reference";
const MEDIA_TYPE = "application/json";
const INVALID_CODE = "journal-packet-invalid";
const EVIDENCE_CODE = "journal-packet-evidence-unavailable";
const REFERENCE_KEYS = ["artifact", "bytes", "kind", "mediaType", "sha256", "version"];
const PAIR_KEYS = ["canonicalText", "ref"];

function invalid() {
  const error = new TypeError("Journal packet is invalid.");
  error.code = INVALID_CODE;
  return error;
}

function evidenceUnavailable() {
  const error = new TypeError("Journal packet evidence is unavailable.");
  error.code = EVIDENCE_CODE;
  return error;
}

function hasExactKeys(value, expected) {
  const keys = Reflect.ownKeys(value);
  return keys.length === expected.length
    && keys.every((key) => typeof key === "string" && expected.includes(key));
}

/** Construct a bounded, content-addressed journal packet without publishing it. */
export function journalPacket(value) {
  let addressed;
  try {
    addressed = addressArtifact(value);
  } catch {
    throw invalid();
  }

  const reference = Object.freeze({
    kind: REFERENCE_KIND,
    version: 1,
    artifact: addressed.ref,
    mediaType: MEDIA_TYPE,
    sha256: sha256Hex(addressed.canonical.text),
    bytes: addressed.canonical.byteLength,
  });
  const artifact = Object.freeze({
    ref: addressed.ref,
    canonicalText: addressed.canonical.text,
  });
  return Object.freeze({ reference, artifact });
}

function snapshotReference(reference) {
  try {
    return canonicalizeJson(reference, JSON_RESOURCE_ENVELOPE).value;
  } catch {
    throw invalid();
  }
}

function validateReference(reference) {
  if (reference === null || typeof reference !== "object" || !hasExactKeys(reference, REFERENCE_KEYS)) {
    throw invalid();
  }
  if (reference.kind !== REFERENCE_KIND || reference.version !== 1 || reference.mediaType !== MEDIA_TYPE) {
    throw invalid();
  }
  if (typeof reference.artifact !== "string" || !isArtifactRef(reference.artifact)) {
    throw invalid();
  }
  if (typeof reference.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(reference.sha256)) {
    throw invalid();
  }
  if (!Number.isSafeInteger(reference.bytes) || reference.bytes < 0) {
    throw invalid();
  }
}

function readResolverPair(pair) {
  try {
    if (pair === null || typeof pair !== "object") throw invalid();
    const prototype = Object.getPrototypeOf(pair);
    if (prototype !== Object.prototype && prototype !== null) throw invalid();
    if (prototype === Object.prototype && Object.getOwnPropertyDescriptor(prototype, "then") !== undefined) {
      throw invalid();
    }
    if (!hasExactKeys(pair, PAIR_KEYS)) throw invalid();

    const refDescriptor = Object.getOwnPropertyDescriptor(pair, "ref");
    const textDescriptor = Object.getOwnPropertyDescriptor(pair, "canonicalText");
    if (refDescriptor === undefined || textDescriptor === undefined
      || !("value" in refDescriptor) || !("value" in textDescriptor)
      || !refDescriptor.enumerable || !textDescriptor.enumerable
      || typeof refDescriptor.value !== "string"
      || typeof textDescriptor.value !== "string") {
      throw invalid();
    }
    return { ref: refDescriptor.value, canonicalText: textDescriptor.value };
  } catch {
    throw invalid();
  }
}

/** Resolve and verify a packet body supplied by the trusted host composition. */
export function resolveJournalPacket(reference, resolveArtifact) {
  const snapshot = snapshotReference(reference);
  validateReference(snapshot);
  if (typeof resolveArtifact !== "function") throw invalid();

  // Keep the trusted resolver call outside validation catches so every thrown
  // value, including null, undefined, and codec-shaped errors, escapes intact.
  const pair = resolveArtifact(snapshot.artifact);
  if (pair === null || pair === undefined) throw evidenceUnavailable();

  const body = readResolverPair(pair);
  if (body.ref !== snapshot.artifact) throw invalid();

  let verified;
  try {
    verified = verifyArtifact(body.ref, body.canonicalText);
  } catch {
    throw invalid();
  }
  if (verified.canonical.text !== body.canonicalText
    || sha256Hex(body.canonicalText) !== snapshot.sha256
    || verified.canonical.byteLength !== snapshot.bytes) {
    throw invalid();
  }
  return verified.canonical.value;
}
