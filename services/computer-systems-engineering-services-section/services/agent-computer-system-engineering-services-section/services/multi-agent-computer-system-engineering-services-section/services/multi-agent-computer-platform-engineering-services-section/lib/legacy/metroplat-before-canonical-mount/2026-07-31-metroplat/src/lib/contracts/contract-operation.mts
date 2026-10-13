/**
 * contracts/operation - executable program packets and schema-operation
 * composability/auditing, split out of the single contracts module.
 */

import type { ContractValue } from "./contract.mts";
import type { FromSchema } from "../schema/contract.mts";

export type ProgramPacketPurity = "pure" | "boundary" | "effectful";
export type ProgramPacketTotality = "structural" | "partial" | "streaming" | "unknown";

export interface OperationConformanceVector {
  readonly id: string;
  readonly claim: string;
  readonly input?: ContractValue;
  readonly output?: ContractValue;
  readonly evidence?: ContractValue;
}

export interface ExecutableProgramPacket {
  readonly kind: "metroplat.program.packet";
  readonly id: string;
  readonly version: string;
  readonly domain?: string;
  readonly codomain?: string;
  readonly inputCodecs: readonly string[];
  readonly outputCodecs: readonly string[];
  readonly bodyFormat: "rmn-core-0.1";
  readonly body: ContractValue;
  readonly purity: ProgramPacketPurity;
  readonly totality: ProgramPacketTotality;
  readonly contract: string;
  readonly conformance: readonly string[];
  readonly testVectors: readonly OperationConformanceVector[];
  readonly digest: string;
  readonly proofCore?: readonly string[];
}

export interface SchemaOperationPresentation {
  readonly id: string;
  readonly domain?: string;
  readonly codomain?: string;
  readonly hasPortableBody: boolean;
}

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
} as const;

export type SchemaOperationAudit = FromSchema<typeof schemaOperationAuditSchema>;

export function operationConformanceVector(spec: OperationConformanceVector): OperationConformanceVector {
  return Object.freeze({
    ...spec,
    ...(spec.input === undefined ? {} : { input: spec.input }),
    ...(spec.output === undefined ? {} : { output: spec.output }),
    ...(spec.evidence === undefined ? {} : { evidence: spec.evidence }),
  });
}

export function executableProgramPacket(
  spec: Omit<ExecutableProgramPacket, "kind">,
): ExecutableProgramPacket {
  return Object.freeze({
    kind: "metroplat.program.packet" as const,
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

export function schemaOperationsCompose(producer: SchemaOperationPresentation, consumer: SchemaOperationPresentation): boolean {
  return producer.codomain !== undefined && consumer.domain !== undefined && producer.codomain === consumer.domain;
}

export function auditSchemaOperation(presentation: SchemaOperationPresentation): SchemaOperationAudit {
  const relation = presentation.domain !== undefined && presentation.codomain !== undefined ? "operation" : "boundary";
  const reason = relation === "operation"
    ? undefined
    : presentation.domain === undefined && presentation.codomain === undefined
      ? "untyped boundary" as const
      : presentation.domain === undefined
        ? "admission boundary" as const
        : "transport boundary" as const;
  return Object.freeze({
    kind: "metroplat.contracts.operation-audit" as const,
    id: presentation.id,
    relation,
    hasPortableBody: presentation.hasPortableBody,
    ...(presentation.domain === undefined ? {} : { domain: presentation.domain }),
    ...(presentation.codomain === undefined ? {} : { codomain: presentation.codomain }),
    ...(reason === undefined ? {} : { reason }),
  });
}
