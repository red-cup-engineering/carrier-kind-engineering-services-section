import {
  admitOperation, executeOperation, isPromiseLike,
  type Operation,
  type ExecutionOptions,
  type ExecutionResult,
  type HostResolver,
  type OperationRefusal,
  type Result,
} from "./operations.mjs";
import { createTypeSystem, getType, type TypeSystem } from "@red-cup-engineering/computer-data-engine";
import { decodeOperationRequest, encodeOperationOutcome, type WireCodecCatalog } from "../src/wire.mjs";

/** Every host uses one registry, typed evaluator, wire boundary, and provider lifetime. */
export type PlatformExecutionOptions = Omit<ExecutionOptions, "resolveType" | "resolveHost">;
export type PlatformDispatchOptions = PlatformExecutionOptions & Readonly<{ codecs: WireCodecCatalog }>;

/** One named capability the platform starts, offers, and releases. */
export type CapabilityProvider<T = unknown> = Readonly<{
  name: string;
  start(): T | Promise<T>;
  close?(capability: T): void | Promise<void>;
}>;

/** The started capabilities, by provider name. */
export type Capabilities = Readonly<Record<string, unknown>>;

export type ComputerPlatformSpecification = Readonly<{
  id?: string;
  typeSystem?: TypeSystem;
  operations?: readonly Operation[];
  providers?: readonly CapabilityProvider[];
}>;

export type ComputerPlatform = Readonly<{
  kind: "computer-platform";
  specification: ComputerPlatformSpecification;
  /** Start every provider once (memoized); a failure releases what started and rejects. */
  start(): Promise<Capabilities>;
  /** Refuse new work, wait for active work to drain, then release every capability in reverse order. */
  close(): Promise<void>;
  /** The started capabilities, or an empty record before start. */
  capabilities(): Capabilities;
  closed(): boolean;
  /** Hold the platform open for one unit of work; the returned function releases it. */
  acquire(): () => void;
  /** Resolve a capability-effect operation's host from the started capabilities. */
  resolveHost: HostResolver;
  operation(id: string): Operation | undefined;
  operations(): readonly Operation[];
  /** Start providers as needed and retain them until the typed operation settles. */
  execute(id: string, input: unknown, options?: PlatformExecutionOptions): ExecutionResult;
  dispatch(document: string, options: PlatformDispatchOptions): Promise<string>;
}>;

function refusal(code: string, message: string): Result<never, OperationRefusal> {
  return Object.freeze({ ok: false as const, refusal: Object.freeze({ code, message }) });
}

export function isComputerPlatform(value: unknown): value is ComputerPlatform {
  return typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === "computer-platform";
}

/** A host resolver over started capabilities: a capability-effect operation binds to the provider of the same name when it is a function. */
export function hostResolverOf(capabilities: () => Capabilities): HostResolver {
  return (capability) => {
    const host = capabilities()[capability];
    return typeof host === "function" ? (host as (input: unknown) => unknown) : undefined;
  };
}

/** Already-started capabilities (a Workers `env`, a machine's bindings) as providers that need no lifecycle. */
export function bindingsProviders(bindings: Readonly<Record<string, unknown>>): readonly CapabilityProvider[] {
  return Object.freeze(Object.entries(bindings).map(([name, capability]) => Object.freeze({ name, start: () => capability })));
}

