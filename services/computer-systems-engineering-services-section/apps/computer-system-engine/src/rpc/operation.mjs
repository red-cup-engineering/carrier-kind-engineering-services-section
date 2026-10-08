/**
 * @packageDocumentation
 *
 * rpc — the canonical operation and execution system every engine declares its verbs in.
 *
 * Schema contracts provide the object half. This module adds the OPERATION half:
 * operations typed by domain/codomain objects, explicit immutable catalogs,
 * and composition as schema boundary compatibility. Derived program
 * contracts measure preservation separately from this constructor. The categorical role split is
 * objects->schemas, operations->running; the operation half imports the object half
 * (running already depends on schemas).
 *
 * Operation declarations are inert values. Applications explicitly assemble
 * them into an immutable `OperationCatalog`; importing a module never changes
 * the callable process surface.
 */

import { executeJavascriptProgram } from "@red-cup-engineering/javascript-node-services-section/module-closure";
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { mark, utterance } from "@red-cup-engineering/signcell/utterance";
import { createOperationExecutor } from "@red-cup-engineering/computer-code-engineering-services-section/typed-operation";
import { schemaFrom, schemaFromGraph } from "@red-cup-engineering/json-schema-services-section/contracts";
import { shiftSen, tm, ty } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation";
import { checkTy, tyEqual } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation/typing";
import { decodeDescriptor, descriptorTy, encodeDescriptor } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation/json-codec";
import { evaluate } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/eval";
import { evaluateRunTerm, primitives } from "@red-cup-engineering/signcraft/primitives";
import { jsonResource, canonicalJson, canonicalizeJson, JSON_RESOURCE_ENVELOPE } from "@red-cup-engineering/json-services-section";
import { auditSchemaOperation, schemaOperationsCompose } from "@red-cup-engineering/signchain/contracts/contract-operation";
import { wireCodec } from "@red-cup-engineering/computer-system-engine/wire-eavt-tuple";
import { isOperationHandlerResult } from "./execution-context.mjs";

/** Schema contract object accepted by the operation half. */

/** Serializable programme selection; hosted declarations, SEN terms and admitted JSNode source have distinct bodies. */
export const ProgramSchema = {
  $id: "metroplat/executing/program",
  type: "object",
  required: ["kind", "verb", "inputFormat", "outputFormat", "options"],
  properties: {
    kind: { const: "metroplat.program" },
    verb: { type: "string", minLength: 1 },
    inputFormat: { type: "string" },
    outputFormat: { type: "string" },
    options: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
    description: { type: "string" },
    domain: { type: "string", minLength: 1 },
    codomain: { type: "string", minLength: 1 },
    relation: { enum: ["operation", "projection", "protocol", "boundary"] },
    locus: { type: "string", minLength: 1 },
    effects: {
      type: "object",
      required: ["class", "replay", "coordination", "deterministic", "totality"],
      additionalProperties: false,
      properties: {
        class: { enum: ["pure", "host-read", "journal-write", "external"] },
        replay: { enum: ["safe", "idempotency-key", "coordinated"] },
        coordination: { enum: ["coordination-free", "coordination-required"] },
        deterministic: { enum: [true, "unmeasured"] },
        totality: { enum: ["schema-bounded", "partial", "unmeasured"] },
      },
    },
    body: {
      anyOf: [
        { type: "object", required: ["kind", "declaration"], properties: { kind: { const: "host" }, declaration: { type: "string", minLength: 1 } }, additionalProperties: false },
        { type: "object", required: ["kind", "term"], properties: { kind: { const: "sen" }, term: {} }, additionalProperties: false },
        { type: "object", required: ["kind", "closure", "module", "export"], properties: { kind: { const: "jsnode" }, closure: { type: "string", pattern: "^ni:///sha-256;[A-Za-z0-9_-]{43}$" }, module: { type: "string", minLength: 1 }, export: { type: "string", minLength: 1 } }, additionalProperties: false },
      ],
    },
    runTerm: {},
  },
  title: "Program",
  description: "A serializable executable operation with its boundary formats, schemas and explicit body selection.",
  additionalProperties: false,
};

