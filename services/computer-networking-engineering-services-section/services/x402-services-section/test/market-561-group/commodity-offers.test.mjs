import assert from "node:assert/strict";
import test from "node:test";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { encodePaymentSignatureHeader, decodePaymentResponseHeader } from "@x402/core/http";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { createMarket561Group, catalog } from "../../apps/market-561-group/src/market.mjs";
import { marketX402Service } from "../../src/market/market.mjs";
import { loadEdgeBinding } from "../../apps/market-561-group/src/edge-bindings.mjs";
import { edgeSettlementJournal } from "../../apps/market-561-group/src/edge-settlement.mjs";
import { canonicalizeJsonText, applyJsonMergePatch, selectJsonPointer } from "@red-cup-engineering/json-services-section/json-transformations";
import { csvToJson, jsonToCsv } from "@red-cup-engineering/csv-services-section/csv-codec";
import { jsonlToJson, jsonToJsonl } from "@red-cup-engineering/jsonl-services-section/convert-jsonl";

test("standards preserve edge cases and reject lossy or unsafe conversions", () => {
 assert.deepEqual(selectJsonPointer({value:{"a/b":[null]},pointer:"#/a~1b/0"}),{found:true,value:null});
 for(const pointer of ["/constructor","/toString","/00","/-1","/1e0"]) assert.deepEqual(selectJsonPointer({value:[4],pointer}),{found:false});
 assert.throws(()=>selectJsonPointer({value:{},pointer:"/x~2"}));
 assert.throws(()=>canonicalizeJsonText({text:'{"x":1,"x":2}'}));
 const value=applyJsonMergePatch(JSON.parse('{"value":{"a":1},"patch":{"__proto__":{"polluted":true},"a":null}}'));
 assert.equal(Object.hasOwn(value,"__proto__"),true); assert.equal({}.polluted,undefined);assert.equal(Object.hasOwn(value,"a"),false);
 assert.deepEqual(applyJsonMergePatch({value:{a:[1]},patch:{a:[2,3]}}),{a:[2,3]});
 const records=[{"a,b":'x"y',"note":"line1\nline2"}];
 const csv=jsonToCsv({records,columns:["a,b","note"]});
 assert.equal(csv.text,'"a,b","note"\r\n"x""y","line1\nline2"\r\n');
 assert.deepEqual(csvToJson({text:csv.text}).records,records);
 assert.deepEqual(csvToJson({text:'"x"\r\n""\r\n'}).records,[{x:""}]);
 for(const text of ['a,a\n1,2','a,b\n1,2,3','a\n"x"oops','a\nxx"yy']) assert.throws(()=>csvToJson({text}));
 assert.deepEqual(jsonlToJson({text:'0\nnull\r\n\n{"x":1}\n'}).values,[0,null,{x:1}]);
 assert.throws(()=>jsonlToJson({text:'{}\ninvalid'}),/line 2/);
 assert.equal(jsonToJsonl({values:[null,{b:2,a:1}]}).text,'null\n{"a":1,"b":2}\n');
 assert.throws(()=>csvToJson({text:"x".repeat(65537)}));
 assert.throws(()=>csvToJson({text:"\ud800"}));
 assert.throws(()=>jsonToCsv({columns:["n"],records:[{n:Infinity}]}));
});

