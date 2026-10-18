import test from "node:test";
import assert from "node:assert/strict";
import { selectPublicMarketCatalogRows as select, compareMarketOfferSamples, requestContract, selectMarketCoordinateFiber } from "../../src/market/catalog.mjs";
import { validateJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";

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


test("exact price filters cannot mistake starting tariffs for a buyer's fixed price", () => {
  const readout = {
    ...rows,
    settlement: { network: "eip155:8453", asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
    offers: [
      { ...rows.offers[0], sku: "ni:cheap", amountAtomic: "1000", category: "data" },
      { ...rows.offers[1], sku: "ni:costly", amountAtomic: "20000", category: "data" },
      { ...rows.offers[0], sku: "ni:variable", amountAtomic: "100",
        pricing: { minimumAtomic: "100", mode: "canonical-json-byte-bands" } },
      { ...rows.offers[1], sku: "ni:unknown", amountAtomic: null },
      { ...rows.offers[0], sku: "ni:held", listed: false, amountAtomic: "1" },
    ],
  };
  assert.deepEqual(select(readout, "search", { query: "", maxFixedPriceAtomic: "1000" }).offers.map(row=>row.sku),
    ["ni:cheap"]);
  assert.deepEqual(select(readout, "search", { query: "", maxFixedPriceAtomic: "20000" }).offers.map(row=>row.sku),
    ["ni:cheap", "ni:costly"]);
  assert.equal(select(readout, "search", { query: "", maxFixedPriceAtomic: "0" }).total, 0);
  assert.deepEqual(select(readout, "search", { query: "gas", category: "data", maxFixedPriceAtomic: "1000" })
    .offers.map(row=>row.sku), ["ni:cheap"], "filter composes with existing literal discovery");
  assert.equal(readout.offers[2].amountAtomic, "100", "price filters never mutate the seller");
});

test("atomic budget search refuses missing settlement denomination and misleading price syntax", () => {
  const priced = { ...rows, settlement: { network: "eip155:8453", asset: "0x" + "ab".repeat(20) } };
  assert.throws(() => select(rows, "search", { query: "", maxFixedPriceAtomic: "1000" }),
    /requires source-qualified network and asset/);
  for (const val of [1, "-1", "01", "1.0", "1e9", "", "a", "0".repeat(2), "9".repeat(90)]) {
    assert.throws(() => select(priced, "search", { query: "", maxFixedPriceAtomic: val }),
      /canonical uint256 atomic amount/);
  }
  assert.throws(() => select(priced, "search", {
    query: "", maxFixedPriceAtomic: "9".repeat(78),
  }), /canonical uint256 atomic amount/, "uint256 overflow must not be silently accepted");
});

test("sample composition uses the original JSON Schema evaluator and exact public SKUs", () => {
  const report = {recordType: "561-group.x402-market-catalog", offers: [
    {
      sku: "ni:source", listed: true, method: "GET", name: "Measure metres",
      output: { schema: {type:"object",required:["amount","unit"],properties:{
        amount:{type:"integer"},unit:{const:"m"}}}, example: {amount:3,unit:"m"}},
      request:{}
    },
    {
      sku: "ni:consumer", listed: true, method: "POST", name: "Use metres",
      request: {bodySchema:{type:"object",required:["amount","unit"],properties:{
        amount:{type:"integer"},unit:{const:"m"}}}},
      output:{schema:{type:"object"},example:{accepted:true}},
    },
    {
      sku: "ni:km", listed: true, method: "POST", name: "Use kilometres",
      request: {bodySchema:{type:"object",required:["amount","unit"],properties:{
        amount:{type:"integer"},unit:{const:"km"}}}},
      output:{schema:{type:"object"},example:{accepted:true}},
    },
    {
      sku: "ni:held", listed: false, method:"POST", name:"Internal",
      request:{bodySchema:{type:"object"}},output:{schema:{type:"object"},example:{amount:3,unit:"m"}},
    },
  ]};
  const selected = select(report,"compare",{skus:["ni:source","ni:consumer","ni:km","ni:held"]},
    {maxComparedOffers:8,maxSamplePairs:56});
  assert.deepEqual(selected.offers.map(x=>x.sku), ["ni:source","ni:consumer","ni:km"]);
  assert.deepEqual(selected.missingSkus, ["ni:held"]);
  const relation = selected.sampleComposition;
  assert.equal(relation.kind, "x402.market.sample-composition-reading.v1");
  assert.equal(relation.totalDirectedPairs,6);
  assert.equal(relation.consideredPairs,6);
  assert.equal(relation.complete,true);
  assert.ok(relation.sampleRefusedPairs > 0, "different measurement units cannot be silently glued");
  assert.ok(relation.sampleAdmittedLinks.some(edge=>
    edge.from==="ni:source" && edge.to==="ni:consumer"
    && edge.evidenceLevel==="one-example-structural-only"
    && edge.executionAuthorized===false));
  assert.equal(relation.sampleAdmittedLinks.some(edge=>edge.to==="ni:km" && edge.from==="ni:source"),false);
  assert.equal(relation.sampleAdmittedLinks.some(edge=>edge.to==="ni:held" || edge.from==="ni:held"),false);
  assert.equal(relation.authorizesExecution,false);
});

test("original sample evaluation refuses invalid sources and reports unfinished budgets", () => {
  const a={sku:"a",method:"GET",output:{schema:{type:"string"},example:{value:4}}};
  const b={sku:"b",method:"POST",request:{bodySchema:{type:"object"}}};
  const bad=compareMarketOfferSamples([a,b],{maxSamplePairs:2});
  assert.deepEqual(bad.invalidOutputExampleSkus,["a"]);
  assert.deepEqual(bad.sampleAdmittedLinks,[]);
  assert.equal(bad.sampleUnassayedPairs,2);
  const partial=compareMarketOfferSamples([a,b],{maxSamplePairs:1});
  assert.equal(partial.complete,false);
  assert.equal(partial.consideredPairs,1);
  assert.equal(partial.unexaminedPairs,1);
  const none=compareMarketOfferSamples([a,b]);
  assert.equal(none.complete,false);
  assert.equal(none.unexaminedPairs,2);
  assert.throws(()=>compareMarketOfferSamples([a,b],{maxSamplePairs:-1}),/budget/);
  const invalidTarget=compareMarketOfferSamples([
    {sku:"x",method:"GET",output:{schema:{type:"object"},example:{good:true}}},
    {sku:"y",method:"POST",request:{bodySchema:{"$schema":"unsupported",type:"object"}}},
  ],{maxSamplePairs:2});
  assert.equal(invalidTarget.sampleAdmittedLinks.length,0);
  assert.deepEqual(invalidTarget.invalidTargetSchemaSkus,["y"]);
});

test("optional-only POST schemas cannot manufacture apparently useful workflow paths", () => {
  const source={
    sku:"source",method:"GET",
    output:{schema:{type:"object",required:["amount"],properties:{amount:{type:"integer"}}},
      example:{amount:7}},
  };
  const broad={sku:"broad-translate",method:"POST",
    request:{bodySchema:{properties:{text:{type:"string"}}}}};
  const result=compareMarketOfferSamples([source,broad],{maxSamplePairs:2});
  assert.equal(result.complete,true);
  assert.deepEqual(result.sampleAdmittedLinks,[]);
  assert.deepEqual(result.nonDiscriminatingInputSchemaSkus,["broad-translate"]);
  assert.equal(result.sampleUnassayedPairs,2);
  assert.equal(result.authorizesExecution,false);
  const actual={...broad,sku:"required-input",
    request:{bodySchema:{required:["amount"],properties:{amount:{type:"integer"}}}}};
  const repaired=compareMarketOfferSamples([source,actual],{maxSamplePairs:2});
  assert.deepEqual(repaired.nonDiscriminatingInputSchemaSkus,[]);
  assert.deepEqual(repaired.sampleAdmittedLinks.map(edge=>[edge.from,edge.to]),
    [["source","required-input"]]);
});

test("one original POST request contract exposes the same object admission as the live market", () => {
  const declaration = {
    method:"POST", route:"/v1/consumer",
    bodySchema:{required:["amount"],properties:{amount:{type:"integer"}}},
    bodyExample:{amount:5},
  };
  const original=JSON.stringify(declaration.bodySchema);
  const request=requestContract({declaration,probeUrl:"https://market.example/v1/consumer",
    mimeType:"application/json"});
  assert.equal(request.bodySchema.type,"object");
  assert.equal(JSON.stringify(declaration.bodySchema),original,"original declaration is not rewritten");
  assert.equal(validateJsonSchema({amount:5},request.bodySchema).valid,true);
  assert.equal(validateJsonSchema("held",request.bodySchema).valid,false,
    "required applies only to objects in standard JSON Schema; market admission supplies object type");
  const source={sku:"string-producer",method:"GET",
    output:{schema:{type:"string"},example:"held"}};
  const target={sku:"object-consumer",method:"POST",request};
  const comparison=compareMarketOfferSamples([source,target],{maxSamplePairs:2});
  assert.deepEqual(comparison.sampleAdmittedLinks,[]);
  assert.equal(comparison.sampleRefusedPairs,1,
    "unrelated string output is not admitted as an object request");
  assert.equal(comparison.authorizesExecution,false);
});

test("a trusted coordinate host can select real capacity beyond the first market's alpha profile", () => {
  const readout = {
    recordType: "561-group.x402-market-catalog",
    offers: Array.from({length: 25}, (_, i) => ({
      sku: "ni:source:" + i, listed: true, name: "Source " + i,
      gateway: "gateway-" + i, seller: { enterprise: "seller-" + i },
      category: "category-" + i, compute:{package:"@provider/" + i},
    })),
  };
  const output = selectMarketCoordinateFiber(readout, { limit:22 }, {
    maxPageSize:22, maxOffset:100001, maxFacetValues:22,
  });
  assert.equal(output.total,25);
  assert.equal(output.offers.length,22);
  assert.equal(output.nextOffset,22);
  assert.equal(output.facets.seller.values.length,22);
  assert.equal(output.facets.seller.truncated,true);
  assert.equal(selectMarketCoordinateFiber(readout, {offset:100001}, {
    maxOffset:100001,
  }).offers.length,0);
  const conservative = selectMarketCoordinateFiber(readout);
  assert.equal(conservative.offers.length,20);
  assert.equal(conservative.facets.seller.values.length,12);
  assert.throws(()=>selectMarketCoordinateFiber(readout,{limit:22},{
    maxPageSize:20,
  }),/budget exceeded/);
  assert.throws(()=>selectMarketCoordinateFiber(readout,{},{
    maxFacetValues:Infinity,
  }),/budget exceeded/);
});
