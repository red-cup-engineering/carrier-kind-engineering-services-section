/**
 * Tally credit: a line whose limit is computed from a counterparty's record of matched tallies,
 * never from the balance it holds (the monetary economics section's tally credit). The limit is
 * the count of settled tallies in the window times their median settled size, times a factor that
 * falls to zero while any half-tally (a claim awaiting its counterpart) is older than the window.
 * Every draw is itself a crossing, so a default is an unmatched half kept on the record, which
 * closes the line until it is matched, without passing the default to anyone else.
 */

const median = (values) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * The credit limit of a tally record. Each entry is { status, at, size }: the status a data-layer
 * tally reconciled to ("settled", "claim", "dispute"), when the crossing opened or settled
 * (milliseconds or an ISO date), and the settled size.
 */
export function tallyCredit(record, { now, window }) {
  const time = (at) => (typeof at === "number" ? at : Date.parse(at));
  const current = time(now);
  if (!Number.isFinite(current) || !(window > 0)) throw new TypeError("tally credit needs a time now and a positive window");
  const inWindow = record.filter((entry) => current - time(entry.at) <= window);
  const settled = inWindow.filter((entry) => entry.status === "settled");
  const staleHalves = record.filter((entry) => entry.status === "claim" && current - time(entry.at) > window);
  const factor = staleHalves.length === 0 ? 1 : 0;
  const settledSize = median(settled.map((entry) => entry.size));
  return Object.freeze({
    limit: settled.length * settledSize * factor,
    settled: settled.length,
    medianSettledSize: settledSize,
    staleHalves: staleHalves.length,
    disputes: inWindow.filter((entry) => entry.status === "dispute").length,
  });
}
