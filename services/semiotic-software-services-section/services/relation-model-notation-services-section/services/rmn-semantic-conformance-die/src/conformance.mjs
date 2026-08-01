// Pure placement-independent RMN die material.
import { rawNiUri } from "./canonical-cbor.mjs";
import { RELATIONAL_VALUE_TYPE, decodeRelationalValue } from "./relational-value.mjs";
import { assay, checkTerm, decodeSemantic, evaluate, semanticBytes, semanticId, validateType } from "./rmn-core.mjs";

const WIT_TRANSITION_ASSAY_TYPE = [
  "product",
  ["product", ["effect"], ["effect"]],
  ["base", "Evidence"],
];

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function isEffectBundle(type, term) {
  return type?.[0] === "product" && type?.[1]?.[0] === "effect"
    && term?.[0] === "pair" && term?.[1]?.[0] === "effect";
}

function assertCanonical(bytes, term) {
  if (!semanticBytes(term).equals(bytes)) fail("noncanonical-rmn", "RMN input is not RFC 8949 core-deterministic CBOR");
  if (semanticId(term) !== rawNiUri(bytes)) fail("identity-mismatch", "RMN input identity does not match its canonical bytes");
}

export function conformAscribedTerm(source, { fuel = 10_000 } = {}) {
  const request = Array.isArray(source) ? source : decodeSemantic(source);
  if (request?.[0] !== "ascribe" || request.length !== 3) {
    fail("untyped-rmn", "the conformance boundary requires one (ascribe Type Term) RMN term");
  }
  const expectedType = validateType(request[1]);
  const term = request[2];
  checkTerm(term, expectedType);

  if (JSON.stringify(expectedType) === JSON.stringify(RELATIONAL_VALUE_TYPE)) {
    const value = decodeRelationalValue(expectedType, term);
    if (value?.kind === "HierarchicalCircuitAssayRequest") {
      fail("distinct-judgment-required", "hierarchical circuit equivalence requires its distinct typed receipt; normalization cannot substitute for that judgment");
    }
    if (value?.kind === "HierarchicalCircuitTraceRequest") {
      fail("distinct-judgment-required", "typed circuit residue requires its distinct typed receipt; normalization cannot substitute for that judgment");
    }
  }

  if (JSON.stringify(expectedType) === JSON.stringify(WIT_TRANSITION_ASSAY_TYPE)) {
    fail("distinct-judgment-required", "WIT transition requires its distinct typed receipt; normalization cannot substitute for that judgment");
  }

  if (isEffectBundle(expectedType, term)) {
    const operation = semanticId(term[2]);
    if (term[1][1].operation !== operation) fail("effect-operation-mismatch", "effect cell operation does not identify the bundled operation term");
  }
  const reduced = evaluate(term, fuel);
  checkTerm(reduced.normalForm, expectedType);
  return {
    kind: isEffectBundle(expectedType, term) ? "effect-bundle" : "term",
    request,
    requestId: semanticId(request),
    response: ["ascribe", expectedType, reduced.normalForm],
    normalForm: reduced.normalForm,
    expectedType,
    term: semanticId(term),
    normalFormId: semanticId(reduced.normalForm),
    fuelUsed: reduced.fuelUsed,
    ...(isEffectBundle(expectedType, term) ? { effectCell: reduced.normalForm[1][1], operation: semanticId(reduced.normalForm[2]) } : {}),
  };
}

export function conformCanonicalBytes(bytes, options) {
  const body = Buffer.from(bytes);
  const term = decodeSemantic(body);
  assertCanonical(body, term);
  return conformAscribedTerm(term, options);
}

export function ascribedBytes(term, expectedType) {
  return semanticBytes(["ascribe", expectedType, term]);
}

export function ascribedAssay(term, expectedType, options) {
  const result = assay({ term, expectedType, fuel: options?.fuel ?? 10_000 });
  return conformAscribedTerm(["ascribe", expectedType, result.normalizedTerm], options);
}