export const programSchemaContract = schemaFrom(ProgramSchema);

/** Serializable program face produced from `ProgramSchema`, with schema ids
 *  and optional `runTerm` present but the executable closure absent. */

/** Boundary helper for operation bodies that may run synchronously or await host IO. */

/** Review row classifying one registered operation as a schema-addressed operation,
 *  package projection, protocol boundary, or boundary, and recording whether a
 *  true operation is carried by SEN. */

/** The specific way an operation is escaping the SEN schema-operation discipline. */

/** Review row for operations whose classification hides SEN-worthy work. */

/** Decidable operation-composition report: schema boundary compatibility (SETTLED-4). */

/** An operation declaration at the MetroPlat boundary. */

/** Input to `operation(...)`: the authored form before defaults are projected. */

function effectsOf(spec) {
  if (spec.effects !== undefined) return Object.freeze({ ...spec.effects });
  const effectClass = spec.runTerm !== undefined ? "pure"
    : (spec.writes?.length ?? 0) > 0 ? "journal-write"
      : "host-read";
  return Object.freeze({
    class: effectClass,
    replay: "safe",
    coordination: "coordination-free",
    deterministic: effectClass === "pure" ? true : "unmeasured",
    totality: effectClass === "pure"
      ? spec.domain !== undefined && spec.codomain !== undefined ? "schema-bounded" : "partial"
      : "unmeasured",
  });
}

/** One explicitly assembled, immutable operation catalog. */

/** The schema objects actually carried by an operation family, uniquely by
 * address and in deterministic address order. Faces project this finite
 * category boundary instead of consulting ambient package state. */
export function schemasOfOperations(operations) {
  const schemas = new Map();
  const visit = (schema) => {
    const prior = schemas.get(schema.id);
    if (prior !== undefined) {
      if (prior !== schema && JSON.stringify(prior.schema) !== JSON.stringify(schema.schema)) {
        throw new TypeError(`operation schema universe: different contracts share address ${schema.id}`);
      }
      return;
    }
    schemas.set(schema.id, schema);
    // A relating carrier resolves its own $refs through the carrier registry: it is a leaf here.
    for (const reference of schema.references ?? []) visit(reference);
  };
  for (const operation of operations) {
    for (const schema of [operation.domain, operation.codomain]) {
      if (schema !== undefined) visit(schema);
    }
  }
  return Object.freeze([...schemas.values()].sort((left, right) => left.id.localeCompare(right.id)));
}

/** Assemble the callable category without ambient import-time registration. */
export function createOperationCatalog(operations) {
  const values = Object.freeze([...operations]);
  const byVerb = new Map();
  const byReference = new Map();
  for (const candidate of values) {
    if (byVerb.has(candidate.verb)) {
      throw new TypeError(`operation catalog: duplicate verb ${JSON.stringify(candidate.verb)}`);
    }
    if (byReference.has(candidate.ref)) {
      throw new TypeError(`operation catalog: duplicate declaration ${JSON.stringify(candidate.ref)}`);
    }
    byVerb.set(candidate.verb, candidate);
    byReference.set(candidate.ref, candidate);
  }
  return Object.freeze({
    kind: "metroplat.rpc.catalog",
    operations: values,
    byVerb,
    byReference,
  });
}

/** The executable body of an operation carried as a SEN term, evaluated with SignCraft's
 *  primitives. With input and output descriptors the term is checked once against its declared
 *  SEN arrow, and each input and output is checked against its SEN type. */
