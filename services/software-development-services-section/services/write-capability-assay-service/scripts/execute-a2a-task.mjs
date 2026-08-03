#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { assayStandingWriteCapability } from "../src/assay-write-capability.mjs";
import { decodeWriteCapabilityRequest, encodeWriteCapabilityResponse } from "../src/protocol.mjs";
export async function executeA2aMessage(source) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("write-capability assay requires an A2A ROLE_USER message");
  const input = extractRmnPart(message.parts), decoded = decodeWriteCapabilityRequest(input.bytes), request = decoded.value;
  let response;
  try { response = encodeWriteCapabilityResponse({ request: decoded.identity.id, disposition: "admitted", observation: assayStandingWriteCapability(request.material) }); }
  catch (error) { response = encodeWriteCapabilityResponse({ request: decoded.identity.id, disposition: "refused", reason: error instanceof Error ? error.message : String(error) }); }
  return Message.toJSON({ messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId, role: Role.ROLE_AGENT, parts: [rmnPart(response.bytes, "write-capability-response.rmn.cbor")], metadata: { responseNi: response.id }, extensions: [], referenceTaskIds: [] });
}
try { process.stdout.write(`${JSON.stringify(await executeA2aMessage(JSON.parse(readFileSync(0, "utf8"))))}\n`); }
catch (error) { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; }
