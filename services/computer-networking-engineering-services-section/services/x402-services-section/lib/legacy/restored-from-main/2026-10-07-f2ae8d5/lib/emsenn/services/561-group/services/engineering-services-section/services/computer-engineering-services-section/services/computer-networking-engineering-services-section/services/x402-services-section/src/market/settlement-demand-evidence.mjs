// Money settled is not the same fact as an independent customer wanting the offer. A settlement
// witness (the market's X402SettlementWitness) proves the first; whether its payer is an
// independent outside customer, the house itself, or linked to it needs its own evidence, and a
// payer absent from every record stays unknown, never presumed external.

export const COUNTERPARTY_INDEPENDENCE = Object.freeze(["independent-external", "house-self", "linked-non-independent", "unknown"]);
const KNOWN = new Set(COUNTERPARTY_INDEPENDENCE);
const ASSERTED = new Set(COUNTERPARTY_INDEPENDENCE.filter((value) => value !== "unknown"));

/** A payer as a lower-case address or CAIP-10 account; null when undisclosed. */
export function normalizePayer(value) {
  if (value == null || value === "undisclosed") return null;
  const text = String(value).trim();
  if (text === "") return null;
  if (/^0x[0-9a-fA-F]{40}$/u.test(text)) return text.toLowerCase();
  const caip = /^(eip155:[0-9]+:)(0x[0-9a-fA-F]{40})$/u.exec(text);
  return caip ? `${caip[1]}${caip[2].toLowerCase()}` : text;
}

/** The payer's independence from the evidence that names it: one asserted class, or unknown with why. */
export function classifyCounterparty(payer, evidence = []) {
  const who = normalizePayer(payer);
  if (who === null) return Object.freeze({ classification: "unknown", reason: "payer-undisclosed", evidence: Object.freeze([]) });
  if (!Array.isArray(evidence)) throw new TypeError("counterparty evidence must be an array");
  const matches = evidence.map((entry, index) => {
    if (!KNOWN.has(entry?.classification)) throw new TypeError(`counterparty evidence[${index}] has an unsupported classification`);
    if (typeof entry.source !== "string" || entry.source.trim() === "") throw new TypeError(`counterparty evidence[${index}] needs a source`);
    return { payer: normalizePayer(entry.payer), classification: entry.classification, source: entry.source };
  }).filter((entry) => entry.payer === who).map(({ classification, source }) => Object.freeze({ classification, source }));
  if (matches.length === 0) return Object.freeze({ classification: "unknown", reason: "no-counterparty-evidence", evidence: Object.freeze([]) });
  const asserted = new Set(matches.map((entry) => entry.classification).filter((value) => ASSERTED.has(value)));
  if (asserted.size !== 1) {
    return Object.freeze({ classification: "unknown", reason: asserted.size === 0 ? "explicit-unknown" : "conflicting-counterparty-evidence", evidence: Object.freeze(matches) });
  }
  return Object.freeze({ classification: [...asserted][0], reason: "evidenced", evidence: Object.freeze(matches) });
}

/** One settlement witness read for demand: settled, and whether the payer is evidenced independent. */
export function settlementDemandReading(witness, evidence = []) {
  const payment = witness?.payment;
  if (witness?.type !== "X402SettlementWitness" || !payment?.network || !payment?.transaction) {
    throw new TypeError("an X402SettlementWitness with a payment network and transaction is required");
  }
  const amount = String(payment.amount ?? "");
  if (!/^[0-9]+$/u.test(amount)) throw new TypeError("settlement amount must be an integer base-unit string");
  const counterparty = classifyCounterparty(payment.payer, evidence);
  return Object.freeze({
    type: "X402SettlementDemandReading",
    settled: true,
    independentCustomerDemand: counterparty.classification === "independent-external",
    counterparty: counterparty.classification,
    reason: counterparty.reason,
    provenance: counterparty.evidence,
    gateway: witness.gateway ?? null,
    operation: witness.operation ?? null,
    network: payment.network,
    transaction: payment.transaction,
    payer: normalizePayer(payment.payer),
    amount,
  });
}

/** Totals per network: everything settled, and the part independent customers paid; counts per class. */
export function summarizeDemand(readings) {
  const settled = new Map(), independent = new Map();
  const counts = Object.fromEntries(COUNTERPARTY_INDEPENDENCE.map((name) => [name, 0]));
  for (const reading of readings) {
    if (reading?.type !== "X402SettlementDemandReading") throw new TypeError("not a settlement demand reading");
    counts[reading.counterparty] += 1;
    settled.set(reading.network, (settled.get(reading.network) ?? 0n) + BigInt(reading.amount));
    if (reading.independentCustomerDemand) independent.set(reading.network, (independent.get(reading.network) ?? 0n) + BigInt(reading.amount));
  }
  const plain = (map) => Object.fromEntries([...map].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, value.toString()]));
  return Object.freeze({ settlements: readings.length, independentSettlements: readings.filter((reading) => reading.independentCustomerDemand).length,
    counts: Object.freeze(counts), settledByNetwork: Object.freeze(plain(settled)), independentByNetwork: Object.freeze(plain(independent)) });
}
