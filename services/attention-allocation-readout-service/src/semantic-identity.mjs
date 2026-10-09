import {
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/computer-content-engineering-services-section/semantic-content-identity";

function requiredObjectKind(objectKind) {
  if (typeof objectKind !== "string" || objectKind.length === 0) throw new TypeError("semantic object kind is required");
  return objectKind;
}

export function jsonId(value, objectKind) {
  return identifyJsonSemanticContent({
    objectKind: requiredObjectKind(objectKind),
    value,
    witnessRoot: EMPTY_WITNESS_ROOT,
  }).token;
}

