import { getAddress } from "ethers";
import { createPublicClient, custom, parseAbi } from "viem";
import { base } from "viem/chains";

import { BASE_PUBLIC_EVM_CHAIN, BASE_PUBLIC_EVM_PROVIDERS,
  createPublicEvmReadPool } from "./public-evm-read.mjs";

const PROFILE = "org.emsenn.evm.moonwell-account-health.v1";
const MARKET_EMISSION_CONFIG_PROFILE = "org.emsenn.evm.moonwell-market-emission-config.v1";
const BASE_CAIP2 = "eip155:8453";
const WAD = 10n ** 18n;
const VALUE_SCALE = WAD;
const MAX_MARKETS = 64;
const MAX_REWARD_CONFIGS = 64;
const MAX_SCENARIOS = 64;
const MAX_HORIZON_SECONDS = 365n * 24n * 60n * 60n;
const SUPPORTED_BASE_RPC_URLS = new Set(BASE_PUBLIC_EVM_PROVIDERS.map(({ url }) => url));

const comptrollerReadAbi = parseAbi([
  "function getAssetsIn(address) view returns (address[])",
  "function getAccountLiquidity(address) view returns (uint256,uint256,uint256)",
  "function oracle() view returns (address)",
  "function markets(address) view returns (bool,uint256)",
]);
const marketReadAbi = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function underlying() view returns (address)",
  "function getAccountSnapshot(address) view returns (uint256,uint256,uint256,uint256)",
  "function balanceOfUnderlying(address) returns (uint256)",
  "function borrowBalanceCurrent(address) returns (uint256)",
  "function borrowRatePerTimestamp() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function borrowBalanceStored(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function totalBorrows() view returns (uint256)",
]);
const erc20ReadAbi = parseAbi(["function decimals() view returns (uint8)"]);
const oracleReadAbi = parseAbi(["function getUnderlyingPrice(address) view returns (uint256)"]);
const rewardDistributorReadAbi = parseAbi([
  "function getAllMarketConfigs(address) view returns ((address owner,address emissionToken,uint256 endTime,uint224 supplyGlobalIndex,uint32 supplyGlobalTimestamp,uint224 borrowGlobalIndex,uint32 borrowGlobalTimestamp,uint256 supplyEmissionsPerSec,uint256 borrowEmissionsPerSec)[])",
]);

function uint(name, value) {
  if (typeof value === "bigint" && value >= 0n) return value;
  if (typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)) return BigInt(value);
  throw new Error(`${name} must be an unsigned decimal integer string or bigint`);
}