function senBody(spec) {
  const program = spec.runTerm;
  if (spec.inputDescriptor === undefined && spec.outputDescriptor === undefined) {
    return (input) => evaluateRunTerm(program, jsonResource(input, `operation ${spec.verb} input`));
  }
  if (spec.inputDescriptor === undefined || spec.outputDescriptor === undefined) {
    throw new TypeError(`operation ${spec.verb}: inputDescriptor and outputDescriptor are a pair`);
  }
  const domain = descriptorTy(spec.inputDescriptor);
  const codomain = descriptorTy(spec.outputDescriptor);
  if (!checkTy([], program, ty.arrow(domain, codomain))) {
    throw new TypeError(`operation ${spec.verb}: runTerm does not check against its declared SEN arrow`);
  }
  return (input) => {
    const encoded = encodeDescriptor(spec.inputDescriptor, jsonResource(input, `operation ${spec.verb} input`));
    if (!checkTy([], encoded, domain)) throw new TypeError(`operation ${spec.verb}: encoded input does not inhabit its declared SEN domain`);
    const result = evaluate(tm.app(program, encoded), primitives);
    if (!checkTy([], result, codomain)) throw new TypeError(`operation ${spec.verb}: evaluated output does not inhabit its declared SEN codomain`);
    return decodeDescriptor(spec.outputDescriptor, result);
  };
}

/**
 * Construct the category-kernel face of an operation or boundary operation.
 *
 * SchemaContract objects are the only internal source of domain/codomain identity. This
 * function builds the carried operation record without changing process-global state.
 * Contract derivation reads that record downstream. The common engine
 * binds the host body or SEN term at construction and checks each invocation.
 */
export function operation(spec) {
  if (!spec.verb || spec.verb.trim() === "") throw new TypeError("operation: verb is required");
  const record = spec;
  const program = spec.program === undefined ? undefined : Object.freeze({ kind: spec.program.kind, closure: spec.program.closure, module: spec.program.module, export: spec.program.export });
  if (program !== undefined && (program.kind !== "jsnode" || ![program.closure, program.module, program.export].every(value => typeof value === "string" && value.length > 0))) throw new TypeError("operation: invalid addressed JavaScript programme");
  if (spec.program !== undefined && (spec.run !== undefined || spec.runTerm !== undefined)) throw new TypeError("operation: an addressed programme cannot substitute a host callback");
  if ("domainSchema" in record || "codomainSchema" in record) {
    throw new TypeError("operation: schema refs are projected from domain/codomain objects; pass SchemaContract objects");
  }
  if (spec.run === undefined && spec.runTerm === undefined && spec.program === undefined) throw new TypeError(`operation ${spec.verb}: run or runTerm is required`);
  // `locus` names the input field that addresses the resource an invocation acts on (a duty's
  // scope, say): the invocation is authorized against that sub-resource of the program, so an
  // authority attenuated to it reaches this operation there and nowhere else.
  if (spec.locus !== undefined && (typeof spec.locus !== "string" || spec.locus === "")) throw new TypeError(`operation ${spec.verb}: locus names an input field`);
  const inName = spec.inputFormat ?? "json";
  const outName = spec.outputFormat ?? "json";
  wireCodec(inName);
  wireCodec(outName);
  const effects = effectsOf(spec);
  const declaration = Object.freeze({
    kind: "metroplat.rpc.operation-declaration",
    verb: spec.verb,
    inputFormat: inName,
    outputFormat: outName,
    reads: Object.freeze([...(spec.reads ?? [])]),
    writes: Object.freeze([...(spec.writes ?? [])]),
    options: Object.freeze([...(spec.options ?? [])]),
    effects,
    ...(spec.domain === undefined ? {} : { domain: spec.domain.id }),
    ...(spec.codomain === undefined ? {} : { codomain: spec.codomain.id }),
    ...(spec.relation === undefined ? {} : { relation: spec.relation }),
    ...(spec.locus === undefined ? {} : { locus: spec.locus }),
    body: program ?? (spec.runTerm === undefined
      ? Object.freeze({ kind: "host", declaration: spec.verb })
      : Object.freeze({ kind: "sen", term: spec.runTerm })),
  });
  const value = {
    kind: "metroplat.action",
    ref: artifactId(declaration),
    body: declaration.body,
    verb: spec.verb,
    inputFormat: inName,
    outputFormat: outName,
    reads: Object.freeze([...(spec.reads ?? [])]),
    writes: Object.freeze([...(spec.writes ?? [])]),
    options: Object.freeze([...(spec.options ?? [])]),
    effects,
    ...(spec.summary === undefined ? {} : { summary: spec.summary }),
    ...(spec.description === undefined ? {} : { description: spec.description }),
    ...(spec.domain === undefined ? {} : { domain: spec.domain }),
    ...(spec.codomain === undefined ? {} : { codomain: spec.codomain }),
    ...(spec.relation === undefined ? {} : { relation: spec.relation }),
    ...(spec.locus === undefined ? {} : { locus: spec.locus }),
    ...(spec.runTerm === undefined ? {} : { runTerm: spec.runTerm }),
    ...(spec.inputDescriptor === undefined ? {} : { inputDescriptor: spec.inputDescriptor, outputDescriptor: spec.outputDescriptor }),
  };
  const execute = createOperationExecutor({
    id: spec.verb,
    ...(spec.domain === undefined ? {} : { domain: spec.domain }),
    ...(spec.codomain === undefined ? {} : { codomain: spec.codomain }),
    run: spec.program === undefined ? (spec.run ?? senBody(spec)) : (input, args, context) => executeJavascriptProgram(program, input, args, context),
    projectOutput: (output, assertOutput) => isOperationHandlerResult(output)
      ? Object.freeze({ ...output, value: assertOutput(output.value) })
      : assertOutput(output),
  });
  const executable = Object.defineProperty(value, "execute", { value: execute });
  return Object.freeze(executable);
}

