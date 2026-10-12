import {
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { ACTOR, NODE_ROOT } from "./notebook.mjs";
import {
  CHANNEL,
  contentId,
  digest,
  exact,
  rows,
  runLesson,
  validLesson,
} from "./operations.mjs";
import { recordJournalRecord, semanticJson } from "./record-journal.mjs";
export const CATEGORY = "modern-business-notebook.a2a-explainer-order-state";
function pc(v) {
  if (Array.isArray(v)) return `[${v.map(pc).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .filter((k) => v[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${pc(v[k])}`)
      .join(",")}}`;
  return JSON.stringify(v);
}
function exactCurriculum(v) {
  if (!v || typeof v !== "object") return false;
  const { id, ...b } = v;
  return (
    id ===
    identifyJsonSemanticContent({
      objectKind: "emsweb.modern-business-curriculum.record",
      value: semanticJson(b),
      witnessRoot: EMPTY_WITNESS_ROOT,
    }).token
  );
}
async function record(v, o) {
  recordJournalRecord(o.dataRoot ?? join(NODE_ROOT, "data"), CATEGORY, v, { recordedAt: o.at, actor: ACTOR });
}
export function validOrder(order, at) {
  const d = order?.curriculumDelivery,
    l = d?.object;
  return (
    exact(order) &&
    order.type === "ModernBusinessPersistentNotebookExplainerOrder" &&
    order.customer === CHANNEL &&
    order.provider === ACTOR &&
    exactCurriculum(d) &&
    d.type === "Accept" &&
    d.actor === "urn:ame:modern-business-curriculum-enterprise" &&
    d.target === CHANNEL &&
    validLesson(l, at) &&
    order.curriculumProduct === l.id &&
    order.videoFormat === "explainer" &&
    order.videoCapacityAllocation === "modern-business-practices-alternating"
  );
}
export async function fulfill(order, o = {}) {
  const at = o.at ?? new Date().toISOString(),
    dataRoot = resolve(o.dataRoot ?? join(NODE_ROOT, "data"));
  if (!validOrder(order, at))
    return {
      type: "ModernBusinessPersistentNotebookExplainerServiceResult",
      provider: ACTOR,
      order: order?.id ?? null,
      disposition: "refused",
      code: "invalid-order",
      retryable: false,
      refusedAt: at,
    };
  const prior = rows(dataRoot, CATEGORY).find(
    (r) => r.order === order.id && r.status === "delivered",
  );
  if (prior) return prior.result;
  try {
    const generated = await (o.runLesson ?? runLesson)(
        order.curriculumDelivery.object,
        { ...o, at, dataRoot },
      ),
      bytes = readFileSync(generated.artifactPath),
      sha = digest(bytes),
      exchangeRoot = resolve(
        o.exchangeRoot ?? join(dataRoot, "artifact-exchange"),
      );
    if (sha !== generated.delivery.videoAdmission.sha256)
      throw new TypeError("business notebook carrier differs from admission");
    mkdirSync(exchangeRoot, { recursive: true });
    const carrier = join(exchangeRoot, `${sha.slice(7)}.mp4`);
    if (existsSync(carrier)) {
      if (digest(readFileSync(carrier)) !== sha)
        throw new TypeError("business exchange conflict");
    } else writeFileSync(carrier, bytes, { flag: "wx", mode: 0o600 });
    const base = String(
      o.artifactBaseUrl ??
        process.env.MODERN_BUSINESS_NOTEBOOK_ARTIFACT_BASE_URL ??
        "",
    ).replace(/\/$/u, "");
    if (!/^https?:\/\//u.test(base))
      throw new TypeError("business artifact base URL required");
    const artifact = {
        url: `${base}/artifacts/${basename(carrier)}`,
        authorization: {
          scheme: "Bearer",
          token: (o.tokenBytes ?? randomBytes(32)).toString("base64url"),
        },
        mediaType: "video/mp4",
        byteLength: bytes.length,
        sha256: sha,
      },
      result = {
        type: "ModernBusinessPersistentNotebookExplainerServiceResult",
        provider: ACTOR,
        order: order.id,
        disposition: "artifact",
        curriculumDelivery: order.curriculumDelivery,
        notebookDelivery: generated.activity,
        artifact,
      },
      b = {
        type: "ModernBusinessPersistentNotebookExplainerOrderState",
        order: order.id,
        status: "delivered",
        result,
        deliveredAt: at,
      },
      row = { id: contentId(b), ...b };
    await record(row, { ...o, at, dataRoot });
    return result;
  } catch (e) {
    const sold = /capacity-sold-out|capacity.*sold out/iu.test(e.message);
    return {
      type: "ModernBusinessPersistentNotebookExplainerServiceResult",
      provider: ACTOR,
      order: order.id,
      disposition: "refused",
      code: sold ? "capacity-sold-out" : "provider-operation-refused",
      retryable: sold,
      detail: e.message.slice(0, 500),
      refusedAt: at,
    };
  }
}