function boundedInteger(name, value, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

function normalizedAddress(name, value) {
  try { return getAddress(value).toLowerCase(); }
  catch { throw new Error(`${name} must be an EVM address`); }
}

function mulDivFloor(a, b, denominator) {
  if (denominator <= 0n) throw new Error("division denominator must be positive");
  return (a * b) / denominator;
}

function mulDivCeil(a, b, denominator) {
  if (denominator <= 0n) throw new Error("division denominator must be positive");
  const product = a * b;
  return product === 0n ? 0n : ((product - 1n) / denominator) + 1n;
}

function powWadCeil(base, exponent) {
  let result = WAD;
  let factor = base;
  let remaining = exponent;
  while (remaining > 0n) {
    if (remaining & 1n) result = mulDivCeil(result, factor, WAD);
    remaining >>= 1n;
    if (remaining > 0n) factor = mulDivCeil(factor, factor, WAD);
  }
  return result;
}

function normalizeMarket(raw, index) {
  const market = normalizedAddress(`markets[${index}].market`, raw?.market);
  const underlying = normalizedAddress(`markets[${index}].underlying`, raw?.underlying);
  const underlyingDecimals = boundedInteger(`markets[${index}].underlyingDecimals`, raw?.underlyingDecimals, 0, 36);
  const suppliedUnderlyingRaw = uint(`markets[${index}].suppliedUnderlyingRaw`, raw?.suppliedUnderlyingRaw);
  const borrowedUnderlyingRaw = uint(`markets[${index}].borrowedUnderlyingRaw`, raw?.borrowedUnderlyingRaw);
  const underlyingPriceMantissa = uint(`markets[${index}].underlyingPriceMantissa`, raw?.underlyingPriceMantissa);
  const collateralFactorMantissa = uint(`markets[${index}].collateralFactorMantissa`, raw?.collateralFactorMantissa);
  const borrowRatePerTimestampMantissa = uint(`markets[${index}].borrowRatePerTimestampMantissa`, raw?.borrowRatePerTimestampMantissa);
  if (underlyingPriceMantissa === 0n) throw new Error(`markets[${index}] has a zero oracle price`);
  if (collateralFactorMantissa > WAD) throw new Error(`markets[${index}] collateral factor exceeds 1e18`);
  if (borrowRatePerTimestampMantissa > WAD) throw new Error(`markets[${index}] borrow rate exceeds 1e18 per timestamp`);
  return { market, underlying, symbol: String(raw?.symbol ?? "").slice(0, 64), underlyingDecimals,
    suppliedUnderlyingRaw, borrowedUnderlyingRaw, underlyingPriceMantissa, collateralFactorMantissa,
    borrowRatePerTimestampMantissa, entered: raw?.entered !== false };
}

function normalizeMultiplierMap(name, value, marketSet) {
  const output = new Map();
  for (const [market, multiplierValue] of Object.entries(value ?? {})) {
    const key = normalizedAddress(`${name} market`, market);
    if (!marketSet.has(key)) throw new Error(`${name} names an unknown market ${key}`);
    const multiplier = uint(`${name}.${key}`, multiplierValue);
    if (multiplier > 10n * WAD) throw new Error(`${name}.${key} exceeds the bounded 10x multiplier`);
    output.set(key, multiplier);
  }
  return output;
}

function collateralValue(market, suppliedRaw = market.suppliedUnderlyingRaw, priceMultiplier = WAD) {
  if (!market.entered) return 0n;
  return (suppliedRaw * market.underlyingPriceMantissa * priceMultiplier * market.collateralFactorMantissa)
    / (WAD * WAD * WAD);
}

function debtValue(market, borrowedRaw = market.borrowedUnderlyingRaw, priceMultiplier = WAD) {
  const numerator = borrowedRaw * market.underlyingPriceMantissa * priceMultiplier;
  const denominator = WAD * WAD;
  return numerator === 0n ? 0n : ((numerator - 1n) / denominator) + 1n;
}

function state(markets, targetHealthFactorMantissa, collateralMultipliers = new Map(), debtMultipliers = new Map()) {
  const rows = markets.map((market) => {
    const collateralPriceMultiplierMantissa = collateralMultipliers.get(market.market) ?? WAD;
    const debtPriceMultiplierMantissa = debtMultipliers.get(market.market) ?? WAD;
    const adjustedCollateralValueMantissa = collateralValue(market, market.suppliedUnderlyingRaw,
      collateralPriceMultiplierMantissa);
    const debtValueMantissa = debtValue(market, market.borrowedUnderlyingRaw, debtPriceMultiplierMantissa);
    return { market: market.market, symbol: market.symbol,
      suppliedUnderlyingRaw: market.suppliedUnderlyingRaw.toString(),
      borrowedUnderlyingRaw: market.borrowedUnderlyingRaw.toString(),
      collateralPriceMultiplierMantissa: collateralPriceMultiplierMantissa.toString(),
      debtPriceMultiplierMantissa: debtPriceMultiplierMantissa.toString(),
      adjustedCollateralValueMantissa: adjustedCollateralValueMantissa.toString(),
      debtValueMantissa: debtValueMantissa.toString() };
  });
  const collateral = rows.reduce((sum, row) => sum + BigInt(row.adjustedCollateralValueMantissa), 0n);
  const debt = rows.reduce((sum, row) => sum + BigInt(row.debtValueMantissa), 0n);
  const liquidity = collateral > debt ? collateral - debt : 0n;
  const shortfall = debt > collateral ? debt - collateral : 0n;
  const healthFactorMantissa = debt === 0n ? null : mulDivFloor(collateral, WAD, debt);
  const targetCollateral = debt === 0n ? 0n : mulDivCeil(debt, targetHealthFactorMantissa, WAD);
  const maximumDebtAtTarget = targetHealthFactorMantissa === 0n
    ? debt : mulDivFloor(collateral, WAD, targetHealthFactorMantissa);
  const repaymentValue = debt > maximumDebtAtTarget ? debt - maximumDebtAtTarget : 0n;
  return { collateralValueMantissa: collateral.toString(), debtValueMantissa: debt.toString(),
    liquidityMantissa: liquidity.toString(), shortfallMantissa: shortfall.toString(),
    healthFactor: debt === 0n ? { kind: "unbounded", numerator: collateral.toString(), denominator: "0" }
      : { kind: "finite", numerator: collateral.toString(), denominator: debt.toString(),
        mantissa: healthFactorMantissa.toString() },
    targetHealthFactorMantissa: targetHealthFactorMantissa.toString(),
    targetSatisfied: debt === 0n || healthFactorMantissa >= targetHealthFactorMantissa,
    targetCollateralValueMantissa: targetCollateral.toString(),
    repaymentValueToTargetMantissa: repaymentValue.toString(), markets: rows };
}

function maxWithdrawalRaw(markets, marketIndex, target, collateralMultipliers, debtMultipliers) {
  const current = state(markets, target, collateralMultipliers, debtMultipliers);
  if (!current.targetSatisfied) return 0n;
  const market = markets[marketIndex];
  let low = 0n;
  let high = market.suppliedUnderlyingRaw;
  while (low < high) {
    const mid = (low + high + 1n) / 2n;
    const changed = markets.map((item, index) => index === marketIndex
      ? { ...item, suppliedUnderlyingRaw: item.suppliedUnderlyingRaw - mid } : item);
    if (state(changed, target, collateralMultipliers, debtMultipliers).targetSatisfied) low = mid;
    else high = mid - 1n;
  }
  return low;
}

function minAdditionalCollateralRaw(markets, marketIndex, target, collateralMultipliers, debtMultipliers) {
  if (state(markets, target, collateralMultipliers, debtMultipliers).targetSatisfied) return 0n;
  const market = markets[marketIndex];
  if (!market.entered || market.collateralFactorMantissa === 0n) return null;
  let high = 1n;
  const satisfied = (addition) => {
    const changed = markets.map((item, index) => index === marketIndex
      ? { ...item, suppliedUnderlyingRaw: item.suppliedUnderlyingRaw + addition } : item);
    return state(changed, target, collateralMultipliers, debtMultipliers).targetSatisfied;
  };
  while (!satisfied(high)) {
    high *= 2n;
    if (high > 1n << 255n) throw new Error("additional collateral search exceeded uint256 bounds");
  }
  let low = 0n;
  while (low < high) {
    const mid = (low + high) / 2n;
    if (satisfied(mid)) high = mid;
    else low = mid + 1n;
  }
  return low;
}

function minRepaymentRaw(markets, marketIndex, target, collateralMultipliers, debtMultipliers) {
  const current = state(markets, target, collateralMultipliers, debtMultipliers);
  if (current.targetSatisfied) return { raw: 0n, sufficient: true };
  const market = markets[marketIndex];
  if (market.borrowedUnderlyingRaw === 0n) return { raw: 0n, sufficient: false };
  const satisfied = (repayment) => {
    const changed = markets.map((item, index) => index === marketIndex
      ? { ...item, borrowedUnderlyingRaw: item.borrowedUnderlyingRaw - repayment } : item);
    return state(changed, target, collateralMultipliers, debtMultipliers).targetSatisfied;
  };
  if (!satisfied(market.borrowedUnderlyingRaw)) {
    return { raw: market.borrowedUnderlyingRaw, sufficient: false };
  }
  let low = 0n;
  let high = market.borrowedUnderlyingRaw;
  while (low < high) {
    const mid = (low + high) / 2n;
    if (satisfied(mid)) high = mid;
    else low = mid + 1n;
  }
  return { raw: low, sufficient: true };
}

function minCurrentRepaymentRaw(currentMarkets, marketIndex, target, scenario) {
  const currentBorrow = currentMarkets[marketIndex].borrowedUnderlyingRaw;
  if (state(scenario.markets, target, scenario.collateralMultipliers, scenario.debtMultipliers).targetSatisfied) {
    return { raw: 0n, sufficient: true };
  }
  if (currentBorrow === 0n) return { raw: 0n, sufficient: false };
  const factor = scenario.debtAccrualFactors[marketIndex];
  const satisfied = (currentRepayment) => {
    const futureReduction = mulDivFloor(currentRepayment, factor, WAD);
    const changed = scenario.markets.map((item, index) => index === marketIndex
      ? { ...item, borrowedUnderlyingRaw: item.borrowedUnderlyingRaw > futureReduction
        ? item.borrowedUnderlyingRaw - futureReduction : 0n } : item);
    return state(changed, target, scenario.collateralMultipliers, scenario.debtMultipliers).targetSatisfied;
  };
  if (!satisfied(currentBorrow)) return { raw: currentBorrow, sufficient: false };
  let low = 0n;
  let high = currentBorrow;
  while (low < high) {
    const mid = (low + high) / 2n;
    if (satisfied(mid)) high = mid;
    else low = mid + 1n;
  }
  return { raw: low, sufficient: true };
}

function accrueDebt(markets, seconds) {
  return markets.map((market) => {
    const factor = powWadCeil(WAD + market.borrowRatePerTimestampMantissa, seconds);
    return { ...market, borrowedUnderlyingRaw: mulDivCeil(market.borrowedUnderlyingRaw, factor, WAD) };
  });
}

export function evaluateMoonwellAccountHealth(input) {
  if (!Array.isArray(input?.markets) || input.markets.length === 0 || input.markets.length > MAX_MARKETS) {
    throw new Error(`markets must contain 1 through ${MAX_MARKETS} entries`);
  }
  const markets = input.markets.map(normalizeMarket);
  if (new Set(markets.map((market) => market.market)).size !== markets.length) throw new Error("market addresses must be unique");
  const marketSet = new Set(markets.map((market) => market.market));
  const target = uint("targetHealthFactorMantissa", input.targetHealthFactorMantissa);
  if (target < WAD || target > 10n * WAD) throw new Error("target health factor must be from 1e18 through 10e18");
  const current = state(markets, target);
  const rawStresses = input.stresses ?? [];
  if (!Array.isArray(rawStresses) || rawStresses.length > MAX_SCENARIOS) throw new Error(`stresses may contain at most ${MAX_SCENARIOS} entries`);
  const stressIds = new Set();
  const stressDescriptors = rawStresses.map((stress, index) => {
    const id = String(stress?.id ?? "");
    if (!/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(id) || stressIds.has(id)) throw new Error(`stresses[${index}].id must be unique and bounded`);
    stressIds.add(id);
    const collateral = normalizeMultiplierMap(`stresses[${index}].collateralPriceMultipliers`, stress.collateralPriceMultipliers, marketSet);
    const debt = normalizeMultiplierMap(`stresses[${index}].debtPriceMultipliers`, stress.debtPriceMultipliers, marketSet);
    return { id, markets, collateralMultipliers: collateral, debtMultipliers: debt,
      debtAccrualFactors: markets.map(() => WAD) };
  });
  const stresses = stressDescriptors.map((scenario) => ({ id: scenario.id,
    ...state(scenario.markets, target, scenario.collateralMultipliers, scenario.debtMultipliers) }));
  const rawHorizons = input.horizonsSeconds ?? [];
  if (!Array.isArray(rawHorizons) || rawHorizons.length > MAX_SCENARIOS) throw new Error(`horizonsSeconds may contain at most ${MAX_SCENARIOS} entries`);
  const horizonDescriptors = rawHorizons.map((value, index) => {
    const seconds = uint(`horizonsSeconds[${index}]`, value);
    if (seconds > MAX_HORIZON_SECONDS) throw new Error("interest horizon exceeds one year");
    return { id: `interest-${seconds}s`, seconds, markets: accrueDebt(markets, seconds),
      collateralMultipliers: new Map(), debtMultipliers: new Map(),
      debtAccrualFactors: markets.map((market) => powWadCeil(WAD + market.borrowRatePerTimestampMantissa, seconds)) };
  });
  const horizons = horizonDescriptors.map((scenario) => ({ seconds: scenario.seconds.toString(),
    supplyInterestAssumption: "zero-conservative", debtAccrualAssumption: "per-timestamp-compound-ceiling",
    ...state(scenario.markets, target) }));
  const scenarios = [{ id: "current", markets, collateralMultipliers: new Map(), debtMultipliers: new Map(),
    debtAccrualFactors: markets.map(() => WAD) }, ...stressDescriptors, ...horizonDescriptors];
  const withdrawalLimits = markets.map((market, index) => {
    const values = scenarios.map((scenario) => ({ id: scenario.id, raw: maxWithdrawalRaw(scenario.markets, index,
      target, scenario.collateralMultipliers, scenario.debtMultipliers) }));
    const guarded = values.reduce((minimum, item) => item.raw < minimum ? item.raw : minimum, values[0].raw);
    return { market: market.market, symbol: market.symbol,
      currentMaximumUnderlyingRaw: values[0].raw.toString(), maximumUnderlyingRaw: guarded.toString(),
      bindingScenarios: values.filter((item) => item.raw === guarded).map((item) => item.id) };
  });
  const collateralAdditions = markets.map((market, index) => {
    const values = scenarios.map((scenario) => ({ id: scenario.id, raw: minAdditionalCollateralRaw(scenario.markets,
      index, target, scenario.collateralMultipliers, scenario.debtMultipliers) }));
    const impossible = values.some((item) => item.raw == null);
    const guarded = impossible ? null : values.reduce((maximum, item) => item.raw > maximum ? item.raw : maximum, 0n);
    return { market: market.market, symbol: market.symbol,
      currentMinimumUnderlyingRaw: values[0].raw?.toString() ?? null,
      minimumUnderlyingRaw: guarded?.toString() ?? null,
      bindingScenarios: guarded == null ? values.filter((item) => item.raw == null).map((item) => item.id)
        : values.filter((item) => item.raw === guarded).map((item) => item.id) };
  });
  const repaymentOptions = markets.filter((market) => market.borrowedUnderlyingRaw > 0n).map((market) => {
    const index = markets.indexOf(market);
    const currentOption = minRepaymentRaw(markets, index, target, new Map(), new Map());
    const values = scenarios.map((scenario) => ({ id: scenario.id,
      ...minCurrentRepaymentRaw(markets, index, target, scenario) }));
    const sufficient = values.every((item) => item.sufficient);
    const guarded = values.reduce((maximum, item) => item.raw > maximum ? item.raw : maximum, 0n);
    return { market: market.market, symbol: market.symbol,
      currentMinimumUnderlyingRaw: currentOption.raw.toString(), minimumUnderlyingRaw: guarded.toString(),
      sufficientAlone: sufficient, bindingScenarios: values.filter((item) => item.raw === guarded).map((item) => item.id) };
  });
  const allGuardStates = [current, ...stresses, ...horizons];
  const guardSatisfied = allGuardStates.every((item) => item.targetSatisfied);
  return { profile: PROFILE, valueScale: VALUE_SCALE.toString(), roundingPolicy: {
    collateral: "floor", debt: "ceiling", futureDebt: "per-timestamp-compound-ceiling",
    futureSupplyInterest: "ignored" }, current, withdrawalLimits, collateralAdditions, repaymentOptions,
    stresses, horizons, guard: { targetHealthFactorMantissa: target.toString(),
      withdrawalOrLeverageExpansionAdmitted: guardSatisfied,
      remedyRequired: !guardSatisfied, currentRemedyRequired: !current.targetSatisfied,
      boundedScenarioIds: scenarios.map((scenario) => scenario.id),
      prohibitedEffects: ["credential-read", "transaction-assembly", "sign", "broadcast", "asset-movement"] } };
}

function validateRpcUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("rpcUrl must be credential-free HTTPS without query or fragment");
  }
  if (!SUPPORTED_BASE_RPC_URLS.has(url.href)) {
    throw new Error("rpcUrl must be an allowlisted credential-free public Base endpoint");
  }
  return url.href;
}

