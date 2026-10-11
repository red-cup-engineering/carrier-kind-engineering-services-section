/** Own the local actor independently of optional remote MCP federation. */
export async function startNativeActorService({ open, project } = {}) {
  if (typeof open !== "function") throw new TypeError("native actor service needs its owner factory");
  if (project !== undefined && typeof project !== "function") throw new TypeError("native actor projection must be a function");
  const abort = new AbortController();
  let activityPub;
  let projection;
  let worker;
  let state = "starting";
  let failure;
  let closing;
  // A stopped required queue is a process-supervision event, not merely an HTTP health bit.
  // A pending Promise carries no timer or handle and persists an early stop until the host subscribes.
  let signalFailure;
  const failed = new Promise((resolve) => { signalFailure = resolve; });
  const close = () => closing ??= (async () => {
    state = "stopped";
    const failures = [];
    for (const release of [
      () => projection?.close(),
      async () => { abort.abort(); await worker; },
      () => activityPub?.close?.(),
    ]) {
      try { await release(); }
      catch (error) { failures.push(error); }
    }
    if (failures.length) throw new AggregateError(failures, "native actor release failed");
  })();
  const fail = (error) => {
    if (!abort.signal.aborted && state !== "failed") {
      state = "failed";
      failure = error instanceof Error ? error : new Error(String(error));
      signalFailure(failure);
    }
  };
  try {
    activityPub = await open();
    if (activityPub?.provider === undefined || typeof activityPub.close !== "function"
      || typeof activityPub.provider?.federation?.startQueue !== "function") {
      throw new TypeError("native actor owner did not supply a provider with a queue and release");
    }
    projection = await project?.(activityPub.provider);
    if (project !== undefined && typeof projection?.close !== "function") {
      throw new TypeError("native actor projection did not supply a release");
    }
    const queue = activityPub.provider.federation.startQueue(undefined, { signal: abort.signal });
    if (typeof queue?.then !== "function") throw new TypeError("native actor queue must expose its lifetime");
    state = "running";
    worker = Promise.resolve(queue).then(
      () => fail(new Error("native actor queue exited before shutdown")),
      fail,
    );
    // Do not announce a queue which already failed during startup as running.
    await Promise.resolve();
    if (state === "failed") throw failure;
    return Object.freeze({ activityPub, state: () => state, close, failed });
  } catch (error) {
    try { await close(); }
    catch (cleanup) { throw new AggregateError([error, cleanup], "native actor startup failed"); }
    throw error;
  }
}

/** Optional peers cannot compensate for a missing or stopped required local actor. */
export function nativeActorReadiness(service, required) {
  if (!required) return Object.freeze({ required: false, ok: true, state: "not-required" });
  const state = service?.state?.();
  const ok = state === "running" && service?.activityPub?.provider !== undefined;
  return Object.freeze({ required: true, ok, state: ok ? "running" : "failed" });
}

/** One unexpected stop requests a supervised restart; normal drain never does. */
export function superviseRequiredNativeActor(actor, shutdown, restart) {
  if (actor === undefined || typeof restart !== "function") return undefined;
  if (typeof actor.failed?.then !== "function") throw new TypeError("required actor must expose its failure signal");
  return actor.failed.then(() => {
    if (shutdown?.draining !== true) return restart();
  });
}
