import { jsonToTerm, termToJson } from "@red-cup-engineering/relation-model-notation-json-codec";
import { inferTy } from "@red-cup-engineering/relation-model-notation-typing";
import { EMPTY_WITNESS_ROOT, identifyNormalizedSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { reviewCandidate } from "./review.mjs";

export const REVIEW_PROFILE = "org.emsenn.software.semantic-candidate-review.v1";
export const PROVIDER_ACCOUNT = "eip155:31337:0x993312a9d1f14ffb56c609c9a799ac3c7a3c2145";
export const REVIEW_REQUEST_KIND = "semantic-candidate-review.request";
export const REVIEW_RECEIPT_KIND = "semantic-candidate-review.receipt";

function exactKeys(value, keys) { return value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0"); }
function fail(message) { throw new Error(message); }
export function identifyReviewValue(value, objectKind) {
  const term = jsonToTerm(value), type = inferTy([], term);
  if (type === null) fail("review value did not earn an RMN type");
  const identity = identifyNormalizedSemanticContent({ objectKind, semanticType: type, term, witnessRoot: EMPTY_WITNESS_ROOT });
  return { type, term, bytes: Buffer.from(identity.bytes), id: identity.token };
}

function decodeReviewValue(type, term) {
  if (JSON.stringify(inferTy([], term)) !== JSON.stringify(type)) fail("review value does not inhabit its declared RMN type");
  return termToJson(term);
}

export function normalizeReviewRequest(source) {
  if (!exactKeys(source, ["candidate", "kind", "manifest", "maximumReviews", "minimumReviews"]) || source.kind !== "SemanticCandidateReviewRequest") fail("review request has an unknown or absent field");
  if (!source.manifest || Object.getPrototypeOf(source.manifest) !== Object.prototype || !source.candidate || Object.getPrototypeOf(source.candidate) !== Object.prototype) fail("review request requires exact manifest and candidate maps");
  if (!Number.isInteger(source.minimumReviews) || !Number.isInteger(source.maximumReviews) || source.minimumReviews < 1 || source.maximumReviews < source.minimumReviews || source.maximumReviews > 8) fail("review quorum bounds are invalid");
  const changes = source.candidate.changes;
  if (!Array.isArray(changes) || changes.length > 256 || changes.some((change) => typeof change?.path !== "string" || typeof change?.after !== "string" || Buffer.byteLength(change.after) > 20_000)) fail("candidate changes must be bounded text source");
  if (!Array.isArray(source.candidate.providers) || !Array.isArray(source.candidate.actions)) fail("candidate providers and actions must be explicit sequences");
  if (typeof source.manifest.id !== "string" || typeof source.manifest.objective !== "string" || !Array.isArray(source.manifest.testVectors)) fail("review manifest requires id, objective, and test vectors");
  return source;
}

export function encodeReviewRequest(source) { const value = normalizeReviewRequest(source), encoded = identifyReviewValue(value, REVIEW_REQUEST_KIND); return { value, type: encoded.type, term: encoded.term }; }
export function decodeReviewRequest(type, term) { return normalizeReviewRequest(decodeReviewValue(type, term)); }

export async function performReview(source, options = {}) {
  const request = normalizeReviewRequest(source);
  const review = await reviewCandidate({ manifest: request.manifest, candidate: { ...request.candidate, changes: request.candidate.changes.map((change) => ({ ...change, after: Buffer.from(change.after) })) } }, { minimumReviews: request.minimumReviews, maximumReviews: request.maximumReviews, ...options });
  const receipt = { kind: "SemanticCandidateReviewReceipt", profile: REVIEW_PROFILE, provider: PROVIDER_ACCOUNT, subject: identifyReviewValue(request, REVIEW_REQUEST_KIND).id, review };
  const document = identifyReviewValue(receipt, REVIEW_RECEIPT_KIND);
  return { receipt, semanticId: document.id, canonicalBytes: document.bytes };
}

export function decodeReviewReceipt(type, term) {
  const value = decodeReviewValue(type, term);
  if (!exactKeys(value, ["kind", "profile", "provider", "review", "subject"]) || value.kind !== "SemanticCandidateReviewReceipt" || value.profile !== REVIEW_PROFILE || value.provider !== PROVIDER_ACCOUNT || typeof value.review?.accepted !== "boolean") fail("review receipt is malformed or foreign");
  return value;
}
