#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { conformInfomaterialLayout } from "@red-cup-engineering/infomaterial-layout-service/client";
import { checkTerm, decodeSemantic, semanticBytes } from "@red-cup-engineering/rmn-semantic-conformance";
import { createSettlementStore } from "@lenticule-science/rwil-rdf-projection-service/client";
import { decodeCutGraphRequest, deriveInfomaterialCutGraph } from "../src/cut-graph.mjs";
import { INFOMATERIAL_CUT_GRAPH_LAW } from "../src/law.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function executeA2aMessage(source, env = process.env) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("cut-graph derivation requires an A2A ROLE_USER message");
  if (!env.INFOMATERIAL_LAYOUT_AGENT) throw new Error("INFOMATERIAL_LAYOUT_AGENT is required; cut-graph derivation cannot attest its own layout");
  if (!env.RWIL_RDF_AGENT) throw new Error("RWIL_RDF_AGENT is required; cut-graph derivation cannot keep an ambient book");
  const input = extractRmnPart(message.parts), term = decodeSemantic(input.bytes);
  if (!semanticBytes(term).equals(input.bytes)) throw new Error("cut-graph request is not canonical RMN CBOR");
  if (term?.[0] !== "ascribe" || term.length !== 3) throw new Error("cut-graph request must be one typed RMN object");
  checkTerm(term[2], term[1]);
  const request = decodeCutGraphRequest(term[1], term[2]);
  const result = await deriveInfomaterialCutGraph(request, {
    assayLayout: (layout) => conformInfomaterialLayout({ agentUrl: env.INFOMATERIAL_LAYOUT_AGENT, ...layout }),
  });
  const recordedAt = new Date().toISOString();
  const store = createSettlementStore({ settlementRoot: ROOT, agentUrl: env.RWIL_RDF_AGENT });
  await store.record({ category: "infomaterial-cut-graph.receipt", recordedAt, record: { ...result.receipt, semanticId: result.semanticId, law: INFOMATERIAL_CUT_GRAPH_LAW.id } });
  return Message.toJSON({
    messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId,
    role: Role.ROLE_AGENT,
    parts: [rmnPart(result.canonicalBytes, "infomaterial-cut-graph-receipt.rmn.cbor")],
    extensions: [], referenceTaskIds: [],
    metadata: { disposition: "conformant", profile: result.receipt.profile, receiptNi: result.semanticId, circuitNi: result.receipt.circuit, assemblyNi: result.receipt.assembly, materialRootNi: result.receipt.materialRoot },
  });
}

try {
  const source = JSON.parse(readFileSync(0, "utf8"));
  process.stdout.write(`${JSON.stringify(await executeA2aMessage(source))}\n`);
} catch (error) {
  process.stderr.write(`${error.code ?? "cut-graph-refusal"}: ${error.message}\n`);
  process.exitCode = 1;
}