/** One closed schema universe, independent of tree shape and process registration. */
function schemaDescriptor(contract) {
  if (contract === undefined) return undefined;
  const pending = [contract], byId = new Map();
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === null || typeof current !== "object" || typeof current.id !== "string"
      || current.schema?.$id !== current.id || !Array.isArray(current.references)) {
      throw new TypeError("Invalid operation schema graph");
    }
    const prior = byId.get(current.id);
    if (prior !== undefined) {
      if (canonicalJson(prior.schema) !== canonicalJson(current.schema)) {
        throw new TypeError("Invalid operation schema graph: conflicting schema address");
      }
      continue;
    }
    byId.set(current.id, current);
    pending.push(...current.references);
  }
  const references = [...byId.values()].filter((value) => value.id !== contract.id)
    .sort((left, right) => Buffer.compare(Buffer.from(left.id), Buffer.from(right.id)))
    .map((value) => Object.freeze({ id: value.id, schema: value.schema, references: Object.freeze([]) }));
  return Object.freeze({ id: contract.id, schema: contract.schema, references: Object.freeze(references) });
}

/** The inert, serializable portion of an operation declaration. Generated catalogs persist this
 * projection so discovery can remain exact without importing an operation family's executable
 * module. The operation reference is retained because it addresses the declaration, including
 * whether its real body is host code or SEN. */
export function operationDescriptor(operationValue) {
  return Object.freeze({
    ref: operationValue.ref,
    body: operationValue.body,
    verb: operationValue.verb,
    inputFormat: operationValue.inputFormat,
    outputFormat: operationValue.outputFormat,
    reads: Object.freeze([...(operationValue.reads ?? [])]),
    writes: Object.freeze([...(operationValue.writes ?? [])]),
    options: Object.freeze([...(operationValue.options ?? [])]),
    effects: operationValue.effects,
    ...(operationValue.summary === undefined ? {} : { summary: operationValue.summary }),
    ...(operationValue.description === undefined ? {} : { description: operationValue.description }),
    ...(operationValue.domain === undefined ? {} : { domain: schemaDescriptor(operationValue.domain) }),
    ...(operationValue.codomain === undefined ? {} : { codomain: schemaDescriptor(operationValue.codomain) }),
    ...(operationValue.relation === undefined ? {} : { relation: operationValue.relation }),
    ...(operationValue.locus === undefined ? {} : { locus: operationValue.locus }),
  });
}