function parseAccount(value) {
  const match = /^eip155:8453:(0x[0-9a-fA-F]{40})$/.exec(value ?? "");
  if (!match) throw new Error("account must be a Base CAIP-10 account");
  const address = normalizedAddress("account", match[1]);
  return { address, caip10: `${BASE_CAIP2}:${address}` };
}

function moonwellProviderUrls(request) {
  const values = request?.rpcUrls ?? (request?.rpcUrl == null
    ? BASE_PUBLIC_EVM_PROVIDERS.map(({ url }) => url) : [request.rpcUrl]);
  if (!Array.isArray(values) || values.length === 0) throw new Error("rpcUrls must name at least one public Base endpoint");
  return values.map(validateRpcUrl);
}

function moonwellBoundary(request) {
  if (request?.snapshotBlock == null) return undefined;
  return { chainId: 8453, blockNumber: uint("snapshotBlock", request.snapshotBlock),
    blockHash: request.snapshotBlockHash };
}

function moonwellReadPool(request, dependencies) {
  const providers = moonwellProviderUrls(request).map((url, index) => ({ id: `moonwell-public-${index + 1}`, url }));
  if (dependencies.readPool != null) return dependencies.readPool;
  const createClient = dependencies.rpc == null ? undefined : ({ provider }) => createPublicClient({ chain: base,
    transport: custom({ request: ({ method, params }) => dependencies.rpc(provider.url, method, params ?? []) }) });
  return createPublicEvmReadPool({ chain: BASE_PUBLIC_EVM_CHAIN, providers,
    ...(dependencies.readPoolOptions ?? {}), ...(createClient == null ? {} : { createClient }) });
}

