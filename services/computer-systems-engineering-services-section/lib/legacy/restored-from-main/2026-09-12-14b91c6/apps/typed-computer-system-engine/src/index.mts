/**
 * Typed computer system engine.
 *
 * A system is the explicit composition boundary above individual typed
 * operations.  It owns stable operation registration and delegates wire
 * decoding, effect authorization, and operation execution to the networking
 * and code engines.  It deliberately does not add a lifecycle state machine:
 * the runtime contracts recovered from Relating establish registration and an
 * invocation outcome, but no independent lifecycle semantics.
 */
import {
  dispatchOperationRequest,
  type OperationDispatchOptions,
} from "@red-cup-engineering/typed-code-networking-engine";
import {
  COMPUTER_ENGINEERING_SPECIFICATION_ID,
  createTypeSystem,
  getType,
  type TypeSystem,
} from "@red-cup-engineering/computer-data-engine";
import { admitOperation, executeOperationById, type ExecutionOptions, type ExecutionResult,
  type Operation,
  type OperationRefusal,
  type Result,
} from "@red-cup-engineering/typed-computer-code-engine";

/** This package binds systems to the single concurrent-game-system specification. */
export const COMPUTER_SYSTEM_SPECIFICATION = COMPUTER_ENGINEERING_SPECIFICATION_ID;

/** A stable, admitted system composition. */
export interface TypedComputerSystem {
  readonly version: 1;
  readonly id: string;
  /** The admitted type catalog resolving every operation domain and codomain. */
  readonly typeSystem: TypeSystem;
  readonly operations: readonly Operation[];
}

/** A resolved, immutable operation registry for one system composition. */
export interface TypedComputerSystemRuntime {
  readonly system: TypedComputerSystem;
  readonly operation: (id: string) => Operation | undefined;
  readonly operations: () => readonly Operation[];
  readonly execute: (id: string, input: unknown, options?: Omit<ExecutionOptions, "resolveType">) => ExecutionResult;
  readonly dispatch: (
    document: string,
    options: Omit<OperationDispatchOptions, "resolveOperation" | "resolveType">,
  ) => Promise<string>;
}

function refusal(code: string, message: string): Result<never, OperationRefusal> {
  return Object.freeze({
    ok: false as const,
    refusal: Object.freeze({ code, message }),
  });
}

function validSystemId(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Admit a system composition and establish its operation registry.
 *
 * Operation admission belongs to the typed computer-code engine.  This layer
 * verifies only the system-owned invariants: a stable id and one operation per
 * operation id.  It never replaces an operation body or evaluator.
 */
export function admitTypedComputerSystem(
  value: TypedComputerSystem,
): Result<TypedComputerSystem, OperationRefusal> {
  if (value.version !== 1) return refusal("unsupported-system-version", `system ${value.id} must have version 1`);
  if (!validSystemId(value.id)) return refusal("invalid-system-id", "system id must be non-empty");
  const catalog = createTypeSystem(value.typeSystem.types);
  if (!catalog.ok) return refusal("invalid-type-system", catalog.refusal.message);

  const ids = new Set<string>();
  const operations: Operation[] = [];
  for (const operation of value.operations) {
    if (ids.has(operation.id)) {
      return refusal("duplicate-operation-id", `system ${value.id} contains duplicate operation ${operation.id}`);
    }
    ids.add(operation.id);
    if (getType(catalog.value, operation.domain.id) !== operation.domain) {
      return refusal("domain-type-not-in-system", `operation ${operation.id} domain ${operation.domain.id} is not this system's declaration`);
    }
    if (getType(catalog.value, operation.codomain.id) !== operation.codomain) {
      return refusal("codomain-type-not-in-system", `operation ${operation.id} codomain ${operation.codomain.id} is not this system's declaration`);
    }
    const admitted = admitOperation(operation);
    if (!admitted.ok) return admitted;
    operations.push(admitted.value);
  }
  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      version: 1 as const,
      id: value.id,
      typeSystem: catalog.value,
      operations: Object.freeze(operations),
    }),
  });
}

/**
 * Create the system-owned registry and bind it to the networking boundary.
 *
 * The returned dispatcher is the one actual execution path: networking decodes
 * the request and invokes the typed computer-code engine with the caller's
 * explicit host and effect capabilities.
 */
export function createTypedComputerSystemRuntime(
  definition: TypedComputerSystem,
): Result<TypedComputerSystemRuntime, OperationRefusal> {
  const admitted = admitTypedComputerSystem(definition);
  if (!admitted.ok) return admitted;

  const byId = new Map(admitted.value.operations.map((operation) => [operation.id, operation]));
  const runtime: TypedComputerSystemRuntime = Object.freeze({
    system: admitted.value,
    operation: (id: string): Operation | undefined => byId.get(id),
    operations: (): readonly Operation[] => admitted.value.operations,
    execute: (id: string, input: unknown, options: Omit<ExecutionOptions, "resolveType"> = {}) => executeOperationById(id, input, {
      ...options,
      resolveOperation: (id) => byId.get(id),
      resolveType: (id) => getType(admitted.value.typeSystem, id),
    }),
    dispatch: async (
      document: string,
      options: Omit<OperationDispatchOptions, "resolveOperation" | "resolveType">,
    ): Promise<string> => dispatchOperationRequest(document, {
      ...options,
      resolveOperation: (id: string): Operation | undefined => byId.get(id),
      resolveType: (id: string) => getType(admitted.value.typeSystem, id),
    }),
  });
  return Object.freeze({ ok: true as const, value: runtime });
}
