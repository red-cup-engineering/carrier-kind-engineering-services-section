/** Derives Beancount `balance` assertions for Hive, Hive-Engine, Base-native and Base USDC chain state,
 *  from the wallets and symbol/account mappings recorded as metadata in the house ledger. */
import { readFileText } from "@red-cup-engineering/file-services/read-file";
import { writeFileText } from "@red-cup-engineering/file-services/write-file";
import {
  acquireObservationBoundary, callMany, chain, formatUnits,
} from "@red-cup-engineering/treasury-observation-service/chains";
import { observeAddress } from "@red-cup-engineering/treasury-observation-service/native";
import { balancesOfToken } from "@red-cup-engineering/treasury-observation-service/tokens";
import { renderBalanceDirective, renderFile } from "./beancount-render.mjs";
import { addDecimalStrings, stripUnitSuffix } from "@red-cup-engineering/computer-data-engineering-services-section/number/decimal-string";
import { HiveClient } from "@red-cup-engineering/hive-blockchain-client-service";
import { EngineClient } from "@red-cup-engineering/hive-blockchain-client-service/engine.mjs";
import {
  evmCustodyWallets, hiveCustodyWallets, hiveEngineAccountFor, hiveEngineSymbolAccounts,
} from "./ledger-metadata.mjs";

const HIVE_LIQUID_ACCOUNT = "Assets:Digital-Assets:Hive:Liquid";
const HIVE_STAKED_ACCOUNT = "Assets:Digital-Assets:Hive:Staked";
const BASE_NATIVE_ACCOUNT = "Assets:Digital-Assets:EVM:Base:Native";
// USDC on Base is where the Group's x402 sales settle; the ledger holds Base tokens in one account.
const BASE_TOKENS_ACCOUNT = "Assets:Digital-Assets:EVM:Base:Tokens";
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_DECIMALS = 6;
const HIVE_ENGINE_COLLECTIBLES_ACCOUNT = "Assets:Digital-Assets:HiveEngine:Collectibles";
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;

/**
 * @typedef {{ label: string, checked: boolean, value?: string, reason?: string }} WalletReading
 */

/**
 * The Beancount directive date for a cutoff: one day later, matching the ledger's own
 * start-of-day balance-assertion convention (a directive dated D locks in the close of D-1).
 * @param {string} cutoff YYYY-MM-DD
 * @returns {string}
 */
export function directiveDateForCutoff(cutoff) {
  const match = DATE_PATTERN.exec(cutoff);
  if (!match) throw new TypeError(`chain-balance-assertions: not a YYYY-MM-DD date: ${JSON.stringify(cutoff)}`);
  const asUtc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return asUtc.toISOString().slice(0, 10);
}

/**
 * The compact `YYYYMMDD` form of a cutoff, used in reconciliation and source ids.
 * @param {string} cutoff YYYY-MM-DD
 * @returns {string}
 */
export function dateStamp(cutoff) {
  if (!DATE_PATTERN.test(cutoff)) throw new TypeError(`chain-balance-assertions: not a YYYY-MM-DD date: ${JSON.stringify(cutoff)}`);
  return cutoff.replaceAll("-", "");
}

/**
 * `REC-<dateStamp>-<chainTag>-<commodityTag>`.
 * @param {string} dateStampValue
 * @param {string} chainTag
 * @param {string} commodityTag
 * @returns {string}
 */
export function reconciliationId(dateStampValue, chainTag, commodityTag) {
  return `REC-${dateStampValue}-${chainTag}-${commodityTag}`;
}

/**
 * Sum the `checked` readings in a wallet-reading set exactly; readings that failed are excluded
 * from the sum and reported separately, never treated as zero.
 * @param {readonly WalletReading[]} readings
 * @returns {{ sum: string | null, used: string[], failed: { label: string, reason: string }[] }}
 */
export function sumCheckedWallets(readings) {
  const used = readings.filter((r) => r.checked);
  const failed = readings.filter((r) => !r.checked).map(({ label, reason }) => ({ label, reason }));
  const sum = used.length > 0 ? addDecimalStrings(used.map((r) => r.value)) : null;
  return { sum, used: used.map((r) => r.label), failed };
}

/**
 * Sum Hive-Engine `balance` + `stake` per row, grouped by symbol, across every returned wallet
 * row (the fetch is one query over every custody account, so a symbol's total is exact once the
 * query itself succeeds).
 * @param {readonly { symbol: string, balance: string, stake?: string }[]} balances
 * @returns {Map<string, string>} symbol -> exact decimal total
 */
