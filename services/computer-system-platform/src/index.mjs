import { admitOperation, executeOperation, isPromiseLike } from "@red-cup-engineering/computer-code-engineering-services-section/typed-operation";
import { createTypeSystem, getType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { decodeOperationRequest, encodeOperationOutcome } from "./wire.mjs";
function refusal(code, message) {
    return Object.freeze({ ok: false, refusal: Object.freeze({ code, message }) });
}
export function isComputerPlatform(value) {
    return typeof value === "object" && value !== null && value.kind === "computer-platform";
}
/** A host resolver over started capabilities: a capability-effect operation binds to the provider of the same name when it is a function. */
export function hostResolverOf(capabilities) {
    return (capability) => {
        const host = capabilities()[capability];
        return typeof host === "function" ? host : undefined;
    };
}
/** Already-started capabilities (a Workers `env`, a machine's bindings) as providers that need no lifecycle. */
export function bindingsProviders(bindings) {
    return Object.freeze(Object.entries(bindings).map(([name, capability]) => Object.freeze({ name, start: () => capability })));
}
/** Admit the immutable operation and type registry and bind it to one provider lifetime. */
export function createComputerPlatform(specification = {}) {
    const providers = Object.freeze([...(specification.providers ?? [])]);
    if (new Set(providers.map((provider) => provider.name)).size !== providers.length)
        throw new TypeError("platform capability names must be unique");
    if (specification.id !== undefined && (typeof specification.id !== "string" || !specification.id.trim()))
        throw new TypeError("platform id must be nonempty");
    const definitions = specification.operations ?? [];
    const catalog = createTypeSystem(specification.typeSystem?.types ?? definitions.flatMap(operation => [operation.domain, operation.codomain]));
    if (!catalog.ok)
        throw new TypeError(`invalid-type-system: ${catalog.refusal.message}`);
    const byId = new Map();
    for (const operation of definitions) {
        if (byId.has(operation.id))
            throw new TypeError(`duplicate-operation-id: ${operation.id}`);
        for (const side of ["domain", "codomain"]) {
            if (getType(catalog.value, operation[side].id) !== operation[side])
                throw new TypeError(`${side}-type-not-in-platform: ${operation.id}`);
        }
        const admitted = admitOperation(operation);
        if (!admitted.ok)
            throw new TypeError(`${admitted.refusal.code}: ${admitted.refusal.message}`);
        byId.set(operation.id, admitted.value);
    }
    const operations = Object.freeze([...byId.values()]);
    specification = Object.freeze({ ...specification, typeSystem: catalog.value, operations, providers });
    const capabilities = {};
    const started = [];
    let active = 0;
    const drained = [];
    let starting;
    let closing;
    let closed = false;
    let ready = false;
    const snapshot = () => Object.freeze({ ...capabilities });
    async function release() {
        const failures = [];
        for (const provider of started.splice(0).reverse()) {
            try {
                await provider.close?.(capabilities[provider.name]);
            }
            catch (error) {
                failures.push(error);
            }
            delete capabilities[provider.name];
        }
        if (failures.length)
            throw new AggregateError(failures, "platform capability release failed");
    }
    const start = () => {
        if (closed)
            return Promise.reject(new Error("platform is closed"));
        return starting ??= (async () => {
            try {
                for (const provider of providers) {
                    capabilities[provider.name] = await provider.start();
                    started.push(provider);
                }
            }
            catch (error) {
                try {
                    await release();
                }
                catch (cleanup) {
                    throw new AggregateError([error, cleanup], "platform startup failed");
                }
                throw error;
            }
            ready = true;
            return snapshot();
        })();
    };
    const close = () => closing ??= (async () => {
        closed = true;
        try {
            await starting;
        }
        catch { /* startup already released its capabilities */ }
        if (active > 0)
            await new Promise((resolve) => drained.push(resolve));
        await release();
    })();
    const acquire = () => {
        if (closed)
            throw new Error("platform is closed");
        active += 1;
        let released = false;
        return () => {
            if (released)
                return;
            released = true;
            active -= 1;
            if (active === 0)
                for (const resolve of drained.splice(0))
                    resolve();
        };
    };
    const resolveHost = hostResolverOf(snapshot);
    // Every entry path participates in the same provider lifetime. Work admitted
    // before close may finish; close cannot release its hosts while it is pending.
    function run(work) {
        const done = acquire();
        try {
            const result = ready ? work() : start().then(work);
            if (isPromiseLike(result))
                return Promise.resolve(result).finally(done);
            done();
            return result;
        }
        catch (error) {
            done();
            throw error;
        }
    }
    const execute = (id, input, options) => {
        const operation = byId.get(id);
        return operation ? executeOperation(operation, input, { ...options, resolveType: (id) => getType(catalog.value, id), resolveHost })
            : refusal("OperationUnavailable", "operation identity cannot be resolved");
    };
    const platform = Object.freeze({
        kind: "computer-platform",
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
            if (closed)
                return refusal("platform-closed", "platform is closed");
            return run(() => execute(id, input, options));
        },
        dispatch: async (document, options) => {
            return run(async () => {
                const request = decodeOperationRequest(document);
                let input;
                try {
                    const inputCodec = options.codecs.resolve(request.inputCodec);
                    const outputCodec = options.codecs.resolve(request.outputCodec);
                    if (!inputCodec || !outputCodec || [inputCodec, outputCodec].some(codec => typeof codec.decode !== "function" || typeof codec.encode !== "function"))
                        throw new TypeError("wire codec is unavailable");
                    input = inputCodec.decode(request.input);
                }
                catch (error) {
                    return encodeOperationOutcome(request, refusal("InvalidInputWire", error instanceof Error ? error.message : String(error)), options.codecs);
                }
                return encodeOperationOutcome(request, await execute(request.operationId, input, options), options.codecs);
            });
        },
    });
    return platform;
}
