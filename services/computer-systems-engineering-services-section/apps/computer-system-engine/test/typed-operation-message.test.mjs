import assert from "node:assert/strict";
import test from "node:test";
import { admit } from "@red-cup-engineering/computer-data-services-section/type-system";
import { TYPED_OPERATION_MESSAGE_VERSION, TYPED_OPERATION_REQUEST_KIND, typedOperationRefusalType, typedOperationRequestType, typedOperationResultType } from "../src/typed-operation-message.mjs";
test("typed operation messages have one admitted request, result, and refusal contract", () => {
    assert.equal(admit(typedOperationRequestType, { version: TYPED_OPERATION_MESSAGE_VERSION, kind: TYPED_OPERATION_REQUEST_KIND, requestId: "r", operationId: "op", inputCodec: "json", input: "1", outputCodec: "json", actorResourceCatalog: {} }).ok, true);
    assert.equal(admit(typedOperationResultType, { version: 1, kind: "typed-operation-result", requestId: "r", outputCodec: "json", output: "1" }).ok, true);
    assert.equal(admit(typedOperationRefusalType, { version: 1, kind: "typed-operation-refusal", requestId: "r", code: "Denied", message: "effect denied" }).ok, true);
    assert.equal(admit(typedOperationRequestType, { version: 1, kind: TYPED_OPERATION_REQUEST_KIND, requestId: "r", operationId: "op", inputCodec: "json", input: "1" }).ok, false);
});
