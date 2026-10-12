#!/usr/bin/env node
import { runMain, isStrictMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { agentRmnMessage, extractRmnPart, parseA2aMessage } from "@red-cup-engineering/a2a-rmn-part-service";
import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const A2A_CARRIER_KIND = "rsc-quiescent.a2a-json";
const semanticBytes = (value) => identifyJsonSemanticContent({ objectKind: A2A_CARRIER_KIND, value, witnessRoot: EMPTY_WITNESS_ROOT }).bytes;
const decodeSemantic = (bytes) => admitJsonSemanticContent({ bytes, objectKind: A2A_CARRIER_KIND }).value;
import { ACTOR, fulfillResearchOrder } from "./research.mjs";

export async function executeResearchOrder(order, options = {}) {
  const at = options.at ?? new Date().toISOString();
  try { const delivery = await fulfillResearchOrder(order, { ...options, at }); return { type: "ClimateResearchPacketResult", provider: ACTOR, order: order?.id ?? null, disposition: "delivered", delivery, deliveredAt: at }; }
  catch (error) { return { type: "ClimateResearchPacketResult", provider: ACTOR, order: order?.id ?? null, disposition: "refused", code: "research-order-refused", detail: error.message, retryable: /provider|fetch|timeout|429|503/iu.test(error.message), refusedAt: at }; }
}

async function main() { let input = ""; process.stdin.setEncoding("utf8"); for await (const chunk of process.stdin) input += chunk; const message = parseA2aMessage(JSON.parse(input)), part = extractRmnPart(message.parts), term = decodeSemantic(part.bytes); if (!semanticBytes(term).equals(part.bytes) || term?.[0] !== "climate-research-packet-order" || term.length !== 2) throw new TypeError("foreign climate research request"); const result = await executeResearchOrder(term[1]); process.stdout.write(`${JSON.stringify(agentRmnMessage(semanticBytes(["climate-research-packet-result", result]), "climate-research-packet-result.rmn.cbor"))}\n`); }
runMain(main, {
  moduleUrl: import.meta.url,
  isEntry: isStrictMain,
  formatError: (error) => `${error.message}\n`,
  exitCode: 2,
});
