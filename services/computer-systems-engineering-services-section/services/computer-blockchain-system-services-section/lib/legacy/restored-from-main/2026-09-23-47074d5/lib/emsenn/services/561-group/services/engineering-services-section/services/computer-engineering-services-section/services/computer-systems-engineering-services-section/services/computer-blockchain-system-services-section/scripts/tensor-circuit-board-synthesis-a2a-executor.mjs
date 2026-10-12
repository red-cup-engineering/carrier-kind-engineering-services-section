#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { ROLE_AGENT, ROLE_USER } from "@red-cup-engineering/a2a-services-section/a2a-client";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-services-section/rmn-part";
import { checkTerm } from "@red-cup-engineering/relation-model-notation/runtime";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/relation-model-notation/cbor-codec";
import { loadSettlementAccount } from "./settlement-account-binding.mjs";
import { recordSettlementRecord } from "@red-cup-engineering/witness-journal-document-service";
import { decodeSynthesisRequest, synthesizeTensorCircuitBoard } from "@red-cup-engineering/tensor-circuit-board-synthesis-service";

const ROOT = "tensor-circuit-board-synthesis-service"; // moved out of the service; identity stays the service's own basename

export async function executeA2aMessage(source, env = process.env) {
  const message = (source);
  if (message.role !== ROLE_USER) throw new Error("synthesis requires an A2A ROLE_USER message");
  if (!env.WITNESS_JOURNAL_RDF_AGENT) throw new Error("WITNESS_JOURNAL_RDF_AGENT is required; synthesis cannot keep an ambient book");
  const input = extractRmnPart(message.parts);
  const term = decodeSemantic(input.bytes);
  if (!semanticBytes(term).equals(input.bytes) || term?.[0] !== "ascribe" || term.length !== 3) throw new Error("synthesis request must be canonical typed RMN CBOR");
  checkTerm(term[2], term[1]);
  const result = synthesizeTensorCircuitBoard(decodeSynthesisRequest(term[1], term[2]));
  const recordedAt = new Date().toISOString();
  const account = loadSettlementAccount(ROOT);
  await recordSettlementRecord({ settlement: account.settlement, actor: account.actor, agentUrl: env.WITNESS_JOURNAL_RDF_AGENT, category: "tensor-circuit-board-synthesis.receipt", recordedAt, record: { ...result.receipt, semanticId: result.semanticId } });
  return ({
    messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId, role: ROLE_AGENT,
    parts: [rmnPart(result.canonicalBytes, "tensor-circuit-board-synthesis-receipt.rmn.cbor")],
    metadata: { disposition: "conformant", receiptNi: result.semanticId, circuitNi: result.receipt.circuitId, assemblyNi: result.receipt.assemblyId },
    extensions: [], referenceTaskIds: [],
  });
}

try {
  const source = JSON.parse(readFileSync(0, "utf8"));
  process.stdout.write(`${JSON.stringify(await executeA2aMessage(source))}\n`);
} catch (error) {
  process.stderr.write(`${error.code ?? "synthesis-refusal"}: ${error.message}\n`);
  process.exitCode = 1;
}
