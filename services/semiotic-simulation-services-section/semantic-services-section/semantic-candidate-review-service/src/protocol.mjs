import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { reviewCandidate } from "./review.mjs";

export const REVIEW_PROFILE = "org.emsenn.software.semantic-candidate-review.v1";
export const PROVIDER_ACCOUNT = "eip155:31337:0x993312a9d1f14ffb56c609c9a799ac3c7a3c2145";

function exactKeys(value, keys) { return value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0"); }
function fail(message) { throw new Error(message); }
function typed(value) { const encoded = encodeRelationalValue(value), term = ["ascribe", encoded.type, encoded.term]; return { bytes: semanticBytes(term), id: semanticId(term) }; }

export function normalizeReviewRequest(source) {
  if (!exactKeys(source, ["candidate", "kind", "manifest", "maximumReviews", "minimumReviews"]) || source.kind !== "SemanticCandidateReviewRequest") fail("review request has an unknown, absent, or legacy field");
  if (!source.manifest || Object.getPrototypeOf(source.manifest) !== Object.prototype || !source.candidate || Object.getPrototypeOf(source.candidate) !== Object.prototype) fail("review request requires exact manifest and candidate maps");
  if (!Number.isInteger(source.minimumReviews) || !Number.isInteger(source.maximumReviews) || source.minimumReviews < 1 || source.maximumReviews < source.minimumReviews || source.maximumReviews > 8) fail("review quorum bounds are invalid");
  const changes = source.candidate.changes;
  if (!Array.isArray(changes) || changes.length > 256 || changes.some((change) => typeof change?.path !== "string" || typeof change?.after !== "string" || Buffer.byteLength(change.after) > 20_000)) fail("candidate changes must be bounded text source");
  if (!Array.isArray(source.candidate.providers) || !Array.isArray(source.candidate.actions)) fail("candidate providers and actions must be explicit sequences");
  if (typeof source.manifest.id !== "string" || typeof source.manifest.objective !== "string" || !Array.isArray(source.manifest.testVectors)) fail("review manifest requires id, objective, and test vectors");
  return source;
}

export function encodeReviewRequest(source) { const value = normalizeReviewRequest(source), encoded = encodeRelationalValue(value); return { value, type: encoded.type, term: encoded.term }; }
export function decodeReviewRequest(type, term) { if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("review request must use relational RMN"); return normalizeReviewRequest(decodeRelationalValue(type, term)); }

export async function performReview(source, options = {}) {
  const request = normalizeReviewRequest(source);
  const review = await reviewCandidate({ manifest: request.manifest, candidate: { ...request.candidate, changes: request.candidate.changes.map((change) => ({ ...change, after: Buffer.from(change.after) })) } }, { minimumReviews: request.minimumReviews, maximumReviews: request.maximumReviews, ...options });
  const receipt = { kind: "SemanticCandidateReviewReceipt", profile: REVIEW_PROFILE, provider: PROVIDER_ACCOUNT, subject: typed(request).id, review };
  const document = typed(receipt);
  return { receipt, semanticId: document.id, canonicalBytes: document.bytes };
}

export function decodeReviewReceipt(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("review receipt must use relational RMN");
  const value = decodeRelationalValue(type, term);
  if (!exactKeys(value, ["kind", "profile", "provider", "review", "subject"]) || value.kind !== "SemanticCandidateReviewReceipt" || value.profile !== REVIEW_PROFILE || value.provider !== PROVIDER_ACCOUNT || typeof value.review?.accepted !== "boolean") fail("review receipt is malformed or foreign");
  return value;
}
