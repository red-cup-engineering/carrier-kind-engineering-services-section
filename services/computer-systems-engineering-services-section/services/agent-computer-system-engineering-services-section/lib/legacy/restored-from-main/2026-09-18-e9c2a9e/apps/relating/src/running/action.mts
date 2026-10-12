/**
 * acting/action - the boundary-morphism class: an action is a cocone leg.
 *
 * The carrier kernel owns the carrier constructor and registry. This module adds the
 * acting boundary's codec checks and utterance facts, so existing transports keep
 * reading the same action shape while domain/codomain refs now derive from
 * carrier objects.
 */
import { mark, utterance, type UtteranceCarrier } from "@lenticule-science/articulating";
import type { JsonValue } from "../codecs/text/json/core.mjs";
import { evaluate, evaluateRunTerm } from "@red-cup-engineering/relation-model-notation-eval";
import { shiftRmn, tm, ty } from "@red-cup-engineering/relation-model-notation";
import { checkTy, tyEqual } from "@red-cup-engineering/relation-model-notation-typing";
import { decodeDescriptor, descriptorTy, encodeDescriptor } from "@red-cup-engineering/relation-model-notation-json-codec";
import { action as kernelAction, composes, type Action, type ActionSpec } from "./category.mjs";
import { wireCodec } from "../codecs/boundary/wire/index.mjs";

export type { Action, ActionSpec };
export { composes };

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value && typeof (value as { then?: unknown }).then === "function";
}

function assertInput(spec: ActionSpec, input: unknown): unknown {
  return spec.domain?.assert(input, `action ${spec.verb} input`) ?? input;
}

function assertOutput(spec: ActionSpec, output: unknown): unknown {
  return spec.codomain?.assert(output, `action ${spec.verb} output`) ?? output;
}

function descriptorIdentity(descriptor: Parameters<typeof descriptorTy>[0]): string {
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
        .map((key) => `${JSON.stringify(key)}:${descriptorIdentity(descriptor.fields[key]!)}`)
        .join(",")})`;
    default:
      throw new TypeError(`compose: unknown RMN JSON descriptor ${String((descriptor as { kind?: unknown }).kind)}`);
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
export function action(spec: ActionSpec): Action {
  if (!spec.verb || spec.verb.trim() === "") throw new TypeError("action: verb is required");
  const record = spec as unknown as Record<string, unknown>;
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
  const body = spec.run ?? ((input: unknown): unknown => {
    const program = spec.runTerm as NonNullable<typeof spec.runTerm>;
    if (spec.inputDescriptor === undefined || spec.outputDescriptor === undefined)
      return evaluateRunTerm(program, input as JsonValue);
    const domain = descriptorTy(spec.inputDescriptor);
    const codomain = descriptorTy(spec.outputDescriptor);
    if (!checkTy([], program, ty.arrow(domain, codomain)))
      throw new TypeError(`action ${spec.verb}: runTerm does not check against its declared RMN arrow`);
    const encoded = encodeDescriptor(spec.inputDescriptor, input as JsonValue);
    if (!checkTy([], encoded, domain)) throw new TypeError(`action ${spec.verb}: encoded input does not inhabit its declared RMN domain`);
    const result = evaluate(tm.app(program, encoded));
    if (!checkTy([], result, codomain)) throw new TypeError(`action ${spec.verb}: evaluated output does not inhabit its declared RMN codomain`);
    return decodeDescriptor(spec.outputDescriptor, result);
  });
  const run = (input: unknown, args: Record<string, unknown>): unknown | Promise<unknown> => {
    const admitted = assertInput(spec, input);
    const output = body(admitted, args);
    return isPromiseLike(output) ? output.then((value) => assertOutput(spec, value)) : assertOutput(spec, output);
  };
  return kernelAction({ ...spec, inputFormat: inName, outputFormat: outName, run });
}

/** Type guard: a value is an action carrier. */
export function isAction(value: unknown): value is Action {
  return typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === "relating.action";
}

/** A relational fact as an utterance: token mark = {subject, object}, claim mark = predicate. */
export function fact(subject: JsonValue, predicate: string, object: JsonValue): UtteranceCarrier {
  return utterance(mark({ subject, object }), mark(predicate));
}

/**
 * Compose two IR-backed morphisms as `consumer ∘ producer`.
 *
 * Composition is allowed only when the carrier identity equation holds:
 * `producer.codomain.$id === consumer.domain.$id`. Both inputs must have
 * `runTerm` bodies, because composition is only defined for actions admitted
 * with one executable IR body rather than a hidden TypeScript closure.
 */
export function compose(producer: Action, consumer: Action, verb: string): Action {
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
    throw new TypeError(`compose: ${producer.verb} output RMN type ≠ ${consumer.verb} input RMN type`);
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
      shiftRmn(1, 0, consumer.runTerm),
      tm.app(shiftRmn(1, 0, producer.runTerm), tm.var(0)),
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
export function actionUtterances(act: Action): readonly UtteranceCarrier[] {
  const term = `relating.action.${act.verb}`;
  const facts: UtteranceCarrier[] = [
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
