/**
 * The priced product face of the market observation: what the market sells
 * at `GET /v1/x402-market/observation`. The package owns the Base provider
 * pool, EIP-3009 validation, attempts, and provenance; this face owns only
 * request admission and the public response shape, so the market binds it
 * by export and carries no code of its own for it.
 */

export const DEFAULT_WINDOW_BLOCKS = 900;
export const MIN_WINDOW_BLOCKS = 30;
export const MAX_WINDOW_BLOCKS = 10800;

/**
 * Admit one observation request's query: an optional integer `windowBlocks`
 * within the sampled-window bounds.
 * @param {{windowBlocks?: string|number}} [query]
 * @returns {number} The admitted window in blocks.
 * @throws {TypeError} When windowBlocks is not an integer.
 * @throws {RangeError} When windowBlocks is outside the admitted bounds.
 */
export function normalizeWindowRequest(query = {}) {
  if (query.windowBlocks === undefined) return DEFAULT_WINDOW_BLOCKS;
  const windowBlocks = Number(query.windowBlocks);
  if (!Number.isInteger(windowBlocks)) throw new TypeError(`windowBlocks must be an integer, got ${JSON.stringify(query.windowBlocks)}`);
  if (windowBlocks < MIN_WINDOW_BLOCKS || windowBlocks > MAX_WINDOW_BLOCKS) {
    throw new RangeError(`windowBlocks must be between ${MIN_WINDOW_BLOCKS} and ${MAX_WINDOW_BLOCKS}, got ${windowBlocks}`);
  }
  return windowBlocks;
}

/**
 * Observe the sampled Base-USDC EIP-3009 window one paid call asks for.
 * @param {{windowBlocks?: string|number}} [query] The request query.
 * @param {{observeSettlement?: Function, readPool?: object, now?: () => string}} [dependencies] Test seams; the settlement observer defaults to this package's own, loaded on first use.
 * @returns {Promise<object>} The public observation record.
 * @throws {Error} With `status` 502 when the chain measurement fails.
 */
export async function observeX402Market(query = {}, dependencies = {}) {
  const windowBlocks = normalizeWindowRequest(query);
  const observe = dependencies.observeSettlement ?? (await import("./settlement.mjs")).observeSettlement;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const settlement = await observe({ readPool: dependencies.readPool, windowBlocks });
  if (!settlement.ok) {
    const failure = new Error(`settlement measurement failed: ${settlement.reason}`);
    failure.status = 502;
    throw failure;
  }
  return {
    recordType: "561-group.x402-market-observation",
    observedAt: now(),
    chain: { network: "eip155:8453", asset: settlement.asset, rangeObservation: true, provenance: settlement.measured.provenance },
    measured: settlement.measured,
    distinctAuthorizersSampled: settlement.measured.distinctAuthorizers,
    extrapolated: settlement.extrapolated,
    caveat: settlement.caveat,
  };
}
