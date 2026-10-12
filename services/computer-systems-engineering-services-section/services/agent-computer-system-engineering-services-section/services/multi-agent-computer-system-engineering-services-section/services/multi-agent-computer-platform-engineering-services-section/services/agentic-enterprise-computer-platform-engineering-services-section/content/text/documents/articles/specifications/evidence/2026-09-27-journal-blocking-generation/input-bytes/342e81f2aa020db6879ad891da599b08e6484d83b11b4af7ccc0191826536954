/**
 * MetroPlat artifacts: bounded RFC 8785 JSON named by its semantic content
 * address under one object kind. Canonical JSON is the JSON section's codec;
 * the name is SEN identity. Refusals are TypeErrors carrying `code` and `path`.
 */
import { JSON_RESOURCE_ENVELOPE, admitCanonicalJson, canonicalizeJson } from "@red-cup-engineering/json-services-section";
import { isNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { semanticIdOf } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/semantic-content-identity";

export const ARTIFACT_KIND = "metroplat.artifact";

/** The semantic id of one JSON value as a MetroPlat artifact. */
export const artifactId = semanticIdOf(ARTIFACT_KIND);

function refusal(code, path, message) {
  const error = new TypeError(`${code} at ${path}: ${message}`);
  error.code = code;
  error.path = path;
  return error;
}

/** Whether a string is an artifact reference. */
export function isArtifactRef(reference) {
  return isNiUri(reference);
}

/** Canonicalize a runtime value within the resource envelope and name it. */
export function addressArtifact(value) {
  const canonical = canonicalizeJson(value, JSON_RESOURCE_ENVELOPE);
  return Object.freeze({ ref: artifactId(canonical.value), canonical });
}

/** Admit JSON source text strictly and name the value it denotes. */
export function admitArtifact(source) {
  const canonical = admitCanonicalJson(source, JSON_RESOURCE_ENVELOPE);
  return Object.freeze({ ref: artifactId(canonical.value), canonical });
}

/** Admit source text and require that it is the artifact `reference` names. */
export function verifyArtifact(reference, source) {
  if (!isArtifactRef(reference)) throw refusal("reference-syntax", "$", "artifact reference must be one RFC 6920 SHA-256 ni URI");
  const artifact = admitArtifact(source);
  if (artifact.ref !== reference) throw refusal("digest-mismatch", "$", `artifact names ${artifact.ref}, not ${reference}`);
  return artifact;
}

export {
  addressSiteConstitution,
  INITIAL_SITE_CONSTITUTION,
  validateSiteConstitution,
} from "./site.mjs";
export {
  addressTextDocument,
  TEXT_DOCUMENT_BRANCH_WIDTH,
  TEXT_DOCUMENT_LEAF_BYTES,
} from "./text-document.mjs";
export {
  addressPrimitiveArticulation,
  admitPrimitiveArticulation,
} from "./primitive-articulation.mjs";
