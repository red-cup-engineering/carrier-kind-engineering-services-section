#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { checkTerm, decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { createSettlementStore } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { assayRecursiveSettlementFabric } from "../src/assay-recursive-settlement-fabric.mjs";
import { FABRIC_ASSAY_LAW } from "../src/law.mjs";
import { authorizeFabricTerritory, decodeFabricAssayRequest, encodeFabricAssayReceipt } from "../src/protocol.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), ".."), PROVIDER = "eip155:31337:0x39b06799d1b27733b7a4e4751ffe92c61a498484";
export async function executeA2aMessage(source, env = process.env) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("fabric assay requires an A2A ROLE_USER message");
  if (!env.WITNESS_JOURNAL_RDF_AGENT) throw new Error("WITNESS_JOURNAL_RDF_AGENT is required; the assay cannot keep an ambient book");
  const input = extractRmnPart(message.parts), requestTerm = decodeSemantic(input.bytes);
  if (!semanticBytes(requestTerm).equals(input.bytes) || requestTerm?.[0] !== "ascribe" || requestTerm.length !== 3) throw new Error("fabric assay request must be canonical typed RMN CBOR");
  checkTerm(requestTerm[2], requestTerm[1]);
  const request = decodeFabricAssayRequest(requestTerm[1], requestTerm[2]), requestId = semanticId(requestTerm);
  const territoryRoot = authorizeFabricTerritory(request.territoryRoot, env.FABRIC_ASSAY_ALLOWED_ROOTS);
  const assay = assayRecursiveSettlementFabric(territoryRoot), result = encodeFabricAssayReceipt({ provider: PROVIDER, law: FABRIC_ASSAY_LAW.id, request: requestId, assay }), recordedAt = new Date().toISOString();
  const store = createSettlementStore({ settlementRoot: ROOT, agentUrl: env.WITNESS_JOURNAL_RDF_AGENT });
  await store.record({ category: "recursive-settlement-fabric-assay.receipt", recordedAt, record: { semanticId: result.id, provider: PROVIDER, law: FABRIC_ASSAY_LAW.id, request: requestId, conforming: assay.conforming, frontier: assay.frontier } });
  return Message.toJSON({ messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId, role: Role.ROLE_AGENT, parts: [rmnPart(result.bytes, "recursive-settlement-fabric-assay-receipt.rmn.cbor")], metadata: { disposition: assay.conforming ? "conformant" : "cut-required", receiptNi: result.id, requestNi: requestId }, extensions: [], referenceTaskIds: [] });
}
try { process.stdout.write(`${JSON.stringify(await executeA2aMessage(JSON.parse(readFileSync(0, "utf8"))))}\n`); }
catch (error) { process.stderr.write(`${error.code ?? "fabric-assay-refusal"}: ${error.message}\n`); process.exitCode = 1; }
