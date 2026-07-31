import { Interface, getAddress } from "ethers";

import { jsonRpc } from "./public-evm-ledger.mjs";

const PROFILE = "org.emsenn.evm.moonwell-account-health.v1";
const BASE_CAIP2 = "eip155:8453";
const WAD = 10n ** 18n;
const VALUE_SCALE = WAD;
const MAX_MARKETS = 64;
const MAX_SCENARIOS = 64;
const MAX_HORIZON_SECONDS = 365n * 24n * 60n * 60n;
const SUPPORTED_BASE_RPC_URLS = new Set([
  "https://mainnet.base.org/",
  "https://base-rpc.publicnode.com/",
]);

const comptrollerInterface = new Interface([
  "function getAssetsIn(address) view returns (address[])",
  "function getAccountLiquidity(address) view returns (uint256,uint256,uint256)",
  "function oracle() view returns (address)",
  "function markets(address) view returns (bool,uint256)",
]);
const marketInterface = new Interface([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function underlying() view returns (address)",
  "function getAccountSnapshot(address) view returns (uint256,uint256,uint256,uint256)",
  "function balanceOfUnderlying(address) returns (uint256)",
  "function borrowBalanceCurrent(address) returns (uint256)",
  "function borrowRatePerTimestamp() view returns (uint256)",
]);
const erc20Interface = new Interface(["function decimals() view returns (uint8)"]);
const oracleInterface = new Interface(["function getUnderlyingPrice(address) view returns (uint256)"]);

function uint(name, value) {
  if (typeof value === "bigint" && value >= 0n) return value;
  if (typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)) return BigInt(value);
  throw new Error(`${name} must be an unsigned decimal integer string or bigint`);
}

function rpcUint(name, value) {
  if (typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value)) return BigInt(value);
  return uint(name, value);
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

async function contractCall(rpc, rpcUrl, to, iface, functionName, args, blockTag) {
  const data = iface.encodeFunctionData(functionName, args);
  const result = await rpc(rpcUrl, "eth_call", [{ to, data }, blockTag]);
  return iface.decodeFunctionResult(functionName, result);
}

function credentialFreePublicRpc() {
  let nextRequestAt = 0;
  return async (...args) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const delay = Math.max(0, nextRequestAt - Date.now());
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      nextRequestAt = Date.now() + 125;
      try { return await jsonRpc(...args); }
      catch (error) {
        if (!/HTTP 429/u.test(String(error?.message ?? error)) || attempt === 4) throw error;
        nextRequestAt = Date.now() + (250 * (2 ** attempt));
      }
    }
    throw new Error("public RPC retry state exhausted");
  };
}

async function observeMarket({ rpc, rpcUrl, blockTag, account, comptroller, oracle, market }) {
  const symbolResult = await contractCall(rpc, rpcUrl, market, marketInterface, "symbol", [], blockTag);
  const marketDecimalsResult = await contractCall(rpc, rpcUrl, market, marketInterface, "decimals", [], blockTag);
  const underlyingResult = await contractCall(rpc, rpcUrl, market, marketInterface, "underlying", [], blockTag);
  const snapshot = await contractCall(rpc, rpcUrl, market, marketInterface, "getAccountSnapshot", [account], blockTag);
  const marketConfiguration = await contractCall(rpc, rpcUrl, comptroller, comptrollerInterface, "markets", [market], blockTag);
  const priceResult = await contractCall(rpc, rpcUrl, oracle, oracleInterface, "getUnderlyingPrice", [market], blockTag);
  const rateResult = await contractCall(rpc, rpcUrl, market, marketInterface, "borrowRatePerTimestamp", [], blockTag);
  const currentSupplyResult = await contractCall(rpc, rpcUrl, market, marketInterface, "balanceOfUnderlying", [account], blockTag);
  const currentBorrowResult = await contractCall(rpc, rpcUrl, market, marketInterface, "borrowBalanceCurrent", [account], blockTag);
  const underlying = normalizedAddress("underlying", underlyingResult[0]);
  const underlyingDecimalsResult = await contractCall(rpc, rpcUrl, underlying, erc20Interface, "decimals", [], blockTag);
  if (snapshot[0] !== 0n) throw new Error(`Moonwell account snapshot error ${snapshot[0]} for ${market}`);
  if (marketConfiguration[0] !== true) throw new Error(`entered Moonwell market is not listed: ${market}`);
  return { market: normalizedAddress("market", market), underlying, symbol: String(symbolResult[0]).slice(0, 64),
    marketDecimals: Number(marketDecimalsResult[0]), underlyingDecimals: Number(underlyingDecimalsResult[0]), entered: true,
    suppliedUnderlyingRaw: currentSupplyResult[0].toString(), borrowedUnderlyingRaw: currentBorrowResult[0].toString(),
    storedMTokenBalanceRaw: snapshot[1].toString(), storedBorrowBalanceRaw: snapshot[2].toString(),
    storedExchangeRateMantissa: snapshot[3].toString(), underlyingPriceMantissa: priceResult[0].toString(),
    collateralFactorMantissa: marketConfiguration[1].toString(), borrowRatePerTimestampMantissa: rateResult[0].toString() };
}

