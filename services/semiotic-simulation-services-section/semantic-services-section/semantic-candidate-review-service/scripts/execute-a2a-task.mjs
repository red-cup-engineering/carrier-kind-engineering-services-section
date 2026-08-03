#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { admitNormalizedSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { createSettlementStore } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { decodeReviewRequest, performReview, REVIEW_REQUEST_KIND } from "../src/protocol.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export async function executeA2aMessage(source, env = process.env, options = {}) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("semantic review requires an A2A ROLE_USER message");
  if (!env.WITNESS_JOURNAL_RDF_AGENT) throw new Error("WITNESS_JOURNAL_RDF_AGENT is required");
  const input = extractRmnPart(message.parts), admitted = admitNormalizedSemanticContent(input.bytes);
  if (admitted.envelope.objectKind !== REVIEW_REQUEST_KIND) throw new Error("semantic review request has the wrong semantic object kind");
  const result = await performReview(decodeReviewRequest(admitted.envelope.semanticType, admitted.envelope.settledBody), options), recordedAt = new Date().toISOString();
  const store = createSettlementStore({ settlementRoot: ROOT, agentUrl: env.WITNESS_JOURNAL_RDF_AGENT });
  await store.record({ category: "semantic-candidate-review.receipt", recordedAt, record: { ...result.receipt, semanticId: result.semanticId } });
  return Message.toJSON({ messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId, role: Role.ROLE_AGENT, parts: [rmnPart(result.canonicalBytes, "semantic-candidate-review-receipt.rmn.cbor")], metadata: { disposition: result.receipt.review.accepted ? "accepted-by-review-quorum" : "refused-by-review-quorum", receiptNi: result.semanticId }, extensions: [], referenceTaskIds: [] });
}

if (process.argv[1]) try { const source = JSON.parse(readFileSync(0, "utf8")); process.stdout.write(`${JSON.stringify(await executeA2aMessage(source))}\n`); } catch (error) { process.stderr.write(`${error.code ?? "semantic-review-refusal"}: ${error.message}\n`); process.exitCode = 1; }
