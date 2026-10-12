import { decodeSemantic, semanticAddress, semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { isNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { isDeepStrictEqual } from "node:util";
import { jsonToTerm, termToJson } from "../json-codec.mjs";
import { checkTerm, evaluate, inferTerm } from "../runtime.mjs";
import { encodeJsonByteCarrier } from "@red-cup-engineering/json-services-section/encode-json-byte-carrier";

export const SEN_NORMALIZATION_PROFILE = "urn:rce:sen:normalize:0.1.0";
export const IDENTITY_SETTLEMENT_PROFILE = "urn:rce:settlement:identity:0.0.1";

// The semantic identity of a typed claim is the semiotic content address of this
// envelope: semanticId(envelope). There is no other identity scheme.
const V2_KIND = "semiotic-expression-notation.normalized-semantic-content";
const ENVELOPE_VERSION = 3;
const V2_KEYS = Object.freeze([
  "kind",
  "version",
  "objectKind",
  "semanticType",
  "normalizationProfile",
  "settlementProfile",
  "settledBody",
  "witnessRoot",
]);

/** Explicit root for semantic material whose named settlement profile consumes
 * no evidential witnesses. This is a raw canonical-carrier commitment, not a
 * second semantic identity law. */
export const EMPTY_WITNESS_ROOT = semanticId({ kind: "semantic-content.empty-witness-bundle", version: 1 });

function refusal(code, message) {
  const error = new TypeError(message);
  error.code = code;
  return error;
}

function inhabitsDeclaredType(term, semanticType) {
  try {
    checkTerm(term, semanticType);
    return true;
  } catch {
    return false;
  }
}

function normalizeSen(term) {
  return evaluate(term, 10_000).normalForm;
}

function commitmentOf(value) {
  const { id, bytes } = semanticAddress(value);
  return Object.freeze({ id, token: id, algorithm: "sha-256", mediaType: "application/sen+cbor", bytes });
}

/** A deep frozen copy, built without recursion: list terms nest as deep as they are long. */
function immutableCopy(value) {
  const copyOf = (node) => (node === null || typeof node !== "object" ? node : Array.isArray(node) ? new Array(node.length) : {});
  const root = copyOf(value);
  const pending = root === value ? [] : [[value, root]];
  const finished = [];
  while (pending.length > 0) {
    const [source, target] = pending.pop();
    finished.push(target);
    for (const [key, member] of Object.entries(source)) {
      const copy = copyOf(member);
      target[key] = copy;
      if (copy !== member) pending.push([member, copy]);
    }
  }
  for (const node of finished) Object.freeze(node);
  return root;
}

function canonicalNi(value, field) {
  if (!isNiUri(value)) {
    throw refusal("malformed-content-address", `${field} must be one canonical RFC 6920 SHA-256 ni URI`);
  }
  return value;
}

function canonicalString(value, field) {
  if (typeof value !== "string") throw refusal("malformed-normalized-content", `${field} must be a finite string`);
  return value.normalize("NFC");
}

function admitV2Envelope(envelope, { requireNormal = true, typeChecked = false } = {}) {
  if (envelope === null || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw refusal("malformed-normalized-content", "normalized semantic content must be one envelope object");
  }
  const keys = Object.keys(envelope).sort();
  if (!isDeepStrictEqual(keys, [...V2_KEYS].sort()) || envelope.kind !== V2_KIND || envelope.version !== ENVELOPE_VERSION) {
    throw refusal("malformed-normalized-content", "normalized semantic content has unknown fields, kind, or version");
  }
  const objectKind = canonicalString(envelope.objectKind, "objectKind");
  if (objectKind.length === 0) throw refusal("malformed-normalized-content", "objectKind must not be empty");
  if (envelope.normalizationProfile !== SEN_NORMALIZATION_PROFILE) {
    throw refusal("unsupported-normalization-profile", `unsupported normalization profile ${String(envelope.normalizationProfile)}`);
  }
  if (envelope.settlementProfile !== IDENTITY_SETTLEMENT_PROFILE) {
    throw refusal("unsupported-settlement-profile", `unsupported settlement profile ${String(envelope.settlementProfile)}`);
  }
  const witnessRoot = canonicalNi(envelope.witnessRoot, "witnessRoot");
  if (!typeChecked && !inhabitsDeclaredType(envelope.settledBody, envelope.semanticType)) {
    throw refusal("non-relational-content", "settledBody must be a closed SEN term inhabiting semanticType");
  }
  if (requireNormal) {
    let normalized;
    try {
      normalized = normalizeSen(envelope.settledBody);
    } catch {
      throw refusal("normalization-failure", "settledBody could not be checked under the declared normalization profile");
    }
    if (!isDeepStrictEqual(normalized, envelope.settledBody)) {
      throw refusal("non-normal-content", "settledBody is not normal under the declared normalization profile");
    }
  }
  return immutableCopy({
    kind: V2_KIND,
    version: ENVELOPE_VERSION,
    objectKind,
    semanticType: envelope.semanticType,
    normalizationProfile: SEN_NORMALIZATION_PROFILE,
    settlementProfile: envelope.settlementProfile,
    settledBody: envelope.settledBody,
    witnessRoot,
  });
}

function identifyV2Envelope(envelope) {
  const admitted = admitV2Envelope(envelope);
  return Object.freeze({ ...commitmentOf(admitted), envelope: admitted });
}

/** Commit a term this module has just normalized and type-checked.  Public
 * envelope admission still proves normality and typing; this internal path
 * avoids repeating either over the same immutable term. */
function identifyAlreadyNormalizedV2Envelope(envelope) {
  const admitted = admitV2Envelope(envelope, { requireNormal: false, typeChecked: true });
  return Object.freeze({ ...commitmentOf(admitted), envelope: admitted });
}

/** Normalize one explicitly typed SEN term and bind its identity settlement witness. */
export function identifyNormalizedSemanticContent({
  objectKind,
  semanticType,
  term,
  witnessRoot,
  normalizationProfile = SEN_NORMALIZATION_PROFILE,
  settlementProfile = IDENTITY_SETTLEMENT_PROFILE,
} = {}) {
  if (normalizationProfile !== SEN_NORMALIZATION_PROFILE) {
    throw refusal("unsupported-normalization-profile", `unsupported normalization profile ${String(normalizationProfile)}`);
  }
  if (settlementProfile !== IDENTITY_SETTLEMENT_PROFILE) {
    throw refusal("unsupported-settlement-profile", `identifyNormalizedSemanticContent requires ${IDENTITY_SETTLEMENT_PROFILE}`);
  }
  if (!inhabitsDeclaredType(term, semanticType)) throw refusal("non-relational-content", "term must be a closed SEN term inhabiting semanticType");
  let settledBody;
  try {
    settledBody = normalizeSen(term);
  } catch {
    throw refusal("normalization-failure", "term could not be normalized under the declared normalization profile");
  }
  if (!inhabitsDeclaredType(settledBody, semanticType)) {
    throw refusal("normalization-type-mismatch", "normalized term no longer inhabits its admitted semanticType");
  }
  return identifyAlreadyNormalizedV2Envelope({
    kind: V2_KIND,
    version: ENVELOPE_VERSION,
    objectKind,
    semanticType,
    normalizationProfile,
    settlementProfile,
    settledBody,
    witnessRoot,
  });
}

/** Admit one JSON value through the injective JSON→SEN bridge, infer its exact
 * closed product type, and identify only the resulting normalized envelope. */
export function identifyJsonSemanticContent({ objectKind, value, witnessRoot } = {}) {
  let term;
  try {
    term = jsonToTerm(value);
  } catch {
    throw refusal("non-relational-content", "value must cross the admitted JSON-to-SEN boundary");
  }
  let semanticType;
  try {
    semanticType = inferTerm(term);
  } catch {
    throw refusal("non-relational-content", "admitted JSON did not derive an SEN type");
  }
  // The JSON bridge yields a value term (marks, stars and pairs): closed, normal,
  // and typed by the inference above, so it is its own settled body.
  return identifyAlreadyNormalizedV2Envelope({
    kind: V2_KIND,
    version: ENVELOPE_VERSION,
    objectKind,
    semanticType,
    normalizationProfile: SEN_NORMALIZATION_PROFILE,
    settlementProfile: IDENTITY_SETTLEMENT_PROFILE,
    settledBody: term,
    witnessRoot,
  });
}

/** The identity function of one object kind: a JSON value to its semantic id,
 * with no evidential witnesses. */
export function semanticIdOf(objectKind) {
  if (typeof objectKind !== "string" || objectKind.trim() === "") throw new TypeError("semantic-object-kind-required");
  return (value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).id;
}

/** Content-address one JSON value under one object kind, with no evidential
 * witnesses: the two-argument boundary form of `semanticIdOf`, for a caller
 * that names both in one call rather than currying the kind first. Reports
 * only the address (id, token, algorithm, mediaType), never the raw content
 * bytes or the full normalized envelope those two already identify. */
export function contentAddressOf({ objectKind, value } = {}) {
  const { id, token, algorithm, mediaType } = identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT });
  return { id, token, algorithm, mediaType };
}

