import test from "node:test";
import assert from "node:assert/strict";
import loadLedger, { posting, transaction } from "../src/accounting/ledger.mjs";
import { openItemsReport } from "../src/accounting/open-items.mjs";
import { gradedFromParts, gradedToExactString } from "@red-cup-engineering/exact-number-data-service/graded";
const usd = (n) => gradedFromParts(BigInt(n), 1n, "USD");
test("open items retain invoice identity and partial reductions", () => {
 const l=loadLedger([transaction({id:"i",date:"2026-01-01",narration:"invoice",postings:[posting({account:"Assets:Receivables:Trade",amount:usd(1200),meta:{invoice_id:"I",due_date:"2026-01-10",counterparty:"A",source_id:"s1"}}),posting({account:"Income:Sales",amount:usd(-1200)})]}),transaction({id:"p",date:"2026-01-02",narration:"payment",postings:[posting({account:"Assets:Cash",amount:usd(300)}),posting({account:"Assets:Receivables:Trade",amount:usd(-300),meta:{invoice_id:"I"}})]})]);
 const r=openItemsReport(l,{roles:[{account:"Assets:Receivables:Trade",kind:"receivable"}],asOf:"2026-01-02",agingBasis:"due-date"});
 assert.equal(gradedToExactString(r.items[0].increases),"1200/1 USD"); assert.equal(gradedToExactString(r.items[0].reductions),"300/1 USD"); assert.equal(gradedToExactString(r.items[0].outstanding),"900/1 USD"); assert.equal(r.items[0].status,"open");
});
const report=(entries, roles=[{account:"Assets:Receivables:Trade",kind:"receivable"}], agingBasis="due-date") => openItemsReport(loadLedger(entries),{roles,asOf:"2026-01-10",agingBasis});
test("AP bill and payment retain credit orientation",()=>{const r=report([transaction({date:"2026-01-01",narration:"bill",postings:[posting({account:"Liabilities:Accounts-Payable",amount:usd(-1200),meta:{invoice_id:"B"}}),posting({account:"Expenses:X",amount:usd(1200)})]}),transaction({date:"2026-01-02",narration:"pay",postings:[posting({account:"Liabilities:Accounts-Payable",amount:usd(300),meta:{invoice_id:"B"}}),posting({account:"Assets:Cash",amount:usd(-300)})]})],[{account:"Liabilities:Accounts-Payable",kind:"payable"}]);assert.equal(gradedToExactString(r.items[0].outstanding),"900/1 USD")});
test("overpayment is a visible credit",()=>{const r=report([transaction({date:"2026-01-01",narration:"pay",postings:[posting({account:"Assets:Receivables:Trade",amount:usd(-2),meta:{invoice_id:"X"}}),posting({account:"Assets:Cash",amount:usd(2)})]})]);assert.equal(r.items[0].status,"credit")});
test("entities separate identical invoice ids",()=>{const r=report(["A","B"].map((entity)=>transaction({date:"2026-01-01",narration:"i",postings:[posting({account:"Assets:Receivables:Trade",amount:usd(1),meta:{invoice_id:"I",entity}}),posting({account:"Income:X",amount:usd(-1)})]})));assert.equal(r.items.length,2)});
test("missing identity exposes unmatched amount",()=>{const r=report([transaction({date:"2026-01-01",narration:"x",postings:[posting({account:"Assets:Receivables:Trade",amount:usd(1)}),posting({account:"Income:X",amount:usd(-1)})]})]);assert.equal(gradedToExactString(r.unmatched[0].amount),"1/1 USD")});
test("invoice aging is explicit when due date is absent", () => {
 const r = report([transaction({
  date: "2026-01-01", narration: "i", postings: [
   posting({ account: "Assets:Receivables:Trade", amount: usd(1), meta: { invoice_id: "I" } }),
   posting({ account: "Income:X", amount: usd(-1) }),
  ],
 })], undefined, "invoice-date");
 assert.equal(r.items[0].age, 9);
});
test("cutoff is inclusive and invalid cutoff refuses", () => {
 const entries = [transaction({
  date: "2026-01-10", narration: "i", postings: [
   posting({ account: "Assets:Receivables:Trade", amount: usd(1), meta: { invoice_id: "I" } }),
   posting({ account: "Income:X", amount: usd(-1) }),
  ],
 })];
 assert.equal(report(entries).items.length, 1);
 assert.throws(() => openItemsReport(loadLedger(entries), {
  roles: [{ account: "Assets:Receivables:Trade", kind: "receivable" }], asOf: "no", agingBasis: "due-date",
 }));
});
