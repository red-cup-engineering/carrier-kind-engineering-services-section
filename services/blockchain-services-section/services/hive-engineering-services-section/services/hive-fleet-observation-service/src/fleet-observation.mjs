import { addDecimalStrings } from "@red-cup-engineering/exact-number-data-service/decimal-string";

/** Pure Hive observation data: no provider identity, journal custody or execution authority.
 * Decimal balances remain exact; missing observations cannot support a fleet total. */
function quantity(value, suffix) {
  if (typeof value !== "string" || !value.endsWith(` ${suffix}`)) return null;
  const amount = value.slice(0, -(suffix.length + 1));
  try { return addDecimalStrings([amount]); } catch { return null; }
}

export function projectHiveFleetObservation(tick, tickDigest) {
  const accounts = (tick.accounts ?? []).map((account) => ({
    account: account.account,
    liquid: { hive: quantity(account.trading?.hive, "HIVE"), hbd: quantity(account.trading?.hbd, "HBD") },
    voting: { planned: account.voting?.votesPlanned ?? 0, broadcast: account.voting?.votesBroadcast ?? 0,
      skipped: account.voting?.votesSkipped ?? 0, errors: account.voting?.execution?.errors ?? 0 },
    trading: { mode: account.trading?.mode ?? "unknown", planned: account.trading?.tradesPlanned ?? 0,
      executed: account.trading?.tradesExecuted ?? 0, liquidityPlanned: account.trading?.lpPlanned ?? 0,
      liquidityExecuted: account.trading?.lpExecuted ?? 0, savingsExecuted: account.trading?.savingsExecuted ?? false },
  })).sort((left, right) => left.account.localeCompare(right.account));
  const sum = (field) => Array.isArray(tick.accounts) && accounts.every((account) => account.liquid[field] !== null)
    ? addDecimalStrings(["0", ...accounts.map((account) => account.liquid[field])]) : null;
  const execution = accounts.reduce((totals, account) => ({
    votesBroadcast: totals.votesBroadcast + account.voting.broadcast,
    votesSkipped: totals.votesSkipped + account.voting.skipped,
    voteErrors: totals.voteErrors + account.voting.errors,
    tradesExecuted: totals.tradesExecuted + account.trading.executed,
    liquidityMovesExecuted: totals.liquidityMovesExecuted + account.trading.liquidityExecuted,
  }), { votesBroadcast: 0, votesSkipped: 0, voteErrors: 0, tradesExecuted: 0, liquidityMovesExecuted: 0 });
  return { type: "HiveFleetCustodyObservation", sourceTick: { id: tickDigest, settledAt: tick.ts },
    fleet: { running: tick.running === true, liveFlag: tick.live === true,
      enabledLanes: tick.enabled ?? [], accountCount: accounts.length },
    aggregateLiquid: { hive: sum("hive"), hbd: sum("hbd") },
    accounts, execution,
    interpretationLimits: ["Hive-and-Hive-Engine-only", "not-a-cross-chain-position",
      "live-flag-does-not-prove-broadcast", "balances-are-source-tick-observations-not-custody-title", "unobserved-balances-are-unknown-not-zero"],
    credentialAccess: false, chainMutation: false };
}

