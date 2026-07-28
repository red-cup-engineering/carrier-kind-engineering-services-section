// Message-boundary test for the terminal projection Actor.
import assert from "node:assert/strict";
import test from "node:test";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalRwilDocument } from "@lenticule-science/rwil-rdf-projection-service/client";
import { ACTOR } from "../src/projector.mjs";
import { executeA2aMessage, operationBytes, operationFromBytes } from "../src/a2a-executor.mjs";

const exact = (body) => ({ id: semanticId(relationalRwilDocument(body)), ...body });
test("the Actor returns a provider-bound projection receipt", async () => {
  const request = exact({ type: "NativeWorkProductTransitionProjectionOperation", provider: ACTOR, workProduct: { text: "TOOL: test" } });
  const source = Message.toJSON({ messageId: "00000000-0000-4000-8000-000000000001", contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(operationBytes(request))], metadata: {}, extensions: [], referenceTaskIds: [] });
  const response = operationFromBytes(extractRmnPart(Message.fromJSON(await executeA2aMessage(source)).parts).bytes);
  assert.equal(response.provider, ACTOR);
  assert.equal(response.request, request.id);
  assert.equal(response.projection.transition.action, "test");
});
