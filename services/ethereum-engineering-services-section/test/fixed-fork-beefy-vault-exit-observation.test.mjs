import assert from "node:assert/strict";
import test from "node:test";
import { Interface } from "ethers";

import { FixedForkHarnessProviderError, observeFixedForkBeefyVaultExits,
  parseFixedForkHarnessProviderOutput, recordFixedForkBeefyVaultExitObservation }
  from "../src/fixed-fork-beefy-vault-exit-observation.mjs";

const EVENT = new Interface(["event FixedForkRecoveryObserved(string candidateId,uint256 blockNumber,address vault,address lpToken,uint256 sharesBurned,uint256 lpBurned,address token0,uint256 amount0,address token1,uint256 amount1,uint256 gasUsed,uint256 gasUnitsCeil,uint256 baseFeePerGas,uint256 l1DataFeeWeiCeil,uint256 operatorFeeWeiCeil,uint256 transactionCount,uint256 unsignedTxSizeCeil)"]);
const SIGMUND_EXIT_EVENT = new Interface(["event FixedForkSigmundTbtcCbBtcExitObserved(uint256 blockNumber,address source,address rewardPool,address vault,address lpToken,uint256 stakedVaultSharesExited,uint256 directVaultSharesBurned,uint256 lpBurned,address tbtc,uint256 tbtcReceived,address cbbtc,uint256 cbbtcReceived,uint256 gasUsed)"]);
const SIGMUND_SWAP_EVENT = new Interface(["event FixedForkSigmundTbtcCbBtcSwapObserved(uint256 blockNumber,address pool,uint256 tbtcInput,uint256 cbbtcQuoted,uint256 cbbtcReceived,uint256 tbtcResidual,uint256 sourceCbBtcAfter,uint256 gasUsed)"]);
const SIGMUND_REPAYMENT_EVENT = new Interface(["event FixedForkSigmundCbBtcRepaymentObserved(uint256 blockNumber,address source,address target,address market,uint256 repaymentSats,uint256 debtBeforeSats,uint256 debtAfterSats,uint256 sourceCbBtcResidualSats,uint256 targetCbBtcAllowanceSats)"]);
const SIGMUND_HEALTH_EVENT = new Interface(["event FixedForkSigmundHealthObserved(uint256 blockNumber,address target,uint256 targetHealthFactorWad,uint256 currentHealthFactorWad,uint256 lbtcHaircut10HealthFactorWad,uint256 lbtcDown5CbBtcUp2HealthFactorWad,bool allScenariosMeetTarget)"]);
const BLOCK_HASH = `0x${"a".repeat(64)}`;
const input = { profile: "org.emsenn.evm.fixed-fork-beefy-vault-exit-observation.v1",
  authority: { fixedForkEvidenceOnly: true, liveMutation: false, signerMaterialPresent: false,
    transactionAssembly: false, signing: false, broadcast: false, chainMutation: false, outputCalldata: false },
  chain: "eip155:8453", rpcUrl: "https://mainnet.base.org/", block: "48971240",
  blockHash: BLOCK_HASH, timestamp: "1784731827", candidates: ["yanagi-beefy-weeth-weth"] };

function harness(candidateId = "yanagi-beefy-weeth-weth") {
  const encoded = EVENT.encodeEventLog(EVENT.getEvent("FixedForkRecoveryObserved"), [candidateId, 48971240n,
    "0x47579c50c7aedea788d18927aed4c827fe34996a", "0x91f0f34916ca4e2cce120116774b0e4fa0cdcaa8",
    100n, 110n, "0x04c0599ae5a44757c0af6f9ec3b93da8976c150a", 120n,
    "0x4200000000000000000000000000000000000006", 130n, 474575n, 634218n, 5000000n,
    1000n, 200n, 3n, 256n]);
  return { "test/BeefyLegacyRecoveryFork.t.sol:BeefyLegacyRecoveryForkTest": { test_results: {
    "testYanagiBeefyWeethWethFixedForkExit()": { status: "Success",
      logs: [{ address: "0x0000000000000000000000000000000000000001",
        topics: encoded.topics, data: encoded.data }] } } } };
}

