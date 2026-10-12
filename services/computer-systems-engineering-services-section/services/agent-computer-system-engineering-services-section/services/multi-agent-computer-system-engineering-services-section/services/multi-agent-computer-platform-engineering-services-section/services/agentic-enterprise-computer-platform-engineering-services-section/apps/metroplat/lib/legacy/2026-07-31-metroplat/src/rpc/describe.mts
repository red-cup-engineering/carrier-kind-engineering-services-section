/** Protocol-neutral description of an immutable RPC catalog. */
import type { JsonRecord, JsonValue } from "../lib/codecs/json/core.mts";
import type { OperationCatalog, OperationEffects, OperationRelation } from "./operation.mts";

export interface OperationDescription {
  readonly kind: "metroplat.rpc.operation-description";
  readonly ref: string;
  readonly verb: string;
  readonly inputFormat: string;
  readonly outputFormat: string;
  readonly options: readonly string[];
  readonly domain?: string;
  /** Actual domain schema used to derive protocol tool affordances without consulting a registry. */
  readonly inputSchema?: JsonRecord;
  readonly codomain?: string;
  readonly relation?: OperationRelation;
  readonly body: Readonly<{ kind: "rmn"; term: JsonValue }> | Readonly<{ kind: "host"; declaration: string }>;
  readonly effects: OperationEffects;
  readonly standing: "held" | "denied" | "contested" | "unknown";
  readonly summary?: string;
  readonly description?: string;
}

export interface RpcDescription {
  readonly kind: "metroplat.rpc.description";
  readonly operations: readonly OperationDescription[];
}

export function describe(
  catalog: OperationCatalog,
  standing: ReadonlyMap<string, OperationDescription["standing"]> = new Map(),
): RpcDescription {
  return Object.freeze({
    kind: "metroplat.rpc.description" as const,
    operations: Object.freeze(catalog.operations.map((operation): OperationDescription => Object.freeze({
      kind: "metroplat.rpc.operation-description" as const,
      ref: operation.ref,
      verb: operation.verb,
      inputFormat: operation.inputFormat,
      outputFormat: operation.outputFormat,
      options: operation.options,
      ...(operation.domain === undefined ? {} : { domain: operation.domain.id }),
      ...(operation.domain === undefined ? {} : { inputSchema: operation.domain.schema }),
      ...(operation.codomain === undefined ? {} : { codomain: operation.codomain.id }),
      ...(operation.relation === undefined ? {} : { relation: operation.relation }),
      body: operation.runTerm === undefined
        ? Object.freeze({ kind: "host" as const, declaration: operation.verb })
        : Object.freeze({ kind: "rmn" as const, term: operation.runTerm as unknown as JsonValue }),
      effects: operation.effects,
      standing: standing.get(operation.ref) ?? "unknown",
      ...(operation.summary === undefined ? {} : { summary: operation.summary }),
      ...(operation.description === undefined ? {} : { description: operation.description }),
    }))),
  });
}
