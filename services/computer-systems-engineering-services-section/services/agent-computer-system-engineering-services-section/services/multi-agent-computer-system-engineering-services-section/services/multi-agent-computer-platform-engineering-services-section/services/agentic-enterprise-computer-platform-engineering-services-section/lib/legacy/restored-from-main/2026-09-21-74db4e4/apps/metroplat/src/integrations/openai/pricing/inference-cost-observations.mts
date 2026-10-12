/**
 * running/inference-cost-observations — recorded `openai-chat-completions`
 * admit rows (`services/openai-client`'s `callClaim`, written through
 * `writeAtRoot`'s token `"openai-chat-completions"`) read as a per-worker,
 * per-model cost table.
 *
 * A call's worker identity rides the wire request's own standard `user`
 * field — the OpenAI `/chat/completions` request already carries an
 * end-user identifier, so a worker naming itself there is a degenerate use
 * of an existing wire property, not a new one. Subtotals fold through
 * `src/integrations/openai/src/economy/cost.mjs`'s `composeCost` (the package's one cost monoid);
 * the dollar subtotals are additionally checked against the grand total
 * through `value-settlement.mjs`'s `ledgerConserved` (`GradedAdditive` over
 * `ValueQuantity`, sector = commodity), a real conservation certificate
 * rather than trusting the fold's floating-point arithmetic on its own say-
 * so. No file I/O here — the caller (the cut deriver) owns reading the log,
 * mirroring `work-item-observations.mts`'s own division of labor.
 */
import { composeCost, type CostAmount } from "./cost.mts";
import { ledgerConserved, valueQuantity, type LedgerEntry, type ValueQuantity } from "@red-cup-engineering/x402-value-settlement-service";
import { isJsonRecord } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { EAVT } from "../../../lib/codecs/json/jsonl/eavt/index.mts";

/** One (worker, model) subtotal. */
export interface InferenceCostCell {
  readonly worker: string;
  readonly model: string;
  readonly calls: number;
  readonly cost: CostAmount;
}

/** The dollar-conservation certificate over this cut's own two independent
 *  foldings of the same underlying readings: crediting the sum of every
 *  per-worker subtotal against debiting the flat grand total. Quantized to
 *  microdollars (`1e6`ths of a dollar) — `ledgerConserved`'s `addQuantity`
 *  cross-multiplies denominators without reducing them, so a single pairwise
 *  add stays exact only while the squared denominator (`1e6² = 1e12`) sits
 *  well inside `Number.MAX_SAFE_INTEGER`; this is why the certificate stays
 *  a fixed two-entry check rather than one credit leg per cell (an entry per
 *  cell would compound the denominator once per fold and overflow for any
 *  non-trivial call count). Dollars themselves stay floating-point
 *  everywhere else. */
export interface InferenceCostConservation {
  readonly conserved: boolean;
  readonly residual: readonly ValueQuantity[];
}

export interface InferenceCostCut {
  readonly kind: "metroplat.inference-cost-cut";
  readonly calls: number;
  readonly cells: readonly InferenceCostCell[];
  readonly byWorker: Readonly<Record<string, CostAmount>>;
  readonly byModel: Readonly<Record<string, CostAmount>>;
  readonly total: CostAmount;
  readonly conservation: InferenceCostConservation;
}

const MICRODOLLARS_PER_DOLLAR = 1_000_000;

function microdollars(dollars: number): number {
  return Math.round(dollars * MICRODOLLARS_PER_DOLLAR);
}

/** One recorded call's cost reading, or `undefined` when the row is not a
 *  recognizable `openai.chat-completions.call` claim (an unrelated fact on
 *  the same feed, or a call recorded before this reduction's fields
 *  existed). */
