#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { admitNormalizedSemanticContent } from "@red-cup-engineering/relation-model-notation-runtime/semantic-content-identity";
import { decodeStatusRequest, encodeStatusResponse } from "../lib/protocol.mjs";
import { observeTraceChain } from "../lib/status.mjs";

export async function executeStatusMessage(source, env = process.env) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("trace-chain status requires ROLE_USER");
  const input = extractRmnPart(message.parts), admitted = admitNormalizedSemanticContent(input.bytes, input.ni), term = admitted.envelope.settledBody;
  decodeStatusRequest(term);
  const request = admitted.token, status = await observeTraceChain(env.TRACE_CHAIN_RPC ?? "http://127.0.0.1:8561");
  const output = encodeStatusResponse({request, status});
  return Message.toJSON({messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId, role: Role.ROLE_AGENT, parts: [rmnPart(output.bytes, "settlement-trace-chain-status.rmn.cbor")], metadata: {requestNi: request, responseNi: output.id}, extensions: [], referenceTaskIds: []});
}
try { process.stdout.write(`${JSON.stringify(await executeStatusMessage(JSON.parse(readFileSync(0, "utf8"))))}\n`); }
catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
