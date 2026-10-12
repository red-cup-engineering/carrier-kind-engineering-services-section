/**
 * @packageDocumentation
 *
 * infograph/builtins — built-in operation modules shipped by the application.
 *
 * Each built-in module owns one operation family. This composition selects
 * those families, adds the generated LSP operation, and derives both the
 * schema-node mounts and flat dispatch list from the same declarations.
 */
import type { Operation } from "../../rpc/index.mts";
import { moduleMounts, type SchemaMount } from "../../presentation/index.mts";
import { inducingOperations } from "./operations/inducing.mts";
import { realizationOperations } from "./operations/realization.mts";
import { positingOperations } from "./operations/positing.mts";
import { metroplatLspOperationFor } from "../../integrations/lsp/operation.mts";
import { markdownOperations } from "./operations/markdown.mts";

/** metroplat-lsp — answer LSP-style reads over the same schema/operation substrate as the package apex. */
export const metroplatLspOperation: Operation = metroplatLspOperationFor(() => builtinOperations, {
  packageName: "@red-cup-engineering/metroplat",
});

/**
 * The package's module operation families, keyed by module name. This is the
 * authored decomposition the mesh mounts; nothing here regroups operations — each
 * family is owned by its module file.
 */
export const builtinOperationModules: Readonly<Record<string, readonly Operation[]>> = Object.freeze({
  "@red-cup-engineering/metroplat/inducing": inducingOperations,
  "@red-cup-engineering/metroplat/realization": realizationOperations,
  "@red-cup-engineering/metroplat/positing": positingOperations,
  "@red-cup-engineering/metroplat/markdown": markdownOperations,
  "@red-cup-engineering/metroplat/lsp": Object.freeze([metroplatLspOperation]),
});

/** The package's schema-node mesh: every module family mounted at the nodes its
 *  operations act on, module identity preserved on each mount. */
export function builtinMounts(): readonly SchemaMount[] {
  return Object.freeze(Object.entries(builtinOperationModules)
    .flatMap(([module, family]) => moduleMounts(module, family)));
}

/** The package's operations — the DERIVED coproduct of the module families. */
export const builtinOperations: readonly Operation[] = Object.freeze(Object.values(builtinOperationModules).flat());
