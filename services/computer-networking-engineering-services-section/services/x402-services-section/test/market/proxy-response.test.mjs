import test from "node:test";
import assert from "node:assert/strict";
import { encodePaymentRequiredHeader, decodePaymentRequiredHeader } from "@x402/core/http";
import { projectProxyResponse } from "../../src/market/proxy-response.mjs";

const endpoint="https://market.561.group/v1/four/reading-convert";
const native=()=>({x402Version:2,resource:{url:endpoint,description:"Native merchant quote",mimeType:"application/json"},accepts:[{scheme:"exact",network:"eip155:8453",asset:"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",amount:"1000",payTo:"0x32886F6F361C1d570255c2762967A2e41D0E9B1a",maxTimeoutSeconds:300,extra:{name:"USD Coin",version:"2"}}]});
const response=(challenge,body=JSON.stringify(challenge))=>new Response(body,{status:402,headers:{"content-type":"application/json","payment-required":encodePaymentRequiredHeader(challenge)}});
test("already-public native quotes retain their exact bytes, terms and request-input endpoint scope",async()=>{
 const challenge=native(),body=JSON.stringify(challenge,null,2),upstream=response(challenge,body),encoded=upstream.headers.get("payment-required");
 const out=await projectProxyResponse(upstream,{publicUrl:endpoint+"?input=example",resourceUrl:endpoint});
 assert.equal(out.status,402);assert.equal(out.headers.get("payment-required"),encoded);assert.equal(await out.text(),body);
 assert.deepEqual(decodePaymentRequiredHeader(out.headers.get("payment-required")),challenge);
 const paidBytes=Uint8Array.from([0,255,1]),paid=new Response(paidBytes,{status:200,headers:{"payment-response":"reported-settlement"}});
 const delivered=await projectProxyResponse(paid,{publicUrl:endpoint});assert.equal(delivered.headers.get("payment-response"),"reported-settlement");assert.deepEqual(new Uint8Array(await delivered.arrayBuffer()),paidBytes);
});
test("other resources and contradictory inline terms are refused rather than renamed",async()=>{
 const challenge=native();
 for(const url of ["https://other.test/v1/four/reading-convert","https://market.561.group/v1/other","http://node-market.561.group:8087/v1/four/reading-convert"]){const out=await projectProxyResponse(response({...challenge,resource:{...challenge.resource,url}}),{publicUrl:endpoint});assert.equal(out.status,502);}
 const inline={...challenge,accepts:[{...challenge.accepts[0],amount:"999999"}]};assert.equal((await projectProxyResponse(response(challenge,JSON.stringify(inline)),{publicUrl:endpoint})).status,502);
});

test("missing and oversized upstream payment-required headers fail closed",async()=>{
 const missing=new Response("payment needed",{status:402,headers:{"content-type":"text/plain"}});
 const absent=await projectProxyResponse(missing,{publicUrl:endpoint});
 assert.equal(absent.status,502);
 assert.equal(absent.headers.get("payment-required"),null);
 const oversized=new Response("oversized",{status:402,headers:{"payment-required":"A".repeat(65_537)}});
 const refused=await projectProxyResponse(oversized,{publicUrl:endpoint});
 assert.equal(refused.status,502);
 assert.equal(refused.headers.get("payment-required"),null);
 const empty=new Response("empty",{status:402,headers:{"payment-required":""}});
 assert.equal((await projectProxyResponse(empty,{publicUrl:endpoint})).status,502);
});

test("merchant-authorized expectedTerms bind Node quotes to owner contract, asset, payee and tariff",async()=>{
 const nativeQuote=native();
 const base=nativeQuote.accepts[0];
 const expectedTerms={network:base.network,asset:base.asset,payTo:base.payTo,amount:base.amount};
 const accepted=await projectProxyResponse(response(nativeQuote),{publicUrl:endpoint,expectedTerms});
 assert.equal(accepted.status,402);
 assert.equal(decodePaymentRequiredHeader(accepted.headers.get("payment-required")).accepts[0].amount,base.amount);
 for(const altered of [
   {network:"eip155:5615611"},
   {asset:"0x"+"11".repeat(20)},
   {payTo:"0x"+"22".repeat(20)},
   {amount:"2000"},
   {amount:"1"},
   {scheme:"batch-settlement"},
 ]) {
   const upstream=response({...nativeQuote,accepts:[{...base,...altered}]});
   const rejected=await projectProxyResponse(upstream,{publicUrl:endpoint,expectedTerms});
   assert.equal(rejected.status,502,JSON.stringify(altered));
   assert.equal(rejected.headers.get("payment-required"),null);
 }
 const mixed=response({...nativeQuote,accepts:[base,{...base,payTo:"0x"+"22".repeat(20)}]});
 assert.equal((await projectProxyResponse(mixed,{publicUrl:endpoint,expectedTerms})).status,502);
});


test("the proxy bounds optional 402 bodies by bytes, not a trusted content-length", async () => {
  const challenge = native();
  const paymentHeader = encodePaymentRequiredHeader(challenge);
  const body = new Uint8Array(262_144);
  body.fill(97);
  const admitted = await projectProxyResponse(new Response(body, {
    status: 402, headers: { "payment-required": paymentHeader, "content-type": "application/octet-stream" },
  }), { publicUrl: endpoint });
  assert.equal(admitted.status, 402);
  assert.deepEqual(new Uint8Array(await admitted.arrayBuffer()), body);
  const declaredTooLarge = await projectProxyResponse(new Response("small", {
    status: 402, headers: { "payment-required": paymentHeader, "content-length": "999999999" },
  }), { publicUrl: endpoint });
  assert.equal(declaredTooLarge.status, 502);
  const streamedTooLarge = await projectProxyResponse(new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(200_000));
      controller.enqueue(new Uint8Array(70_000));
      controller.close();
    },
  }), {status: 402, headers: {"payment-required": paymentHeader}}), { publicUrl: endpoint });
  assert.equal(streamedTooLarge.status, 502);
  assert.equal(streamedTooLarge.headers.get("payment-required"), null);
});