function contractFromDescriptor(descriptor) {
  if (descriptor === undefined) return undefined;
  return schemaFromGraph({ root: descriptor.id, schemas: [descriptor, ...descriptor.references]
    .map(({ id, schema }) => ({ id, schema })) });
}

/** Reconstitute an admitted executable descriptor without loading an ambient operation family. */
export function operationFromDescriptor(descriptor) {
  if (descriptor.body?.kind !== "jsnode") throw new TypeError("operation: descriptor has no admitted JavaScript programme");
  const value = operation({ ...descriptor, program: descriptor.body,
    domain: contractFromDescriptor(descriptor.domain), codomain: contractFromDescriptor(descriptor.codomain) });
  if (value.ref !== descriptor.ref) throw new TypeError("operation: executable descriptor address mismatch");
  return value;
}

/** Discover a closed declaration without loading its executable family. The family enters
 * once on first execution (or `realize`) and must preserve the complete advertised operation contract. */
export function lazyOperation(inputDescriptor, loadFamily) {
  const snapshot = canonicalizeJson(inputDescriptor, JSON_RESOURCE_ENVELOPE).value;
  const descriptor = canonicalizeJson({ ...snapshot,
    ...(snapshot.domain === undefined ? {} : { domain: schemaDescriptor(snapshot.domain) }),
    ...(snapshot.codomain === undefined ? {} : { codomain: schemaDescriptor(snapshot.codomain) }),
  }, JSON_RESOURCE_ENVELOPE).value;
  const domain = contractFromDescriptor(descriptor.domain);
  const codomain = contractFromDescriptor(descriptor.codomain);
  let loaded;
  const loadOnce = () => loaded ??= Promise.resolve().then(loadFamily).then((operations) => {
    if (!Array.isArray(operations)) throw new TypeError("Operation contract mismatch");
    const matches = operations.filter((candidate) => candidate?.verb === descriptor.verb);
    if (matches.length !== 1 || typeof matches[0].execute !== "function"
      || canonicalJson(operationDescriptor(matches[0])) !== canonicalJson(descriptor)) {
      throw new TypeError("Operation contract mismatch");
    }
    return matches[0];
  });
  const value = {
    kind: "metroplat.action", ...descriptor,
    ...(domain === undefined ? {} : { domain }),
    ...(codomain === undefined ? {} : { codomain }),
  };
  Object.defineProperty(value, "execute", { value: async (input, arguments_, context) =>
    (await loadOnce()).execute(input, arguments_, context) });
  // Load the family now and check it against the advertised contract, without executing anything:
  // a node booted as a release candidate's probe realizes every family before it says it is ready.
  Object.defineProperty(value, "realize", { value: () => loadOnce().then(() => undefined) });
  return Object.freeze(value);
}

/** The same operation offered under another verb (a FeltOS or MetroPlat name for it): formats,
 *  schemas, effects, SEN body and execution unchanged. */
function bindExecution(value, execute) {
  const properties = Object.getOwnPropertyDescriptors(value);
  properties.execute = { value: execute };
  return Object.freeze(Object.create(Object.getPrototypeOf(value), properties));
}

export function operationAs(source, verb = source.verb) {
  if (verb === source.verb) return source;
  const alias = operation({
  verb,
  ...(source.body?.kind === "jsnode" ? { program: source.body } : {}),
  reads: source.reads,
  writes: source.writes,
  inputFormat: source.inputFormat,
  outputFormat: source.outputFormat,
  options: source.options,
  effects: source.effects,
  ...(source.summary === undefined ? {} : { summary: source.summary }),
  ...(source.description === undefined ? {} : { description: source.description }),
  ...(source.domain === undefined ? {} : { domain: source.domain }),
  ...(source.codomain === undefined ? {} : { codomain: source.codomain }),
  ...(source.relation === undefined ? {} : { relation: source.relation }),
  ...(source.locus === undefined ? {} : { locus: source.locus }),
  ...(source.runTerm === undefined ? {} : { runTerm: source.runTerm }),
  ...(source.inputDescriptor === undefined ? {} : { inputDescriptor: source.inputDescriptor, outputDescriptor: source.outputDescriptor }),
  ...(source.body?.kind === "jsnode" ? {} : { run: (input, args, context) => source.execute(input, args, context) }),
  });
  return bindExecution(alias, (input, args, context) => source.execute(input, args, context));
}

