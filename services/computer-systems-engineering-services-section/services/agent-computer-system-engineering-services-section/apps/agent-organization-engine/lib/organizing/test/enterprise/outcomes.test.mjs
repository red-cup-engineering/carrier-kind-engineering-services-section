import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  acceptanceReadoutOf, deliveryReadingOf, isoWeekOf, outcomeBookText, outcomeJournal, outcomeOf, partyResolverOf, seamOfOutcome, standingOf, readStandingIndex, readMarketJudgments, readJudgedSettlements, standingIndexOf,
} from "../../src/enterprise/outcomes.mjs";

const SECTION = "services/engineering-services-section";
const territories = [
  { id: "engineering", section: SECTION, entity: "561-group-llc" },
  { id: "group-operations", section: "services/561-group-services-section", entity: "561-group-llc" },
];
const accounts = new Map([["0x42f7", { entity: "561-group-llc" }], ["0xf0f0", { entity: "founder" }]]);
const partyOf = partyResolverOf({ territories, accounts });

const sale = (payer, tx, amount) => outcomeOf({
  source: "customer", lot: "sku:a", delivery: `tx:${tx}`, provider: `section:lib/emsenn/services/561-group/${SECTION}/services/x`,
  judge: `eip155:8453:${payer}`, verdict: "accepted", at: "2026-10-02T11:00:00.000Z", evidence: [`customer-judgment:${tx}`],
  value: { amount, currency: "USDC", basis: "price", account: "Income:Sales:X402:Translation", settledTo: "Assets:Digital-Assets:EVM:Base:Tokens" },
});
const assayInput = (thread, verdict, at) => ({
  source: "work-arena", lot: thread, delivery: `${thread}#1`, provider: `emsenn/services/561-group/${SECTION}#senior-engineer`, judge: "group-operations",
  verdict, at, evidence: [`assay-result:${thread}`], carrier: "model-a", resources: [{ resource: "output-tokens", unit: "token", amount: "1000", carrier: "model-a" }],
});
const assay = (thread, verdict, at) => outcomeOf(assayInput(thread, verdict, at));

test("an outcome is content-addressed and refuses a judgment with no evidence", () => {
  assert.equal(sale("0x1", "a", "0.01").id, sale("0x1", "a", "0.01").id);
  assert.notEqual(sale("0x1", "a", "0.01").id, sale("0x1", "a", "0.02").id);
  assert.throws(() => outcomeOf({ ...assayInput("t", "accepted", "2026-10-01T00:00:00.000Z"), evidence: [] }), /rests on evidence/u);
});

test("the seam is read from who judged: the Group's own wallet is intra-group, the founder related, a stranger external", () => {
  assert.equal(seamOfOutcome(sale("0x42f7", "a", "0.01"), partyOf), "intra-group");
  assert.equal(seamOfOutcome(sale("0xf0f0", "b", "0.01"), partyOf), "related");
  assert.equal(seamOfOutcome(sale("0x9999", "c", "0.01"), partyOf), "external");
  assert.equal(seamOfOutcome(assay("t", "accepted", "2026-10-01T00:00:00.000Z"), partyOf), "intra-group");
});

test("a namespace only the house mints places its parties inside, unless an account registers one elsewhere", () => {
  const minted = partyResolverOf({ territories, accounts: new Map([["urn:ame:visiting-press", { entity: "visiting-press-llc" }]]), namespaces: [{ prefix: "urn:ame:", party: { entity: "561-group-llc" } }] });
  const judgedBy = (judge) => outcomeOf({ ...assayInput("t", "accepted", "2026-10-01T00:00:00.000Z"), judge });
  assert.equal(seamOfOutcome(judgedBy("urn:ame:independent-editorial-assessment"), minted), "intra-group");
  assert.equal(seamOfOutcome(judgedBy("urn:ame:visiting-press"), minted), "related");
  assert.equal(seamOfOutcome(judgedBy("urn:ame:independent-editorial-assessment"), partyOf), "external");
});

