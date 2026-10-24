import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";import { randomBytes } from "node:crypto";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { ACTOR, NODE_ROOT } from "./notebook.mjs";
import { CHANNEL, contentId, digest, exact, rows, runLesson, validLesson } from "./operations.mjs";
import { recordJournalRecord, semanticJson } from "./record-journal.mjs";

export const ORDER_CATEGORY = "artificial-intelligence-notebook.a2a-explainer-order-state";
function curriculumCanonical(value) { if (Array.isArray(value)) return `[${value.map(curriculumCanonical).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${curriculumCanonical(value[key])}`).join(",")}}`; return JSON.stringify(value); }
function exactCurriculum(value) { if (!value || typeof value !== "object") return false; const { id, ...body } = value; return id === identifyJsonSemanticContent({ objectKind: "emsweb.artificial-intelligence-curriculum.record", value: semanticJson(body), witnessRoot: EMPTY_WITNESS_ROOT }).token; }
function accountSettlement() { const value = JSON.parse(readFileSync(join(NODE_ROOT, "content/evm/accounts/eip155-31337.json"), "utf8")); if (!/^eip155:[0-9]+:0x[a-f0-9]{40}$/u.test(value?.account?.caip10 ?? "")) throw new TypeError("AI notebook A2A provider requires its settlement account"); return value.account.caip10; }
async function record(value, options) { const at = options.at ?? new Date().toISOString(); recordJournalRecord(options.dataRoot ?? join(NODE_ROOT, "data"), ORDER_CATEGORY, value, { recordedAt: at, actor: ACTOR }); }
export function validExplainerOrder(order, at) { const delivery = order?.curriculumDelivery, lesson = delivery?.object; return exact(order) && order.type === "ArtificialIntelligencePersistentNotebookExplainerOrder" && order.customer === CHANNEL && order.provider === ACTOR && exactCurriculum(delivery) && delivery.type === "Accept" && delivery.actor === "urn:ame:artificial-intelligence-curriculum-enterprise" && delivery.target === CHANNEL && validLesson(lesson, at) && order.curriculumProduct === lesson.id && order.videoFormat === "explainer" && order.videoCapacityAllocation === "ai-history-frontiers-alternating"; }
export async function fulfillExplainerOrder(order, options = {}) {
  const at = options.at ?? new Date().toISOString(), dataRoot = resolve(options.dataRoot ?? join(NODE_ROOT, "data"));
  if (!validExplainerOrder(order, at)) return { type: "ArtificialIntelligencePersistentNotebookExplainerServiceResult", provider: ACTOR, order: order?.id ?? null, disposition: "refused", code: "invalid-order", retryable: false, refusedAt: at };
  const prior = rows(dataRoot, ORDER_CATEGORY).find((row) => row.order === order.id && row.status === "delivered"); if (prior) return prior.result;
  try {
    const generated = await (options.runLesson ?? runLesson)(order.curriculumDelivery.object, { ...options, at, dataRoot }), bytes = readFileSync(generated.artifactPath), sha = digest(bytes), exchangeRoot = resolve(options.exchangeRoot ?? join(dataRoot, "artifact-exchange"));
    if (bytes.length < 12 || bytes.subarray(4, 8).toString("ascii") !== "ftyp" || sha !== generated.delivery.videoAdmission.sha256) throw new TypeError("AI notebook generated carrier differs from its admission");
    mkdirSync(exchangeRoot, { recursive: true }); const carrier = join(exchangeRoot, `${sha.slice(7)}.mp4`); if (existsSync(carrier)) { if (digest(readFileSync(carrier)) !== sha) throw new TypeError("AI notebook exchange carrier conflicts with prior bytes"); } else writeFileSync(carrier, bytes, { flag: "wx", mode: 0o600 });
    const baseUrl = String(options.artifactBaseUrl ?? process.env.ARTIFICIAL_INTELLIGENCE_NOTEBOOK_ARTIFACT_BASE_URL ?? "").replace(/\/$/u, ""); if (!/^https?:\/\//u.test(baseUrl)) throw new TypeError("AI notebook artifact exchange requires an absolute base URL");
    const artifact = { url: `${baseUrl}/artifacts/${basename(carrier)}`, authorization: { scheme: "Bearer", token: (options.tokenBytes ?? randomBytes(32)).toString("base64url") }, mediaType: "video/mp4", byteLength: bytes.length, sha256: sha }, result = { type: "ArtificialIntelligencePersistentNotebookExplainerServiceResult", provider: ACTOR, order: order.id, disposition: "artifact", curriculumDelivery: order.curriculumDelivery, notebookDelivery: generated.activity, artifact };
    const body = { type: "ArtificialIntelligencePersistentNotebookExplainerOrderState", order: order.id, status: "delivered", result, deliveredAt: at }, row = { id: contentId(body), ...body }; await record(row, { ...options, at, dataRoot }); return result;
  } catch (error) {
    const soldOut = /capacity-sold-out|capacity.*sold out/iu.test(error.message), body = { type: "ArtificialIntelligencePersistentNotebookExplainerServiceResult", provider: ACTOR, order: order.id, disposition: "refused", code: soldOut ? "capacity-sold-out" : "provider-operation-refused", retryable: soldOut, detail: error.message.slice(0, 500), refusedAt: at }; return body;
  }
}