function sigmundHarness({ repaymentSats = 99_558n, includeHealth = true } = {}) {
  const eventLog = (event, name, values) => {
    const encoded = event.encodeEventLog(event.getEvent(name), values);
    return { address: "0x0000000000000000000000000000000000000001", topics: encoded.topics, data: encoded.data };
  };
  const exit = eventLog(SIGMUND_EXIT_EVENT, "FixedForkSigmundTbtcCbBtcExitObserved", [48971240n,
    "0x32886f6f361c1d570255c2762967a2e41d0e9b1a", "0xcd241a97ac92c3415fefbe6f3d61a27b2c30ace7",
    "0x64af54612646cce0657374226e38b82b8001e674", "0x488d6ea6064eee9352fdcdb7bc50d98a7ff3ad4e",
    599086806n, 4030254124n, 4977962602n, "0x236aa50979d5f3de3bd1eeb40e81137f22ab794b", 525985928959298n,
    "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf", 46981n, 581603n]);
  const swap = eventLog(SIGMUND_SWAP_EVENT, "FixedForkSigmundTbtcCbBtcSwapObserved", [48971240n,
    "0x488d6ea6064eee9352fdcdb7bc50d98a7ff3ad4e", 526157637891477n, 52570n, 52570n, 0n, 99558n, 50135n]);
  const repayment = eventLog(SIGMUND_REPAYMENT_EVENT, "FixedForkSigmundCbBtcRepaymentObserved", [48971240n,
    "0x32886f6f361c1d570255c2762967a2e41d0e9b1a", "0x224c08a8526751887a83e2711b167f890c6d078d",
    "0xf877acafa28c19b96727966690b2f44d35ad5976", repaymentSats, 274568n, 274568n - repaymentSats, 0n, 0n]);
  const health = eventLog(SIGMUND_HEALTH_EVENT, "FixedForkSigmundHealthObserved", [48971240n,
    "0x224c08a8526751887a83e2711b167f890c6d078d", 1200000000000000000n, 1644235718440876347n,
    1488736002837311645n, 1535770451625258852n, true]);
  return { "test/BeefyLegacyRecoveryFork.t.sol:BeefyLegacyRecoveryForkTest": { test_results: {
    "testSigmundFullTbtcCbBtcRepayment()": { status: "Success", logs: includeHealth ? [exit, swap, repayment, health] : [exit, swap, repayment] },
  } } };
}

const rpc = async (url, method) => method === "eth_maxPriorityFeePerGas" ? "0xf4240"
  : ({ number: "0x2eb3de8", hash: BLOCK_HASH, timestamp: "0x6a60d8b3", baseFeePerGas: "0x4c4b40" });

test("projects conserved outputs and route gas from the exact typed fixed-fork event", async () => {
  const result = await observeFixedForkBeefyVaultExits(input, { rpc, runHarness: async () => harness(),
    now: () => "2026-07-22T15:00:00.000Z" });
  assert.equal(result.candidates[0].sharesBurned, "100");
  assert.equal(result.candidates[0].outputs[1].amount, "130");
  assert.equal(result.candidates[0].routeGasUsed, "474575");
  assert.equal(result.candidates[0].gasUnitsCeil, "634218");
  assert.equal(result.candidates[0].fee.maxFeePerGasCeil, "12000000");
  assert.equal(result.candidates[0].fee.totalFeeWeiCeil, "7610616001200");
  assert.equal(result.feeObservedAt, "2026-07-22T15:00:00.000Z");
  assert.equal(result.feeSource, "https://mainnet.base.org/");
  assert.equal(result.gate.outputVerified, true);
  assert.equal(result.gate.gasEstimated, true);
  assert.equal(result.gate.executionAdmitted, false);
});

test("refuses block drift, widened authority, and contradictory harness events", async () => {
  await assert.rejects(() => observeFixedForkBeefyVaultExits(input, { rpc: async (url, method) =>
    method === "eth_maxPriorityFeePerGas" ? "0xf4240" : ({ number: "0x2eb3de8",
      hash: `0x${"b".repeat(64)}`, timestamp: "0x6a60d8b3", baseFeePerGas: "0x4c4b40" }),
    runHarness: async () => harness() }), /block identity/u);
  await assert.rejects(() => observeFixedForkBeefyVaultExits({ ...input,
    authority: { ...input.authority, transactionAssembly: true } }, { rpc, runHarness: async () => harness() }),
  /authority/u);
  await assert.rejects(() => observeFixedForkBeefyVaultExits({ ...input, privateKey: "refused" },
    { rpc, runHarness: async () => harness() }), /secret or transaction/u);
  await assert.rejects(() => observeFixedForkBeefyVaultExits({ ...input, block: 48971240 },
    { rpc, runHarness: async () => harness() }), /decimal text/u);
  await assert.rejects(() => observeFixedForkBeefyVaultExits(input,
    { rpc, runHarness: async () => harness("yanagi-beefy-sfrxeth-wsteth") }), /contradicts/u);
  await assert.rejects(() => observeFixedForkBeefyVaultExits(input, { rpc: async (url, method) =>
    method === "eth_maxPriorityFeePerGas" ? "0xf4240" : ({ number: "0x2eb3de8", hash: BLOCK_HASH,
      timestamp: "0x6a60d8b3", baseFeePerGas: "0x4c4b41" }), runHarness: async () => harness() }), /contradicts/u);
});

