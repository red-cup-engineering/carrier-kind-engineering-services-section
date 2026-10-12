/**
 * @packageDocumentation
 *
 * running/category — the morphism half of the single-source category kernel.
 *
 * A carrier (the object half) lives in `src/carriers`. This module adds the
 * MORPHISM half: actions typed by carrier domain/codomain objects, the live action
 * registry, and composition as the carrier identity equation
 * (`producer.codomain.id === consumer.domain.id`). The categorical role split is
 * objects→writing, morphisms→running; the morphism half imports the object half
 * (running already depends on writing), and the dependency is acyclic — writing
 * never imports running.
 *
 * `registeredCategory` composes the carrier registry (writing) with this module's
 * action registry into one `CategoryRegistry` so downstream faculties populate a
 * single live category by declaring carriers and actions.
 */

import { declaredSchemas, schemaById, schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { MorphismSchema } from "../carriers/running/index.mjs";

/** Carrier object accepted by the morphism half. */

export { MorphismSchema, morphismSchemaCarrier } from "../carriers/running/index.mjs";

/** Serializable action face produced from `MorphismSchema`, with carrier ids
 *  and optional `runTerm` present but the executable closure absent. */

/** Boundary helper for action bodies that may run synchronously or await host IO. */

/** Review row classifying one registered action as a carrier morphism or a
 *  boundary, and recording whether a true morphism is carried by SEN. */

/** The live category registry populated by carrier and action declarations. */

/** A registered operation at the relating boundary. */

/** Input to `action(...)`: the authored form before defaults are projected. */

const actionsByVerb = new Map();

/** The live relating category registry. Downstream faculties populate this by declaring carriers and actions. */
export const registeredCategory = Object.freeze({
  registerCarrier: (value) => schemaFrom(value.schema),
  carrier: (id) => schemaById(id),
  carriers: () => declaredSchemas(),
  registerAction: (value) => {
    actionsByVerb.set(value.verb, value);
    return value;
  },
  actions: () => Object.freeze([...actionsByVerb.values()]),
});

/**
 * Register a morphism or boundary action.
 *
 * Carrier objects are the only internal source of domain/codomain identity. This
 * function is the kernel-level constructor, so it requires an executable `run`.
 * The public acting wrapper can supply that `run` by evaluating a `runTerm`.
 */
export function action(spec) {
  if (!spec.verb || spec.verb.trim() === "") throw new TypeError("action: verb is required");
  const record = spec;
  if ("domainSchema" in record || "codomainSchema" in record) {
    throw new TypeError("action: schema refs are projected from domain/codomain carriers; pass carrier objects");
  }
  if (spec.run === undefined) throw new TypeError(`action ${spec.verb}: run is required at the kernel boundary`);
  const inName = spec.inputFormat ?? "json";
  const outName = spec.outputFormat ?? "json";
  const value = Object.freeze({
    kind: "relating.action",
    verb: spec.verb,
    inputFormat: inName,
    outputFormat: outName,
    options: Object.freeze([...(spec.options ?? [])]),
    ...(spec.summary === undefined ? {} : { summary: spec.summary }),
    ...(spec.description === undefined ? {} : { description: spec.description }),
    ...(spec.domain === undefined ? {} : { domain: spec.domain }),
    ...(spec.codomain === undefined ? {} : { codomain: spec.codomain }),
    ...(spec.runTerm === undefined ? {} : { runTerm: spec.runTerm }),
    ...(spec.inputDescriptor === undefined ? {} : { inputDescriptor: spec.inputDescriptor }),
    ...(spec.outputDescriptor === undefined ? {} : { outputDescriptor: spec.outputDescriptor }),
    run: spec.run,
  });
  return registeredCategory.registerAction(value);
}

/** Two morphisms compose exactly when the producer's codomain carrier id equals the consumer's domain carrier id. */
export function composes(producer, consumer) {
  const produced = producer.codomain?.id;
  const consumed = consumer.domain?.id;
  return produced !== undefined && consumed !== undefined && produced === consumed;
}

/**
 * Classify actions for the IR migration.
 *
 * Carrier-to-carrier morphisms should be carried as `runTerm`; boundary actions
 * are admissions, codecs, or transports. This is intentionally computed from the
 * declared domain/codomain rather than maintained as a curated list.
 *
 * This is the small review surface for the package's "behavior as data" rule:
 * if both sides have carrier identities, the action is a morphism and should be
 * inspectable as SEN. If either side is missing, the action is a boundary and
 * the `reason` explains why the SEN gate does not apply.
 */
export function actionIrAudit(actions) {
  return Object.freeze(actions.map((action) => {
    const domain = action.domain?.id;
    const codomain = action.codomain?.id;
    const relation = domain !== undefined && codomain !== undefined ? "morphism" : "boundary";
    const reason = relation === "morphism"
      ? undefined
      : domain === undefined && codomain === undefined
        ? "untyped boundary"
        : domain === undefined
          ? "admission boundary"
          : "transport boundary";
    return Object.freeze({
      kind: "relating.action.ir-audit",
      verb: action.verb,
      relation,
      hasRunTerm: action.runTerm !== undefined,
      ...(domain === undefined ? {} : { domain }),
      ...(codomain === undefined ? {} : { codomain }),
      ...(reason === undefined ? {} : { reason }),
    });
  }));
}

/**
 * The remaining carrier morphisms whose executable body is still free TS.
 *
 * A non-empty result is useful CI/doc evidence: the package has at least one
 * true carrier-to-carrier action whose body is not yet carried as serializable
 * SEN data.
 */
export function freeTsActions(actions) {
  return Object.freeze(actionIrAudit(actions).filter((entry) =>
    entry.relation === "morphism" && !entry.hasRunTerm));
}

/**
 * The serializable schema-backed morphism carrier for an action.
 *
 * This is the shape that durable logs can store: the executable closure is
 * excluded, while the typed domain/codomain ids and optional IR `runTerm` remain
 * as data. Dispatch can still execute the original action, but this carrier is
 * the reviewable face: docs, ledgers, MCP resources, and the `inspect` action can
 * read it without closing over host process state.
 *
 * @example
 * ```ts
 * import { morphismCarrier } from "@red-cup-engineering/relating";
 *
 * const serializable = morphismCarrier(someAction);
 * Object.hasOwn(serializable, "run"); // false
 * ```
 */
export function morphismCarrier(action) {
  const domain = action.domain?.id;
  const codomain = action.codomain?.id;
  return Object.freeze({
    kind: "relating.action",
    verb: action.verb,
    inputFormat: action.inputFormat,
    outputFormat: action.outputFormat,
    options: [...action.options],
    ...(action.summary === undefined ? {} : { summary: action.summary }),
    ...(action.description === undefined ? {} : { description: action.description }),
    ...(domain === undefined ? {} : { domain }),
    ...(codomain === undefined ? {} : { codomain }),
    ...(action.runTerm === undefined ? {} : { runTerm: action.runTerm }),
  });
}
