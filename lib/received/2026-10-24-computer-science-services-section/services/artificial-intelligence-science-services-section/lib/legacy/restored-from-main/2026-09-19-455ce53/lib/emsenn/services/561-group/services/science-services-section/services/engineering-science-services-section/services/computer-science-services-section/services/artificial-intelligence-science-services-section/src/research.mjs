import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent, verifyJsonSemanticRecord } from "@red-cup-engineering/semantic-content-identify-service";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { canonicalJsonByteCarrier, jsonByteCarrierValue } from "@red-cup-engineering/computer-data-engine/json";

export const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const ACTOR = "urn:ame:artificial-intelligence-research-enterprise";
export const CUSTOMER = "urn:ame:artificial-intelligence-curriculum-enterprise";
export const CATEGORY = "artificial-intelligence-research.product-admission";
export const RECORD_OBJECT_KIND = "emsweb.artificial-intelligence-research.journal-record";
export const FIRST_MANIFEST = join(NODE_ROOT, "content/manifests/history-and-frontiers-of-machine-learning/cybernetics-computation-symbolic-ai.v1.json");
const CONTENT_ROOT = join(NODE_ROOT, "content");
const REQUIRED_USES = ["notebooklm-transformation", "artificial-intelligence-curriculum", "public-youtube-release"];
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export const canonical = canonicalJsonByteCarrier;
export function digest(value) { return `sha256:${createHash("sha256").update(value instanceof Uint8Array ? value : canonical(value)).digest("hex")}`; }
const semanticJson = jsonByteCarrierValue
export function contentId(value) { return identifyJsonSemanticContent({ objectKind: "emsweb.artificial-intelligence-research.record", value: semanticJson(value), witnessRoot: EMPTY_WITNESS_ROOT }).token; }
function contained(path) { const root = realpathSync(CONTENT_ROOT), actual = realpathSync(path); if (actual !== root && !actual.startsWith(`${root}/`)) throw new TypeError("AI research carrier escapes the research settlement"); return actual; }

export function loadResearchDraft(path = FIRST_MANIFEST) {
  const manifestPath = contained(resolve(path)), stat = lstatSync(manifestPath);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size < 100 || stat.size > 1_000_000) throw new TypeError("AI research manifest must be one bounded regular file");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (typeof manifest.carrier !== "string" || !manifest.carrier) throw new TypeError("AI research manifest requires a carrier");
  const carrierPath = contained(resolve(dirname(manifestPath), manifest.carrier)), carrierStat = lstatSync(carrierPath);
  if (carrierStat.isSymbolicLink() || !carrierStat.isFile() || carrierStat.size < 500 || carrierStat.size > 10 * 1024 * 1024) throw new TypeError("AI research packet must be one bounded regular file");
  const bytes = readFileSync(carrierPath), { carrier: _carrier, ...terms } = manifest;
  return { ...terms, carrier: { path: relative(NODE_ROOT, carrierPath), mediaType: "text/markdown", byteLength: bytes.length, sha256: digest(bytes) } };
}

export function loadResearchDraftForLesson({ courseId, lessonId, revision = 1 } = {}) {
  if (!ID.test(courseId ?? "") || !ID.test(lessonId ?? "") || !Number.isInteger(revision) || revision < 1) throw new TypeError("AI research draft lookup requires bounded identities");
  return loadResearchDraft(join(CONTENT_ROOT, "manifests", courseId, `${lessonId}.v${revision}.json`));
}

export function researchDraftAvailable({ courseId, lessonId, revision = 1 } = {}) {
  if (!ID.test(courseId ?? "") || !ID.test(lessonId ?? "") || !Number.isInteger(revision) || revision < 1) throw new TypeError("AI research draft lookup requires bounded identities");
  const root = resolve(CONTENT_ROOT, "manifests"), candidate = resolve(root, courseId, `${lessonId}.v${revision}.json`);
  if (!candidate.startsWith(`${root}/`)) throw new TypeError("AI research draft lookup escapes its manifest custody");
  return existsSync(candidate) && !lstatSync(candidate).isSymbolicLink() && lstatSync(candidate).isFile();
}

export function admittedResearchProducts(options = {}) {
  const root = resolve(options.dataRoot ?? join(NODE_ROOT, "data"));
  return Object.freeze(createSemanticRecordJournal({ root, objectKind: RECORD_OBJECT_KIND }).query({ category: CATEGORY }).map((row) => structuredClone(row.record)));
}

