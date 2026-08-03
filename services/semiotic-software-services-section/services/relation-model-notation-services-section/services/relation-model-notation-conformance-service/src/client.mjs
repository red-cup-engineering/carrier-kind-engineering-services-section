import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeSemantic, semanticBytes, semanticId, checkTerm } from "@red-cup-engineering/relation-model-notation-runtime";
import { ascribedBytes } from "@red-cup-engineering/relation-model-notation-runtime/conformance";
import { SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION } from "@red-cup-engineering/relation-model-notation-runtime/hierarchical-circuit";

function decodeResponse(result) {
  const output = extractRmnPart(a2aResultParts(result));
  const response = decodeSemantic(output.bytes);
  if (!semanticBytes(response).equals(output.bytes)) throw new Error("RMN provider returned noncanonical CBOR");
  if (response?.[0] !== "ascribe" || response.length !== 3) throw new Error("RMN provider returned an untyped response");
  checkTerm(response[2], response[1]);
  return { output, response, expectedType: response[1], normalForm: response[2] };
}

export async function conformTerm({ agentUrl, term, expectedType, signal, send = sendRmnTask }) {
  const requestBytes = ascribedBytes(term, expectedType);
  const message = Message.toJSON({
    messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER,
    parts: [rmnPart(requestBytes, "ascribed-term.rmn.cbor")], metadata: {}, extensions: [], referenceTaskIds: [],
  });
  const exchange = await send({ agentUrl, extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION], requireSignature: true, message, ...(signal ? { signal } : {}) });
  const decoded = decodeResponse(exchange.result);
  const value = {
    ...decoded,
    requestNi: semanticId(["ascribe", expectedType, term]),
    term: semanticId(term),
    normalFormId: semanticId(decoded.normalForm),
    canonicalBytesBase64: semanticBytes(term).toString("base64"),
    normalFormBytesBase64: semanticBytes(decoded.normalForm).toString("base64"),
    exchange,
  };
  if (expectedType?.[0] === "product" && expectedType?.[1]?.[0] === "effect"
    && decoded.normalForm?.[0] === "pair" && decoded.normalForm?.[1]?.[0] === "effect") {
    value.effectCell = decoded.normalForm[1][1];
    value.operation = semanticId(decoded.normalForm[2]);
  }
  return value;
}

export async function conformCanonicalBytes({ agentUrl, bytes, expectedType, expectedNi, signal, send }) {
  const body = Buffer.from(bytes);
  const term = decodeSemantic(body);
  if (!semanticBytes(term).equals(body)) throw new Error("input is not canonical RMN CBOR");
  if (expectedNi !== undefined && semanticId(term) !== expectedNi) throw new Error("RMN bytes do not match their declared semantic identity");
  return conformTerm({ agentUrl, term, expectedType, signal, send });
}
