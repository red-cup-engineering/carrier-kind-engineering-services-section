/** Read-only sampled Base USDC EIP-3009 observation. Authorization events are not proof of
 * x402 use or distinct paying agents; callers receive the measured range and extrapolation separately. */

export const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const AUTHORIZATION_USED_TOPIC = "0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5";
export const BASE_BLOCKS_PER_DAY = 43200;
export const BASE_CHAIN_ID = 8453;

// The Base provider pool is a network effect owner; callers that already inject a
// readPool (every test, and the product face's dependency seam) never need it, so the
// import is deferred here rather than paid at module load for pure-logic callers.
let ethereumEngineeringModulePromise;
function loadEthereumEngineering() {
  ethereumEngineeringModulePromise ??= import("@red-cup-engineering/ethereum-engineering-services-section/public-evm-read");
  return ethereumEngineeringModulePromise;
}
async function baseReadPool() {
  const { BASE_PUBLIC_EVM_CHAIN, BASE_PUBLIC_EVM_PROVIDERS, createPublicEvmReadPool } = await loadEthereumEngineering();
  return createPublicEvmReadPool({ chain: BASE_PUBLIC_EVM_CHAIN, providers: BASE_PUBLIC_EVM_PROVIDERS });
}
async function requireBaseReadPool(readPool) {
  const pool = readPool ?? (await baseReadPool());
  if (pool?.chain?.id !== BASE_CHAIN_ID || typeof pool.readLogs !== "function"
    || typeof pool.requestAtBoundary !== "function") throw new TypeError("readPool must be a Base public EVM read pool");
  return pool;
}
export function authorizerOf(log) {
  const topic = log?.topics?.[1];
  if (log?.removed !== false || log?.topics?.length !== 3 || log.topics[0]?.toLowerCase() !== AUTHORIZATION_USED_TOPIC
    || typeof topic !== "string" || !/^0x0{24}[0-9a-fA-F]{40}$/u.test(topic)
    || typeof log.topics[2] !== "string" || !/^0x[0-9a-fA-F]{64}$/u.test(log.topics[2]) || log.data !== "0x") return null;
  return `0x${topic.slice(26)}`.toLowerCase();
}
export async function measureRange({ readPool, fromBlock, toBlock, asset = BASE_USDC } = {}) {
  if (!Number.isSafeInteger(fromBlock) || !Number.isSafeInteger(toBlock) || fromBlock < 0 || toBlock < fromBlock) {
    throw new RangeError(`settlement: invalid block range ${fromBlock}..${toBlock}`);
  }
  const pool = await requireBaseReadPool(readPool);
  try {
    const result = await pool.readLogs({ filter: { address: asset, topics: [AUTHORIZATION_USED_TOPIC], fromBlock, toBlock } });
    const logs = result.value;
    if (!Array.isArray(logs)) return { ok: false, reason: "public EVM reader returned a non-array log result", fromBlock, toBlock };
    const authorizers = new Set();
    for (let index = 0; index < logs.length; index += 1) {
      const authorizer = authorizerOf(logs[index]);
      if (authorizer == null) return { ok: false, reason: `invalid AuthorizationUsed event at result index ${index}`, fromBlock, toBlock };
      authorizers.add(authorizer);
    }
    return { ok: true, fromBlock, toBlock, blocks: toBlock - fromBlock + 1, authorizations: logs.length,
      distinctAuthorizers: authorizers.size, authorizers: [...authorizers],
      rangeObservation: true, provenance: { chainId: result.boundary.chainId, verificationBoundary: result.boundary,
        providerId: result.provider.id, endpoint: result.provider.url, attempts: result.attempts ?? [], failures: result.failures ?? [] } };
  } catch (error) { return { ok: false, reason: String(error?.message ?? error), fromBlock, toBlock }; }
}
export async function chainTip({ readPool } = {}) {
  const pool = await requireBaseReadPool(readPool);
  try {
    const result = await pool.requestAtBoundary({ operation: ({ boundary }) => boundary });
    return { ok: true, value: Number(result.value.blockNumber), provenance: { chainId: result.value.chainId,
      boundary: result.value, providerId: result.provider.id, endpoint: result.provider.url } };
  } catch (error) { return { ok: false, reason: String(error?.message ?? error) }; }
}
export async function observeSettlement({ readPool, windowBlocks = 900, asset = BASE_USDC, blocksPerDay = BASE_BLOCKS_PER_DAY } = {}) {
  if (!Number.isSafeInteger(windowBlocks) || windowBlocks < 1) throw new RangeError(`settlement: windowBlocks must be a positive safe integer, got ${windowBlocks}`);
  if (!Number.isFinite(blocksPerDay) || blocksPerDay <= 0) throw new RangeError("blocksPerDay must be a positive finite number");
  const pool = await requireBaseReadPool(readPool);
  const tip = await chainTip({ readPool: pool });
  if (!tip.ok) return { ok: false, reason: `could not read chain tip: ${tip.reason}` };
  const toBlock = tip.value;
  const fromBlock = Math.max(0, toBlock - windowBlocks + 1);
  const measured = await measureRange({ readPool: pool, fromBlock, toBlock, asset });
  if (!measured.ok) return { ok: false, reason: measured.reason, fromBlock, toBlock };
  const dayFactor = blocksPerDay / measured.blocks;
  return { ok: true, asset, measured: { fromBlock: measured.fromBlock, toBlock: measured.toBlock,
    blocks: measured.blocks, approximateMinutes: Math.round((measured.blocks * 2) / 60), authorizations: measured.authorizations,
    distinctAuthorizers: measured.distinctAuthorizers, provenance: measured.provenance }, authorizers: measured.authorizers,
  extrapolated: { dayFactor, monthFactor: dayFactor * 30, authorizationsPerDay: Math.round(measured.authorizations * dayFactor),
    authorizationsPer30Days: Math.round(measured.authorizations * dayFactor * 30),
    basis: `a ${measured.blocks}-block sample scaled by ${dayFactor.toFixed(1)} to a day; a burst inside the window is scaled with it` },
  caveat: "EIP-3009 AuthorizationUsed is the settlement primitive x402's exact scheme uses, not a marker of the protocol. This sampled range is not a count of x402 uses or agents; the displayed daily and monthly values are arithmetic extrapolations, not established bounds for those periods." };
}
/** Compare catalog calls with a non-equivalent sample-derived authorization projection. */
export function catalogAuthorizationProjection({ catalogCalls, sampleDerivedAuthorizationProjection }) {
  if (!Number.isFinite(catalogCalls) || catalogCalls < 0) throw new RangeError("catalogCalls must be a non-negative number");
  if (!Number.isFinite(sampleDerivedAuthorizationProjection) || sampleDerivedAuthorizationProjection < 0) throw new RangeError("sampleDerivedAuthorizationProjection must be a non-negative number");
  if (sampleDerivedAuthorizationProjection === 0) return { available: false, reason: "sample-derived authorization projection is zero; no comparison ratio is available", catalogCalls, sampleDerivedAuthorizationProjection };
  return { available: true, catalogCalls, sampleDerivedAuthorizationProjection,
    catalogCallsPerAuthorizationProjection: catalogCalls / sampleDerivedAuthorizationProjection,
    note: "Catalog calls and EIP-3009 sampled authorization activity are different units. The latter is a sample-derived projection, not protocol share or an understatement factor." };
}
