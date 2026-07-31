#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { encodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { createSettlementStore } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { PHASE2_TERRITORY_CONFORMANCE_LAW } from "../src/law.mjs";
import { authorizeTerritory, decodeTerritoryScanRequest } from "../src/protocol.mjs";
import { scanTerritory } from "../src/scan-territory.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export async function executeA2aMessage(source, env = process.env) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("territory conformance requires an A2A ROLE_USER message");
  if (!env.CONFORMANCE_TERRITORY_ROOT) throw new Error("CONFORMANCE_TERRITORY_ROOT is required");
  if (!env.RWIL_RDF_AGENT) throw new Error("RWIL_RDF_AGENT is required; the die cannot keep an ambient book");
  const input = extractRmnPart(message.parts), request = decodeTerritoryScanRequest(input.bytes);
  const report = scanTerritory(authorizeTerritory(env.CONFORMANCE_TERRITORY_ROOT, request.relativePath));
  const encoded = encodeRelationalValue(report), term = ["ascribe", encoded.type, encoded.term], bytes = semanticBytes(term), receiptNi = semanticId(term), recordedAt = new Date().toISOString();
  const store = createSettlementStore({ settlementRoot: ROOT, agentUrl: env.RWIL_RDF_AGENT });
  await store.record({ category: "phase2-territory-conformance.receipt", recordedAt, record: { report: receiptNi, ruleset: report.ruleset, territory: report.territory, conforming: report.conforming, violationCount: report.violationCount, request: input.ni, law: PHASE2_TERRITORY_CONFORMANCE_LAW.id } });
  return Message.toJSON({ messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId, role: Role.ROLE_AGENT, parts: [rmnPart(bytes, "phase2-territory-conformance-report.rmn.cbor")], metadata: { disposition: report.conforming ? "conformant" : "violations", receiptNi, ruleset: report.ruleset, violationCount: report.violationCount }, extensions: [], referenceTaskIds: [] });
}

try { process.stdout.write(`${JSON.stringify(await executeA2aMessage(JSON.parse(readFileSync(0, "utf8"))))}\n`); }
catch (error) { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; }
