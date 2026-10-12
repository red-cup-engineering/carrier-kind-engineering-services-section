#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { ROLE_AGENT, ROLE_USER } from "@red-cup-engineering/a2a-services-section/a2a-client";
import { extractSenPart, senPart } from "@red-cup-engineering/a2a-services-section/rmn-part";
import { admitNormalizedSemanticContent } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/semantic-content-identity";
import { decodeStatusRequest, encodeStatusResponse } from "../lib/protocol.mjs";
import { observeTraceChain } from "../lib/status.mjs";

export async function executeStatusMessage(source, env = process.env) {
  const message = (source);
  if (message.role !== ROLE_USER) throw new Error("trace-chain status requires ROLE_USER");
  const input = extractSenPart(message.parts), admitted = admitNormalizedSemanticContent(input.bytes, input.ni), term = admitted.envelope.settledBody;
  decodeStatusRequest(term);
  const request = admitted.token, status = await observeTraceChain(env.TRACE_CHAIN_RPC ?? "http://127.0.0.1:8561");
  const output = encodeStatusResponse({request, status});
  return ({messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId, role: ROLE_AGENT, parts: [senPart(output.bytes, "settlement-trace-chain-status.rmn.cbor")], metadata: {requestNi: request, responseNi: output.id}, extensions: [], referenceTaskIds: []});
}
try { process.stdout.write(`${JSON.stringify(await executeStatusMessage(JSON.parse(readFileSync(0, "utf8"))))}\n`); }
catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
