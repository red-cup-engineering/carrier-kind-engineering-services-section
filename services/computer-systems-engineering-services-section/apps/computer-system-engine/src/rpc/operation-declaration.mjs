/** The existing RPC declaration law, independent of executor construction.
 * Host callbacks may be carried from their real owner but are never invoked here.
 * JSNode source capture is supplied by its native owner; this layer never guesses it.
 */
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { canonicalJson, canonicalizeJson, JSON_RESOURCE_ENVELOPE } from "@red-cup-engineering/json-services-section";
import { schemaFromGraph } from "@red-cup-engineering/json-schema-services-section/contracts";
import { ty } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { checkTy } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/typing";
import { descriptorTy } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { wireCodec } from "../wire-eavt-tuple.mjs";

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

function validateSenDeclaration(spec) {
  if (spec.program !== undefined || spec.run != null) return;
  if (spec.inputDescriptor === undefined && spec.outputDescriptor === undefined) return;
  if (spec.inputDescriptor === undefined || spec.outputDescriptor === undefined) {
    throw new TypeError(`operation ${spec.verb}: inputDescriptor and outputDescriptor are a pair`);
  }
  const domain = descriptorTy(spec.inputDescriptor);
  const codomain = descriptorTy(spec.outputDescriptor);
  if (!checkTy([], spec.runTerm, ty.arrow(domain, codomain))) {
    throw new TypeError(`operation ${spec.verb}: runTerm does not check against its declared SEN arrow`);
  }
}

export function operationDeclaration(spec) {
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
  validateSenDeclaration(spec);
  return Object.freeze(value);
}

/** One closed schema universe, independent of tree shape and process registration. */
export function schemaDescriptor(contract) {
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


export function schemaContractFromDescriptor(descriptor) {
  if (descriptor === undefined) return undefined;
  return schemaFromGraph({ root: descriptor.id, schemas: [descriptor, ...descriptor.references]
    .map(({ id, schema }) => ({ id, schema })) });
}

/** Original lazy-operation admission, shared by build-time receiving and runtime discovery.
 * Schema reconstruction uses only the explicitly carried graph, never ambient registration. */
export function admitOperationDescriptor(inputDescriptor) {
  const snapshot = canonicalizeJson(inputDescriptor, JSON_RESOURCE_ENVELOPE).value;
  const descriptor = canonicalizeJson({ ...snapshot,
    ...(snapshot.domain === undefined ? {} : { domain: schemaDescriptor(snapshot.domain) }),
    ...(snapshot.codomain === undefined ? {} : { codomain: schemaDescriptor(snapshot.codomain) }),
  }, JSON_RESOURCE_ENVELOPE).value;
  const domain = schemaContractFromDescriptor(descriptor.domain);
  const codomain = schemaContractFromDescriptor(descriptor.codomain);
  return Object.freeze({ descriptor, domain, codomain });
}
