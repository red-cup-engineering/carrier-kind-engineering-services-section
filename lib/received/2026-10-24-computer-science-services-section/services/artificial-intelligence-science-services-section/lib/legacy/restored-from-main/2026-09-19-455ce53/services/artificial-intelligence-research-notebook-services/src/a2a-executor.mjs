#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { agentRmnMessage, extractRmnPart, parseA2aMessage } from "@red-cup-engineering/a2a-rmn-part-service";
import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const A2A_CARRIER_KIND = "rsc-quiescent.a2a-json";
const semanticBytes = (value) => identifyJsonSemanticContent({ objectKind: A2A_CARRIER_KIND, value, witnessRoot: EMPTY_WITNESS_ROOT }).bytes;
const decodeSemantic = (bytes) => admitJsonSemanticContent({ bytes, objectKind: A2A_CARRIER_KIND }).value;
import { fulfillExplainerOrder } from "./a2a-backend.mjs";
export async function main() { let input = ""; process.stdin.setEncoding("utf8"); for await (const chunk of process.stdin) input += chunk; const message = parseA2aMessage(JSON.parse(input)), part = extractRmnPart(message.parts), term = decodeSemantic(part.bytes); if (!semanticBytes(term).equals(part.bytes) || term?.[0] !== "artificial-intelligence-persistent-notebook-explainer-order" || term.length !== 2) throw new TypeError("foreign or noncanonical AI notebook order"); const result = await fulfillExplainerOrder(term[1], { dataRoot: process.env.ARTIFICIAL_INTELLIGENCE_NOTEBOOK_DATA_ROOT, exchangeRoot: process.env.ARTIFICIAL_INTELLIGENCE_NOTEBOOK_EXCHANGE_ROOT, artifactBaseUrl: process.env.ARTIFICIAL_INTELLIGENCE_NOTEBOOK_ARTIFACT_BASE_URL, settlement: process.env.ARTIFICIAL_INTELLIGENCE_NOTEBOOK_SETTLEMENT_ACCOUNT, witnessJournalAgentUrl: process.env.WITNESS_JOURNAL_RDF_AGENT }); process.stdout.write(`${JSON.stringify(agentRmnMessage(semanticBytes(["artificial-intelligence-persistent-notebook-explainer-result", result]), "artificial-intelligence-persistent-notebook-explainer-result.rmn.cbor"))}\n`); }
if (process.argv[1] === fileURLToPath(import.meta.url)) await main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 2; });