test("commodity edge offers carry native signed payment through computation, settlement and delivery",async()=>{
 const network="eip155:8453",payTo="0x32886F6F361C1d570255c2762967A2e41D0E9B1a";
 // Public development key; facilitator test doubles never contact a chain.
 const signer=privateKeyToAccount("0x"+"01".repeat(32));
 const observed=[],settled=[],booked=[];
 const journal=edgeSettlementJournal(catalog(),{MARKET_SETTLEMENTS:{async put(key,text){booked.push(JSON.parse(text));}}},{log:()=>{}});
 let calls=0,refuse=false;
 const facilitatorClient={
 async getSupported(){return {kinds:[{x402Version:2,scheme:"exact",network}],extensions:["bazaar"],signers:{}};},
 async verify(payload){assert.match(payload.payload.signature,/^0x[0-9a-f]+$/i);calls++;return {isValid:true,payer:signer.address};},
 async settle(payload,requirements){settled.push({payload,requirements});return refuse?{success:false,network,errorReason:"test settlement refused"}:{success:true,network,payer:signer.address,transaction:"0x"+"ab".repeat(32)};}
 };
 const market=createMarket561Group({MARKET_RUNTIME:"edge",X402_NETWORK:network,X402_PAY_TO:payTo,X402_FACILITATOR:"https://test.invalid"},{load:loadEdgeBinding,facilitatorClient,afterSettle:async c=>{observed.push(c);await journal(c);}});
 const client=new x402Client();registerExactEvmScheme(client,{signer,networks:[network]});
 const http=new x402HTTPClient(client);
 const offers=catalog().filter(o=>o.declaration.route.startsWith("/v1/data/"));
 assert.equal(offers.length,42);
 const descriptor=await (await market.fetch(new Request("https://market.561.group/.well-known/x402-service.json"))).json();
 assert(descriptor.capabilities.length<=20);assert(descriptor.services.some(s=>s.name==="CSV to JSON Records"));
 assert.equal(descriptor.pricing.base,"0"); // The catalogue itself is free.
 const single=marketX402Service([offers[0]],market.rails());assert.equal(single.pricing.base,"0.0012");assert.equal(single.endpoint,offers[0].url);assert.match(single.description,/HTTP POST/);
 const discovery=await (await market.fetch(new Request("https://market.561.group/.well-known/x402"))).json();
 const jsonTool=discovery.resources.find(r=>r.name==="RFC 8785 Canonical JSON");
 assert.deepEqual(jsonTool.inputSchema.required,["text"]);assert.deepEqual(jsonTool.inputSchema.example,{text:'{"z":2,"a":1}'});
 const serializerTool=discovery.resources.find(r=>r.name==="Typed JSON to RFC 9651 Structured Field");
 assert.deepEqual(serializerTool.inputSchema.required,["kind","value"]);

 for(const offer of offers){
 const metadata=await market.fetch(new Request(offer.url+"/.well-known/x402-service.json"));
 assert.equal(metadata.status,200);
 const manifest=await metadata.json();
 assert.equal(manifest.name,offer.declaration.name);assert.equal(manifest.endpoint,offer.url);assert.equal(manifest.pricing.base,"0.0012");
 const init={method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(offer.declaration.bodyExample)};
 const unpaid=await market.fetch(new Request(offer.url,init));assert.equal(unpaid.status,402);
 const challenge=http.getPaymentRequiredResponse(name=>unpaid.headers.get(name));
 assert.equal(challenge.x402Version,2);assert.equal(challenge.accepts[0].amount,"1200");
 assert.equal(challenge.extensions.bazaar.info.input.method,"POST");
 const payload=await client.createPaymentPayload(challenge);
 const paid=await market.fetch(new Request(offer.url,{...init,headers:{...init.headers,"PAYMENT-SIGNATURE":encodePaymentSignatureHeader(payload)}}));
 assert.equal(paid.status,200,await paid.clone().text());
 assert.deepEqual(await paid.json(),offer.declaration.output.example);
 assert.equal(decodePaymentResponseHeader(paid.headers.get("payment-response")).success,true);
 const bad=await market.fetch(new Request(offer.url,{...init,body:"{}"}));assert([400,422].includes(bad.status));assert.equal(bad.headers.get("payment-required"),null);
 }
 assert.equal(calls,offers.length);assert.equal(observed.length,offers.length);assert.equal(settled.length,offers.length);
 refuse=true;
 const o=offers[0],init={method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(o.declaration.bodyExample)};
 const unpaid=await market.fetch(new Request(o.url,init));
 const payload=await client.createPaymentPayload(http.getPaymentRequiredResponse(name=>unpaid.headers.get(name)));
 const failed=await market.fetch(new Request(o.url,{...init,headers:{...init.headers,"PAYMENT-SIGNATURE":encodePaymentSignatureHeader(payload)}}));
 assert.notEqual(failed.status,200);assert.equal(observed.length,offers.length+1);assert.equal(observed.at(-1).result.success,false);assert.equal(booked.length,offers.length);
 await journal({result:{success:false,network,transaction:"0x"+"cd".repeat(32)}});assert.equal(booked.length,offers.length);
});

