import test from "node:test";
import assert from "node:assert/strict";
import { selectPublicMarketCatalogRows as select } from "../../src/market/catalog.mjs";

const rows = {
  recordType:"x402.market-catalog/v1",
  offers:[
    { sku:"ni:1", listed:true, name:"Gas price", category:"chain",
      seller:{enterprise:"seller-a"}, compute:{package:"@owner/gas",export:"read"},
      gateway:"base", operation:"gas", route:"/v1/gas", description:"Market data" },
    { sku:"ni:2", listed:true, name:"Book quote", category:"publication",
      seller:{enterprise:"seller-b"}, compute:{package:"@owner/books",export:"read"},
      gateway:"books",operation:"book",route:"/v1/book",description:"Publication" },
    { sku:"ni:3", listed:false, name:"Private", category:"chain",
      seller:{enterprise:"seller-a"}, compute:{package:"@owner/gas",export:"read"},
      gateway:"base",operation:"private",route:"/private",description:"Internal" },
  ],
};
const policy={ defaultPageSize:1, maxPageSize:2, maxOffset:100000,
  maxQueryLength:200, maxTerms:12,
  exactMaxLength:{category:128,sellerEnterprise:256,producerPackage:256} };

test("the first buyer and a different owner share the same source-ordered catalogue selection", () => {
  const first = select(rows,"list",{},policy);
  const second = select(rows,"list",{offset:first.nextOffset},policy);
  assert.equal(first.total,2);
  assert.deepEqual(first.offers.map(x=>x.sku),["ni:1"]);
  assert.deepEqual(second.offers.map(x=>x.sku),["ni:2"]);
  assert.equal(second.nextOffset,null);
  assert.ok(Object.isFrozen(first) && Object.isFrozen(first.offers));
});
test("literal term search and exact owner/package coordinates never turn synonyms into claimed identity",()=>{
  assert.deepEqual(select(rows,"search",{query:"gas base"},policy).offers.map(x=>x.sku),["ni:1"]);
  assert.deepEqual(select(rows,"search",{query:"",category:"chain",sellerEnterprise:"seller-a",
    producerPackage:"@owner/gas"},policy).offers.map(x=>x.sku),["ni:1"]);
  assert.equal(select(rows,"search",{query:"gas",sellerEnterprise:"seller-b"},policy).total,0);
  assert.equal(select(rows,"search",{query:"private"},policy).total,0);
});
test("the source-owned inspection retains detail but never returns a held or duplicate SKU",()=>{
  assert.equal(select(rows,"get",{sku:"ni:2"},policy),rows.offers[1]);
  assert.equal(select(rows,"get",{sku:"ni:3"},policy),null);
  assert.throws(()=>select({...rows,offers:[rows.offers[0],rows.offers[0]]},"get",{sku:"ni:1"},policy),/duplicate/i);
});
test("transport budgets are parameters, not a fixed global catalogue size",()=>{
  assert.equal(select(rows,"list",{limit:2},policy).offers.length,2);
  assert.throws(()=>select(rows,"list",{limit:3},policy),/outside/);
  assert.throws(()=>select(rows,"search",{query:"a b c",sellerEnterprise:42},
    {...policy,maxTerms:2}),/too many/);
  assert.throws(()=>select(rows,"search",{query:"",producerPackage:""},policy),/bounded/);
  assert.throws(()=>select(rows,"list",null,policy),/tool arguments/);
  assert.equal(select(rows,"list",{}).offers.length,2);
});

test("all public buyer operations refuse ambiguous or unaddressed saleable SKUs", () => {
  const duplicated = { ...rows, offers: [rows.offers[0], rows.offers[0], rows.offers[1]] };
  for (const mode of ["list", "search", "get"]) {
    const args = mode === "search" ? { query: "" } : mode === "get" ? { sku: "ni:1" } : {};
    assert.throws(() => select(duplicated, mode, args, policy), /duplicate catalog SKU/);
  }
  const anonymous = { ...rows, offers: [{ ...rows.offers[0], sku: null }] };
  assert.throws(() => select(anonymous, "list", {}, policy), /source SKU identities/);
  const privateRepeat = { ...rows, offers: [rows.offers[0], { ...rows.offers[0], listed: false }] };
  assert.equal(select(privateRepeat, "list", {}, policy).total, 1,
    "hidden historical declarations remain outside the buyer projection");
});


test("source-owned comparison of exact public SKUs retains requested order and original seller representations", () => {
  const reading = select(rows, "compare", { skus: ["ni:2", "ni:1"] },
    { maxComparedOffers: 8, maxSkuLength: 256 });
  assert.equal(reading.kind, "x402.market.offer-comparison.v1");
  assert.deepEqual(reading.requestedSkus, ["ni:2", "ni:1"]);
  assert.equal(reading.offers[0], rows.offers[1], "original addressed offer, not a fabricated clone");
  assert.equal(reading.offers[1], rows.offers[0]);
  assert.deepEqual(reading.missingSkus, []);
  assert.equal(Object.isFrozen(reading.offers), true);
  assert.match(reading.basis, /no operation equivalence/);
});

test("comparison cannot expose held/unlisted offers or invent unknown suppliers", () => {
  const reading = select(rows, "compare", { skus: ["ni:3", "ni:unknown", "ni:1"] },
    { maxComparedOffers: 8, maxSkuLength: 256 });
  assert.deepEqual(reading.offers.map(x => x.sku), ["ni:1"]);
  assert.deepEqual(reading.missingSkus, ["ni:3", "ni:unknown"]);
  assert.equal(reading.offers.some(x => x.listed === false), false);
  assert.throws(() => select({ ...rows, offers: [rows.offers[0], rows.offers[0]] },
    "compare", { skus: ["ni:1", "ni:2"] }), /duplicate catalog SKU/);
});

test("comparison rejects ambiguous and unbudgeted caller-selected sets", () => {
  const policy = { maxComparedOffers: 3, maxSkuLength: 20 };
  for (const skus of [
    ["ni:1"], ["ni:1", "ni:1"], ["ni:1", ""], ["ni:1", null],
    ["ni:1", "x".repeat(21)], ["ni:1", "ni:2", "ni:3", "ni:4"],
  ]) assert.throws(() => select(rows, "compare", { skus }, policy), /distinct, bounded, exact seller SKUs/);
  assert.throws(() => select(rows, "compare", { skus: "ni:1,ni:2" }, policy), /distinct, bounded, exact seller SKUs/);
  assert.throws(() => select(rows, "compare", null, policy), /tool arguments/);
});
