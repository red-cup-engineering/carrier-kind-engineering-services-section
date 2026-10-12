/**
 * @packageDocumentation
 *
 * builtins — built-in operation modules shipped by the application.
 *
 * Each built-in module owns one operation family. This composition selects
 * those families, adds the generated LSP operation, and derives both the
 * schema-node mounts and flat dispatch list from the same declarations.
 */

import { moduleMounts } from "@red-cup-engineering/metroplat/presentation/mounting";
import { inducingOperations } from "@red-cup-engineering/relating/operations/inducing";
import { realizationOperations } from "@red-cup-engineering/relating/operations/realization";
import { positingOperations } from "@red-cup-engineering/relating/operations/positing";
import { metroplatLspOperationFor } from "@red-cup-engineering/metroplat/lsp/operation";
import { markdownOperations } from "@red-cup-engineering/knowledge-system-server/workbench/markdown-edit";

/** metroplat-lsp — answer LSP-style reads over the same schema/operation substrate as the package apex. */
export const metroplatLspOperation = metroplatLspOperationFor(() => builtinOperations, {
  packageName: "@red-cup-engineering/metroplat",
});

/**
 * The package's module operation families, keyed by module name. This is the
 * authored decomposition the mesh mounts; nothing here regroups operations — each
 * family is owned by its module file.
 */
export const builtinOperationModules = Object.freeze({
  "@red-cup-engineering/metroplat/inducing": inducingOperations,
  "@red-cup-engineering/metroplat/realization": realizationOperations,
  "@red-cup-engineering/metroplat/positing": positingOperations,
  "@red-cup-engineering/metroplat/markdown": markdownOperations,
  "@red-cup-engineering/metroplat/lsp": Object.freeze([metroplatLspOperation]),
});

/** The package's schema-node mesh: every module family mounted at the nodes its
 *  operations act on, module identity preserved on each mount. */
export function builtinMounts() {
  return Object.freeze(Object.entries(builtinOperationModules)
    .flatMap(([module, family]) => moduleMounts(module, family)));
}

/** The package's operations — the DERIVED coproduct of the module families. */
export const builtinOperations = Object.freeze(Object.values(builtinOperationModules).flat());
