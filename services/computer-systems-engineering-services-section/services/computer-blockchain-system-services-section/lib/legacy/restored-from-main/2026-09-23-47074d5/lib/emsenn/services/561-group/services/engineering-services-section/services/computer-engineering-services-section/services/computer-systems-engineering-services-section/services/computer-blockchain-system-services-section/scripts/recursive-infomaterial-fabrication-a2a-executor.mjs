#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { ROLE_AGENT, ROLE_USER } from "@red-cup-engineering/a2a-services-section/a2a-client";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-services-section/rmn-part";
import { loadSettlementAccount } from "./settlement-account-binding.mjs";
import { recordSettlementRecord } from "@red-cup-engineering/witness-journal-document-service";
import { fabricateDirectoryPatch } from "@red-cup-engineering/recursive-infomaterial-fabrication-service";
import { decodeFabricationRequest } from "@red-cup-engineering/recursive-infomaterial-fabrication-service/request";

const ROOT = "recursive-infomaterial-fabrication-service"; // moved out of the service; identity stays the service's own basename

export async function executeA2aMessage(source, env = process.env) {
  const message = (source);
  if (message.role !== ROLE_USER) throw new Error("recursive infomaterial fabrication requires an A2A ROLE_USER message");
  if (!env.WITNESS_JOURNAL_DOCUMENT_AGENT) throw new Error("WITNESS_JOURNAL_DOCUMENT_AGENT is required for explicit receipt custody");
  const input = extractRmnPart(message.parts), schedule = decodeFabricationRequest(input.bytes);
  const result = await fabricateDirectoryPatch(schedule), recordedAt = new Date().toISOString();
  const account = loadSettlementAccount(ROOT);
  await recordSettlementRecord({ settlement: account.settlement, actor: account.actor, agentUrl: env.WITNESS_JOURNAL_DOCUMENT_AGENT, category: "recursive-infomaterial-fabrication.receipt", recordedAt, record: { ...result.receipt, semanticId: result.semanticId, request: input.ni } });
  const coverBytes = Buffer.from(result.coverReceipt.canonicalBytesBase64, "base64");
  return ({ messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId, role: ROLE_AGENT, parts: [rmnPart(coverBytes, "infomaterial-directory-patch-cover.rmn.cbor")], metadata: { requestNi: input.ni, fabricationReceiptNi: result.semanticId, circuit: result.receipt.circuit, assembly: result.receipt.assembly, disposition: "complete" }, extensions: [], referenceTaskIds: [] });
}

try { process.stdout.write(`${JSON.stringify(await executeA2aMessage(JSON.parse(readFileSync(0, "utf8"))))}\n`); }
catch (error) { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; }