test("the book records only what a party outside the Group paid, and leaves to another book what it already records", () => {
  const outcomes = [sale("0x42f7", "a", "0.04"), sale("0x9999", "c", "0.01")];
  const book = outcomeBookText(outcomes, { partyOf });
  assert.match(book, /Income:Sales:X402:Translation {2}-0\.01 USDC/u);
  assert.doesNotMatch(book, /0\.04 USDC/u);
  assert.doesNotMatch(outcomeBookText(outcomes, { partyOf, booked: new Set(["tx:c"]) }), /\* "/u);
});

test("standing and readings fold the standing judgments: a void withdraws one, a later judgment by the same judge replaces it", () => {
  const accepted = assay("t1", "accepted", "2026-10-01T10:00:00.000Z");
  const rejected = assay("t2", "rejected", "2026-10-01T11:00:00.000Z");
  assert.deepEqual([...standingOf([accepted, rejected])], [["model-a", { accepted: 1, attempts: 2 }]]);
  const voided = outcomeOf({ ...assayInput("t1", "voided", "2026-10-01T12:00:00.000Z"), voids: accepted.id });
  assert.deepEqual([...standingOf([accepted, rejected, voided])], [["model-a", { accepted: 0, attempts: 1 }]]);
  const other = outcomeOf({ ...assayInput("t1", "rejected", "2026-10-01T13:00:00.000Z"), judge: "reader-desk", evidence: ["review:1"] });
  assert.equal(deliveryReadingOf([accepted]), "held");
  assert.equal(deliveryReadingOf([accepted, other]), "contested");
  assert.equal(deliveryReadingOf([accepted, voided]), "unknown");
});

test("the weekly readout states cost per accepted unit only where every resource is priced", () => {
  const outcomes = [assay("t1", "accepted", "2026-09-29T10:00:00.000Z"), assay("t2", "rejected", "2026-09-30T10:00:00.000Z"), sale("0x9999", "c", "0.01"), sale("0x42f7", "a", "0.04")];
  const week = isoWeekOf("2026-10-03T00:00:00.000Z");
  assert.deepEqual(week, { week: "2026-W40", from: "2026-09-28T00:00:00.000Z", to: "2026-10-05T00:00:00.000Z" });
  const unpriced = acceptanceReadoutOf(outcomes, { ...week, partyOf });
  const carrier = unpriced.byCarrier.find((row) => row.carrier === "model-a");
  assert.equal(carrier.costPerAccepted, null);
  assert.equal(carrier.posterior, 0.5);
  assert.deepEqual(unpriced.border.external, { count: 1, value: { USDC: "0.01" }, payers: ["eip155:8453:0x9999"] });
  assert.deepEqual(unpriced.border.self, { count: 1, value: { USDC: "0.04" } });
  const priced = acceptanceReadoutOf(outcomes, { ...week, partyOf, priceOf: () => ({ amount: "0.00001", currency: "USD" }) });
  assert.deepEqual(priced.byCarrier.find((row) => row.carrier === "model-a").costPerAccepted, { USD: "0.020000" });
});

test("the journal tells an outcome once, however often it is told", async () => {
  const root = await mkdtemp(join(tmpdir(), "outcome-journal-"));
  try {
    const outcomes = [sale("0x9999", "c", "0.01"), assay("t1", "accepted", "2026-10-01T10:00:00.000Z")];
    assert.equal(outcomeJournal(root).record(outcomes), 2);
    assert.equal(outcomeJournal(root).record(outcomes), 0);
    assert.deepEqual(outcomeJournal(root).read().map((outcome) => outcome.id).sort(), outcomes.map((outcome) => outcome.id).sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test('cached payment claims do not supply standing, routing or enterprise judged settlements',async()=>{
 const root=await mkdtemp(join(tmpdir(),'outcome-payment-cache-'));
 try{
  const standing=join(root,'standing.json'),market=join(root,'market.json'),settled=join(root,'settled.json');
  await writeFile(standing,JSON.stringify({kind:'organizing.enterprise.outcome-standing',standing:[{carrier:'model',accepted:26,attempts:26}]}));
  assert.equal(readStandingIndex(standing).size,0);
  await writeFile(standing,JSON.stringify(standingIndexOf(new Map([['model',{accepted:1,attempts:2}]]))));
  assert.deepEqual([...readStandingIndex(standing)],[['model',{accepted:1,attempts:2}]]);
  const old={source:'x402-settlement',verdict:'accepted'},judgment={source:'customer',verdict:'accepted'};
  await writeFile(market,JSON.stringify({kind:'organizing.enterprise.market-judgments',judgments:[old,judgment]}));
  assert.deepEqual(readMarketJudgments(market),[judgment]);
  await writeFile(settled,JSON.stringify({kind:'organizing.enterprise.judged-settlements',enterprises:{engineering:[old,judgment]}}));
  assert.deepEqual(readJudgedSettlements(settled,'engineering'),[judgment]);
 }finally{await rm(root,{recursive:true,force:true});}
});
