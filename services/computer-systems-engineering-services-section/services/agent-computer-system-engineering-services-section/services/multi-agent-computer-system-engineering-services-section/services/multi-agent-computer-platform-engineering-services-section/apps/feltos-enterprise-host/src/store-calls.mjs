/**
 * The bound on the store calls the host has in flight (feltos-node specification section 8, item 4:
 * "the host bounds the store calls it has in flight to 8"). A call holds at most about 0.3 MiB
 * (store.md section 10), so the store's share of the node's memory is this many calls and no more,
 * however many peers ask at once.
 */
export const STORE_CALLS_IN_FLIGHT = 8;

/**
 * A bound on concurrent store calls. `run(work)` waits for a free slot (callers the host makes
 * itself, such as a pull from a peer), and `tryRun(work)` refuses when none is free (callers the
 * network makes, which are told to come back).
 */
export function storeCallBound(limit = STORE_CALLS_IN_FLIGHT) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError("the store-call bound is a positive integer");
  let active = 0;
  const waiting = [];
  const release = () => {
    active -= 1;
    const next = waiting.shift();
    if (next !== undefined) { active += 1; next(); }
  };
  const acquire = () => {
    if (active < limit) { active += 1; return Promise.resolve(); }
    return new Promise((resolve) => waiting.push(resolve));
  };
  return Object.freeze({
    limit,
    get inFlight() { return active; },
    async run(work) {
      await acquire();
      try { return await work(); } finally { release(); }
    },
    /** Run `work` if a slot is free; otherwise answer `busy()` without waiting. */
    async tryRun(work, busy) {
      if (active >= limit) return busy();
      active += 1;
      try { return await work(); } finally { release(); }
    },
  });
}
