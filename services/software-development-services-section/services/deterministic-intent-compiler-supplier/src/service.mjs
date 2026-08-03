import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { deliverFromEnvironment } from "@red-cup-engineering/activitypub-services-section/deliver";
import { projectRmnActivity } from "@red-cup-engineering/activitypub-services-section/rmn-activity";
import { listAddressedRmnOutbox } from "@red-cup-engineering/activitypub-services-section/rmn-outbox-client";
import { createSettlementStore, querySettlementRecords } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { requestSoftwareChangeProposalAssay } from "@lenticule-science/software-change-proposal-assay/client";
import { ACTOR, CONTEXT, bidForOffer, fulfillAward } from "./supplier.mjs";
import { bytesOf, jsonFromBytes } from "./semantic-content.mjs";

export const ROOT = new URL("..", import.meta.url).pathname;
const CATEGORY = "deterministic-intent-compiler-supplier.foraging";
const PUBLIC = "https://www.w3.org/ns/activitystreams#Public";
const ACTIVITY_KIND = "deterministic-intent-compiler-supplier.activitypub-activity";
const activityBytes = (activity) => bytesOf(activity, ACTIVITY_KIND);
function activityFromBytes(bytes) { return jsonFromBytes(bytes, ACTIVITY_KIND); }
function requiredEnvironment(name) { const value = process.env[name]; if (typeof value !== "string" || !value) throw new Error(`${name} is required`); return value; }
function validatePolicy(policy) {
  if (!policy?.proposalAssay?.agentCard || !Array.isArray(policy.boards) || policy.boards.some((board) => ["packageRoot", "nodeId", "contract"].some((field) => Object.hasOwn(board, field)) || !board.activityPubActor || !board.activityPubOutbox || !board.activityPubInbox || !board.a2aAgentCard || !board.supplierActivityPubActor)) throw new Error("supplier policy requires standard ActivityPub boards and one A2A proposal assay without package imports");
  return policy;
}
export function loadPolicy(path = new URL("../content/policies/deterministic-intent-compiler.json", import.meta.url)) { return validatePolicy(JSON.parse(readFileSync(path, "utf8"))); }
async function invokeBoard(board, operation, input = null) {
  if (operation === board.listOperation && input === null) {
    const projections = await listAddressedRmnOutbox({ outboxUrl: board.activityPubOutbox, expectedActor: board.activityPubActor, expectedAgentCard: board.a2aAgentCard, recipient: board.supplierActivityPubActor });
    const items = projections.map(({ type, objectBytes }) => { const activity = activityFromBytes(objectBytes); if (activity?.type !== type || activity.actor !== board.actor || ![PUBLIC, ACTOR].includes(activity.target)) throw new Error("board projection disagrees with its RMN activity"); return activity; });
    return { "@context": CONTEXT, type: "OrderedCollection", actor: board.actor, totalItems: items.length, orderedItems: items };
  }
  if (operation === board.submitOperation && input?.actor === ACTOR && input.target === board.actor) {
    const origin = requiredEnvironment("DETERMINISTIC_INTENT_ACTIVITYPUB_ORIGIN"), identifier = requiredEnvironment("DETERMINISTIC_INTENT_ACTIVITYPUB_IDENTIFIER"), agentCard = requiredEnvironment("DETERMINISTIC_INTENT_A2A_AGENT_CARD"), keyPath = requiredEnvironment("DETERMINISTIC_INTENT_ACTIVITYPUB_KEYS_PATH");
    const projection = projectRmnActivity({ type: input.type, origin, identifier, recipient: board.activityPubActor, objectBytes: activityBytes(input), agentCard });
    return deliverFromEnvironment(projection, { actor: ACTOR, origin, identifier, agentCard, keyPath, recipient: board.activityPubActor, inbox: board.activityPubInbox });
  }
  throw new Error(`operation ${operation} is outside the ActivityPub board treaty`);
}
function defaultLedger(options = {}) {
  const dataRoot = resolve(options.dataRoot ?? process.env.DETERMINISTIC_INTENT_COMPILER_SUPPLIER_DATA_ROOT ?? new URL("../data", import.meta.url).pathname), settlement = createSettlementStore({ settlementRoot: ROOT, agentUrl: options.witnessJournalAgentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT });
  return { read: async () => await querySettlementRecords(CATEGORY), append: (value, at) => settlement.record({ category: CATEGORY, recordedAt: at, record: value }) };
}
export function memoryLedger(seed = []) { const rows = [...seed]; return { read: () => [...rows], append: async (value) => { rows.push(value); return value; } }; }
const done = (rows, board, id) => rows.some((row) => row.board === board && row.activity === id && ["submitted", "terminal-skip"].includes(row.status));
const tick = (item) => item?.object?.awardedAtTick ?? item?.attachment?.find((part) => part?.type === "ImprovementBuyerQuote")?.tick ?? -1;

