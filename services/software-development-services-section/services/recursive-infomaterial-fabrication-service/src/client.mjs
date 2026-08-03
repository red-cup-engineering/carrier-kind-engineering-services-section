import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultMetadata, a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { validateDirectoryPatchCoverReceipt } from "@lenticule-science/infomaterial-patch-cover/receipt";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import {
  circuitInterfaceFromAgentCard,
  SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION,
} from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { decodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { FABRICATION_PINOUT } from "@red-cup-engineering/recursive-observation-circuit-synthesis/pinout";
import { RECURSIVE_FABRICATION_CIRCUIT_PROFILE } from "./own-circuit-profile.mjs";
import { encodeFabricationRequest } from "./request.mjs";

const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u;

const responseParts = a2aResultParts;

function requirePin(component, name, direction, predicate, carrier) {
  const pins = component.ports.filter((port) => port.name === name);
  if (pins.length !== 1) throw new Error(`recursive fabrication board must expose exactly one ${name} pin`);
  const pin = pins[0];
  if (pin.direction !== direction || pin.predicate !== predicate || pin.carrier !== carrier || pin.mode !== "tensor") {
    throw new Error(`recursive fabrication board ${name} pin does not conform to the fabrication circuit`);
  }
}

function verifyBoardInterface(card, expectedAccount) {
  const exposed = circuitInterfaceFromAgentCard(card);
  if (exposed.account !== expectedAccount.toLowerCase()) {
    throw new Error("recursive fabrication board account does not match the contracted account");
  }
  if (exposed.component.ports.length !== 2) throw new Error("recursive fabrication board exposes an unexpected pin");
  requirePin(exposed.component, "schedule", "input", FABRICATION_PINOUT.schedulePredicate, FABRICATION_PINOUT.scheduleCarrier);
  requirePin(exposed.component, "receipt", "output", FABRICATION_PINOUT.patchEvidencePredicate, FABRICATION_PINOUT.patchEvidenceCarrier);
  return exposed;
}

/** Hire one exact signed board membrane. The customer supplies the complete
 * provider schedule; the board may conduct it but never receives filesystem
 * authority from this client. */
export async function requestRecursiveInfomaterialFabrication({
  agentUrl,
  schedule,
  expectedAccount = RECURSIVE_FABRICATION_CIRCUIT_PROFILE.account,
  signal,
}) {
  const inputBytes = encodeFabricationRequest(schedule);
  const message = Message.toJSON({
    messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER,
    parts: [rmnPart(inputBytes, "recursive-infomaterial-fabrication-schedule.rmn.cbor")],
    metadata: {}, extensions: [], referenceTaskIds: [],
  });
  const exchange = await sendRmnTask({
    agentUrl,
    extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION],
    message,
    requireSignature: true,
    ...(signal ? { signal } : {}),
  });
  const circuit = verifyBoardInterface(exchange.agentCard, expectedAccount);
  const metadata = a2aResultMetadata(exchange.result);
  if (metadata.requestNi !== exchange.inputNi) {
    throw new Error("recursive fabrication receipt is not bound to the exact schedule");
  }
  const fabricationReceiptNi = metadata.fabricationReceiptNi;
  if (typeof fabricationReceiptNi !== "string" || !NI.test(fabricationReceiptNi)) {
    throw new Error("recursive fabrication board omitted its typed seam receipt identity");
  }
  const output = extractRmnPart(responseParts(exchange.result));
  const term = decodeSemantic(output.bytes);
  if (!semanticBytes(term).equals(output.bytes) || term?.[0] !== "ascribe" || term.length !== 3) {
    throw new Error("recursive fabrication board returned noncanonical RMN");
  }
  const value = decodeRelationalValue(term[1], term[2]);
  const coverReceipt = {
    ...value,
    semanticId: semanticId(term),
    canonicalBytesBase64: output.bytes.toString("base64"),
  };
  validateDirectoryPatchCoverReceipt(coverReceipt);
  return { coverReceipt, fabricationReceiptNi, circuit, exchange };
}
