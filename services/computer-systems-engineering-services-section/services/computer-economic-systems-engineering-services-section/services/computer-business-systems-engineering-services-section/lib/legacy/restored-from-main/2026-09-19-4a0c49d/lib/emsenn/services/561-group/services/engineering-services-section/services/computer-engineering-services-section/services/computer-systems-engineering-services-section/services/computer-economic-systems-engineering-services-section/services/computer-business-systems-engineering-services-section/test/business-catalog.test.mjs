import test from "node:test";import assert from "node:assert/strict";import {deriveBusinessCatalog} from "../src/business-catalog.mjs";
test("invalid query and empty source identity refuse", () => {
  assert.throws(() => deriveBusinessCatalog({ records: [], query: 42 }), /query/);
  assert.throws(() => deriveBusinessCatalog({ records: [], offset: Infinity }), /safe integers/);
  assert.equal(deriveBusinessCatalog({ records: [{ sourcePath: "", kind: "product", package: {path: "a"} }] }).findings.length, 1);
});
test("conflicting identities and valid evidence are independent of input order", () => {
  const records = [
    { sourcePath: "a/z.json", kind: "offer", package: {path: "a", name: "z", version: "2"}, ids: ["b", "a"] },
    { sourcePath: "a/a.json", kind: "product", package: {path: "a", name: "a", version: "1"}, urls: ["https://example.com"] },
  ];
  const forward = deriveBusinessCatalog({ records });
  assert.deepEqual(forward, deriveBusinessCatalog({ records: [...records].reverse() }));
  assert.equal(forward.items[0].package.name, null);
  assert.equal(forward.items[0].packageIdentities.length, 2);
});
const r=(path,name="x",x={})=>({sourcePath:path+"/a.json",kind:"product",package:{path,name,version:"1"},ids:["id"],accounts:["Income:Sales"],urls:["https://x"],repositories:[],...x});
test("shared account retains groups",()=>assert.equal(deriveBusinessCatalog({records:[r("a"),r("b")]}).items.length,2));
test("same name distinct packages ambiguity",()=>assert.ok(deriveBusinessCatalog({records:[r("a","x"),r("b","x")]}).items.every(x=>x.ambiguousName)));
test("malformed finding",()=>assert.equal(deriveBusinessCatalog({records:[{}]}).findings.length,1));
test("deterministic paging",()=>{const x=deriveBusinessCatalog({records:[r("b"),r("a")],limit:1});assert.equal(x.items[0].package.path,"a");assert.equal(x.nextOffset,1)});
test("declared live stays unobserved",()=>assert.equal(deriveBusinessCatalog({records:[r("a","x",{declaredStatus:"live"})]}).items[0].live,"unobserved"));
test("unnamed product is discovered",()=>assert.equal(deriveBusinessCatalog({records:[r("a","", {ids:[]})]}).total,1));
test("account filter retains sibling evidence and total differs matched",()=>{const x=deriveBusinessCatalog({records:[r("a","x",{accounts:["Income:A"]}),r("a","x",{accounts:["Other"]}),r("b","y",{accounts:["Other"]})],accountPrefix:"Income:"});assert.equal(x.total,2);assert.equal(x.matched,1);assert.deepEqual(x.items[0].accounts,["Income:A","Other"])});
test("malformed scalar list and limit zero refuse",()=>{const x=deriveBusinessCatalog({records:[r("a","x",{accounts:"bad"})]});assert.equal(x.findings[0].reason,"malformed-accounts");assert.throws(()=>deriveBusinessCatalog({records:[],limit:0}))});
test("conflicting package identity is retained as finding",()=>{const x=deriveBusinessCatalog({records:[r("a","x"),r("a","y")]});assert.ok(x.findings.some(f=>f.reason==="conflicting-package-identity"))});