export function hiveEngineSymbolTotals(balances) {
  const bySymbol = new Map();
  for (const row of balances) {
    const rowTotal = addDecimalStrings([row.balance, row.stake ?? "0"]);
    bySymbol.set(row.symbol, [...(bySymbol.get(row.symbol) ?? []), rowTotal]);
  }
  const totals = new Map();
  for (const [symbol, values] of bySymbol) totals.set(symbol, addDecimalStrings(values));
  return totals;
}

/**
 * Build the readings for one Hive account field (`balance`, `hbd_balance`, or `vesting_shares`)
 * across the Hive custody wallets, from a `get_accounts` response keyed by public account name.
 * @param {readonly { account: string, publicAccount: string }[]} wallets
 * @param {Map<string, object> | null} accountsByName null when the whole fetch failed
 * @param {string | null} fetchError
 * @param {string} field
 * @returns {WalletReading[]}
 */
export function hiveWalletReadings(wallets, accountsByName, fetchError, field) {
  return wallets.map(({ account, publicAccount }) => {
    if (fetchError !== null) return { label: account, checked: false, reason: fetchError };
    const record = accountsByName.get(publicAccount);
    if (!record) return { label: account, checked: false, reason: `account ${publicAccount} not present in get_accounts response` };
    const raw = record[field];
    if (typeof raw !== "string") return { label: account, checked: false, reason: `get_accounts response missing ${field} for ${publicAccount}` };
    return { label: account, checked: true, value: stripUnitSuffix(raw) };
  });
}

/**
 * Compose one commodity's `balance` directive and receipt entry from wallet readings, or
 * `null` for the directive when any wallet failed: the account aggregates every custody wallet,
 * so a sum over some of them would assert a balance the account does not hold.
 * @param {{ readings: WalletReading[], account: string, commodity: string, directiveDate: string,
 *   cutoff: string, sourceId: string, observedAt: string, chainTag: string, commodityTag: string,
 *   dateStampValue: string }} input
 * @returns {{ directive: string | null, amount: string | null, used: string[],
 *   failed: { label: string, reason: string }[] }}
 */
export function composeCommodityDirective({
  readings, account, commodity, directiveDate, cutoff, sourceId, observedAt, chainTag, commodityTag, dateStampValue,
}) {
  const { sum, used, failed } = sumCheckedWallets(readings);
  if (sum === null || failed.length > 0) return { directive: null, amount: null, used, failed };
  const directive = renderBalanceDirective({
    date: directiveDate,
    account,
    amount: sum,
    commodity,
    metadata: {
      reconciliation_id: reconciliationId(dateStampValue, chainTag, commodityTag),
      cutoff,
      source_id: sourceId,
      source_balance: sum,
      observed_at: observedAt,
    },
  });
  return { directive, amount: sum, used, failed };
}

/**
 * Observe Base native ETH for every `evm-address` custody wallet at one finalized boundary.
 * @param {readonly { account: string, address: string }[]} wallets
 * @param {{ fetchImpl?: typeof fetch, concurrency?: number }} [options]
 * @returns {Promise<{ boundary: object | null, boundaryError: string | null, readings: WalletReading[] }>}
 */
export async function observeBaseNativeBalances(wallets, { fetchImpl = fetch, concurrency = 6, publicEvmReadPool } = {}) {
  const base = chain("base");
  const boundaryResult = await acquireObservationBoundary(base, { finality: "finalized", fetchImpl });
  if (!boundaryResult.ok) {
    return {
      boundary: null,
      boundaryError: boundaryResult.reason,
      readings: wallets.map(({ account }) => ({ label: account, checked: false, reason: boundaryResult.reason })),
    };
  }
  const boundary = boundaryResult.value;
  // One pool shared across every wallet: a fresh pool per call independently re-verifies every
  // provider's chain and block hash, and doing that concurrently for many wallets exhausts the
  // public endpoints' rate limits.
  // The EVM reader loads when a Base balance is actually read, so hosts that never
  // read chain state do not carry its client library.
  const pool = publicEvmReadPool ?? await (async () => {
    const { BASE_PUBLIC_EVM_CHAIN, BASE_PUBLIC_EVM_PROVIDERS, createPublicEvmReadPool } = await import("@red-cup-engineering/ethereum-engineering-services-section/public-evm-read");
    return createPublicEvmReadPool({ chain: BASE_PUBLIC_EVM_CHAIN, providers: BASE_PUBLIC_EVM_PROVIDERS });
  })();
  const jobs = wallets.map(({ account, address }) => async () => {
    const observation = await observeAddress(base, address, { boundary, fetchImpl, publicEvmReadPool: pool });
    return observation.checked
      ? { label: account, checked: true, value: observation.raw }
      : { label: account, checked: false, reason: observation.reason };
  });
  const readings = await callMany(jobs, concurrency);
  return { boundary, boundaryError: null, readings };
}

