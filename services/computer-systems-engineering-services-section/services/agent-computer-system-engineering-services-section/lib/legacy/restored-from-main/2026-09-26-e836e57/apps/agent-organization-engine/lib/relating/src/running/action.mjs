/**
 * acting/action - the boundary-morphism class: an action is a cocone leg.
 *
 * The carrier kernel owns the carrier constructor and registry. This module adds the
 * acting boundary's codec checks and utterance facts, so existing transports keep
 * reading the same action shape while domain/codomain refs now derive from
 * carrier objects.
 */
import { utterance } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/cell";
import { evaluate, evaluateRunTerm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/eval";
import { shiftSen, tm, ty } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";
import { checkTy, tyEqual } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/typing";
import { decodeDescriptor, descriptorTy, encodeDescriptor } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/json-codec";
import { action as kernelAction, composes, } from "./category.mjs";
import { primitives } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/primitives";
import { wireCodec } from "@red-cup-engineering/computer-system-engine/wire";
import { jsonResource } from "@red-cup-engineering/json-services-section";

export { composes };

function isPromiseLike(value) {
  return typeof value === "object" && value !== null && "then" in value && typeof (value).then === "function";
}

function assertInput(spec, input) {
  return spec.domain?.assert(input, `action ${spec.verb} input`) ?? input;
}

function assertOutput(spec, output) {
  return spec.codomain?.assert(output, `action ${spec.verb} output`) ?? output;
}

function descriptorIdentity(descriptor) {
  switch (descriptor.kind) {
    case "null":
    case "boolean":
    case "number":
    case "scalar":
    case "string":
      return descriptor.kind;
    case "list":
      return `list(${descriptorIdentity(descriptor.item)})`;
    case "record":
      return `record(${Object.keys(descriptor.fields).sort()
        .map((key) => `${JSON.stringify(key)}:${descriptorIdentity(descriptor.fields[key])}`)
        .join(",")})`;
    default:
      throw new TypeError(`compose: unknown SEN JSON descriptor ${String((descriptor).kind)}`);
  }
}

/**
 * Register an action at the acting boundary.
 *
 * This wrapper is the public constructor for runnable morphisms. It validates the
 * verb and wire codec names, then delegates to the carrier/action kernel. When `runTerm`
 * is supplied without `run`, the executable body is the evaluator applied to that
 * term; this keeps pure carrier morphisms inspectable as data while preserving the
 * ordinary `run(input, args)` dispatch contract. Declared domain/codomain carriers
 * are enforced here as the action's runtime pre/post boundary: raw admissions can
 * omit a domain, but true carrier morphisms must consume and produce their carriers.
 */
export function action(spec) {
  if (!spec.verb || spec.verb.trim() === "") throw new TypeError("action: verb is required");
  const record = spec;
  if ("domainSchema" in record || "codomainSchema" in record) {
    throw new TypeError("action: schema refs are projected from domain/codomain carriers; pass carrier objects");
  }
  if (spec.run === undefined && spec.runTerm === undefined) throw new TypeError(`action ${spec.verb}: run or runTerm is required`);
  if (spec.run !== undefined && spec.runTerm !== undefined) {
    throw new TypeError(`action ${spec.verb}: run and runTerm are mutually exclusive`);
  }
  if ((spec.inputDescriptor === undefined) !== (spec.outputDescriptor === undefined))
    throw new TypeError(`action ${spec.verb}: inputDescriptor and outputDescriptor are a pair`);
  const inName = spec.inputFormat ?? "json";
  const outName = spec.outputFormat ?? "json";
  wireCodec(inName);
  wireCodec(outName);
  const body = spec.run ?? ((input) => {
    const program = spec.runTerm;
    if (spec.inputDescriptor === undefined || spec.outputDescriptor === undefined)
      return evaluateRunTerm(program, jsonResource(input, `action ${spec.verb} input`), primitives);
    const domain = descriptorTy(spec.inputDescriptor);
    const codomain = descriptorTy(spec.outputDescriptor);
    if (!checkTy([], program, ty.arrow(domain, codomain)))
      throw new TypeError(`action ${spec.verb}: runTerm does not check against its declared SEN arrow`);
    const encoded = encodeDescriptor(spec.inputDescriptor, jsonResource(input, `action ${spec.verb} input`));
    if (!checkTy([], encoded, domain)) throw new TypeError(`action ${spec.verb}: encoded input does not inhabit its declared SEN domain`);
    const result = evaluate(tm.app(program, encoded), primitives);
    if (!checkTy([], result, codomain)) throw new TypeError(`action ${spec.verb}: evaluated output does not inhabit its declared SEN codomain`);
    return decodeDescriptor(spec.outputDescriptor, result);
  });
  const run = (input, args) => {
    const admitted = assertInput(spec, input);
    const output = body(admitted, args);
    return isPromiseLike(output) ? output.then((value) => assertOutput(spec, value)) : assertOutput(spec, output);
  };
  return kernelAction({ ...spec, inputFormat: inName, outputFormat: outName, run });
}

/** Type guard: a value is an action carrier. */
export function isAction(value) {
  return typeof value === "object" && value !== null && (value).kind === "relating.action";
}

/** A relational fact as an utterance: token mark = {subject, object}, claim mark = predicate. */
export function fact(subject, predicate, object) {
  return utterance({ subject, object }, predicate);
}

/**
 * Compose two IR-backed morphisms as `consumer ∘ producer`.
 *
 * Composition is allowed only when the carrier identity equation holds:
 * `producer.codomain.$id === consumer.domain.$id`. Both inputs must have
 * `runTerm` bodies, because composition is only defined for actions admitted
 * with one executable IR body rather than a hidden TypeScript closure.
 */
export function compose(producer, consumer, verb) {
  if (!composes(producer, consumer)) {
    throw new TypeError(`compose: ${producer.verb}.codomain ≠ ${consumer.verb}.domain`);
  }
  if (producer.runTerm === undefined) throw new TypeError(`compose: ${producer.verb} has no runTerm`);
  if (consumer.runTerm === undefined) throw new TypeError(`compose: ${consumer.verb} has no runTerm`);
  if (producer.inputDescriptor === undefined || producer.outputDescriptor === undefined) {
    throw new TypeError(`compose: ${producer.verb} requires input/output descriptors`);
  }
  if (consumer.inputDescriptor === undefined || consumer.outputDescriptor === undefined) {
    throw new TypeError(`compose: ${consumer.verb} requires input/output descriptors`);
  }
  const producerDomain = descriptorTy(producer.inputDescriptor);
  const intermediate = descriptorTy(producer.outputDescriptor);
  const consumerDomain = descriptorTy(consumer.inputDescriptor);
  const consumerCodomain = descriptorTy(consumer.outputDescriptor);
  if (!tyEqual(intermediate, consumerDomain)) {
    throw new TypeError(`compose: ${producer.verb} output SEN type ≠ ${consumer.verb} input SEN type`);
  }
  if (descriptorIdentity(producer.outputDescriptor) !== descriptorIdentity(consumer.inputDescriptor)) {
    throw new TypeError(`compose: ${producer.verb} output descriptor ≠ ${consumer.verb} input descriptor`);
  }
  if (!checkTy([], producer.runTerm, ty.arrow(producerDomain, intermediate))) {
    throw new TypeError(`compose: ${producer.verb} runTerm does not check against its descriptors`);
  }
  if (!checkTy([], consumer.runTerm, ty.arrow(consumerDomain, consumerCodomain))) {
    throw new TypeError(`compose: ${consumer.verb} runTerm does not check against its descriptors`);
  }
  const runTerm = tm.lam(
    tm.app(
      shiftSen(1, 0, consumer.runTerm),
      tm.app(shiftSen(1, 0, producer.runTerm), tm.var(0)),
    ),
  );
  if (!checkTy([], runTerm, ty.arrow(producerDomain, consumerCodomain))) {
    throw new TypeError("compose: generated runTerm does not check");
  }
  return action({
    verb,
    inputFormat: producer.inputFormat,
    outputFormat: consumer.outputFormat,
    ...(producer.domain === undefined ? {} : { domain: producer.domain }),
    ...(consumer.codomain === undefined ? {} : { codomain: consumer.codomain }),
    inputDescriptor: producer.inputDescriptor,
    outputDescriptor: consumer.outputDescriptor,
    runTerm,
  });
}

/** The utterance facts an action carries about itself - the leg's content. */
export function actionUtterances(act) {
  const term = `relating.action.${act.verb}`;
  const facts = [
    fact(term, "relating.action.has-verb", act.verb),
    fact(term, "relating.action.accepts-codec", act.inputFormat),
    fact(term, "relating.action.emits-codec", act.outputFormat),
  ];
  if (act.summary !== undefined) facts.push(fact(term, "relating.action.summary", act.summary));
  if (act.description !== undefined) facts.push(fact(term, "relating.action.description", act.description));
  if (act.domain !== undefined) facts.push(fact(term, "relating.action.domain", act.domain.id));
  if (act.codomain !== undefined) facts.push(fact(term, "relating.action.codomain", act.codomain.id));
  if (act.runTerm !== undefined) facts.push(fact(term, "relating.action.run-term", act.runTerm));
  return Object.freeze(facts);
}
