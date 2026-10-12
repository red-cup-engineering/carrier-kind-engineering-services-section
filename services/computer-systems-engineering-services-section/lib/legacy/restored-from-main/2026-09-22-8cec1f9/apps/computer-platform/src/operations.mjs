import { COMPUTER_ENGINEERING_SPECIFICATION_ID } from "@red-cup-engineering/computer-system-engine/specification";
import { isSubtypeOf } from "@red-cup-engineering/computer-system-engine/type-system";
import { tm, ty, shiftRmn } from "@red-cup-engineering/relation-model-notation";
import { evaluateRunTerm } from "@red-cup-engineering/relation-model-notation/eval";
import { descriptorTy } from "@red-cup-engineering/relation-model-notation/json-codec";
import { checkTy, tyEqual } from "@red-cup-engineering/relation-model-notation/typing";
import { admitOperation, declareCapabilityOperation, evaluateBoundary, executeOperation, immutableBody, isPromiseLike, refusal } from "@red-cup-engineering/jsnode-engine/declared-operation";

export { admitOperation, declareCapabilityOperation, executeOperation, isPromiseLike };

/** This package binds the universal computer specification's code method; it owns no second operation vocabulary. */
export const COMPUTER_CODE_SPECIFICATION = COMPUTER_ENGINEERING_SPECIFICATION_ID;
/** Bind a local JSNode or portable RMN body to its declared pre/postconditions. */
export function createOperationExecutor(definition) {
    if (typeof definition.id !== "string" || definition.id.trim().length === 0)
        throw new TypeError("operation: id is required");
    if (definition.run === undefined && definition.runTerm === undefined)
        throw new TypeError(`operation ${definition.id}: run or runTerm is required`);
    const { id, domain, codomain, projectOutput } = definition;
    const runTerm = definition.runTerm === undefined ? undefined : immutableBody(definition.runTerm);
    const body = definition.run ?? ((input) => evaluateRunTerm(runTerm, input));
    const inputPredicate = (value) => domain === undefined ? value : domain.assert(value, `operation ${id} input`);
    const outputPredicate = (value) => codomain === undefined ? value : codomain.assert(value, `operation ${id} output`);
    const finish = projectOutput === undefined ? outputPredicate : (output) => projectOutput(output, outputPredicate);
    return (input, arguments_, context) => evaluateBoundary(input, inputPredicate, admitted => body(admitted, arguments_, context), finish);
}
const descriptorIdentity = (value) => value === null || typeof value !== "object" ? JSON.stringify(value) ?? "undefined" : Array.isArray(value) ? `[${value.map(descriptorIdentity).join(",")}]` : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${descriptorIdentity(value[key])}`).join(",")}}`;
/** Compose two portable operations after carrier and RMN type equality checks. */
export function composeOperations(producer, consumer, id) {
    if (!isSubtypeOf(producer?.codomain, consumer?.domain))
        return refusal("CompositionRefused", "producer codomain is not a declared subtype of consumer domain");
    if (producer?.body?.kind !== "rmn" || consumer?.body?.kind !== "rmn")
        return refusal("CompositionRefused", "only portable RMN bodies compose");
    const middle = descriptorTy(producer.body.outputDescriptor), domain = descriptorTy(consumer.body.inputDescriptor);
    if (!tyEqual(middle, domain))
        return refusal("CompositionRefused", "RMN descriptor types differ");
    if (descriptorIdentity(producer.body.outputDescriptor) !== descriptorIdentity(consumer.body.inputDescriptor))
        return refusal("CompositionRefused", "RMN descriptors differ");
    const term = tm.lam(tm.app(shiftRmn(1, 0, consumer.body.term), tm.app(shiftRmn(1, 0, producer.body.term), tm.var(0))));
    if (!checkTy([], term, ty.arrow(descriptorTy(producer.body.inputDescriptor), descriptorTy(consumer.body.outputDescriptor))))
        return refusal("CompositionRefused", "composed term does not typecheck");
    return admitOperation({ specification: COMPUTER_ENGINEERING_SPECIFICATION_ID, id, domain: producer.domain, codomain: consumer.codomain, effects: [...producer.effects, ...consumer.effects], body: { kind: "rmn", term, inputDescriptor: producer.body.inputDescriptor, outputDescriptor: consumer.body.outputDescriptor } });
}