/** Bind host argument defaults while preserving the operation declaration. */
export function withOperationArguments(
  unbound,
  defaults,
  hostContext,
) {
  return bindExecution(unbound, (input, arguments_, context) => unbound.execute(input, { ...defaults, ...arguments_ }, hostContext === undefined ? context : { ...context, ...hostContext }));
}

/** Report whether `consumer ∘ producer` is an admissible operation composition. */
export function operationCompositionReport(producer, consumer) {
  const schemaCompatible = schemaOperationsCompose(
    {
      id: producer.verb,
      ...(producer.domain === undefined ? {} : { domain: producer.domain.id }),
      ...(producer.codomain === undefined ? {} : { codomain: producer.codomain.id }),
      hasPortableBody: producer.runTerm !== undefined,
    },
    {
      id: consumer.verb,
      ...(consumer.domain === undefined ? {} : { domain: consumer.domain.id }),
      ...(consumer.codomain === undefined ? {} : { codomain: consumer.codomain.id }),
      hasPortableBody: consumer.runTerm !== undefined,
    },
  );
  return Object.freeze({
    kind: "metroplat.action-composition",
    producer: producer.verb,
    consumer: consumer.verb,
    ...(producer.codomain === undefined ? {} : { schema: producer.codomain.id }),
    schemaCompatible,
    portableBodies: producer.runTerm !== undefined && consumer.runTerm !== undefined,
    ok: schemaCompatible,
  });
}

/** Two operations compose when their schema boundary composes (SETTLED-4). */
export function composes(producer, consumer) {
  return operationCompositionReport(producer, consumer).ok;
}

/**
 * Classify operations for the IR migration.
 *
 * SchemaContract-to-SchemaContract operations should be carried as `runTerm`; package
 * projections may have schema addresses while still using host-language readout
 * code; boundary operations are admissions, codecs, or transports. This is
 * intentionally computed from declared material addresses plus the operation's
 * relation classification, not from a curated verb list.
 *
 * This is the small review surface for the package's "behavior as data" rule:
 * if both sides have schema identities and the operation is not marked as a
 * projection, the operation is a operation and should be inspectable as SEN. If
 * either side is missing, the operation is a boundary and the `reason` explains why
 * the SEN gate does not apply.
 */
export function operationIrAudit(operations) {
  return Object.freeze(operations.map((operation) => {
    const domain = operation.domain?.id;
    const codomain = operation.codomain?.id;
    const audit = auditSchemaOperation({
      id: operation.verb,
      ...(domain === undefined ? {} : { domain }),
      ...(codomain === undefined ? {} : { codomain }),
      hasPortableBody: operation.runTerm !== undefined,
    });
    // A boundary read may have no schema-domain object while still being an
    // explicit package projection. Relation is authored architectural intent;
    // schema completeness governs portability debt, not whether the declared
    // projection/protocol role disappears from the audit.
    const relation = operation.relation === "projection"
      ? "projection"
      : operation.relation === "protocol"
        ? "protocol"
        : operation.relation === "boundary"
          ? "boundary"
        : audit.relation;
    return Object.freeze({
      kind: "metroplat.action.ir-audit",
      verb: operation.verb,
      relation,
      hasRunTerm: operation.runTerm !== undefined,
      ...(domain === undefined ? {} : { domain }),
      ...(codomain === undefined ? {} : { codomain }),
      ...(relation === "projection" ? { reason: "package projection" }
        : relation === "protocol" ? { reason: "protocol boundary" }
          : operation.relation === "boundary" ? { reason: "declared effect boundary" }
            : audit.reason === undefined ? {} : { reason: audit.reason }),
    });
  }));
}