/** Verify that a JSON record's visible identity names its remaining body. */
export function verifyJsonSemanticRecord({ objectKind, value, witnessRoot, identityField = "id" } = {}) {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    if (typeof identityField !== "string") return false;
    const identity = value[identityField];
    if (typeof identity !== "string") return false;
    const body = Object.fromEntries(Object.entries(value).filter(([key]) => key !== identityField));
    return identifyJsonSemanticContent({ objectKind, value: body, witnessRoot }).id === identity;
  } catch {
    return false;
  }
}

export function identifyBytesSemanticContent({ objectKind, bytes, mediaType = "application/octet-stream", witnessRoot } = {}) {
  let carrier;
  try {
    carrier = encodeJsonByteCarrier({ bytes: Array.from(bytes), mediaType });
  } catch (error) {
    if (!(bytes instanceof Uint8Array)) throw refusal("non-relational-content", "bytes must be a Uint8Array");
    throw refusal("malformed-normalized-content", error.message);
  }
  return identifyJsonSemanticContent({ objectKind, value: carrier, witnessRoot });
}

/** Admit v2 transport only when its normal body is exactly one injectively
 * encoded JSON value of the receiver's demanded object kind. */
export function admitJsonSemanticContent({ bytes, token, objectKind } = {}) {
  const identified = admitNormalizedSemanticContent(bytes, token);
  if (identified.envelope.objectKind !== objectKind) {
    throw refusal("semantic-object-kind-mismatch", `expected semantic object kind ${String(objectKind)}`);
  }
  let value;
  try {
    value = termToJson(identified.envelope.settledBody);
  } catch {
    throw refusal("non-json-semantic-content", "settled body is not an admitted JSON term");
  }
  if (!isDeepStrictEqual(jsonToTerm(value), identified.envelope.settledBody)) {
    throw refusal("non-json-semantic-content", "settled body is not the injective JSON-to-SEN representation");
  }
  return Object.freeze({ ...identified, value: immutableCopy(value) });
}

/** Admit canonical v2 bytes and reproduce their typed normalized commitment. */
export function admitNormalizedSemanticContent(bytes, token = undefined) {
  if (!(bytes instanceof Uint8Array)) throw refusal("malformed-normalized-content", "normalized content bytes must be a Uint8Array");
  let decoded;
  try {
    decoded = decodeSemantic(bytes);
  } catch {
    throw refusal("malformed-normalized-content", "bytes must carry one canonical SEN normalized-content envelope");
  }
  const identified = identifyV2Envelope(decoded);
  if (!Buffer.from(identified.bytes).equals(Buffer.from(bytes))) {
    throw refusal("normalized-content-commitment-mismatch", "bytes do not reproduce their canonical normalized-content commitment");
  }
  if (token !== undefined && token !== identified.token) {
    throw refusal("normalized-content-commitment-mismatch", "token does not commit to the supplied normalized-content bytes");
  }
  return identified;
}

/** Verify a visible v2 envelope against its opaque token. */
export function verifyNormalizedSemanticContent(token, envelope) {
  try {
    return typeof token === "string" && identifyV2Envelope(envelope).token === token;
  } catch {
    return false;
  }
}
