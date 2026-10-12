import { jsonToTerm, termToJson } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { inferTy } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/typing";
import {
  admitNormalizedSemanticContent,
  identifyNormalizedSemanticContent,
} from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime";
import {
  EMPTY_WITNESS_ROOT,
} from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";

const DOCUMENT_KIND = "activitypub.sen-json-document";

function immutable(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) immutable(child);
  return Object.freeze(value);
}

export function identifyJsonDocument(value) {
  const term = jsonToTerm(value);
  const semanticType = inferTy([], term);
  if (semanticType === null) throw new TypeError("SEN JSON document did not earn an SEN type");
  const identity = identifyNormalizedSemanticContent({
    objectKind: DOCUMENT_KIND,
    semanticType,
    term,
    witnessRoot: EMPTY_WITNESS_ROOT,
  });
  return Object.freeze({ bytes: Buffer.from(identity.bytes), ni: identity.token });
}

export function admitTermBytes(bytes, label = "SEN document") {
  const source = Buffer.from(bytes ?? []);
  let identity;
  try { identity = admitNormalizedSemanticContent(source); }
  catch { throw new TypeError(`${label} must contain admitted semantic SEN content`); }
  if (identity.envelope.objectKind !== DOCUMENT_KIND) throw new TypeError(`${label} must contain an ActivityPub SEN JSON document`);
  return Object.freeze({ term: immutable(identity.envelope.settledBody), ni: identity.token });
}

export function admitJsonDocument(bytes, label = "SEN JSON document") {
  const admitted = admitTermBytes(bytes, label);
  let value;
  try { value = termToJson(admitted.term); }
  catch { throw new TypeError(`${label} must contain one JSON-document SEN term`); }
  return Object.freeze({ value: immutable(value), ni: admitted.ni });
}
