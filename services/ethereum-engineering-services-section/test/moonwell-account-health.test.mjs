import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMoonwellAccountHealth, MOONWELL_ACCOUNT_HEALTH_PROFILE,
  MOONWELL_MARKET_EMISSION_CONFIG_PROFILE, moonwellMath, observeMoonwellAccountHealth,
  observeMoonwellMarketEmissionConfigs } from "../src/moonwell-account-health.mjs";
import { BASE_PUBLIC_EVM_CHAIN, createPublicEvmReadPool } from "../src/public-evm-read.mjs";

const WAD = "1000000000000000000";
const account = "0x224c08a8526751887a83e2711b167f890c6d078d";
const comptroller = "0xfbb21d0380bee3312b33c4353c8936a0f13ef26c";
const oracle = "0xec942be8a8114bfd0396a5052c36027f2ca6a9d0";
const mUsdc = "0xedc817a28e8b93b03976fbd4a3ddbc9f7d176c22";
const usdc = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const distributor = "0x00000000000000000000000000000000000000d1";
const rewardToken = "0x00000000000000000000000000000000000000e1";

function market(overrides = {}) {
  return { market: mUsdc, underlying: usdc, symbol: "mUSDC", underlyingDecimals: 6,
    suppliedUnderlyingRaw: "100000000", borrowedUnderlyingRaw: "0",
    underlyingPriceMantissa: "1000000000000000000000000000000",
    collateralFactorMantissa: "800000000000000000",
    borrowRatePerTimestampMantissa: "0", entered: true, ...overrides };
}

test("uses floor collateral, ceiling debt, and exact rational health", () => {
  const debtMarket = market({ market: "0x00000000000000000000000000000000000000b1", symbol: "mDEBT",
    suppliedUnderlyingRaw: "0", borrowedUnderlyingRaw: "50000000", collateralFactorMantissa: "0" });
  const result = evaluateMoonwellAccountHealth({ markets: [market(), debtMarket],
    targetHealthFactorMantissa: "1250000000000000000" });
  assert.equal(result.current.collateralValueMantissa, "80000000000000000000");
  assert.equal(result.current.debtValueMantissa, "50000000000000000000");
  assert.equal(result.current.healthFactor.mantissa, "1600000000000000000");
  assert.equal(result.guard.withdrawalOrLeverageExpansionAdmitted, true);
  assert.equal(result.withdrawalLimits[0].maximumUnderlyingRaw, "21875000");
});

test("returns minimum raw repayment and collateral-addition remedies", () => {
  const debtMarket = market({ market: "0x00000000000000000000000000000000000000b1", symbol: "mDEBT",
    suppliedUnderlyingRaw: "0", borrowedUnderlyingRaw: "80000000", collateralFactorMantissa: "0" });
  const result = evaluateMoonwellAccountHealth({ markets: [market(), debtMarket],
    targetHealthFactorMantissa: "1250000000000000000" });
  assert.equal(result.current.targetSatisfied, false);
  assert.equal(result.repaymentOptions[0].minimumUnderlyingRaw, "16000000");
  assert.equal(result.repaymentOptions[0].sufficientAlone, true);
  assert.equal(result.collateralAdditions[0].minimumUnderlyingRaw, "25000000");
  assert.equal(result.withdrawalLimits[0].maximumUnderlyingRaw, "0");
  assert.equal(result.guard.remedyRequired, true);
});

test("models wrapper divergence and debt accrual monotonically", () => {
  const debtMarket = market({ market: "0x00000000000000000000000000000000000000b1", symbol: "mDEBT",
    suppliedUnderlyingRaw: "0", borrowedUnderlyingRaw: "50000000", collateralFactorMantissa: "0",
    borrowRatePerTimestampMantissa: "1000000000000" });
  const result = evaluateMoonwellAccountHealth({ markets: [market(), debtMarket],
    targetHealthFactorMantissa: "1500000000000000000", horizonsSeconds: ["1", "100"], stresses: [{ id: "basis-down",
      collateralPriceMultipliers: { [mUsdc]: "900000000000000000" }, debtPriceMultipliers: {} }] });
  assert.ok(BigInt(result.stresses[0].current?.liquidityMantissa ?? result.stresses[0].liquidityMantissa)
    < BigInt(result.current.liquidityMantissa));
  assert.ok(BigInt(result.horizons[1].debtValueMantissa) >= BigInt(result.horizons[0].debtValueMantissa));
  assert.equal(result.guard.withdrawalOrLeverageExpansionAdmitted, false);
  assert.equal(result.guard.remedyRequired, true);
  assert.ok(BigInt(result.withdrawalLimits[0].maximumUnderlyingRaw)
    < BigInt(result.withdrawalLimits[0].currentMaximumUnderlyingRaw));
  assert.ok(BigInt(result.repaymentOptions[0].minimumUnderlyingRaw)
    >= BigInt(result.repaymentOptions[0].currentMinimumUnderlyingRaw));
});