/**
 * The remaining schema operations whose executable body is still free TS.
 *
 * A non-empty result is useful CI/doc evidence: the package has at least one
 * true schema-object operation whose body is not yet carried as serializable
 * SEN data.
 */
export function nonportableOperations(operations) {
  return Object.freeze(operationIrAudit(operations).filter((entry) =>
    entry.relation === "operation" && !entry.hasRunTerm));
}

function senDebtEntry(
  entry,
  debt,
  reason,
  recommendation,
) {
  return Object.freeze({
    kind: "metroplat.action.sen-debt",
    verb: entry.verb,
    debt,
    relation: entry.relation,
    hasRunTerm: entry.hasRunTerm,
    ...(entry.domain === undefined ? {} : { domain: entry.domain }),
    ...(entry.codomain === undefined ? {} : { codomain: entry.codomain }),
    reason,
    recommendation,
  });
}

/**
 * Actions whose classification hides likely SEN work.
 *
 * `nonportableOperations(...)` answers the strict gate: true schema operations must not
 * be implemented only as TypeScript closures. This report is the adjacent debt
 * surface for subtler failures: projection labels that cover complete
 * schema-object transformations, SEN bodies that lack a complete schema
 * boundary, and read-style schema boundaries that have not declared the
 * schema they read out.
 */
export function operationSenDebt(operations) {
  const debts = [];
  for (const entry of operationIrAudit(operations)) {
    const hasDomain = entry.domain !== undefined;
    const hasCodomain = entry.codomain !== undefined;
    if (entry.relation === "projection" && hasDomain && hasCodomain && !entry.hasRunTerm) {
      debts.push(senDebtEntry(
        entry,
        "projection-with-schema-contract",
        "schema-to-schema projection has no SEN body",
        "split host admission/projection from the pure schema operation, or document a package-projection exemption",
      ));
    }
    if (entry.relation === "boundary" && entry.hasRunTerm && (!hasDomain || !hasCodomain)) {
      debts.push(senDebtEntry(
        entry,
        "sen-boundary-without-schema-contract",
        "SEN body is present but the operation lacks a complete schema boundary",
        "declare the missing schema contract or split the boundary admission from the SEN operation",
      ));
    }
    if (entry.relation === "boundary" && hasDomain && !hasCodomain && !entry.hasRunTerm && entry.verb.startsWith("read-")) {
      debts.push(senDebtEntry(
        entry,
        "schema-read-boundary-without-codomain",
        "read-style operation consumes a schema but does not declare the schema it reads out",
        "promote the readout to a codomain schema with SEN when the output shape is stable",
      ));
    }
  }
  return Object.freeze(debts);
}

/**
 * The serializable schema-backed program object for an operation.
 *
 * This is the shape that durable logs can store: the executable closure is
 * excluded, while the typed domain/codomain ids and optional IR `runTerm` remain
 * as data. Dispatch can still execute the original operation, but this object is
 * the reviewable face: docs, ledgers, MCP resources, and the `inspect` operation can
 * read it without closing over host process state.
 *
 * @example
 * ```ts
 * import { programObject } from "@red-cup-engineering/computer-system-engine/rpc/operation";
 *
 * const serializable = programObject(someAction);
 * Object.hasOwn(serializable, "run"); // false
 * ```
 */
export function programObject(operation) {
  const domain = operation.domain?.id;
  const codomain = operation.codomain?.id;
  return Object.freeze({
    kind: "metroplat.program",
    verb: operation.verb,
    inputFormat: operation.inputFormat,
    outputFormat: operation.outputFormat,
    options: [...operation.options],
    effects: operation.effects,
    ...(operation.summary === undefined ? {} : { summary: operation.summary }),
    ...(operation.description === undefined ? {} : { description: operation.description }),
    ...(domain === undefined ? {} : { domain }),
    ...(codomain === undefined ? {} : { codomain }),
    ...(operation.relation === undefined ? {} : { relation: operation.relation }),
    ...(operation.runTerm === undefined ? {} : { runTerm: operation.runTerm }),
  });
}