function readContract(address, abi, functionName, args = []) {
  return { address, abi, functionName, args };
}

function accountRewardRate(emissionsPerSecond, accountAmount, marketTotal) {
  return marketTotal === 0n ? 0n : mulDivFloor(emissionsPerSecond, accountAmount, marketTotal);
}

export async function observeMoonwellMarketEmissionConfigs(request, dependencies = {}) {
  if (request?.profile !== MARKET_EMISSION_CONFIG_PROFILE) {
    throw new Error(`request profile must be ${MARKET_EMISSION_CONFIG_PROFILE}`);
  }
  const account = parseAccount(request.account);
  const distributor = normalizedAddress("distributor", request.distributor);
  const market = normalizedAddress("market", request.market);
  const readPool = moonwellReadPool(request, dependencies);
  const read = await readPool.requestAtBoundary({ boundary: moonwellBoundary(request), operation: async ({ readContracts }) => {
    const [rawConfigs, totalSupply, totalBorrows, accountSupply, accountBorrow] = await readContracts({ contracts: [
      readContract(distributor, rewardDistributorReadAbi, "getAllMarketConfigs", [market]),
      readContract(market, marketReadAbi, "totalSupply"),
      readContract(market, marketReadAbi, "totalBorrows"),
      readContract(market, marketReadAbi, "balanceOf", [account.address]),
      readContract(market, marketReadAbi, "borrowBalanceStored", [account.address]),
    ] });
    return { rawConfigs, totalSupply, totalBorrows, accountSupply, accountBorrow };
  } });
  if (read.boundary.blockTimestamp == null) throw new Error("selected block boundary did not include a timestamp");
  const timestamp = BigInt(read.boundary.blockTimestamp);
  const { rawConfigs, totalSupply, totalBorrows, accountSupply, accountBorrow } = read.value;
  if (rawConfigs.length > MAX_REWARD_CONFIGS) {
    throw new Error(`market reward configs exceed the bounded maximum of ${MAX_REWARD_CONFIGS}`);
  }
  const configs = rawConfigs.map((config, index) => {
    const field = (name, position) => config[name] ?? config[position];
    const endTime = field("endTime", 2);
    const active = timestamp < endTime;
    const configuredSupply = field("supplyEmissionsPerSec", 7);
    const configuredBorrow = field("borrowEmissionsPerSec", 8);
    const supplyEmissionsPerSecond = active ? configuredSupply : 0n;
    const borrowEmissionsPerSecond = active ? configuredBorrow : 0n;
    return {
      index,
      owner: normalizedAddress(`configs[${index}].owner`, field("owner", 0)),
      emissionToken: normalizedAddress(`configs[${index}].emissionToken`, field("emissionToken", 1)),
      endTime: endTime.toString(),
      supplyGlobalIndex: field("supplyGlobalIndex", 3).toString(),
      supplyGlobalTimestamp: field("supplyGlobalTimestamp", 4).toString(),
      borrowGlobalIndex: field("borrowGlobalIndex", 5).toString(),
      borrowGlobalTimestamp: field("borrowGlobalTimestamp", 6).toString(),
      configuredSupplyEmissionsPerSecondRaw: configuredSupply.toString(),
      configuredBorrowEmissionsPerSecondRaw: configuredBorrow.toString(),
      active,
      effectiveSupplyEmissionsPerSecondRaw: supplyEmissionsPerSecond.toString(),
      effectiveBorrowEmissionsPerSecondRaw: borrowEmissionsPerSecond.toString(),
      accountSupplyRewardPerSecondRaw: accountRewardRate(supplyEmissionsPerSecond, accountSupply, totalSupply).toString(),
      accountBorrowRewardPerSecondRaw: accountRewardRate(borrowEmissionsPerSecond, accountBorrow, totalBorrows).toString(),
    };
  });
  return {
    profile: MARKET_EMISSION_CONFIG_PROFILE,
    observationOnly: true,
    caip2: BASE_CAIP2,
    account: account.caip10,
    snapshotBlock: read.boundary.blockNumber,
    snapshotBlockHash: read.boundary.blockHash,
    snapshotTimestamp: read.boundary.blockTimestamp,
    distributor,
    market,
    marketTotals: { mTokenSupplyRaw: totalSupply.toString(), borrowedUnderlyingRaw: totalBorrows.toString() },
    accountPosition: { mTokenBalanceRaw: accountSupply.toString(), borrowedUnderlyingRaw: accountBorrow.toString() },
    configs,
    readProvider: read.provider, readAttempts: read.attempts, readFailures: read.failures, rpcCallCount: read.callCount,
    signerMaterialAccepted: false,
    credentialAccess: false,
    transactionAssembly: false,
    signing: false,
    broadcast: false,
    chainMutation: false,
    limits: ["fixed-block-public-rpc-observation", "integer-floor-account-reward-allocation",
      "emissions-capped-at-config-end-time", "no-transaction-authority"],
  };
}