/**
 * Read `input.ledger`, observe Hive, Hive-Engine, and Base-native chain state for the wallets
 * its metadata names, write one Beancount `balance` directive per (account, commodity) to
 * `input.out` when provided, and return a reviewable proposal receipt.
 * @param {{ ledger: string, date: string, out?: string }} input
 * @param {{ fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<object>}
 */
export async function deriveChainBalanceAssertions(input, { fetchImpl = fetch, usdcRetryPausesMs = [5_000, 15_000] } = {}) {
  const { ledger, date: cutoff, out } = input;
  const ledgerText = await readFileText(ledger);
  const directiveDate = directiveDateForCutoff(cutoff);
  const dateStampValue = dateStamp(cutoff);
  const observedAt = new Date().toISOString();

  const hiveWallets = hiveCustodyWallets(ledgerText);
  const evmWallets = evmCustodyWallets(ledgerText);
  const heSymbolAccounts = hiveEngineSymbolAccounts(ledgerText);
  const publicAccountNames = hiveWallets.map((w) => w.publicAccount);

  let accountsByName = null;
  let hiveFetchError = null;
  try {
    const accounts = await new HiveClient({ fetch: fetchImpl }).getAccounts(publicAccountNames);
    accountsByName = new Map(accounts.map((a) => [a.name, a]));
  } catch (error) {
    hiveFetchError = `Hive get_accounts failed: ${error?.message ?? error}`;
  }

  const hiveSourceId = `CHAIN-HIVE-${dateStampValue}`;
  const hiveCommodityInput = { directiveDate, cutoff, sourceId: hiveSourceId, observedAt, chainTag: "HIVE", dateStampValue };
  const hive = composeCommodityDirective({
    ...hiveCommodityInput,
    readings: hiveWalletReadings(hiveWallets, accountsByName, hiveFetchError, "balance"),
    account: HIVE_LIQUID_ACCOUNT, commodity: "HIVE", commodityTag: "HIVE",
  });
  const hbd = composeCommodityDirective({
    ...hiveCommodityInput,
    readings: hiveWalletReadings(hiveWallets, accountsByName, hiveFetchError, "hbd_balance"),
    account: HIVE_LIQUID_ACCOUNT, commodity: "HBD", commodityTag: "HBD",
  });
  const vests = composeCommodityDirective({
    ...hiveCommodityInput,
    readings: hiveWalletReadings(hiveWallets, accountsByName, hiveFetchError, "vesting_shares"),
    account: HIVE_STAKED_ACCOUNT, commodity: "VESTS", commodityTag: "VESTS",
  });

  let heBalances = null;
  let heFetchError = null;
  try {
    heBalances = await new EngineClient({ fetch: fetchImpl }).getBalances(publicAccountNames);
  } catch (error) {
    heFetchError = `Hive-Engine tokens/balances failed: ${error?.message ?? error}`;
  }

  const heSourceId = `CHAIN-HIVEENGINE-${dateStampValue}`;
  const hiveEngineDirectives = [];
  const hiveEngineFailedWallets = heFetchError === null ? [] : hiveWallets.map(({ account }) => ({ label: account, reason: heFetchError }));
  if (heBalances !== null) {
    const totals = hiveEngineSymbolTotals(heBalances);
    // A token the books hold that no custody wallet holds any more was spent or sold: the one
    // query covers every wallet, so its absence is a zero balance, not a missing reading.
    // Collectibles are instances, read from another table, and are never asserted here.
    for (const [symbol, account] of Object.entries(heSymbolAccounts)) {
      if (!totals.has(symbol) && account !== HIVE_ENGINE_COLLECTIBLES_ACCOUNT) totals.set(symbol, "0");
    }
    for (const [symbol, amount] of [...totals].sort(([a], [b]) => a.localeCompare(b))) {
      const account = hiveEngineAccountFor(symbol, heSymbolAccounts);
      hiveEngineDirectives.push(renderBalanceDirective({
        date: directiveDate,
        account,
        amount,
        commodity: symbol,
        metadata: {
          reconciliation_id: reconciliationId(dateStampValue, "HIVEENGINE", symbol),
          cutoff,
          source_id: heSourceId,
          source_balance: amount,
          observed_at: observedAt,
        },
      }));
    }
  }

  // One verified provider pool for every Base read at this boundary: each fresh pool re-verifies
  // every provider, which exhausts the public endpoints' rate limits across 80 wallets.
  const { BASE_PUBLIC_EVM_CHAIN, BASE_PUBLIC_EVM_PROVIDERS, createPublicEvmReadPool } = await import("@red-cup-engineering/ethereum-engineering-services-section/public-evm-read");
  const publicEvmReadPool = createPublicEvmReadPool({ chain: BASE_PUBLIC_EVM_CHAIN, providers: BASE_PUBLIC_EVM_PROVIDERS });
  const base = await observeBaseNativeBalances(evmWallets, { fetchImpl, publicEvmReadPool });
  let baseEth = { directive: null, amount: null, used: [], failed: base.readings.filter((r) => !r.checked).map(({ label, reason }) => ({ label, reason })) };
  if (base.boundary !== null) {
    const { sum, used, failed } = sumCheckedWallets(base.readings);
    if (sum !== null && failed.length === 0) {
      const amount = formatUnits(BigInt(sum), 18);
      const sourceId = `CHAIN-BASE-${base.boundary.blockNumber}`;
      baseEth = {
        directive: renderBalanceDirective({
          date: directiveDate,
          account: BASE_NATIVE_ACCOUNT,
          amount,
          commodity: "ETH",
          metadata: {
            reconciliation_id: reconciliationId(dateStampValue, "BASE", "ETH"),
            cutoff,
            source_id: sourceId,
            source_balance: amount,
            observed_at: base.boundary.observedAt,
          },
        }),
        amount, used, failed,
      };
    } else {
      baseEth = { directive: null, amount: null, used, failed };
    }
  }

  // Base USDC at the same finalized boundary as Base ETH, over the same custody wallets: asserted
  // only when every wallet was read, as every aggregate is.
  let baseUsdc = { directive: null, amount: null, used: [], failed: [] };
  if (base.boundary !== null && evmWallets.length > 0) {
    // One Multicall3 read per chunk of wallets (public Base providers throttle per-call reads); a
    // wallet whose read failed is read again after a pause before the aggregate is refused.
    const readChunk = async (wallets) => (await balancesOfToken(chain("base"), BASE_USDC, wallets.map((wallet) => wallet.address), { boundary: base.boundary, fetchImpl, publicEvmReadPool }))
      .map((reading, index) => (reading.checked ? { label: wallets[index].account, checked: true, value: reading.raw } : { label: wallets[index].account, checked: false, reason: reading.reason }));
    const chunks = [];
    for (let start = 0; start < evmWallets.length; start += 40) chunks.push(evmWallets.slice(start, start + 40));
    let readings = [];
    for (const chunk of chunks) readings.push(...await readChunk(chunk));
    for (const pauseMs of usdcRetryPausesMs) {
      const failedWallets = evmWallets.filter((_, index) => !readings[index].checked);
      if (failedWallets.length === 0) break;
      await new Promise((resolve) => { setTimeout(resolve, pauseMs); });
      const again = new Map((await readChunk(failedWallets)).map((reading) => [reading.label, reading]));
      readings = readings.map((reading) => (reading.checked ? reading : again.get(reading.label) ?? reading));
    }
    const { sum, used, failed } = sumCheckedWallets(readings);
    if (sum !== null && failed.length === 0) {
      const amount = formatUnits(BigInt(sum), USDC_DECIMALS);
      baseUsdc = {
        directive: renderBalanceDirective({
          date: directiveDate, account: BASE_TOKENS_ACCOUNT, amount, commodity: "USDC",
          metadata: {
            reconciliation_id: reconciliationId(dateStampValue, "BASE", "USDC"), cutoff,
            source_id: `CHAIN-BASE-${base.boundary.blockNumber}`, source_balance: amount, observed_at: base.boundary.observedAt,
          },
        }),
        amount, used, failed,
      };
    } else {
      baseUsdc = { directive: null, amount: null, used, failed };
    }
  }

  const directives = [hive.directive, hbd.directive, vests.directive, ...hiveEngineDirectives, baseEth.directive, baseUsdc.directive]
    .filter((d) => d !== null);
  const header = "; Proposed by Metroplat book maintenance from observed chain state. Review before accepting.";
  const proposal = renderFile(header, directives);
  if (typeof out === "string" && out.length > 0) await writeFileText(out, proposal);

  return {
    ...(typeof out === "string" && out.length > 0 ? { out } : {}),
    directives: Object.freeze(directives),
    proposal,
    cutoff,
    directiveDate,
    directiveCount: directives.length,
    hive: {
      walletsObserved: hive.used.length,
      walletsFailed: [...hive.failed, ...hbd.failed, ...vests.failed],
      commodities: { HIVE: hive.amount, HBD: hbd.amount, VESTS: vests.amount },
    },
    hiveEngine: {
      symbolsObserved: hiveEngineDirectives.length,
      walletsObserved: heFetchError === null ? hiveWallets.length : 0,
      walletsFailed: hiveEngineFailedWallets,
    },
    base: {
      walletsObserved: baseEth.used.length,
      walletsFailed: [...baseEth.failed, ...baseUsdc.failed],
      boundaryError: base.boundaryError,
      amount: baseEth.amount,
      usdc: baseUsdc.amount,
    },
  };
}