/** Admit the immutable operation and type registry and bind it to one provider lifetime. */
export function createComputerPlatform(specification: ComputerPlatformSpecification = {}): ComputerPlatform {
  const providers = Object.freeze([...(specification.providers ?? [])]);
  if (new Set(providers.map((provider) => provider.name)).size !== providers.length) throw new TypeError("platform capability names must be unique");
  if (specification.id !== undefined && (typeof specification.id !== "string" || !specification.id.trim())) throw new TypeError("platform id must be nonempty");
  const definitions = specification.operations ?? [];
  const catalog = createTypeSystem(specification.typeSystem?.types ?? definitions.flatMap(operation => [operation.domain, operation.codomain]));
  if (!catalog.ok) throw new TypeError(`invalid-type-system: ${catalog.refusal.message}`);
  const byId = new Map<string, Operation>();
  for (const operation of definitions) {
    if (byId.has(operation.id)) throw new TypeError(`duplicate-operation-id: ${operation.id}`);
    for (const side of ["domain", "codomain"] as const) {
      if (getType(catalog.value, operation[side].id) !== operation[side]) throw new TypeError(`${side}-type-not-in-platform: ${operation.id}`);
    }
    const admitted = admitOperation(operation);
    if (!admitted.ok) throw new TypeError(`${admitted.refusal.code}: ${admitted.refusal.message}`);
    byId.set(operation.id, admitted.value);
  }
  const operations = Object.freeze([...byId.values()]);
  specification = Object.freeze({ ...specification, typeSystem: catalog.value, operations, providers });
  const capabilities: Record<string, unknown> = {};
  const started: CapabilityProvider[] = [];
  let active = 0;
  const drained: (() => void)[] = [];
  let starting: Promise<Capabilities> | undefined;
  let closing: Promise<void> | undefined;
  let closed = false;
  let ready = false;
  const snapshot = (): Capabilities => Object.freeze({ ...capabilities });
  async function release(): Promise<void> {
    const failures: unknown[] = [];
    for (const provider of started.splice(0).reverse()) {
      try { await provider.close?.(capabilities[provider.name]); } catch (error) { failures.push(error); }
      delete capabilities[provider.name];
    }
    if (failures.length) throw new AggregateError(failures, "platform capability release failed");
  }
  const start = (): Promise<Capabilities> => {
    if (closed) return Promise.reject(new Error("platform is closed"));
    return starting ??= (async () => {
      try {
        for (const provider of providers) { capabilities[provider.name] = await provider.start(); started.push(provider); }
      } catch (error) {
        try { await release(); } catch (cleanup) { throw new AggregateError([error, cleanup], "platform startup failed"); }
        throw error;
      }
      ready = true;
      return snapshot();
    })();
  };
  const close = (): Promise<void> => closing ??= (async () => {
    closed = true;
    try { await starting; } catch { /* startup already released its capabilities */ }
    if (active > 0) await new Promise<void>((resolve) => drained.push(resolve));
    await release();
  })();
  const acquire = (): (() => void) => {
    if (closed) throw new Error("platform is closed");
    active += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      active -= 1;
      if (active === 0) for (const resolve of drained.splice(0)) resolve();
    };
  };
  const resolveHost = hostResolverOf(snapshot);
  // Every entry path participates in the same provider lifetime. Work admitted
  // before close may finish; close cannot release its hosts while it is pending.
  function run<T>(work: () => T | Promise<T>): T | Promise<T> {
    const done = acquire();
    try {
      const result = ready ? work() : start().then(work);
      if (isPromiseLike(result)) return Promise.resolve(result).finally(done);
      done();
      return result;
    } catch (error) { done(); throw error; }
  }
  const execute = (id: string, input: unknown, options: PlatformExecutionOptions): ExecutionResult => {
    const operation = byId.get(id);
    return operation ? executeOperation(operation, input, { ...options, resolveType: (id) => getType(catalog.value, id), resolveHost })
      : refusal("OperationUnavailable", "operation identity cannot be resolved");
  };
  const platform: ComputerPlatform = Object.freeze({
    kind: "computer-platform" as const,
    specification,
    start,
    close,
    capabilities: snapshot,
    closed: () => closed,
    acquire,
    resolveHost,
    operation: (id) => byId.get(id),
    operations: () => operations,
    execute: (id, input, options = {}) => {
      if (closed) return refusal("platform-closed", "platform is closed");
      return run(() => execute(id, input, options));
    },
    dispatch: async (document, options) => {
      return run(async () => {
        const request = decodeOperationRequest(document);
        let input: unknown;
        try {
          const inputCodec = options.codecs.resolve(request.inputCodec);
          const outputCodec = options.codecs.resolve(request.outputCodec);
          if (!inputCodec || !outputCodec || [inputCodec, outputCodec].some(codec => typeof codec.decode !== "function" || typeof codec.encode !== "function")) throw new TypeError("wire codec is unavailable");
          input = inputCodec.decode(request.input);
        } catch (error) {
          return encodeOperationOutcome(request, refusal("InvalidInputWire", error instanceof Error ? error.message : String(error)), options.codecs);
        }
        return encodeOperationOutcome(request, await execute(request.operationId, input, options), options.codecs);
      });
    },
  });
  return platform;
}