test("zero debt has unbounded health and no repayment requirement", () => {
  const result = evaluateMoonwellAccountHealth({ markets: [market()], targetHealthFactorMantissa: WAD });
  assert.deepEqual(result.current.healthFactor, { kind: "unbounded", numerator: "80000000000000000000", denominator: "0" });
  assert.equal(result.current.repaymentValueToTargetMantissa, "0");
  assert.equal(result.withdrawalLimits[0].maximumUnderlyingRaw, "100000000");
});

test("fixed-point helpers round in the declared conservative direction", () => {
  assert.equal(moonwellMath.mulDivFloor(10n, 10n, 6n), 16n);
  assert.equal(moonwellMath.mulDivCeil(10n, 10n, 6n), 17n);
  assert.equal(moonwellMath.powWadCeil(1000000000000000001n, 2n), 1000000000000000003n);
});

test("decodes market reward configs and computes end-capped account rates at one block", async () => {
  const configs = [
    [account, rewardToken, 300n, 11n, 190n, 12n, 191n, 40n, 20n],
    [account, usdc, 200n, 21n, 180n, 22n, 181n, 400n, 200n],
  ];
  let batchSize;
  const readPool = { async requestAtBoundary({ operation }) {
    const value = await operation({ readContracts: async ({ contracts }) => {
      batchSize = contracts.length;
      return [configs, 1000n, 400n, 250n, 100n];
    } });
    return { boundary: { chainId: 8453, blockNumber: "100", blockHash: `0x${"a".repeat(64)}`,
      blockTimestamp: "200" }, provider: { id: "fixture", url: "https://base-rpc.publicnode.com/" },
    value, attempts: [], failures: [], callCount: 3 };
  } };
  const observation = await observeMoonwellMarketEmissionConfigs({
    profile: MOONWELL_MARKET_EMISSION_CONFIG_PROFILE,
    account: `eip155:8453:${account}`,
    rpcUrl: "https://base-rpc.publicnode.com",
    distributor,
    market: mUsdc,
  }, { readPool });
  assert.equal(observation.snapshotBlock, "100");
  assert.equal(batchSize, 5);
  assert.equal(observation.rpcCallCount, 3);
  assert.deepEqual(observation.marketTotals, { mTokenSupplyRaw: "1000", borrowedUnderlyingRaw: "400" });
  assert.equal(observation.configs[0].effectiveSupplyEmissionsPerSecondRaw, "40");
  assert.equal(observation.configs[0].accountSupplyRewardPerSecondRaw, "10");
  assert.equal(observation.configs[0].accountBorrowRewardPerSecondRaw, "5");
  assert.equal(observation.configs[1].active, false);
  assert.equal(observation.configs[1].configuredSupplyEmissionsPerSecondRaw, "400");
  assert.equal(observation.configs[1].effectiveSupplyEmissionsPerSecondRaw, "0");
  assert.equal(observation.configs[1].accountBorrowRewardPerSecondRaw, "0");
  assert.equal(observation.signerMaterialAccepted, false);
  assert.equal(observation.transactionAssembly, false);
  assert.equal(observation.chainMutation, false);
});

test("refuses duplicate markets, floating point inputs, and unbounded scenarios", () => {
  assert.throws(() => evaluateMoonwellAccountHealth({ markets: [market(), market()], targetHealthFactorMantissa: WAD }), /unique/);
  assert.throws(() => evaluateMoonwellAccountHealth({ markets: [market({ suppliedUnderlyingRaw: 1 })],
    targetHealthFactorMantissa: WAD }), /unsigned decimal/);
  assert.throws(() => evaluateMoonwellAccountHealth({ markets: [market()], targetHealthFactorMantissa: WAD,
    horizonsSeconds: [String(366 * 86400)] }), /one year/);
});

