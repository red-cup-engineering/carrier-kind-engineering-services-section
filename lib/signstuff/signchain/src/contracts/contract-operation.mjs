/**
 * contracts/operation - executable program packets and schema-operation
 * composability/auditing, split out of the single contracts module.
 */

export const schemaOperationAuditSchema = {
  $id: "metroplat/contracts/operation/schema-operation-audit",
  type: "object",
  required: ["kind", "id", "relation", "hasPortableBody"],
  properties: {
    kind: { const: "metroplat.contracts.operation-audit" },
    id: { type: "string" },
    relation: { enum: ["operation", "boundary"] },
    hasPortableBody: { type: "boolean" },
    domain: { type: "string" },
    codomain: { type: "string" },
    reason: { enum: ["untyped boundary", "admission boundary", "transport boundary"] },
  },
  additionalProperties: false,
  title: "SchemaOperationAudit",
  description: "An audit of whether a schema-addressed operation has a portable body, and why not.",
};

export function operationConformanceVector(spec) {
  return Object.freeze({
    ...spec,
    ...(spec.input === undefined ? {} : { input: spec.input }),
    ...(spec.output === undefined ? {} : { output: spec.output }),
    ...(spec.evidence === undefined ? {} : { evidence: spec.evidence }),
  });
}

export function executableProgramPacket(
  spec,
) {
  return Object.freeze({
    kind: "metroplat.program.packet",
    id: spec.id,
    version: spec.version,
    ...(spec.domain === undefined ? {} : { domain: spec.domain }),
    ...(spec.codomain === undefined ? {} : { codomain: spec.codomain }),
    inputCodecs: Object.freeze([...spec.inputCodecs]),
    outputCodecs: Object.freeze([...spec.outputCodecs]),
    bodyFormat: spec.bodyFormat,
    body: spec.body,
    purity: spec.purity,
    totality: spec.totality,
    contract: spec.contract,
    conformance: Object.freeze([...spec.conformance]),
    testVectors: Object.freeze(spec.testVectors.map(operationConformanceVector)),
    digest: spec.digest,
    ...(spec.proofCore === undefined ? {} : { proofCore: Object.freeze([...spec.proofCore]) }),
  });
}

export function schemaOperationsCompose(producer, consumer) {
  return producer.codomain !== undefined && consumer.domain !== undefined && producer.codomain === consumer.domain;
}

export function auditSchemaOperation(presentation) {
  const relation = presentation.domain !== undefined && presentation.codomain !== undefined ? "operation" : "boundary";
  const reason = relation === "operation"
    ? undefined
    : presentation.domain === undefined && presentation.codomain === undefined
      ? "untyped boundary"
      : presentation.domain === undefined
        ? "admission boundary"
        : "transport boundary";
  return Object.freeze({
    kind: "metroplat.contracts.operation-audit",
    id: presentation.id,
    relation,
    hasPortableBody: presentation.hasPortableBody,
    ...(presentation.domain === undefined ? {} : { domain: presentation.domain }),
    ...(presentation.codomain === undefined ? {} : { codomain: presentation.codomain }),
    ...(reason === undefined ? {} : { reason }),
  });
}
