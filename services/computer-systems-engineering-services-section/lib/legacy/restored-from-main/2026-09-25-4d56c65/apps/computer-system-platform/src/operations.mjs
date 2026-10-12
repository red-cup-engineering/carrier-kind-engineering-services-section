import { COMPUTER_ENGINEERING_SPECIFICATION_ID } from "@red-cup-engineering/computer-system-engine/specification";
import { isSubtypeOf } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { tm, ty, shiftSen } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";
import { evaluateRunTerm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/eval";
import { descriptorTy } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/json-codec";
import { checkTy, tyEqual } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/typing";
import { admitOperation, declareCapabilityOperation, evaluateBoundary, executeOperation, immutableBody, isPromiseLike, refusal } from "@red-cup-engineering/computer-code-development-engine/declared-operation";

export { admitOperation, declareCapabilityOperation, executeOperation, isPromiseLike };

/** This package binds the universal computer specification's code method; it owns no second operation vocabulary. */
export const COMPUTER_CODE_SPECIFICATION = COMPUTER_ENGINEERING_SPECIFICATION_ID;
/** Bind a local JSNode or portable SEN body to its declared pre/postconditions. */
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
/** Compose two portable operations after carrier and SEN type equality checks. */
export function composeOperations(producer, consumer, id) {
    if (!isSubtypeOf(producer?.codomain, consumer?.domain))
        return refusal("CompositionRefused", "producer codomain is not a declared subtype of consumer domain");
    if (producer?.body?.kind !== "sen" || consumer?.body?.kind !== "sen")
        return refusal("CompositionRefused", "only portable SEN bodies compose");
    const middle = descriptorTy(producer.body.outputDescriptor), domain = descriptorTy(consumer.body.inputDescriptor);
    if (!tyEqual(middle, domain))
        return refusal("CompositionRefused", "SEN descriptor types differ");
    if (descriptorIdentity(producer.body.outputDescriptor) !== descriptorIdentity(consumer.body.inputDescriptor))
        return refusal("CompositionRefused", "SEN descriptors differ");
    const term = tm.lam(tm.app(shiftSen(1, 0, consumer.body.term), tm.app(shiftSen(1, 0, producer.body.term), tm.var(0))));
    if (!checkTy([], term, ty.arrow(descriptorTy(producer.body.inputDescriptor), descriptorTy(consumer.body.outputDescriptor))))
        return refusal("CompositionRefused", "composed term does not typecheck");
    return admitOperation({ specification: COMPUTER_ENGINEERING_SPECIFICATION_ID, id, domain: producer.domain, codomain: consumer.codomain, effects: [...producer.effects, ...consumer.effects], body: { kind: "sen", term, inputDescriptor: producer.body.inputDescriptor, outputDescriptor: consumer.body.outputDescriptor } });
}