export async function observeMoonwellAccountHealth(request, dependencies = {}) {
  if (request?.profile !== PROFILE) throw new Error(`request profile must be ${PROFILE}`);
  const account = parseAccount(request.account);
  const comptroller = normalizedAddress("comptroller", request.comptroller);
  const readPool = moonwellReadPool(request, dependencies);
  const read = await readPool.requestAtBoundary({ boundary: moonwellBoundary(request), operation: async ({ readContracts }) => {
    const [assetsResult, oracleResult, protocolLiquidityResult] = await readContracts({ contracts: [
      readContract(comptroller, comptrollerReadAbi, "getAssetsIn", [account.address]),
      readContract(comptroller, comptrollerReadAbi, "oracle"),
      readContract(comptroller, comptrollerReadAbi, "getAccountLiquidity", [account.address]),
    ] });
    if (protocolLiquidityResult[0] !== 0n) throw new Error(`Moonwell account liquidity error ${protocolLiquidityResult[0]}`);
    const assets = assetsResult.map((market) => normalizedAddress("entered market", market));
    if (assets.length === 0) return { oracle: normalizedAddress("oracle", oracleResult),
      protocolLiquidityResult, markets: [], noEnteredMarkets: true };
    if (assets.length > MAX_MARKETS) throw new Error(`entered markets exceed the bounded maximum of ${MAX_MARKETS}`);
    const oracle = normalizedAddress("oracle", oracleResult);
    const marketContracts = assets.flatMap((market) => [
      readContract(market, marketReadAbi, "symbol"),
      readContract(market, marketReadAbi, "decimals"),
      readContract(market, marketReadAbi, "underlying"),
      readContract(market, marketReadAbi, "getAccountSnapshot", [account.address]),
      readContract(comptroller, comptrollerReadAbi, "markets", [market]),
      readContract(oracle, oracleReadAbi, "getUnderlyingPrice", [market]),
      readContract(market, marketReadAbi, "borrowRatePerTimestamp"),
      readContract(market, marketReadAbi, "balanceOfUnderlying", [account.address]),
      readContract(market, marketReadAbi, "borrowBalanceCurrent", [account.address]),
    ]);
    const marketResults = await readContracts({ contracts: marketContracts });
    const underlyingAddresses = assets.map((_market, index) => normalizedAddress("underlying", marketResults[(index * 9) + 2]));
    const underlyingDecimals = await readContracts({ contracts: underlyingAddresses
      .map((underlying) => readContract(underlying, erc20ReadAbi, "decimals")) });
    const markets = assets.map((market, index) => {
      const offset = index * 9;
      const snapshot = marketResults[offset + 3];
      const marketConfiguration = marketResults[offset + 4];
      if (snapshot[0] !== 0n) throw new Error(`Moonwell account snapshot error ${snapshot[0]} for ${market}`);
      if (marketConfiguration[0] !== true) throw new Error(`entered Moonwell market is not listed: ${market}`);
      return { market, underlying: underlyingAddresses[index], symbol: String(marketResults[offset]).slice(0, 64),
        marketDecimals: Number(marketResults[offset + 1]), underlyingDecimals: Number(underlyingDecimals[index]), entered: true,
        suppliedUnderlyingRaw: marketResults[offset + 7].toString(), borrowedUnderlyingRaw: marketResults[offset + 8].toString(),
        storedMTokenBalanceRaw: snapshot[1].toString(), storedBorrowBalanceRaw: snapshot[2].toString(),
        storedExchangeRateMantissa: snapshot[3].toString(), underlyingPriceMantissa: marketResults[offset + 5].toString(),
        collateralFactorMantissa: marketConfiguration[1].toString(),
        borrowRatePerTimestampMantissa: marketResults[offset + 6].toString() };
    });
    return { oracle, protocolLiquidityResult, markets, noEnteredMarkets: false };
  } });
  if (read.boundary.blockTimestamp == null) throw new Error("selected block boundary did not include a timestamp");
  const { oracle, protocolLiquidityResult, markets, noEnteredMarkets } = read.value;
  const observed = { profile: PROFILE, observationOnly: true, caip2: BASE_CAIP2, account: account.caip10,
    snapshotBlock: read.boundary.blockNumber, snapshotBlockHash: read.boundary.blockHash,
    snapshotTimestamp: read.boundary.blockTimestamp, comptroller, oracle,
    protocolAccountLiquidity: { error: "0", liquidityMantissa: protocolLiquidityResult[1].toString(),
      shortfallMantissa: protocolLiquidityResult[2].toString() }, markets,
    readProvider: read.provider, readAttempts: read.attempts, readFailures: read.failures, rpcCallCount: read.callCount,
    signerMaterialAccepted: false, credentialAccess: false, transactionAssembly: false,
    signing: false, broadcast: false, chainMutation: false,
    limits: ["fixed-block-public-rpc-observation", "oracle-values-are-protocol-inputs-not-independent-prices",
      "future-supply-interest-ignored", "no-transaction-authority", "not-a-liquidation-warranty"] };
  if (noEnteredMarkets) return { ...observed,
    outcome: { type: "no-entered-markets", factual: true, enteredMarketCount: 0 },
    riskEvaluationPerformed: false };
  const evaluation = evaluateMoonwellAccountHealth({ markets,
    targetHealthFactorMantissa: request.targetHealthFactorMantissa,
    stresses: request.stresses ?? [], horizonsSeconds: request.horizonsSeconds ?? [] });
  return { ...observed, outcome: { type: "account-health-evaluated", factual: false,
    enteredMarketCount: markets.length }, riskEvaluationPerformed: true, evaluation };
}

export const MOONWELL_ACCOUNT_HEALTH_PROFILE = PROFILE;
export const MOONWELL_MARKET_EMISSION_CONFIG_PROFILE = MARKET_EMISSION_CONFIG_PROFILE;
export const MOONWELL_VALUE_SCALE = VALUE_SCALE;
export const moonwellMath = Object.freeze({ mulDivFloor, mulDivCeil, powWadCeil });
