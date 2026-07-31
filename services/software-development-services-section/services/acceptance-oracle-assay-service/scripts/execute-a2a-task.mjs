#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/rmn-semantic-conformance";
import { createSettlementStore } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { ACCEPTANCE_ORACLE_ASSAY_LAW } from "../src/law.mjs";
import { decodeRequest, performAssay } from "../src/protocol.mjs";
const ROOT = resolve(import.meta.dirname, "..");
export async function executeA2aMessage(source, env = process.env) { const message = Message.fromJSON(source); if (message.role !== Role.ROLE_USER) throw new Error("oracle assay requires A2A ROLE_USER"); if (!env.RWIL_RDF_AGENT) throw new Error("RWIL_RDF_AGENT is required"); const input = extractRmnPart(message.parts), term = decodeSemantic(input.bytes); if (!semanticBytes(term).equals(input.bytes) || term?.[0] !== "ascribe" || term.length !== 3) throw new Error("oracle assay request must be canonical typed RMN CBOR"); const result = await performAssay(decodeRequest(term[1], term[2])), recordedAt = new Date().toISOString(); const store = createSettlementStore({ settlementRoot: ROOT, agentUrl: env.RWIL_RDF_AGENT }); await store.record({ category: "acceptance-oracle-assay.receipt", recordedAt, record: { ...result.receipt, semanticId: result.semanticId, law: ACCEPTANCE_ORACLE_ASSAY_LAW.id } }); return Message.toJSON({ messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId, role: Role.ROLE_AGENT, parts: [rmnPart(result.canonicalBytes, "acceptance-oracle-assay-receipt.rmn.cbor")], metadata: { disposition: result.receipt.assay.accepted ? "oracle-evidence-assayed" : "oracle-evidence-not-assayed", receiptNi: result.semanticId, law: ACCEPTANCE_ORACLE_ASSAY_LAW.id }, extensions: [], referenceTaskIds: [] }); }
if (process.argv[1]) try { process.stdout.write(`${JSON.stringify(await executeA2aMessage(JSON.parse(readFileSync(0, "utf8"))))}\n`); } catch (error) { process.stderr.write(`${error.code ?? "oracle-assay-refusal"}: ${error.message}\n`); process.exitCode = 1; }