export async function operatePulse(activity, options = {}) {
  const policy = options.policy ?? loadPolicy(), at = options.recordedAt ?? new Date().toISOString();
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Create" || activity.actor !== policy.clockActor || activity.target !== ACTOR || activity.capability !== policy.deliveryCapabilityId || activity.object?.type !== "DeterministicIntentCompilerSupplierPulse" || !/#[0-9]+$/u.test(activity.object.pulseId ?? "")) return { "@context": CONTEXT, type: "Reject", actor: ACTOR, target: activity?.actor ?? null, inReplyTo: activity?.id ?? null, object: { type: "DeterministicIntentCompilerSupplierPulseRefusal", reason: "exact-contracted-clockkeeper-pulse-required", customerMutation: false } };
  const ledger = options.ledger ?? defaultLedger(options), callBoard = options.invokeBoard ?? invokeBoard, reviewProposal = options.reviewProposal ?? (async (request) => (await requestSoftwareChangeProposalAssay(request, { agentCardUrl: policy.proposalAssay.agentCard })).review), outcomes = [];
  for (const board of policy.boards) {
    let outbox; try { outbox = await callBoard(board, board.listOperation, null); } catch (error) { outcomes.push({ board: board.actor, status: "transport-residue", reason: error.message }); continue; }
    const awarded = new Set(outbox.orderedItems?.filter((item) => item?.type === "Accept" && item.object?.type === "ImprovementProposalAward").map((item) => item.object.quote) ?? []);
    const candidates = (outbox.orderedItems ?? []).filter((item) => item?.id && !done(ledger.read(), board.actor, item.id) && tick(item) >= board.minimumBoardTick).filter((item) => (item.type === "Accept" && item.target === ACTOR && item.object?.type === "ImprovementProposalAward") || (item.type === "Offer" && item.object?.type === "SoftwareDevelopmentWorkLot" && !awarded.has(item.attachment?.find((part) => part?.type === "ImprovementBuyerQuote")?.id))).sort((a, b) => Number(b.type === "Accept") - Number(a.type === "Accept") || tick(b) - tick(a) || a.id.localeCompare(b.id));
    for (const publication of candidates.slice(0, policy.maximumActivitiesPerTick)) {
      try {
        const authored = publication.type === "Accept" ? await fulfillAward(publication, publication.object.bidSnapshot, { policy, recordedAt: at, templatePath: resolve(ROOT, "content/templates/bounded-inference-intent-compiler.mjs"), reviewProposal }) : bidForOffer(publication, policy);
        const receipt = authored ? await callBoard(board, board.submitOperation, authored) : null, disposition = { type: "DeterministicIntentCompilerSupplierDisposition", board: board.actor, activity: publication.id, status: authored ? (receipt?.type === "Reject" ? "customer-rejected" : "submitted") : "terminal-skip", detail: authored ? { authored: authored.id, authoredType: authored.type, objectType: authored.object?.type, receipt: receipt?.id ?? null } : "outside-product-class", recordedAt: at, customerTerritoryMutation: false };
        await ledger.append(disposition, at); outcomes.push(disposition);
      } catch (error) { const residue = { type: "DeterministicIntentCompilerSupplierDisposition", board: board.actor, activity: publication.id, status: "retryable-residue", detail: error.message, recordedAt: at, customerTerritoryMutation: false }; await ledger.append(residue, at); outcomes.push(residue); }
    }
  }
  return { "@context": CONTEXT, type: "Accept", actor: ACTOR, target: activity.actor, inReplyTo: activity.id, object: { type: "DeterministicIntentCompilerSupplierTickReceipt", pulseId: activity.object.pulseId, outcomes, nextTickRequired: true, inferenceCalls: 0, customerMutation: false } };
}
