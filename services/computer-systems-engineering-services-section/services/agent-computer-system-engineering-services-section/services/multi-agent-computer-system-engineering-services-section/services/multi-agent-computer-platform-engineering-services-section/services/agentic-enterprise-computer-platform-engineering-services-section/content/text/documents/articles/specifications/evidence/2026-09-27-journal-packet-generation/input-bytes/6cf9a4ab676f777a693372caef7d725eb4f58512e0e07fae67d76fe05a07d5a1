// Pure placement-independent SEN die material.
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { assay, checkTerm, effectCellOfTerm, evaluate, validateType } from "../runtime.mjs";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

/** An effect bundle is `pair(effect cell term, operation)`: its first component
 * decodes through the JSON bridge to an admitted effect cell. */
function effectCellOfBundle(term) {
  return term?.[0] === "pair" ? effectCellOfTerm(term[1]) : undefined;
}

function assertCanonical(bytes, term) {
  if (!semanticBytes(term).equals(bytes)) fail("noncanonical-sen", "SEN input is not RFC 8949 core-deterministic CBOR");
  if (semanticId(term) !== makeNiUri(bytes)) fail("identity-mismatch", "SEN input identity does not match its canonical bytes");
}

export function conformAscribedTerm(source, { fuel = 10_000 } = {}) {
  const request = Array.isArray(source) ? source : decodeSemantic(source);
  if (request?.[0] !== "ascribe" || request.length !== 3) {
    fail("untyped-sen", "the conformance boundary requires one (ascribe Type Term) SEN term");
  }
  const expectedType = validateType(request[1]);
  const term = request[2];
  checkTerm(term, expectedType);

  // The type engine owns term typing; the runtime owns the effect carrier's
  // bounded operational fields, admitted by decoding the bundle's cell.
  const bundled = effectCellOfBundle(term) !== undefined;
  const reduced = evaluate(term, fuel);
  checkTerm(reduced.normalForm, expectedType);
  return {
    kind: bundled ? "effect-bundle" : "term",
    request,
    requestId: semanticId(request),
    response: ["ascribe", expectedType, reduced.normalForm],
    normalForm: reduced.normalForm,
    expectedType,
    term: semanticId(term),
    normalFormId: semanticId(reduced.normalForm),
    fuelUsed: reduced.fuelUsed,
    ...(bundled ? { effectCell: effectCellOfBundle(reduced.normalForm), operation: semanticId(reduced.normalForm[2]) } : {}),
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

/** Conform one term against its expected type, with the carriers a recorder keeps. */
export function conformTerm({ term, expectedType, fuel }) {
  const result = conformAscribedTerm(["ascribe", expectedType, term], fuel === undefined ? {} : { fuel });
  return {
    ...result,
    requestNi: result.requestId,
    canonicalBytesBase64: semanticBytes(term).toString("base64"),
    normalFormBytesBase64: semanticBytes(result.normalForm).toString("base64"),
  };
}

/** Conform canonical term bytes, optionally against their declared semantic identity. */
export function conformTermBytes({ bytes, expectedType, expectedNi, fuel }) {
  const body = Buffer.from(bytes);
  const term = decodeSemantic(body);
  assertCanonical(body, term);
  if (expectedNi !== undefined && semanticId(term) !== expectedNi) fail("identity-mismatch", "SEN bytes do not match their declared semantic identity");
  return conformTerm({ term, expectedType, fuel });
}
