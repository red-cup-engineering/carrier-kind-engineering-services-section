import assert from "node:assert/strict";
import test from "node:test";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalRwilDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { executeA2aMessage, operationBytes, operationFromBytes } from "../src/a2a-executor.mjs";
import { ACTOR, FIXED_GIT_OPERATION, observeRepositoryState } from "../src/observer.mjs";
const exact = (body) => ({ id: semanticId(relationalRwilDocument(body)), ...body });

test("the observer fixes the Git effect and returns explicit FOUR evidence", async () => {
  const request = { type: "RepositoryStateObservationRequest", purpose: "observe repository state", repositoryRoot: "/tmp/example", waitMilliseconds: 1000, executionMode: "live" };
  const operation = exact({ type: "RepositoryStateObservationOperation", provider: ACTOR, request });
  const message = Message.toJSON({ messageId: "1", contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(operationBytes(operation))], metadata: {}, extensions: [], referenceTaskIds: [] });
  const output = await executeA2aMessage(message, { observeRepositoryState: (value) => observeRepositoryState(value, { recordedAt: "2026-07-21T00:00:00.000Z", runGitStatus: async () => ({ exitCode: 0, stdout: " M src/a.mjs\n", stderr: "" }) }) });
  const response = operationFromBytes(extractRmnPart(Message.fromJSON(output).parts).bytes);
  assert.deepEqual(response.observation.fixedGitOperation, FIXED_GIT_OPERATION);
  assert.deepEqual(response.observation.outcome, { positiveEvidence: true, negativeEvidence: false });
  assert.equal(response.observation.dirty, true);
  assert.equal(response.observation.customerMutation, false);
});

test("caller-selected Git material is refused before conduction", async () => {
  await assert.rejects(() => observeRepositoryState({ type: "RepositoryStateObservationRequest", repositoryRoot: "/tmp/example", waitMilliseconds: 1000, executionMode: "live", argv: ["status"] }), /caller-selected argv/u);
});
