/** File-backed BCP 14 specification inspection and journaled Markdown editing. */
import { specificationReadout, specificationRequirementsXml, type SpecificationReadout } from "../../../lib/codecs/specification/index.mts";
import type { MarkdownEditOperation } from "../../../lib/codecs/markdown/index.mts";
import { schemaFrom } from "../../../lib/schema/index.mts";
import { operation, type Operation } from "../../../rpc/index.mts";
import type { FilesystemBinding, FilesystemWriteReceipt } from "./read-write.mts";
import { runMarkdownFileWorkbench, type MarkdownFileWorkbenchRequest } from "./markdown-workbench.mts";

const specificationWorkbenchRequestSchema = {
  $id: "metroplat/filesystem/specification-workbench-request",
  type: "object",
  required: ["path"],
  additionalProperties: false,
  properties: {
    path: { type: "string", minLength: 1 },
    operations: { type: "array", items: { type: "object", required: ["operation"], additionalProperties: true, properties: { operation: { type: "string" } } } },
    write: { type: "boolean" },
    includeXml: { type: "boolean" },
    token: { type: "string" },
    at: { type: "string" },
  },
} as const;

const specificationWorkbenchResponseSchema = {
  $id: "metroplat/filesystem/specification-workbench-response",
  type: "object",
  required: ["kind", "path", "specification", "changed", "persisted"],
  additionalProperties: true,
  properties: {
    kind: { const: "metroplat.specification.workbench-response" },
    path: { type: "string" },
    specification: { type: "object", additionalProperties: true },
    requirementsXml: { type: "string" },
    edit: { type: "object", additionalProperties: true },
    writeReceipt: { type: "object", additionalProperties: true },
    changed: { type: "boolean" },
    persisted: { type: "boolean" },
  },
} as const;

export type SpecificationWorkbenchRequest = Readonly<{
  readonly path: string;
  readonly operations?: readonly MarkdownEditOperation[];
  readonly write?: boolean;
  readonly includeXml?: boolean;
  readonly token?: string;
  readonly at?: string;
}>;

export type SpecificationWorkbenchResponse = Readonly<{
  readonly kind: "metroplat.specification.workbench-response";
  readonly path: string;
  readonly specification: SpecificationReadout;
  readonly requirementsXml?: string;
  readonly edit?: Readonly<Record<string, unknown>>;
  readonly writeReceipt?: FilesystemWriteReceipt;
  readonly changed: boolean;
  readonly persisted: boolean;
}>;

export const specificationWorkbenchRequestContract = schemaFrom(specificationWorkbenchRequestSchema);
export const specificationWorkbenchResponseContract = schemaFrom(specificationWorkbenchResponseSchema);

export async function runSpecificationWorkbench(binding: FilesystemBinding, request: SpecificationWorkbenchRequest): Promise<SpecificationWorkbenchResponse> {
  const markdownRequest: MarkdownFileWorkbenchRequest = Object.freeze({
    path: request.path,
    ...(request.operations === undefined ? {} : { operations: request.operations }),
    ...(request.write === undefined ? {} : { write: request.write }),
    ...(request.token === undefined ? {} : { token: request.token }),
    ...(request.at === undefined ? {} : { at: request.at }),
  });
  const result = await runMarkdownFileWorkbench(binding, markdownRequest);
  const final = result.after ?? result.before;
  const specification = specificationReadout(final.source.text);
  return Object.freeze({
    kind: "metroplat.specification.workbench-response" as const,
    path: request.path,
    specification,
    ...(request.includeXml === true ? { requirementsXml: specificationRequirementsXml(specification) } : {}),
    ...(result.edit === undefined ? {} : { edit: result.edit as unknown as Readonly<Record<string, unknown>> }),
    ...(result.writeReceipt === undefined ? {} : { writeReceipt: result.writeReceipt }),
    changed: result.changed,
    persisted: result.persisted,
  });
}

export function specificationWorkbenchOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([operation({
    verb: "specification-workbench",
    inputFormat: "json",
    outputFormat: "json",
    summary: "Inspect and structurally refine a BCP 14 Markdown specification.",
    description: "Extracts uppercase RFC 2119/RFC 8174 requirements with source coordinates, reports missing BCP 14 references, optionally projects the requirement index to XML, and composes journaled Markdown edits when write=true.",
    domain: specificationWorkbenchRequestContract,
    codomain: specificationWorkbenchResponseContract,
    relation: "projection",
    run: (input: unknown): Promise<SpecificationWorkbenchResponse> => runSpecificationWorkbench(binding, input as SpecificationWorkbenchRequest),
  })]);
}