export function validateResearchDraft(draft) {
  if (!ID.test(draft?.courseId ?? "") || !ID.test(draft?.lessonId ?? "") || !Array.isArray(draft.researchProductClasses) || draft.researchProductClasses.length === 0 || draft.researchProductClasses.some((value) => !ID.test(value))) throw new TypeError("AI research product requires exact course, lesson, and product classes");
  const path = contained(resolve(NODE_ROOT, draft.carrier?.path ?? "")), stat = lstatSync(path), bytes = !stat.isSymbolicLink() && stat.isFile() ? readFileSync(path) : null;
  if (!bytes || draft.carrier.mediaType !== "text/markdown" || bytes.length !== draft.carrier.byteLength || digest(bytes) !== draft.carrier.sha256) throw new TypeError("AI research carrier bytes changed");
  if (!Number.isFinite(Date.parse(draft.observedThrough ?? "")) || !Number.isFinite(Date.parse(draft.expiresAt ?? "")) || Date.parse(draft.expiresAt) <= Date.parse(draft.observedThrough)) throw new TypeError("AI research product requires an ordered freshness interval");
  if (!Array.isArray(draft.citations) || draft.citations.length < 3) throw new TypeError("AI research product requires at least three primary sources");
  const citationIds = draft.citations.map((row) => row?.id), cited = new Set(citationIds);
  if (citationIds.some((id) => !ID.test(id ?? "")) || cited.size !== citationIds.length || draft.citations.some((row) => { try { const url = new URL(row.url); return url.protocol !== "https:" || !row.kind?.startsWith("primary-") || !row.title || !Array.isArray(row.authors) || row.authors.length === 0 || !Number.isInteger(row.published); } catch { return true; } })) throw new TypeError("AI research primary-source identities are invalid");
  if (!Array.isArray(draft.claims) || draft.claims.length === 0 || draft.claims.some((row) => !row.statement || !row.scope || !row.warrants?.length || row.warrants.some((id) => !cited.has(id)))) throw new TypeError("AI research product contains an unwarranted claim");
  for (const [name, value] of [["uncertainty", draft.uncertainty], ["limitations", draft.limitations]]) if (!Array.isArray(value) || value.length === 0 || value.some((row) => typeof row !== "string" || !row.trim())) throw new TypeError(`AI research product requires explicit ${name}`);
  if (REQUIRED_USES.some((use) => !draft.reuseGrant?.includes(use)) || typeof draft.correctionIdentity !== "string" || !draft.correctionIdentity || draft.privacy?.classification !== "public-synthesis" || draft.internalTransfer?.legalBodyRelation !== "same-legal-body" || draft.internalTransfer.cashSettlementRequired !== false || draft.internalTransfer.status !== "settled-internal-cost-allocation") throw new TypeError("AI research product lacks reuse, correction, privacy, or settlement terms");
  return true;
}

export async function admitResearchProduct(draft = loadResearchDraft(), options = {}) {
  validateResearchDraft(draft);
  const sourceBody = { type: "ArtificialIntelligenceResearchSourcePacket", provider: ACTOR, courseId: draft.courseId, lessonId: draft.lessonId, carrier: draft.carrier }, sourcePacket = { id: contentId(sourceBody), ...sourceBody };
  const settlementBody = { type: "InternalResearchSettlementReceipt", payer: CUSTOMER, payee: ACTOR, productClass: "artificial-intelligence-research", accountingUnit: draft.internalTransfer.accountingUnit, amountMicros: draft.internalTransfer.allocatedCostMicros, cashSettlementRequired: false, status: "settled", sourcePacket: sourcePacket.id }, settlementReceipt = { id: contentId(settlementBody), ...settlementBody };
  const sourceCorpusDigest = digest({ carrier: draft.carrier.sha256, citations: draft.citations, claims: draft.claims });
  const root = resolve(options.dataRoot ?? join(NODE_ROOT, "data")), journal = createSemanticRecordJournal({ root, objectKind: RECORD_OBJECT_KIND }), prior = journal.query({ category: CATEGORY }).find((row) => row.record.courseId === draft.courseId && row.record.lessonId === draft.lessonId)?.record;
  if (prior) { if (prior.sourceCorpusDigest === sourceCorpusDigest && prior.correctionIdentity === draft.correctionIdentity) return prior; throw new TypeError("AI research lesson already has a different immutable product; form a successor correction"); }
  const admittedAt = options.at ?? new Date().toISOString(), body = { type: "ArtificialIntelligenceResearchProductAdmission", provider: ACTOR, customer: CUSTOMER, courseId: draft.courseId, lessonId: draft.lessonId, researchProductClasses: [...draft.researchProductClasses], sourcePacket, sourceCorpusDigest, citations: draft.citations, claims: draft.claims, uncertainty: draft.uncertainty, limitations: draft.limitations, observedThrough: draft.observedThrough, expiresAt: draft.expiresAt, reuseGrant: [...draft.reuseGrant], correctionIdentity: draft.correctionIdentity, privacy: draft.privacy, researchSettlementReceipt: settlementReceipt, researchSettlementStatus: "settled", authorityWithheld: ["curriculum-membership", "notebooklm-source-or-generation", "youtube-channel", "upload-schedule-publication"], admittedAt }, product = { id: contentId(body), ...body };
  journal.record({ category: CATEGORY, recordedAt: admittedAt, record: { ...product }, charge: { support: true, refutation: false }, relation: { subject: ACTOR, predicate: "admits", object: product.id } });
  return product;
}

export function researchSourceProjection(product) {
  if (!verifyJsonSemanticRecord({ objectKind: "emsweb.artificial-intelligence-research.record", value: semanticJson(product), witnessRoot: EMPTY_WITNESS_ROOT }) || product.type !== "ArtificialIntelligenceResearchProductAdmission" || product.provider !== ACTOR || product.customer !== CUSTOMER) throw new TypeError("AI source projection requires one exact admitted product");
  const carrier = product.sourcePacket?.carrier, path = contained(resolve(NODE_ROOT, carrier?.path ?? "")), stat = lstatSync(path), bytes = !stat.isSymbolicLink() && stat.isFile() ? readFileSync(path) : null;
  if (!bytes || carrier.mediaType !== "text/markdown" || bytes.length !== carrier.byteLength || digest(bytes) !== carrier.sha256) throw new TypeError("AI admitted research carrier bytes changed");
  return { title: `${product.lessonId.replaceAll("-", " ")} — source-grounded research packet`, digest: carrier.sha256, mediaType: carrier.mediaType, byteLength: bytes.length, bytes };
}

export function deliverResearchProduct(product) {
  const objectBody = { type: "ArtificialIntelligenceResearchProductDelivery", product, source: researchSourceProjection(product) }, object = { id: contentId(objectBody), ...objectBody };
  const body = { type: "Accept", actor: ACTOR, target: CUSTOMER, object }; return { id: contentId(body), ...body };
}
