import { gradeOf, gradedAdd, gradedCompare, gradedNegate, gradedToExactString, gradedZero } from "@red-cup-engineering/exact-number-data-service/graded";


const text = (x) => typeof x === "string" && x.length ? x : null;
const idOf = (t, meta) => text(meta.invoice_id) ?? text(meta.obligation_id) ?? text(t.meta.invoice_id) ?? text(t.meta.obligation_id);
const dueOf = (t) => text(t.meta.due_date);
/** Reports explicitly identified AR/AP positions. It never allocates a receipt by amount or narration. */
export function openItemsReport(ledger, options) {
  const roles = new Map(options.roles.map((x) => [x.account, x]));
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(options.asOf)) throw new TypeError("asOf must be ISO date");
  if (!["due-date","invoice-date"].includes(options.agingBasis)) throw new TypeError("unknown aging basis");
  const pending = new Map();
  const unmatched = [];
  for (const tx of ledger.transactions) {
    if (tx.date > options.asOf) continue;
    for (const posting of tx.postings) {
      const role = roles.get(posting.account); if (!role || !posting.amount) continue;
      const identity = idOf(tx, posting.meta);
      if (!identity) { unmatched.push({ transaction: tx.id ?? tx.date, account: posting.account, reason: "missing-invoice-or-obligation-identity", amount: posting.amount, commodity: gradeOf(posting.amount) }); continue; }
      const amount = role.kind === "payable" ? gradedNegate(posting.amount) : posting.amount;
      const meta = { ...tx.meta, ...posting.meta }; const counterparty = text(meta.counterparty);
      const key = JSON.stringify([text(meta.entity) ?? "", posting.account, gradeOf(amount), identity]);
      const old = pending.get(key);
      const inc = gradedCompare(amount,gradedZero(gradeOf(amount))) > 0 ? amount : gradedZero(gradeOf(amount)); const red = gradedCompare(amount,gradedZero(gradeOf(amount))) < 0 ? gradedNegate(amount) : gradedZero(gradeOf(amount));
      if (old) { old.amount = gradedAdd(old.amount, amount); old.increases=gradedAdd(old.increases,inc); old.reductions=gradedAdd(old.reductions,red); old.transactions.push(tx.id ?? tx.date); }
      else pending.set(key, { role, identity, counterparty, invoiceDate: text(meta.invoice_date) ?? tx.date, dueDate: text(meta.due_date), sourceIds: [...[text(meta.source_id)].filter(Boolean)], transactions: [tx.id ?? tx.date], amount, increases:inc, reductions:red });
    }
  }
  const heldIds = new Set(ledger.worklist.map((x) => x?.subject?.id).filter(Boolean));
  const items = [...pending.values()].map((x) => {
    const zero = gradedZero(gradeOf(x.amount)); const positive = gradedCompare(x.amount, zero) > 0;
    const agingDate = options.agingBasis === "due-date" ? x.dueDate : x.invoiceDate;
    const age = agingDate ? Math.floor((Date.parse(options.asOf+"T00:00:00Z")-Date.parse(agingDate+"T00:00:00Z"))/86400000) : "unknown";
    const held = x.transactions.some((id) => heldIds.has(id));
    return { account: x.role.account, kind: x.role.kind, commodity: gradeOf(x.amount), identity: x.identity, counterparty: x.counterparty, invoiceDate: x.invoiceDate, dueDate: x.dueDate, sourceIds: x.sourceIds, transactions: x.transactions, increases:x.increases, reductions:x.reductions, outstanding: x.amount, agingDate, age, status: held ? "unresolved" : gradedCompare(x.amount, zero) === 0 ? "settled" : positive ? "open" : "credit" };
  });
  return { asOf: options.asOf, agingBasis: options.agingBasis, items, unmatched, held: [...ledger.worklist, ...ledger.lotProblems] };
}
