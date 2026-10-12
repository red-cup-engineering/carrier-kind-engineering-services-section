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
