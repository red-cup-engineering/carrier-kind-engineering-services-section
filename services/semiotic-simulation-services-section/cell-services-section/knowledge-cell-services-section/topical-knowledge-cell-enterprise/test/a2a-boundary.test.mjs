import assert from "node:assert/strict";
import test from "node:test";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/rmn-semantic-conformance";
import { executeA2aMessage } from "../scripts/execute-a2a-task.mjs";
import { cellEnterpriseProtocol as protocol } from "../src/protocol.mjs";
function message(operation) { const request = protocol.encodeRequest(operation, {}); return Message.toJSON({ messageId: "one", contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(semanticBytes(request.term))], metadata: {}, extensions: [], referenceTaskIds: [] }); }
function response(output) { return protocol.decodeResponse(decodeSemantic(extractRmnPart(Message.fromJSON(output).parts).bytes)); }
test("carrier face refuses before all provider and receipt bindings activate", async () => {
  const result = response(await executeA2aMessage(message("admit-topical-knowledge-cell-instance"), async () => { throw new Error("topical-cell-enterprise deployment is not activated"); }));
  assert.equal(result.disposition, "refused"); assert.match(result.reason, /not activated/u);
});
test("carrier face cannot perform a supplier operation", async () => {
  let loaded = false; const result = response(await executeA2aMessage(message("form-corpus-reconciliation-intent"), async () => { loaded = true; return {}; }));
  assert.equal(loaded, false); assert.match(result.reason, /unknown topical-cell-enterprise operation/u);
});
