#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { checkTerm, decodeSemantic, semanticBytes } from "@red-cup-engineering/rmn-semantic-conformance";
import { requestHierarchicalCircuitEquivalence } from "@lenticule-science/hierarchical-circuit-equivalence-assay/client";
import { assayWasmFourCarrier } from "@lenticule-science/wasm-four-carrier-refinement/client";
import { WASM_FOUR_CARRIER_PROFILE } from "@lenticule-science/wasm-four-carrier-refinement";
import { assayRmnCircuitBoardCarrier } from "@lenticule-science/rmn-circuit-board-carrier-refinement/client";
import { createSettlementStore } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { assayHierarchicalMaterialLayout, decodeLayoutAssayRequest } from "../src/layout-assay.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function executeA2aMessage(source, env = process.env) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("layout assay requires an A2A ROLE_USER message");
  if (!env.EQUIVALENCE_AGENT_URL) throw new Error("EQUIVALENCE_AGENT_URL is required; layout cannot attest its own circuit");
  if (!env.WASM_FOUR_REFINEMENT_AGENT_URL) throw new Error("WASM_FOUR_REFINEMENT_AGENT_URL is required; layout cannot label carrier material itself");
  if (!env.RMN_BOARD_REFINEMENT_AGENT_URL) throw new Error("RMN_BOARD_REFINEMENT_AGENT_URL is required; layout cannot label recursive board material itself");
  if (!env.WITNESS_JOURNAL_RDF_AGENT) throw new Error("WITNESS_JOURNAL_RDF_AGENT is required; layout cannot keep an ambient book");
  const input = extractRmnPart(message.parts);
  const term = decodeSemantic(input.bytes);
  if (!semanticBytes(term).equals(input.bytes)) throw new Error("layout request is not canonical RMN CBOR");
  if (term?.[0] !== "ascribe" || term.length !== 3) throw new Error("layout request must be one typed RMN object");
  checkTerm(term[2], term[1]);
  const request = decodeLayoutAssayRequest(term[1], term[2]);
  const result = await assayHierarchicalMaterialLayout(request, {
    conform: async ({ circuit, components, assembly }) => {
      const response = await requestHierarchicalCircuitEquivalence({ agentUrl: env.EQUIVALENCE_AGENT_URL, circuit, components, assembly });
      return { assay: response.receipt, receiptNi: response.receiptNi };
    },
    refine: ({ producer, circuit, components, assembly, component, materialObservation, carrier }) => carrier.profile === WASM_FOUR_CARRIER_PROFILE
      ? assayWasmFourCarrier({ agentUrl: env.WASM_FOUR_REFINEMENT_AGENT_URL, producer, component, materialObservation, carrier })
      : assayRmnCircuitBoardCarrier({ agentUrl: env.RMN_BOARD_REFINEMENT_AGENT_URL, producer, circuit, components, assembly, component, materialObservation, carrier }),
  });
  const recordedAt = new Date().toISOString();
  const store = createSettlementStore({ settlementRoot: ROOT, agentUrl: env.WITNESS_JOURNAL_RDF_AGENT });
  await store.record({ category: "infomaterial-layout-assay.receipt", recordedAt, record: { ...result.receipt, semanticId: result.semanticId } });
  return Message.toJSON({
    messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId,
    role: Role.ROLE_AGENT,
    parts: [rmnPart(result.canonicalBytes, "infomaterial-layout-receipt.rmn.cbor")],
    extensions: [], referenceTaskIds: [],
    metadata: { disposition: "conformant", profile: result.receipt.profile, receiptNi: result.semanticId, circuitNi: result.receipt.circuit, assemblyNi: result.receipt.assembly, materialRootNi: result.receipt.materialRoot },
  });
}

try {
  const source = JSON.parse(readFileSync(0, "utf8"));
  process.stdout.write(`${JSON.stringify(await executeA2aMessage(source))}\n`);
} catch (error) {
  process.stderr.write(`${error.code ?? "layout-refusal"}: ${error.message}\n`);
  process.exitCode = 1;
}
