/**
 * enterprise/statement — the win-win value-added statement of a micro-enterprise (Rendanheyi
 * glossary: gongying-zengzhi-biao, yinling-mubiao, zengzhi-fenxiang). It carries users as a
 * balance, the ecosystem's parties, value created and value captured kept apart, costs, and the
 * value-adjustment contract's measures read against their leading goals.
 *
 * Value captured is counted only from settlement receipts; value created only from entries that
 * name their source; an amount nobody recorded is unknown, never zero.
 * @packageDocumentation
 */
import { interestReading } from "./orders.mjs";
import { shareValueAdded } from "./constitution.mjs";

const sum = (values) => values.reduce((total, value) => total + value, 0);
const inPeriod = (record, { from, to } = {}) => (!from || String(record.recordedAt ?? record.date) >= from) && (!to || String(record.recordedAt ?? record.date) < to);
const months = ({ from, to } = {}, now = Date.now()) => {
  const start = from ? Date.parse(from) : NaN;
  const end = to ? Math.min(Date.parse(to), now) : now;
  return Number.isFinite(start) && end > start ? (end - start) / (30.4375 * 86_400_000) : null;
};

/**
 * The measures a value-adjustment contract may name, each read from the enterprise's facts.
 * A measure with no facts to read is null (unknown).
 */
export const MEASURES = Object.freeze({
  "closed-orders": (f) => f.orders.filter((o) => o.stage === f.closedStage).length,
  "closed-orders-per-month": (f) => (f.months ? f.orders.filter((o) => o.stage === f.closedStage).length / f.months : null),
  "value-captured": (f) => f.captured,
  "average-fee": (f) => (f.settlements.length ? f.captured / f.settlements.length : null),
  "contacts-per-contract": (f) => {
    const contracted = f.orders.filter((o) => o.history.some((h) => h.stage === f.contractedStage)).length;
    return contracted ? f.contacts.filter((c) => c.outcome !== "letter sent").length / contracted : null;
  },
  "users-served": (f) => f.served,
});

/** A measure's reading against its target: met, short, or unknown, and in which direction better lies. */
export function measureReading(measure, facts) {
  const read = MEASURES[measure.reading];
  const actual = read ? read(facts) : null;
  const better = measure.better ?? "higher";
  const reading = actual === null || actual === undefined || !Number.isFinite(actual) ? "unknown"
    : (better === "lower" ? actual <= measure.target : actual >= measure.target) ? "met" : "short";
  return Object.freeze({ id: measure.id, means: measure.means ?? null, target: measure.target, unit: measure.unit ?? null, better, actual: Number.isFinite(actual) ? Number(actual.toFixed(4)) : null, reading });
}

/**
 * The statement for one enterprise over a period.
 * @param {object} input
 * @param {object} input.enterprise enterpriseOf record
 * @param {object[]} input.orders currentOrders of this enterprise
 * @param {object[]} input.contacts contacts of this enterprise
 * @param {object[]} input.settlements settlement receipts: { kind, received, shares, userValue, parties }; deposits and payouts are not captured value
 * @param {object[]} input.costs cost entries: { amount, source }
 * @param {object[]} input.contracts contractOf records with their `standing`
 */
export function valueAddedStatement({ enterprise, orders = [], contacts = [], settlements = [], costs = [], contracts = [], period = {}, closedStage = "closed", contractedStage = "contracted", now = Date.now() }) {
  const scopedSettlements = settlements.filter((s) => (s.kind ?? "settlement") === "settlement" && inPeriod(s, period));
  const scopedCosts = costs.filter((c) => inPeriod(c, period));
  const scopedContacts = contacts.filter((c) => inPeriod(c, period));
  const parties = new Map();
  for (const contact of contacts) {
    const list = parties.get(contact.party) ?? [];
    list.push(contact);
    parties.set(contact.party, list);
  }
  const readings = [...parties.values()].map((list) => interestReading(list));
  const captured = sum(scopedSettlements.map((s) => s.received ?? 0));
  const createdEntries = scopedSettlements.flatMap((s) => (s.userValue ?? []).filter((e) => e.source && Number.isFinite(e.amount)));
  const created = createdEntries.length ? sum(createdEntries.map((e) => e.amount)) : null;
  const costTotal = scopedCosts.filter((c) => c.source).length ? sum(scopedCosts.filter((c) => c.source).map((c) => c.amount)) : null;
  const shared = scopedSettlements.flatMap((s) => s.shares ?? []);
  const ecosystem = new Set([...scopedSettlements.flatMap((s) => s.parties ?? []), ...shared.map((s) => s.party).filter(Boolean)]);
  const facts = { orders, contacts: scopedContacts, settlements: scopedSettlements, captured, served: orders.filter((o) => o.stage === closedStage).length, months: months(period, now), closedStage, contractedStage };

  const adjustments = contracts.filter((c) => c.type === "value-adjustment").map((contract) => ({
    contract: contract.id,
    standing: contract.standing ?? "proposed",
    leadingGoal: contract.leadingGoal ?? null,
    benchmark: contract.benchmark ?? null,
    period: contract.period ?? null,
    measures: (contract.measures ?? []).map((measure) => measureReading(measure, { ...facts, months: months(contract.period ?? period, now) })),
  }));
  const captureTarget = contracts.filter((c) => c.type === "value-adjustment" && c.standing === "in force").flatMap((c) => c.measures ?? []).find((m) => m.reading === "value-captured")?.target;
  const pool = Number.isFinite(captureTarget) ? captured - captureTarget : null;
  const groups = contracts.filter((c) => c.type === "chain-group").map((contract) => ({
    contract: contract.id,
    standing: contract.standing ?? "proposed",
    user: contract.user ?? null,
    sharing: contract.standing === "in force" && pool !== null ? shareValueAdded(contract, pool) : null,
  }));

  return Object.freeze({
    enterprise: enterprise.id,
    name: enterprise.name,
    kind: enterprise.kind,
    faces: enterprise.faces,
    period,
    users: {
      reached: readings.filter((r) => r !== "unknown").length,
      interested: readings.filter((r) => r === "held").length,
      declined: readings.filter((r) => r === "denied").length,
      served: facts.served,
      open: orders.filter((o) => ![closedStage, "dead"].includes(o.stage)).length,
    },
    ecosystem: [...ecosystem].sort(),
    valueCreated: { amount: created, entries: createdEntries.length, recognition: "sourced user-outcome entries only; unknown when none" },
    valueCaptured: { amount: captured, receipts: scopedSettlements.length, recognition: "settlement receipts only" },
    costs: { amount: costTotal, entries: scopedCosts.length },
    shared: { amount: sum(shared.map((s) => s.amount ?? 0)), lines: shared.length },
    retained: costTotal === null ? null : captured - sum(shared.map((s) => s.amount ?? 0)) - costTotal,
    valueAdjustment: adjustments,
    chainGroups: groups,
    valueAddedPool: pool,
  });
}