export async function observeMoonwellAccountHealth(request, dependencies = {}) {
  if (request?.profile !== PROFILE) throw new Error(`request profile must be ${PROFILE}`);
  const account = parseAccount(request.account);
  const rpcUrl = validateRpcUrl(request.rpcUrl);
  const comptroller = normalizedAddress("comptroller", request.comptroller);
  const rpc = dependencies.rpc ?? credentialFreePublicRpc();
  const chainId = rpcUint("eth_chainId", await rpc(rpcUrl, "eth_chainId", []));
  if (chainId !== 8453n) throw new Error("rpcUrl did not identify Base chain 8453");
  const blockNumber = request.snapshotBlock == null
    ? rpcUint("eth_blockNumber", await rpc(rpcUrl, "eth_blockNumber", [])) : uint("snapshotBlock", request.snapshotBlock);
  const blockTag = `0x${blockNumber.toString(16)}`;
  const block = await rpc(rpcUrl, "eth_getBlockByNumber", [blockTag, false]);
  if (block == null) throw new Error("snapshot block is unavailable");
  const timestamp = rpcUint("snapshot timestamp", block.timestamp);
  const assetsResult = await contractCall(rpc, rpcUrl, comptroller, comptrollerInterface, "getAssetsIn", [account.address], blockTag);
  const oracleResult = await contractCall(rpc, rpcUrl, comptroller, comptrollerInterface, "oracle", [], blockTag);
  const protocolLiquidityResult = await contractCall(rpc, rpcUrl, comptroller, comptrollerInterface,
    "getAccountLiquidity", [account.address], blockTag);
  if (protocolLiquidityResult[0] !== 0n) throw new Error(`Moonwell account liquidity error ${protocolLiquidityResult[0]}`);
  const assets = assetsResult[0].map((market) => normalizedAddress("entered market", market));
  if (assets.length === 0 || assets.length > MAX_MARKETS) throw new Error(`entered markets must contain 1 through ${MAX_MARKETS} entries`);
  const oracle = normalizedAddress("oracle", oracleResult[0]);
  const markets = [];
  for (const market of assets) {
    markets.push(await observeMarket({ rpc, rpcUrl, blockTag, account: account.address, comptroller, oracle, market }));
  }
  const evaluation = evaluateMoonwellAccountHealth({ markets,
    targetHealthFactorMantissa: request.targetHealthFactorMantissa,
    stresses: request.stresses ?? [], horizonsSeconds: request.horizonsSeconds ?? [] });
  return { profile: PROFILE, observationOnly: true, caip2: BASE_CAIP2, account: account.caip10,
    snapshotBlock: blockNumber.toString(), snapshotTimestamp: timestamp.toString(), comptroller, oracle,
    protocolAccountLiquidity: { error: "0", liquidityMantissa: protocolLiquidityResult[1].toString(),
      shortfallMantissa: protocolLiquidityResult[2].toString() }, markets, evaluation,
    signerMaterialAccepted: false, credentialAccess: false, transactionAssembly: false,
    signing: false, broadcast: false, chainMutation: false,
    limits: ["fixed-block-public-rpc-observation", "oracle-values-are-protocol-inputs-not-independent-prices",
      "future-supply-interest-ignored", "no-transaction-authority", "not-a-liquidation-warranty"] };
}

export const MOONWELL_ACCOUNT_HEALTH_PROFILE = PROFILE;
export const MOONWELL_VALUE_SCALE = VALUE_SCALE;
export const moonwellMath = Object.freeze({ mulDivFloor, mulDivCeil, powWadCeil });
