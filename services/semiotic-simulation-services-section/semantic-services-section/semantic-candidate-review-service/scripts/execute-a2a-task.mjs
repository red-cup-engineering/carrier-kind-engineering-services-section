#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/rmn-semantic-conformance";
import { createSettlementStore } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { SEMANTIC_CANDIDATE_REVIEW_LAW } from "../src/law.mjs";
import { decodeReviewRequest, performReview } from "../src/protocol.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export async function executeA2aMessage(source, env = process.env, options = {}) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("semantic review requires an A2A ROLE_USER message");
  if (!env.RWIL_RDF_AGENT) throw new Error("RWIL_RDF_AGENT is required");
  const input = extractRmnPart(message.parts), term = decodeSemantic(input.bytes);
  if (!semanticBytes(term).equals(input.bytes) || term?.[0] !== "ascribe" || term.length !== 3) throw new Error("semantic review request must be canonical typed RMN CBOR");
  const result = await performReview(decodeReviewRequest(term[1], term[2]), options), recordedAt = new Date().toISOString();
  const store = createSettlementStore({ settlementRoot: ROOT, agentUrl: env.RWIL_RDF_AGENT });
  await store.record({ category: "semantic-candidate-review.receipt", recordedAt, record: { ...result.receipt, semanticId: result.semanticId, law: SEMANTIC_CANDIDATE_REVIEW_LAW.id } });
  return Message.toJSON({ messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId, role: Role.ROLE_AGENT, parts: [rmnPart(result.canonicalBytes, "semantic-candidate-review-receipt.rmn.cbor")], metadata: { disposition: result.receipt.review.accepted ? "accepted-by-review-quorum" : "refused-by-review-quorum", receiptNi: result.semanticId, law: SEMANTIC_CANDIDATE_REVIEW_LAW.id }, extensions: [], referenceTaskIds: [] });
}

if (process.argv[1]) try { const source = JSON.parse(readFileSync(0, "utf8")); process.stdout.write(`${JSON.stringify(await executeA2aMessage(source))}\n`); } catch (error) { process.stderr.write(`${error.code ?? "semantic-review-refusal"}: ${error.message}\n`); process.exitCode = 1; }
