import { addDecimalStrings } from "@red-cup-engineering/exact-number-data-service/decimal-string";

/** Pure Hive observation data: no provider identity, journal custody or execution authority.
 * Decimal balances remain exact; missing observations cannot support a fleet total. */
function quantity(value, suffix) {
  if (typeof value !== "string" || !value.endsWith(` ${suffix}`)) return null;
  const amount = value.slice(0, -(suffix.length + 1));
  try { return addDecimalStrings([amount]); } catch { return null; }
}

export function projectHiveFleetObservation(tick, tickDigest) {
  if (!Array.isArray(tick?.accounts)) throw new TypeError("Fleet observation requires an explicit source account scope");
  const accounts = tick.accounts.map((account) => ({
    account: account.account,
    liquid: { hive: quantity(account.trading?.hive, "HIVE"), hbd: quantity(account.trading?.hbd, "HBD") },
    voting: { planned: account.voting?.votesPlanned ?? null, broadcast: account.voting?.votesBroadcast ?? null,
      skipped: account.voting?.votesSkipped ?? null, errors: account.voting?.execution?.errors ?? null },
    trading: { mode: account.trading?.mode ?? "unknown", planned: account.trading?.tradesPlanned ?? null,
      executed: account.trading?.tradesExecuted ?? null, liquidityPlanned: account.trading?.lpPlanned ?? null,
      liquidityExecuted: account.trading?.lpExecuted ?? null, savingsExecuted: account.trading?.savingsExecuted ?? null },
  })).sort((left, right) => left.account.localeCompare(right.account));
  const sum = (field) => Array.isArray(tick.accounts) && accounts.every((account) => account.liquid[field] !== null)
    ? addDecimalStrings(["0", ...accounts.map((account) => account.liquid[field])]) : null;
  const observedSum = (a, b) => a === null || b === null ? null : a + b;
  const execution = accounts.reduce((totals, account) => ({
    votesBroadcast: observedSum(totals.votesBroadcast, account.voting.broadcast),
    votesSkipped: observedSum(totals.votesSkipped, account.voting.skipped),
    voteErrors: observedSum(totals.voteErrors, account.voting.errors),
    tradesExecuted: observedSum(totals.tradesExecuted, account.trading.executed),
    liquidityMovesExecuted: observedSum(totals.liquidityMovesExecuted, account.trading.liquidityExecuted),
  }), { votesBroadcast: 0, votesSkipped: 0, voteErrors: 0, tradesExecuted: 0, liquidityMovesExecuted: 0 });
  return { type: "HiveFleetCustodyObservation", sourceTick: { id: tickDigest, settledAt: tick.ts },
    fleet: { running: tick.running ?? null, liveFlag: tick.live ?? null,
      enabledLanes: tick.enabled ?? null, accountCount: accounts.length },
    aggregateLiquid: { hive: sum("hive"), hbd: sum("hbd") },
    accounts, execution,
    interpretationLimits: ["Hive-and-Hive-Engine-only", "not-a-cross-chain-position",
      "live-flag-does-not-prove-broadcast", "balances-are-source-tick-observations-not-custody-title", "unobserved-balances-are-unknown-not-zero"],
    credentialAccess: false, chainMutation: false };
}