/** Type guard: a value is an operation presentation. */
export function isOperation(value) {
  return typeof value === "object" && value !== null && (value).kind === "metroplat.action";
}

/** A relational fact as an utterance: token mark = {subject, object}, claim mark = predicate. */
export function fact(subject, predicate, object) {
  return utterance(mark({ subject, object }), mark(predicate));
}

/**
 * Compose two IR-backed operations as `consumer ∘ producer`.
 *
 * Composition is allowed only when the schema boundary composes (the producer's
 * codomain is the consumer's domain — SETTLED-4). Both inputs must have `runTerm`
 * bodies, because the composed operation must remain a serializable term rather
 * than a hidden TypeScript closure. Semantic confidence in a composite comes from
 * the behavioral oracle (catalog-verify), not from a declared entailment.
 */
export function compose(producer, consumer, verb) {
  const report = operationCompositionReport(producer, consumer);
  if (!report.schemaCompatible) {
    throw new TypeError(`compose: ${producer.verb}.codomain ≠ ${consumer.verb}.domain`);
  }
  if (producer.runTerm === undefined) throw new TypeError(`compose: ${producer.verb} has no runTerm`);
  if (consumer.runTerm === undefined) throw new TypeError(`compose: ${consumer.verb} has no runTerm`);
  const typed = producer.inputDescriptor !== undefined || consumer.inputDescriptor !== undefined;
  if (typed) {
    if (producer.inputDescriptor === undefined || consumer.inputDescriptor === undefined) {
      throw new TypeError(`compose: ${producer.verb} and ${consumer.verb} must both carry SEN descriptors`);
    }
    if (!tyEqual(descriptorTy(producer.outputDescriptor), descriptorTy(consumer.inputDescriptor))
      || JSON.stringify(producer.outputDescriptor) !== JSON.stringify(consumer.inputDescriptor)) {
      throw new TypeError(`compose: ${producer.verb} output descriptor ≠ ${consumer.verb} input descriptor`);
    }
  }
  return operation({
    ...(typed ? { inputDescriptor: producer.inputDescriptor, outputDescriptor: consumer.outputDescriptor } : {}),
    verb,
    inputFormat: producer.inputFormat,
    outputFormat: consumer.outputFormat,
    ...(producer.domain === undefined ? {} : { domain: producer.domain }),
    ...(consumer.codomain === undefined ? {} : { codomain: consumer.codomain }),
    runTerm: tm.lam(tm.app(shiftSen(1, 0, consumer.runTerm), tm.app(shiftSen(1, 0, producer.runTerm), tm.var(0)))),
  });
}

/** The utterance facts an operation carries about itself - the leg's content. */
export function operationUtterances(act) {
  const term = `metroplat.action.${act.verb}`;
  const facts = [
    fact(term, "metroplat.action.has-verb", act.verb),
    fact(term, "metroplat.action.accepts-codec", act.inputFormat),
    fact(term, "metroplat.action.emits-codec", act.outputFormat),
  ];
  if (act.summary !== undefined) facts.push(fact(term, "metroplat.action.summary", act.summary));
  if (act.description !== undefined) facts.push(fact(term, "metroplat.action.description", act.description));
  if (act.domain !== undefined) facts.push(fact(term, "metroplat.action.domain", act.domain.id));
  if (act.codomain !== undefined) facts.push(fact(term, "metroplat.action.codomain", act.codomain.id));
  if (act.body !== undefined) facts.push(fact(term, "metroplat.action.program-body", act.body));
  if (act.runTerm !== undefined) facts.push(fact(term, "metroplat.action.run-term", act.runTerm));
  return Object.freeze(facts);
}