test("projects SIGMUND's conserved full conversion, repayment, and post-action health", async () => {
  const sigmundInput = { ...input, candidates: ["sigmund-beefy-tbtc-cbbtc"] };
  const result = await observeFixedForkBeefyVaultExits(sigmundInput, { rpc, runHarness: async () => sigmundHarness(),
    now: () => "2026-09-01T12:00:00.000Z" });
  const candidate = result.candidates[0];
  assert.equal(candidate.sourcePosition.stakedVaultSharesExited, "599086806");
  assert.equal(candidate.sourcePosition.directVaultSharesBurned, "4030254124");
  assert.equal(candidate.sourcePosition.lpBurned, "4977962602");
  assert.deepEqual(candidate.outputs, [{ token: "0x236aa50979d5f3de3bd1eeb40e81137f22ab794b", amount: "525985928959298" },
    { token: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf", amount: "46981" }]);
  assert.equal(candidate.fullConversionStatus, "completed");
  assert.equal(candidate.fullConversion.tbtcInput, "526157637891477");
  assert.equal(candidate.fullConversion.cbbtcQuotedSats, "52570");
  assert.equal(candidate.fullConversion.cbbtcReceivedSats, "52570");
  assert.equal(candidate.fullConversion.tbtcResidual, "0");
  assert.equal(candidate.repayment.repaymentSats, "99558");
  assert.equal(candidate.repayment.debtAfterSats, "175010");
  assert.equal(candidate.repayment.sourceCbBtcResidualSats, "0");
  assert.equal(candidate.repayment.targetCbBtcAllowanceSats, "0");
  assert.equal(candidate.health.targetHealthFactorWad, "1200000000000000000");
  assert.equal(candidate.health.currentHealthFactorWad, "1644235718440876347");
  assert.equal(candidate.health.allScenariosMeetTarget, true);
  await assert.rejects(() => observeFixedForkBeefyVaultExits(sigmundInput,
    { rpc, runHarness: async () => sigmundHarness({ repaymentSats: 99_557n }) }), /contradict/u);
  await assert.rejects(() => observeFixedForkBeefyVaultExits(sigmundInput,
    { rpc, runHarness: async () => sigmundHarness({ includeHealth: false }) }), /health observation/u);
});

test("records only a request-bound provider observation", async () => {
  const result = await observeFixedForkBeefyVaultExits(input, { rpc, runHarness: async () => harness(),
    now: () => "2026-07-22T14:59:00.000Z" });
  const writes = [];
  const recorded = await recordFixedForkBeefyVaultExitObservation(input, result, { recordedAt: "2026-07-22T15:00:00.000Z",
    record: async (request) => { writes.push(request); return { digest: "projection" }; } });
  assert.equal(writes[0].category, "ethereum-services.fixed-fork-beefy-vault-exit-observation");
  assert.equal(recorded.record.decisionBoundary.executionAdmitted, false);
  await assert.rejects(() => recordFixedForkBeefyVaultExitObservation({ ...input, block: "48971241" }, result,
    { record: async () => ({}) }), /request-bound/u);
});

test("bounds non-JSON Forge output as typed secret-safe provider evidence", () => {
  assert.throws(() => parseFixedForkHarnessProviderOutput({
    stdout: `Compiler run failed:\n${process.env.HOME}/secret/project/src/Bad.sol\n${"x".repeat(2_000)}`,
    stderr: "\u001b[31mError: Compilation failed\u001b[0m",
  }), (error) => {
    assert.equal(error instanceof FixedForkHarnessProviderError, true);
    assert.equal(error.code, "ERR_FIXED_FORK_HARNESS_PROVIDER");
    assert.equal(error.evidence.stage, "result-decoding");
    assert.match(error.evidence.stdout, /^Compiler run failed:/u);
    assert.equal(error.evidence.stdout.includes(process.env.HOME), false);
    assert.ok(error.evidence.stdout.length <= 768);
    assert.equal(error.message.includes("JSON"), false);
    return true;
  });
});
