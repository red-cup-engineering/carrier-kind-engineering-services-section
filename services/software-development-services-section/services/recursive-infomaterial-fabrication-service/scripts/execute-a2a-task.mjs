#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { createSettlementStore } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { fabricateDirectoryPatch } from "../src/fabricate.mjs";
import { decodeFabricationRequest } from "../src/request.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function executeA2aMessage(source, env = process.env) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("recursive infomaterial fabrication requires an A2A ROLE_USER message");
  if (!env.WITNESS_JOURNAL_RDF_AGENT) throw new Error("WITNESS_JOURNAL_RDF_AGENT is required; the board cannot keep an ambient book");
  const input = extractRmnPart(message.parts), schedule = decodeFabricationRequest(input.bytes);
  const result = await fabricateDirectoryPatch(schedule), recordedAt = new Date().toISOString();
  const store = createSettlementStore({ settlementRoot: ROOT, agentUrl: env.WITNESS_JOURNAL_RDF_AGENT });
  await store.record({ category: "recursive-infomaterial-fabrication.receipt", recordedAt, record: { ...result.receipt, semanticId: result.semanticId, request: input.ni } });
  const coverBytes = Buffer.from(result.coverReceipt.canonicalBytesBase64, "base64");
  return Message.toJSON({ messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId, role: Role.ROLE_AGENT, parts: [rmnPart(coverBytes, "infomaterial-directory-patch-cover.rmn.cbor")], metadata: { requestNi: input.ni, fabricationReceiptNi: result.semanticId, circuit: result.receipt.circuit, assembly: result.receipt.assembly, disposition: "complete" }, extensions: [], referenceTaskIds: [] });
}

try { process.stdout.write(`${JSON.stringify(await executeA2aMessage(JSON.parse(readFileSync(0, "utf8"))))}\n`); }
catch (error) { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; }