function callReadingOfRow(row: EAVT): { readonly worker: string; readonly model: string; readonly amount: CostAmount } | undefined {
  const [, , value] = row;
  if (!isJsonRecord(value) || value["kind"] !== "openai.chat-completions.call") return undefined;
  const request = value["request"];
  const cost = value["cost"];
  if (!isJsonRecord(cost) || typeof cost["model"] !== "string") return undefined;
  const inputTokens = cost["inputTokens"];
  const outputTokens = cost["outputTokens"];
  const dollars = cost["dollars"];
  if (typeof inputTokens !== "number" || typeof outputTokens !== "number" || typeof dollars !== "number") return undefined;
  const worker = isJsonRecord(request) && typeof request["user"] === "string" && request["user"].trim().length > 0
    ? request["user"]
    : "unknown";
  return Object.freeze({
    worker,
    model: cost["model"],
    amount: Object.freeze({ dollars, tokens: Object.freeze({ input: inputTokens, output: outputTokens }) }),
  });
}

function pushInto(map: Map<string, CostAmount[]>, key: string, amount: CostAmount): void {
  const list = map.get(key);
  if (list === undefined) map.set(key, [amount]);
  else list.push(amount);
}

function foldRecord(amounts: ReadonlyMap<string, CostAmount[]>): Readonly<Record<string, CostAmount>> {
  const out: Record<string, CostAmount> = {};
  for (const [key, list] of amounts) out[key] = composeCost(list, "serial");
  return Object.freeze(out);
}

/** Reduce a day's recorded `openai-chat-completions` admit rows to a
 *  per-worker, per-model cost table with a dollar-conservation certificate. */
export interface InferenceCostObservationCollector {
  push(row: EAVT): void;
  read(): InferenceCostCut;
}

export function inferenceCostObservationCollector(): InferenceCostObservationCollector {
  const byCell = new Map<string, { worker: string; model: string; amounts: CostAmount[] }>();
  const byWorkerAmounts = new Map<string, CostAmount[]>();
  const byModelAmounts = new Map<string, CostAmount[]>();
  const totalAmounts: CostAmount[] = [];
  const push = (row: EAVT): void => {
    const reading = callReadingOfRow(row);
    if (reading === undefined) return;
    const cellKey = `${reading.worker}\n${reading.model}`;
    const cell = byCell.get(cellKey) ?? { worker: reading.worker, model: reading.model, amounts: [] };
    cell.amounts.push(reading.amount);
    byCell.set(cellKey, cell);
    pushInto(byWorkerAmounts, reading.worker, reading.amount);
    pushInto(byModelAmounts, reading.model, reading.amount);
    totalAmounts.push(reading.amount);
  };
  const read = (): InferenceCostCut => {
    const cells: InferenceCostCell[] = [...byCell.values()].map((cell) => Object.freeze({
      worker: cell.worker,
      model: cell.model,
      calls: cell.amounts.length,
      cost: composeCost(cell.amounts, "serial"),
    }));
    const total = composeCost(totalAmounts, "serial");
    const byWorkerGrandTotalDollars = [...byWorkerAmounts.values()]
      .reduce((sum, amounts) => sum + composeCost(amounts, "serial").dollars, 0);
    const creditEntry: LedgerEntry = Object.freeze({
      quantity: valueQuantity(microdollars(byWorkerGrandTotalDollars), MICRODOLLARS_PER_DOLLAR, "USD"),
      sign: "credit" as const,
    });
    const debitEntry: LedgerEntry = Object.freeze({
      quantity: valueQuantity(microdollars(total.dollars), MICRODOLLARS_PER_DOLLAR, "USD"),
      sign: "debit" as const,
    });
    return Object.freeze({
      kind: "metroplat.inference-cost-cut" as const,
      calls: totalAmounts.length,
      cells: Object.freeze(cells),
      byWorker: foldRecord(byWorkerAmounts),
      byModel: foldRecord(byModelAmounts),
      total,
      conservation: ledgerConserved([creditEntry, debitEntry]),
    });
  };
  return Object.freeze({
    push,
    read,
  });
}

export function inferenceCostObservationsOfRows(rows: Iterable<EAVT>): InferenceCostCut {
  const collector = inferenceCostObservationCollector();
  for (const row of rows) collector.push(row);
  return collector.read();
}