test("observes six markets in three fixed-boundary batches without signer or transaction capabilities", async () => {
  const batchSizes = [];
  const marketAddresses = [mUsdc, ...[2, 3, 4, 5, 6]
    .map((suffix) => `0x${suffix.toString(16).padStart(40, "0")}`)];
  const underlyingAddresses = [usdc, ...[12, 13, 14, 15, 16]
    .map((suffix) => `0x${suffix.toString(16).padStart(40, "0")}`)];
  const values = (contract) => {
    const { address, functionName } = contract;
    const marketIndex = marketAddresses.indexOf(address.toLowerCase());
    if (functionName === "getAssetsIn") return marketAddresses;
    if (functionName === "oracle") return oracle;
    if (functionName === "getAccountLiquidity") return [0n, 30n, 0n];
    if (functionName === "symbol") return `mASSET${marketIndex}`;
    if (functionName === "decimals") return underlyingAddresses.includes(address.toLowerCase()) ? 6 : 8;
    if (functionName === "underlying") return underlyingAddresses[marketIndex];
    if (functionName === "getAccountSnapshot") return [0n, 100n, 0n, 10000000000000000n];
    if (functionName === "markets") return [true, 800000000000000000n];
    if (functionName === "getUnderlyingPrice") return 1000000000000000000000000000000n;
    if (functionName === "balanceOfUnderlying") return 100000000n;
    return 0n;
  };
  const readPool = { async requestAtBoundary({ operation }) {
    const value = await operation({ readContracts: async ({ contracts }) => {
      batchSizes.push(contracts.length);
      return contracts.map(values);
    } });
    return { boundary: { chainId: 8453, blockNumber: "100", blockHash: `0x${"a".repeat(64)}`,
      blockTimestamp: "200" }, provider: { id: "fixture", url: "https://base-rpc.publicnode.com/" },
    value, attempts: [], failures: [], callCount: 5 };
  } };
  const observation = await observeMoonwellAccountHealth({ profile: MOONWELL_ACCOUNT_HEALTH_PROFILE,
    account: `eip155:8453:${account}`, rpcUrl: "https://base-rpc.publicnode.com", comptroller,
    targetHealthFactorMantissa: WAD, horizonsSeconds: [], stresses: [] }, { readPool });
  assert.equal(observation.snapshotBlock, "100");
  assert.equal(observation.snapshotBlockHash, `0x${"a".repeat(64)}`);
  assert.equal(observation.snapshotTimestamp, "200");
  assert.equal(observation.markets.length, 6);
  assert.equal(observation.markets[0].suppliedUnderlyingRaw, "100000000");
  assert.equal(observation.evaluation.current.healthFactor.kind, "unbounded");
  assert.deepEqual(batchSizes, [3, 54, 6]);
  assert.equal(observation.rpcCallCount, 5);
  assert.equal(observation.signerMaterialAccepted, false);
  assert.equal(observation.transactionAssembly, false);
  assert.equal(observation.chainMutation, false);
});

test("returns a factual empty-account outcome without poisoning its drpc provider", async () => {
  const boundaryHash = `0x${"d".repeat(64)}`;
  const client = {
    async getChainId() { return 8453; },
    async getBlock() { return { number: 100n, hash: boundaryHash, timestamp: 200n }; },
    async request() { return "still-healthy"; },
    async multicall({ contracts }) {
      return contracts.map(({ functionName }) => {
        if (functionName === "getAssetsIn") return [];
        if (functionName === "oracle") return oracle;
        if (functionName === "getAccountLiquidity") return [0n, 0n, 0n];
        throw new Error(`unexpected contract read ${functionName}`);
      });
    },
  };
  const readPool = createPublicEvmReadPool({ chain: BASE_PUBLIC_EVM_CHAIN,
    providers: [{ id: "base-drpc", url: "https://base.drpc.org/" }], maxAttemptsPerProvider: 1,
    minimumIntervalMs: 0, schedule: async () => {}, createClient: () => client });
  const observation = await observeMoonwellAccountHealth({ profile: MOONWELL_ACCOUNT_HEALTH_PROFILE,
    account: `eip155:8453:${account}`, rpcUrl: "https://base.drpc.org", comptroller,
    targetHealthFactorMantissa: WAD }, { readPool });
  assert.deepEqual(observation.outcome, { type: "no-entered-markets", factual: true, enteredMarketCount: 0 });
  assert.equal(observation.riskEvaluationPerformed, false);
  assert.equal("evaluation" in observation, false);
  assert.deepEqual(observation.markets, []);
  assert.equal(observation.snapshotBlock, "100");
  assert.equal(observation.snapshotBlockHash, boundaryHash);
  assert.equal(observation.readProvider.id, "base-drpc");
  assert.deepEqual(readPool.failedProviderIds(), []);
  const next = await readPool.requestAtBoundary({ boundary: { chainId: 8453,
    blockNumber: observation.snapshotBlock, blockHash: observation.snapshotBlockHash },
  method: "eth_getBalance", params: [account] });
  assert.equal(next.value, "still-healthy");
  assert.equal(next.provider.id, "base-drpc");
});

test("observer refuses credential-bearing RPC URLs and the wrong chain", async () => {
  const base = { profile: MOONWELL_ACCOUNT_HEALTH_PROFILE, account: `eip155:8453:${account}`,
    rpcUrl: "https://user:secret@example.test/rpc", comptroller, targetHealthFactorMantissa: WAD };
  await assert.rejects(() => observeMoonwellAccountHealth(base), /credential-free/);
  await assert.rejects(() => observeMoonwellAccountHealth({ ...base, rpcUrl: "https://base-rpc.publicnode.com" },
    { readPool: { async requestAtBoundary() { throw new Error("provider identified chain 1, expected 8453"); } } }), /chain 1/u);
  await assert.rejects(() => observeMoonwellAccountHealth({ ...base, rpcUrl: "https://rpc.example/base" }), /allowlisted/);
});
