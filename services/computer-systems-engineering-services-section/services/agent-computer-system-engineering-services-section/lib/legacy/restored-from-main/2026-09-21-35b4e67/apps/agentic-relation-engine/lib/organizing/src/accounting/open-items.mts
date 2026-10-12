import type { LoadedLedger, Transaction } from "./ledger.mjs";
import { addMoney, cmpMoney, moneyZero, negateMoney, commodityOf, toExactString, type Money } from "@red-cup-engineering/gaming/market";

export interface OpenItemRole { readonly account: string; readonly kind: "receivable" | "payable"; }
export interface OpenItemsOptions { readonly roles: readonly OpenItemRole[]; readonly asOf: string; readonly agingBasis: "due-date" | "invoice-date"; }
export interface OpenItem {
  readonly account: string; readonly kind: "receivable" | "payable"; readonly commodity: string;
  readonly identity: string; readonly counterparty: string | null; readonly invoiceDate: string;
  readonly dueDate: string | null; readonly sourceIds: readonly string[]; readonly transactions: readonly string[];
  readonly increases: Money; readonly reductions: Money; readonly outstanding: Money; readonly agingDate: string | null; readonly age: "unknown" | number;
  readonly status: "open" | "settled" | "credit" | "unresolved";
}
export interface OpenItemsReport { readonly asOf: string; readonly agingBasis: "due-date" | "invoice-date"; readonly items: readonly OpenItem[]; readonly unmatched: readonly { transaction: string; account: string; reason: string; amount: Money; commodity: string }[]; readonly held: readonly unknown[]; }

const text = (x: unknown): string | null => typeof x === "string" && x.length ? x : null;
const idOf = (t: Transaction, meta: Record<string, unknown>): string | null => text(meta.invoice_id) ?? text(meta.obligation_id) ?? text(t.meta.invoice_id) ?? text(t.meta.obligation_id);
const dueOf = (t: Transaction): string | null => text(t.meta.due_date);
/** Reports explicitly identified AR/AP positions. It never allocates a receipt by amount or narration. */
export function openItemsReport(ledger: LoadedLedger, options: OpenItemsOptions): OpenItemsReport {
  const roles = new Map(options.roles.map((x) => [x.account, x]));
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(options.asOf)) throw new TypeError("asOf must be ISO date");
  if (!["due-date","invoice-date"].includes(options.agingBasis)) throw new TypeError("unknown aging basis");
  const pending = new Map<string, { role: OpenItemRole; identity: string; counterparty: string | null; invoiceDate: string; dueDate: string | null; sourceIds: string[]; transactions: string[]; amount: Money; increases: Money; reductions: Money }>();
  const unmatched: { transaction: string; account: string; reason: string; amount: Money; commodity: string }[] = [];
  for (const tx of ledger.transactions) {
    if (tx.date > options.asOf) continue;
    for (const posting of tx.postings) {
      const role = roles.get(posting.account); if (!role || !posting.amount) continue;
      const identity = idOf(tx, posting.meta);
      if (!identity) { unmatched.push({ transaction: tx.id ?? tx.date, account: posting.account, reason: "missing-invoice-or-obligation-identity", amount: posting.amount, commodity: commodityOf(posting.amount) }); continue; }
      const amount = role.kind === "payable" ? negateMoney(posting.amount) : posting.amount;
      const meta = { ...tx.meta, ...posting.meta }; const counterparty = text(meta.counterparty);
      const key = JSON.stringify([text(meta.entity) ?? "", posting.account, commodityOf(amount), identity]);
      const old = pending.get(key);
      const inc = cmpMoney(amount,moneyZero(commodityOf(amount))) > 0 ? amount : moneyZero(commodityOf(amount)); const red = cmpMoney(amount,moneyZero(commodityOf(amount))) < 0 ? negateMoney(amount) : moneyZero(commodityOf(amount));
      if (old) { old.amount = addMoney(old.amount, amount); old.increases=addMoney(old.increases,inc); old.reductions=addMoney(old.reductions,red); old.transactions.push(tx.id ?? tx.date); }
      else pending.set(key, { role, identity, counterparty, invoiceDate: text(meta.invoice_date) ?? tx.date, dueDate: text(meta.due_date), sourceIds: [...[text(meta.source_id)].filter(Boolean) as string[]], transactions: [tx.id ?? tx.date], amount, increases:inc, reductions:red });
    }
  }
  const heldIds = new Set(ledger.worklist.map((x: any) => x?.mark?.id).filter(Boolean));
  const items = [...pending.values()].map((x) => {
    const zero = moneyZero(commodityOf(x.amount)); const positive = cmpMoney(x.amount, zero) > 0;
    const agingDate = options.agingBasis === "due-date" ? x.dueDate : x.invoiceDate;
    const age = agingDate ? Math.floor((Date.parse(options.asOf+"T00:00:00Z")-Date.parse(agingDate+"T00:00:00Z"))/86400000) : "unknown";
    const held = x.transactions.some((id) => heldIds.has(id));
    return { account: x.role.account, kind: x.role.kind, commodity: commodityOf(x.amount), identity: x.identity, counterparty: x.counterparty, invoiceDate: x.invoiceDate, dueDate: x.dueDate, sourceIds: x.sourceIds, transactions: x.transactions, increases:x.increases, reductions:x.reductions, outstanding: x.amount, agingDate, age, status: held ? "unresolved" : cmpMoney(x.amount, zero) === 0 ? "settled" : positive ? "open" : "credit" } as OpenItem;
  });
  return { asOf: options.asOf, agingBasis: options.agingBasis, items, unmatched, held: [...ledger.worklist, ...ledger.lotProblems] };
}
