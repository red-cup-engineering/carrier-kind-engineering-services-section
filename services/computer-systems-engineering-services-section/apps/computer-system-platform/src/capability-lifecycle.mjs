import { serviceLifecycleEvent } from "@red-cup-engineering/node-process-services-section/lifecycle";

/** A provider lifetime without an operation/type registry. */
export function isCapabilityPlatform(value) {
  return typeof value === "object" && value !== null && value.kind === "computer-platform"
    && typeof value.start === "function" && typeof value.acquire === "function";
}

const DEFAULT_START_MS = 10_000;
const DEFAULT_STOP_MS = 10_000;
const DEFAULT_RETRY_MS = 1_000;
const MAX_RETRY_MS = 60_000;

const errorDetail = (error) => ({
  name: error instanceof Error ? error.name : "Error",
  message: error instanceof Error ? error.message : String(error),
});

function deadline(promise, milliseconds, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * Start resolves once every required provider has started. Optional providers
 * continue under supervision in the background and keep the platform degraded
 * until they have started. An enabled(capabilities) predicate is evaluated once,
 * synchronously, in startup order. False leaves the provider disabled and absent;
 * a thrown error or non-boolean result fails startup and releases prior providers.
 */
export function createCapabilityPlatform(specification = {}) {
  const providers = Object.freeze([...(specification.providers ?? [])]);
  if (new Set(providers.map((provider) => provider.name)).size !== providers.length) {
    throw new TypeError("platform capability names must be unique");
  }
  if (providers.some((provider) => typeof provider.name !== "string" || !provider.name.trim())) {
    throw new TypeError("platform capability names must be nonempty");
  }
  if (specification.id !== undefined && (typeof specification.id !== "string" || !specification.id.trim())) {
    throw new TypeError("platform id must be nonempty");
  }
  if ((specification.operations?.length ?? 0) > 0 || (specification.typeSystem?.types?.length ?? 0) > 0) {
    throw new TypeError("operation platforms must be created by @red-cup-engineering/computer-platform");
  }

  const capabilities = {};
  const started = [];
  const records = new Map(providers.map((provider) => [provider.name, {
    name: provider.name,
    optional: provider.optional === true,
    state: "pending",
    attempts: 0,
  }]));
  const retryTimers = new Map();
  const retryTasks = new Set();
  let active = 0;
  const drained = [];
  let starting;
  let closing;
  let closed = false;
  let requiredReady = false;
  let platformState = "starting";

  const snapshot = () => Object.freeze({ ...capabilities });
  const providerStates = () => Object.freeze(Object.fromEntries(
    [...records].map(([name, record]) => [name, Object.freeze({ ...record })]),
  ));
  const status = () => Object.freeze({ state: platformState, providers: providerStates() });
  const emit = async (service, event, ok, detail) => {
    if (typeof specification.onEvent !== "function") return;
    await specification.onEvent(serviceLifecycleEvent({
      service,
      boundary: "process-main",
      event,
      at: new Date().toISOString(),
      ok,
      detail,
      evidence: [specification.id ?? "computer-platform", service],
    }));
  };
  const setPlatformState = async (next) => {
    if (platformState === next) return;
    platformState = next;
    if (next === "ready" || next === "degraded") {
      await emit(specification.id ?? "computer-platform", "ready", true, { phase: "platform", state: next });
    }
  };
  const settledState = () => providers.some((provider) => provider.optional === true
    && !["started", "disabled"].includes(records.get(provider.name).state)) ? "degraded" : "ready";

  async function stopProvider(provider, { cleanup = false } = {}) {
    const record = records.get(provider.name);
    if (record.state !== "started") return;
    const stopMs = provider.stopMs ?? DEFAULT_STOP_MS;
    try {
      await deadline(
        Promise.resolve().then(() => provider.close?.(capabilities[provider.name])),
        stopMs,
        `${provider.name} did not stop within ${stopMs} ms`,
      );
      record.state = "stopped";
      await emit(provider.name, "close", true, { phase: "stop", cleanup });
    } catch (error) {
      record.lastError = errorDetail(error);
      if (error?.message === `${provider.name} did not stop within ${stopMs} ms`) {
        record.state = "abandoned";
        await emit(provider.name, "close", false, { phase: "abandon", stopMs, error: record.lastError });
        return;
      }
      record.state = "stopped";
      await emit(provider.name, "close", false, { phase: "stop", cleanup, error: record.lastError });
      throw error;
    } finally {
      delete capabilities[provider.name];
    }
  }

  async function release({ cleanup = false } = {}) {
    const failures = [];
    for (const provider of started.splice(0).reverse()) {
      try { await stopProvider(provider, { cleanup }); }
      catch (error) { failures.push(error); }
    }
    if (failures.length) throw new AggregateError(failures, "platform capability release failed");
  }

  async function startProvider(provider, phase) {
    const record = records.get(provider.name);
    record.attempts += 1;
    // An optional provider that is still starting is not failed, only not yet known: it has no start
    // deadline unless it names one, and is retried only after its start actually fails. A start
    // cannot be cancelled, so one that misses its deadline has whatever it later returns closed.
    const startMs = provider.startMs ?? (provider.optional === true ? Infinity : DEFAULT_START_MS);
    const late = `${provider.name} did not start within ${startMs} ms`;
    try {
      const starting = Promise.resolve().then(() => provider.start(snapshot()));
      const capability = Number.isFinite(startMs)
        ? await deadline(starting, startMs, late).catch((error) => {
          if (error?.message === late) void starting.then((value) => provider.close?.(value)).catch(() => undefined);
          throw error;
        })
        : await starting;
      if (closed || platformState === "failed") {
        await deadline(
          Promise.resolve().then(() => provider.close?.(capability)),
          provider.stopMs ?? DEFAULT_STOP_MS,
          `${provider.name} did not stop within ${provider.stopMs ?? DEFAULT_STOP_MS} ms`,
        ).catch(() => undefined);
        return false;
      }
      capabilities[provider.name] = capability;
      record.state = "started";
      delete record.lastError;
      started.push(provider);
      await emit(provider.name, "start", true, { phase, attempt: record.attempts });
      return true;
    } catch (error) {
      record.lastError = errorDetail(error);
      await emit(provider.name, "start", false, { phase, attempt: record.attempts, error: record.lastError });
      throw error;
    }
  }

  function supervise(provider) {
    const record = records.get(provider.name);
    const task = (async () => {
      try {
        await startProvider(provider, record.attempts === 0 ? "start" : "retry");
        if (!closed && requiredReady) await setPlatformState(settledState());
      } catch (error) {
        if (closed || platformState === "failed") return;
        record.state = "retrying";
        const retryMs = Math.min(
          (provider.retryMs ?? DEFAULT_RETRY_MS) * (2 ** Math.max(0, record.attempts - 1)),
          provider.retryMaxMs ?? MAX_RETRY_MS,
        );
        await emit(provider.name, "start", false, {
          phase: "retry", attempt: record.attempts, retryMs, error: errorDetail(error),
        });
        if (requiredReady) await setPlatformState("degraded");
        const timer = setTimeout(() => {
          retryTimers.delete(provider.name);
          supervise(provider);
        }, retryMs);
        timer.unref?.();
        retryTimers.set(provider.name, timer);
      }
    })();
    retryTasks.add(task);
    void task.finally(() => retryTasks.delete(task)).catch(() => undefined);
  }

  const start = () => {
    if (closed) return Promise.reject(new Error("platform is closed"));
    return starting ??= (async () => {
      try {
        for (const provider of providers) {
          if (closed) return snapshot();
          if (provider.enabled !== undefined) {
            if (typeof provider.enabled !== "function") throw new TypeError(`${provider.name} enabled must be a predicate`);
            const enabled = provider.enabled(snapshot());
            if (typeof enabled !== "boolean") {
              // Refuse asynchronous predicates without leaving a rejected promise
              // able to interrupt the already-started providers' cleanup.
              void Promise.resolve(enabled).catch(() => undefined);
              throw new TypeError(`${provider.name} enabled must return a boolean synchronously`);
            }
            if (!enabled) {
              records.get(provider.name).state = "disabled";
              continue;
            }
          }
          if (provider.optional === true) {
            supervise(provider);
            continue;
          }
          await startProvider(provider, "start");
        }
      } catch (error) {
        platformState = "failed";
        for (const timer of retryTimers.values()) clearTimeout(timer);
        retryTimers.clear();
        try { await release({ cleanup: true }); }
        catch (cleanup) { throw new AggregateError([error, cleanup], "platform startup failed"); }
        throw error;
      }
      if (closed) return snapshot();
      requiredReady = true;
      await setPlatformState(settledState());
      return snapshot();
    })();
  };
  const acquire = () => {
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
  const close = () => closing ??= (async () => {
    closed = true;
    platformState = "closing";
    for (const timer of retryTimers.values()) clearTimeout(timer);
    retryTimers.clear();
    try { await starting; } catch { /* startup already released providers */ }
    await Promise.allSettled([...retryTasks]);
    if (active > 0) await new Promise((resolve) => drained.push(resolve));
    try { await release(); }
    finally { platformState = "closed"; }
  })();
  return Object.freeze({
    kind: "computer-platform",
    specification: Object.freeze({ ...specification, providers }),
    start,
    close,
    capabilities: snapshot,
    state: () => platformState,
    providerStates,
    status,
    closed: () => closed,
    acquire,
  });
}
