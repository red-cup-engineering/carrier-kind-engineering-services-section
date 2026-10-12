/**
 * @packageDocumentation
 *
 * fern-catalog — projects JSNode-bound installed operations into
 * MetroPlat's `TrustedOperationSource` and Operation contracts.
 */
import path from "node:path";
import { readBoundPackageOperations } from "@red-cup-engineering/computer-code-development-engine/operations";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

/** Where to read the admitted operation graph from, and where its packages are installed. */

/** The operation verb for one `scripts/<verb>.mjs` path: the basename, unchanged. */
function verbFromScriptPath(scriptPath) {
  return path.basename(scriptPath, ".mjs");
}

/** Project one JSDoc-derived JSON-Schema literal (no `$id` of its own) into
 *  a metroplat `SchemaContract` addressed under the operation's own verb. */
function schemaContractFromJsonSchema(id, schema) {
  if (schema === null) return undefined;
  const literal = { ...schema, $id: id };
  return schemaFrom(literal);
}

/**
 * Project JSNode's verified installed operations into MetroPlat's trusted
 * catalog source shape. JSNode owns FERN row reading, package/version and path
 * verification, script import, and JSDoc contract re-derivation.
 */
export async function operationSourcesFromFern(options) {
  const bound = await readBoundPackageOperations({ fernPath: options.fern, operationsRoot: options.operationsRoot });
  const operationsByPackage = new Map();
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
      run: (input) => boundOperation.run(input),
    }));
    operationsByPackage.set(boundOperation.origin.packageName, operations);
  }
  return Object.freeze([...operationsByPackage].map(([module, operations]) => Object.freeze({ module, operations: Object.freeze(operations) })));
}

/**
 * Resolve the `{fern, operationsRoot}` pair from one MetroPlat process
 * boundary's resolved options, or `undefined` when neither is set — the
 * catalog is then unchanged, exactly as if this module did not exist.
 * `resolveInfographProcessOptions` already refuses a lone `--fern` or
 * `--operations-root`, so both fields are present or both are absent here.
 */
export function fernCatalogOptionsFrom(
  processOptions,
) {
  if (processOptions.fern === undefined || processOptions.operationsRoot === undefined) return undefined;
  return Object.freeze({ fern: processOptions.fern, operationsRoot: processOptions.operationsRoot });
}
