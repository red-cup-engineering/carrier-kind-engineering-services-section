import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import {
  a2aResultParts,
  sendRmnTask,
} from "@red-cup-engineering/a2a-rmn-task-client-service";
import { agentCardSignatureEvidence } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import {
  extractRmnPart,
  userRmnMessage,
} from "@red-cup-engineering/a2a-rmn-part-service";
import {
  admitJsonSemanticContent,
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
  verifyJsonSemanticRecord,
} from "@red-cup-engineering/semantic-content-identify-service";
const RSC_A2A_JSON_KIND = "rsc-quiescent.a2a-json",
  semanticBytes = (value) =>
    identifyJsonSemanticContent({
      objectKind: RSC_A2A_JSON_KIND,
      value,
      witnessRoot: EMPTY_WITNESS_ROOT,
    }).bytes,
  decodeSemantic = (bytes) =>
    admitJsonSemanticContent({ bytes, objectKind: RSC_A2A_JSON_KIND }).value;
import { ACTOR, NODE_ROOT, notebookIdentity } from "./notebook.mjs";
import { queryJournalRecords, recordJournalRecord, semanticJson } from "./record-journal.mjs";
export const PROVIDER = "urn:ame:notebooklm-inference-team",
  CURRICULUM = "urn:ame:modern-business-curriculum-enterprise",
  CHANNEL = "urn:ame:modern-business-youtube-channel-enterprise",
  ALLOCATION = "modern-business-practices-alternating";
const INV = "modern-business-notebook.inventory-admission",
  SRC = "modern-business-notebook.source-state-admission",
  VID = "modern-business-notebook.video-artifact-admission",
  NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
