/**
 * @packageDocumentation
 *
 * infograph/fern-catalog — projects JSNode-bound installed operations into
 * MetroPlat's `TrustedOperationSource` and Operation contracts.
 */
import path from "node:path";
import { readBoundPackageOperations } from "@red-cup-engineering/jsnode-engine/operations";
import { operation, type Operation } from "../../rpc/operation.mts";
import { schemaFrom, type SchemaContract } from "@red-cup-engineering/computer-data-engine/contracts";
import type { TrustedOperationSource } from "./catalog.mts";

/** Where to read the admitted operation graph from, and where its packages are installed. */
export interface FernCatalogOptions {
  /** Path to a FERN ({e,a,v,t}) flatfile (`fern`/`frog`'s own file). */
  readonly fern: string;
  /** Directory whose `node_modules` holds the packages admitted onto `fern`. */
  readonly operationsRoot: string;
}

/** The operation verb for one `scripts/<verb>.mjs` path: the basename, unchanged. */
function verbFromScriptPath(scriptPath: string): string {
  return path.basename(scriptPath, ".mjs");
}

/** Project one JSDoc-derived JSON-Schema literal (no `$id` of its own) into
 *  a metroplat `SchemaContract` addressed under the operation's own verb. */
function schemaContractFromJsonSchema(id: string, schema: Readonly<Record<string, unknown>> | null): SchemaContract | undefined {
  if (schema === null) return undefined;
  const literal = { ...schema, $id: id } as { readonly $id: string };
  return schemaFrom(literal);
}

/**
 * Project JSNode's verified installed operations into MetroPlat's trusted
 * catalog source shape. JSNode owns FERN row reading, package/version and path
 * verification, script import, and JSDoc contract re-derivation.
 */
export async function operationSourcesFromFern(options: FernCatalogOptions): Promise<readonly TrustedOperationSource[]> {
  const bound = await readBoundPackageOperations({ fernPath: options.fern, operationsRoot: options.operationsRoot });
  const operationsByPackage = new Map<string, Operation[]>();
  for (const boundOperation of bound) {
    const verb = verbFromScriptPath(boundOperation.path);
    const domain = schemaContractFromJsonSchema(`metroplat/fern/${boundOperation.origin.packageName}/${verb}/input`, boundOperation.inputSchema);
    const codomain = schemaContractFromJsonSchema(`metroplat/fern/${boundOperation.origin.packageName}/${verb}/output`, boundOperation.outputSchema);
    const operations = operationsByPackage.get(boundOperation.origin.packageName) ?? [];
    operations.push(operation({
      verb,
      ...(boundOperation.description === null ? {} : { summary: boundOperation.description }),
      ...(domain === undefined ? {} : { domain }),
      ...(codomain === undefined ? {} : { codomain }),
      run: (input: unknown): unknown => boundOperation.run(input),
    }));
    operationsByPackage.set(boundOperation.origin.packageName, operations);
  }
  return Object.freeze([...operationsByPackage].map(([module, operations]) => Object.freeze({ module, operations: Object.freeze(operations) })));
}

/**
 * Resolve the `{fern, operationsRoot}` pair from one infograph process
 * boundary's resolved options, or `undefined` when neither is set — the
 * catalog is then unchanged, exactly as if this module did not exist.
 * `resolveInfographProcessOptions` already refuses a lone `--fern` or
 * `--operations-root`, so both fields are present or both are absent here.
 */
export function fernCatalogOptionsFrom(
  processOptions: Readonly<{ readonly fern?: string; readonly operationsRoot?: string }>,
): FernCatalogOptions | undefined {
  if (processOptions.fern === undefined || processOptions.operationsRoot === undefined) return undefined;
  return Object.freeze({ fern: processOptions.fern, operationsRoot: processOptions.operationsRoot });
}

/**
 * `operationSourcesFromFern`, or `[]` when `processOptions` names no FERN —
 * the one call every process boundary (CLI, MCP, HTTP) makes.
 */
export async function trustedOperationSourcesFromProcessOptions(
  processOptions: Readonly<{ readonly fern?: string; readonly operationsRoot?: string }>,
): Promise<readonly TrustedOperationSource[]> {
  const fernCatalogOptions = fernCatalogOptionsFrom(processOptions);
  return fernCatalogOptions === undefined ? [] : operationSourcesFromFern(fernCatalogOptions);
}
