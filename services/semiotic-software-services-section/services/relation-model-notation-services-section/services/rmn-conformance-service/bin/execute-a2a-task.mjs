#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { conformCanonicalBytes } from "../src/conformance.mjs";
import { semanticBytes } from "../src/rmn-core.mjs";

export function executeA2aMessage(source) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("RMN conformance requires an A2A ROLE_USER message");
  const input = extractRmnPart(message.parts);
  const result = conformCanonicalBytes(input.bytes);
  const output = rmnPart(semanticBytes(result.response), "normal-form.rmn.cbor");
  return Message.toJSON({
    messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId,
    role: Role.ROLE_AGENT, parts: [output], extensions: [], referenceTaskIds: [],
    metadata: {
      disposition: "conformant", profile: "org.emsenn.rmn.core.v3", kind: result.kind,
      requestNi: result.requestId, termNi: result.term ?? result.witness,
      normalFormNi: result.normalFormId ?? result.witness,
      fuelUsed: result.fuelUsed ?? 0,
    },
  });
}

try {
  const source = JSON.parse(readFileSync(0, "utf8"));
  process.stdout.write(`${JSON.stringify(await executeA2aMessage(source))}\n`);
} catch (error) {
  process.stderr.write(`${error.code ?? "rmn-refusal"}: ${error.message}\n`);
  process.exitCode = 1;
}