export function canonical(v) {
  if (v instanceof Uint8Array)
    return `{"$bytes":${JSON.stringify(Buffer.from(v).toString("base64url"))}}`;
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .filter((k) => v[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
      .join(",")}}`;
  return JSON.stringify(v);
}
function producer(v) {
  if (Array.isArray(v)) return `[${v.map(producer).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .filter((k) => v[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${producer(v[k])}`)
      .join(",")}}`;
  return JSON.stringify(v);
}
export function digest(v) {
  return `sha256:${createHash("sha256")
    .update(v instanceof Uint8Array ? v : canonical(v))
    .digest("hex")}`;
}
export function contentId(v) {
  return identifyJsonSemanticContent({
    objectKind: "emsweb.modern-business-persistent-notebook.record",
    value: semanticJson(v),
    witnessRoot: EMPTY_WITNESS_ROOT,
  }).token;
}
export function exact(v) {
  if (!v || typeof v !== "object") return false;
  const { id, ...b } = v;
  return verifyJsonSemanticRecord({
    objectKind: "emsweb.modern-business-persistent-notebook.record",
    value: { id, ...semanticJson(b) },
    witnessRoot: EMPTY_WITNESS_ROOT,
  });
}
function exactProduct(v) {
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
export function providerBinding() {
  const v = JSON.parse(
    readFileSync(
      new URL("../content/config/notebooklm-provider.json", import.meta.url),
      "utf8",
    ),
  );
  if (
    v.status !== "active-standing-grant" ||
    v.customer !== ACTOR ||
    v.provider !== PROVIDER ||
    v.notebookId !== notebookIdentity().notebookId ||
    !NI.test(v.agentCardIdentity) ||
    v.videoCustomer !== CHANNEL ||
    v.videoCapacityAllocation !== ALLOCATION
  )
    throw new TypeError(
      "business notebook provider binding is not active and exact",
    );
  return v;
}
export function rows(root, cat) {
  return queryJournalRecords(root, cat);
}
async function record(cat, value, o = {}) {
  const at = o.at ?? new Date().toISOString();
  recordJournalRecord(o.dataRoot ?? join(NODE_ROOT, "data"), cat, value, { recordedAt: at, actor: ACTOR });
}
function response(exchange) {
  const cfg = providerBinding();
  if (
    agentCardSignatureEvidence(exchange.agentCard).card !==
    cfg.agentCardIdentity
  )
    throw new TypeError("NotebookLM card changed");
  const p = extractRmnPart(a2aResultParts(exchange.result)),
    t = decodeSemantic(p.bytes);
  if (
    !semanticBytes(t).equals(p.bytes) ||
    t?.[0] !== "notebooklm-operation-result"
  )
    throw new TypeError("NotebookLM returned foreign result");
  return t[1];
}
async function send(tag, request, o = {}) {
  const cfg = providerBinding(),
    exchange = await (o.send ?? sendRmnTask)({
      agentUrl: cfg.agentUrl,
      message: userRmnMessage(
        semanticBytes([tag, request]),
        `${tag}.rmn.cbor`,
        randomUUID(),
      ),
      requireSignature: true,
      signal: AbortSignal.timeout(o.timeoutMs ?? 3630000),
    });
  return response(exchange);
}
function urn() {
  return `urn:emsenn:notebooklm-notebook:${notebookIdentity().notebookId}`;
}
export async function observeInventory(o = {}) {
  const root = resolve(o.dataRoot ?? join(NODE_ROOT, "data")),
    operation = contentId({
      customer: ACTOR,
      notebookId: notebookIdentity().notebookId,
      phase: "inventory-v1",
    }),
    prior = rows(root, INV).find((r) => r.providerOperation === operation);
  if (prior) return prior;
  const normalized = {
      notebookId: notebookIdentity().notebookId,
      policy: "observe-only",
      executionMode: "observe-live",
      expectedCurrentSourceIds: null,
      desiredSources: [],
      maxRuntimeSeconds: 300,
    },
    request = {
      type: "NotebookLMA2AInventoryObservation",
      customer: ACTOR,
      operationId: operation,
      providerRequestDigest: digest(normalized),
      notebookId: normalized.notebookId,
      policy: normalized.policy,
      executionMode: normalized.executionMode,
      maxRuntimeSeconds: 300,
    },
    result = await send("notebooklm-inventory-observation", request, o),
    receipt = result?.receipt;
  if (
    result?.disposition !== "completed" ||
    receipt?.outcome !== "observed" ||
    receipt.notebookId !== notebookIdentity().notebookId ||
    receipt.finalSourceSetDigest !== digest([...receipt.finalSourceIds].sort())
  )
    throw new TypeError(
      `business inventory observation failed: ${result?.code ?? "invalid"}`,
    );
  const b = {
      type: "ModernBusinessNotebookInventoryAdmission",
      notebook: urn(),
      provider: PROVIDER,
      providerOperation: operation,
      providerRequestDigest: request.providerRequestDigest,
      providerReceipt: receipt.id,
      finalSourceIds: receipt.finalSourceIds,
      finalSourceSetDigest: receipt.finalSourceSetDigest,
      admittedAt: o.at ?? new Date().toISOString(),
    },
    a = { id: contentId(b), ...b };
  await record(INV, a, { ...o, dataRoot: root });
  return a;
}
function current(root) {
  return [...rows(root, INV), ...rows(root, SRC)]
    .sort((a, b) => Date.parse(a.admittedAt) - Date.parse(b.admittedAt))
    .at(-1);
}
export function validLesson(v, at = new Date().toISOString()) {
  const bytes = Buffer.from(v?.source?.bytes ?? []),
    c = v?.situatedContext;
  return (
    exactProduct(v) &&
    v.type === "ModernBusinessLessonProductAdmission" &&
    v.provider === CURRICULUM &&
    v.courseId === "modern-firm-as-operational-system" &&
    v.courseRevision === 1 &&
    Number.isInteger(v.sequence) &&
    v.sequence > 0 &&
    Array.isArray(v.prerequisites) &&
    v.researchSettlementStatus === "settled" &&
    Date.parse(v.expiresAt) > Date.parse(at) &&
    v.reuseGrant?.includes("notebooklm-transformation") &&
    v.reuseGrant?.includes("public-youtube-release") &&
    ["organizationForm", "industry", "scale", "jurisdiction"].every(
      (k) => typeof c?.[k] === "string" && c[k],
    ) &&
    c.descriptiveEvidence?.length &&
    Array.isArray(c.prescriptiveInference) &&
    c.uncertainty?.length &&
    c.counterevidence?.length &&
    bytes.length > 0 &&
    bytes.length === v.source.byteLength &&
    v.source.mediaType === "text/markdown" &&
    digest(bytes) === v.source.digest &&
    !Object.hasOwn(v.source, "path") &&
    v.notebookPromptDigest === digest(v.notebookPrompt) &&
    v.authorityWithheld?.includes("business-advice-warranty")
  );
}
export async function reconcile(lesson, o = {}) {
  if (!validLesson(lesson, o.at))
    throw new TypeError(
      "business notebook requires exact fresh situated curriculum product",
    );
  const root = resolve(o.dataRoot ?? join(NODE_ROOT, "data"));
  await observeInventory({ ...o, dataRoot: root });
  const cur = current(root),
    operation = contentId({
      customer: ACTOR,
      notebookId: notebookIdentity().notebookId,
      curriculumProduct: lesson.id,
      sourcePrecondition: cur.finalSourceSetDigest,
      phase: "source-v1",
    }),
    prior = rows(root, SRC).find((r) => r.providerOperation === operation);
  if (prior) return prior;
  const bytes = Buffer.from(lesson.source.bytes),
    source = {
      digest: lesson.source.digest,
      title: lesson.source.title,
      mediaType: "text/markdown",
      byteLength: bytes.length,
    },
    normalized = {
      notebookId: notebookIdentity().notebookId,
      policy: "curated-cumulative-add",
      executionMode: "reconcile-live",
      expectedCurrentSourceIds: cur.finalSourceIds,
      desiredSources: [source],
      maxRuntimeSeconds: 1800,
    },
    request = {
      type: "NotebookLMA2ACumulativeSourceOperation",
      customer: ACTOR,
      operationId: operation,
      providerRequestDigest: digest(normalized),
      notebookId: normalized.notebookId,
      policy: normalized.policy,
      expectedCurrentSourceIds: normalized.expectedCurrentSourceIds,
      maxRuntimeSeconds: 1800,
      source: { ...source, bytes },
    },
    result = await send("notebooklm-cumulative-source-operation", request, o),
    receipt = result?.receipt;
  if (
    result?.disposition !== "completed" ||
    receipt?.outcome !== "reconciled" ||
    (receipt.deletedSourceIds ?? []).length ||
    receipt.finalSourceSetDigest !== digest([...receipt.finalSourceIds].sort())
  )
    throw new TypeError(
      `business source reconciliation failed: ${result?.code ?? "invalid"}`,
    );
  const b = {
      type: "ModernBusinessNotebookSourceStateAdmission",
      notebook: urn(),
      curriculumProduct: lesson.id,
      sourcePacket: lesson.sourcePacket,
      sourceDigest: source.digest,
      provider: PROVIDER,
      providerOperation: operation,
      providerRequestDigest: request.providerRequestDigest,
      providerReceipt: receipt.id,
      desiredSources: receipt.desiredSources,
      finalSourceIds: receipt.finalSourceIds,
      finalSourceSetDigest: receipt.finalSourceSetDigest,
      admittedAt: o.at ?? new Date().toISOString(),
    },
    a = { id: contentId(b), ...b };
  await record(SRC, a, { ...o, dataRoot: root });
  return a;
}
function demand(lesson, source) {
  const p = {
      type: "NotebookLMRequest",
      sources: source.desiredSources,
      prompt: lesson.notebookPrompt,
      artifactType: "video",
      executionMode: "live",
      corpusMode: "reconciled-notebook",
      notebookSourceReceiptId: source.providerReceipt,
      videoFormat: "explainer",
      videoStyle: "auto",
      videoLanguage: "en",
      videoCapacityCustomer: CHANNEL,
      videoCapacityAllocation: ALLOCATION,
      capacityCustomer: null,
      cinematicAllocation: null,
    },
    normalized = {
      sources: p.sources,
      prompt: p.prompt,
      artifactType: "video",
      executionMode: "live",
      corpusMode: "reconciled-notebook",
      notebookSourceReceiptId: p.notebookSourceReceiptId,
      sourcePacket: null,
      sourcePacketDigest: null,
      videoFormat: "explainer",
      videoStyle: "auto",
      videoLanguage: "en",
      videoCapacityCustomer: CHANNEL,
      videoCapacityAllocation: ALLOCATION,
      capacityCustomer: null,
      cinematicAllocation: null,
    },
    b = {
      type: "PersistentNotebookVideoDemand",
      notebook: urn(),
      sourceAdmission: source.id,
      customer: CHANNEL,
      provider: PROVIDER,
      providerRequest: p,
      providerRequestDigest: digest(normalized),
    };
  return { id: contentId(b), ...b };
}
function secure(u) {
  try {
    const x = new URL(u);
    return (
      x.protocol === "https:" ||
      (x.protocol === "http:" &&
        ["127.0.0.1", "localhost", "[::1]"].includes(x.hostname))
    );
  } catch {
    return false;
  }
}
export async function generate(lesson, source, o = {}) {
  const root = resolve(o.dataRoot ?? join(NODE_ROOT, "data")),
    d = demand(lesson, source),
    operation = contentId({
      customer: ACTOR,
      notebookId: notebookIdentity().notebookId,
      curriculumProduct: lesson.id,
      phase: "video-v1",
    }),
    prior = rows(root, VID).find((r) => r.providerOperation === operation);
  if (prior) return delivery(lesson, prior);
  const p = d.providerRequest,
    request = {
      type: "NotebookLMA2AVideoOperation",
      customer: ACTOR,
      operationId: operation,
      providerRequestDigest: d.providerRequestDigest,
      notebookId: notebookIdentity().notebookId,
      prompt: p.prompt,
      notebookSourceReceiptId: p.notebookSourceReceiptId,
      videoFormat: "explainer",
      videoStyle: "auto",
      videoLanguage: "en",
      videoCapacityCustomer: CHANNEL,
      videoCapacityAllocation: ALLOCATION,
      capacityCustomer: null,
      cinematicAllocation: null,
    };
  let result;
  for (let i = 0; i < (o.maxAttempts ?? 240); i++) {
    result = await send("notebooklm-video-operation", request, o);
    if (result?.disposition !== "in-progress") break;
    await (o.wait ?? ((ms) => new Promise((r) => setTimeout(r, ms))))(
      Math.min(Number(result.retryAfterSeconds ?? 60) * 1000, 60000),
    );
  }
  const pr = result?.result,
    a = pr?.artifact,
    payload = a?.payload,
    cap = pr?.videoOverviewCapacityReceipt;
  if (
    result?.disposition !== "completed" ||
    pr?.disposition !== "artifact" ||
    !secure(a?.url) ||
    a.authorization?.scheme !== "Bearer" ||
    payload?.format !== "mp4" ||
    payload.mediaType !== "video/mp4" ||
    payload.videoFormat !== "explainer" ||
    cap.customer !== CHANNEL ||
    cap.allocation !== ALLOCATION ||
    cap.disposition !== "spent" ||
    cap.requestDigest !== d.providerRequestDigest
  )
    throw new TypeError(
      `business video generation failed: ${result?.code ?? "invalid"}`,
    );
  const response = await (o.fetchImpl ?? fetch)(a.url, {
      headers: { authorization: `Bearer ${a.authorization.token}` },
      redirect: "error",
      signal: AbortSignal.timeout(o.timeoutMs ?? 3630000),
    }),
    bytes = Buffer.from(await response.arrayBuffer());
  if (
    !response.ok ||
    bytes.length < 12 ||
    bytes.subarray(4, 8).toString("ascii") !== "ftyp" ||
    bytes.length !== payload.byteLength ||
    digest(bytes) !== payload.sha256
  )
    throw new TypeError("business artifact bytes differ from provider terms");
  const dir = join(root, "artifacts");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${payload.sha256.slice(7)}.mp4`);
  if (existsSync(path)) {
    if (
      !lstatSync(path).isFile() ||
      digest(readFileSync(path)) !== payload.sha256
    )
      throw new TypeError("business artifact conflict");
  } else writeFileSync(path, bytes, { flag: "wx", mode: 0o600 });
  const b = {
      type: "PersistentNotebookVideoArtifactAdmission",
      notebook: urn(),
      demand: d.id,
      sourceAdmission: source.id,
      curriculumProduct: lesson.id,
      provider: PROVIDER,
      providerResultDigest: digest(pr),
      providerOperation: operation,
      providerDemand: d,
      providerRequestDigest: d.providerRequestDigest,
      providerArtifactId: payload.providerArtifactId,
      videoOverviewCapacityReceipt: cap.id,
      videoOverviewCapacity: cap,
      cinematicCapacityReceipt: null,
      cinematicCapacity: null,
      videoFormat: "explainer",
      videoStyle: "auto",
      language: "en",
      mediaType: "video/mp4",
      byteLength: bytes.length,
      sha256: payload.sha256,
      importedCarrier: `data/artifacts/${basename(path)}`,
      admittedAt: o.at ?? new Date().toISOString(),
    },
    ad = { id: contentId(b), ...b };
  await record(VID, ad, { ...o, dataRoot: root });
  return delivery(lesson, ad);
}
export function delivery(lesson, video) {
  const b = {
      type: "ModernBusinessPersistentNotebookExplainerDelivery",
      provider: ACTOR,
      customer: CHANNEL,
      curriculumProduct: lesson.id,
      demand: video.providerDemand,
      videoAdmission: video,
      videoOverviewCapacityReceipt: video.videoOverviewCapacity,
    },
    d = { id: contentId(b), ...b },
    a = { type: "Accept", actor: ACTOR, target: CHANNEL, object: d };
  return {
    activity: { id: contentId(a), ...a },
    delivery: d,
    artifactPath: resolve(NODE_ROOT, video.importedCarrier),
  };
}
export async function runLesson(lesson, o = {}) {
  return generate(lesson, await reconcile(lesson, o), o);
}
