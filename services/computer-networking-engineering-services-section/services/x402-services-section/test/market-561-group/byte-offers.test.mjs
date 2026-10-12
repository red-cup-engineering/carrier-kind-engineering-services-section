import assert from "node:assert/strict";
import test from "node:test";
import { encodeJsonByteCarrier } from "@red-cup-engineering/json-services-section/encode-json-byte-carrier";
import { decodeJsonByteCarrier } from "@red-cup-engineering/json-services-section/decode-json-byte-carrier";
import { createMarket561Group } from "../../apps/market-561-group/src/market.mjs";
import { loadEdgeBinding } from "../../apps/market-561-group/src/edge-bindings.mjs";

test("RFC 4648 vectors, arbitrary binary and owner limits survive byte conversion",()=>{
 const vectors=[["",""],["f","Zg=="],["fo","Zm8="],["foo","Zm9v"],["foob","Zm9vYg=="],["fooba","Zm9vYmE="],["foobar","Zm9vYmFy"]];
 for(const [text,contentBase64] of vectors){
 const bytes=Array.from(new TextEncoder().encode(text)),mediaType="application/octet-stream";
 assert.deepEqual(encodeJsonByteCarrier({bytes,mediaType}),{mediaType,contentBase64});
 assert.deepEqual(decodeJsonByteCarrier({carrier:{mediaType,contentBase64}}),{mediaType,bytes});
 }
 const binary=[0,255,128,1,254];assert.deepEqual(decodeJsonByteCarrier({carrier:encodeJsonByteCarrier({bytes:binary,mediaType:"image/png"})}).bytes,binary);
 for(const contentBase64 of ["Zg","Zh==","Zm9=","Zg==\n","Zg===","-w=="]) assert.throws(()=>decodeJsonByteCarrier({carrier:{mediaType:"text/plain",contentBase64}}));
 assert.throws(()=>encodeJsonByteCarrier({bytes:[1,2,3],mediaType:"text/plain"},{maximumBytes:2}),RangeError);
 assert.throws(()=>decodeJsonByteCarrier({carrier:{mediaType:"text/plain",contentBase64:"AQID"},maximumBytes:1000},{maximumBytes:2}),RangeError);
 assert.throws(()=>decodeJsonByteCarrier({carrier:{mediaType:"image/png",contentBase64:""},expectedMediaType:"text/plain"}));
});

test("the actual edge request stage enforces schema contracts without evaluating generated code",async()=>{
 const env={MARKET_RUNTIME:"edge",X402_NETWORK:"eip155:8453",X402_PAY_TO:"0x32886F6F361C1d570255c2762967A2e41D0E9B1a",X402_FACILITATOR:"https://test.invalid"};
 const market=createMarket561Group(env,{load:loadEdgeBinding,facilitatorClient:{async getSupported(){return {kinds:[{x402Version:2,scheme:"exact",network:env.X402_NETWORK}],extensions:[],signers:{}};},async verify(){throw Error("unpaid");},async settle(){throw Error("unpaid");}}});
 const OriginalFunction=globalThis.Function,originalEval=globalThis.eval;
 globalThis.Function=function(){throw Error("dynamic code generation forbidden");};globalThis.eval=()=>{throw Error("dynamic code generation forbidden");};
 try{
 const post=(route,body)=>market.fetch(new Request("https://market.561.group"+route,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));
 assert.equal((await post("/v1/data/bytes-base64",{bytes:[0,255],mediaType:"application/octet-stream"})).status,402);
 assert.equal((await post("/v1/data/bytes-base64",{bytes:Array(65536).fill(255),mediaType:"application/octet-stream"})).status,402);
 const overWire=await post("/v1/data/bytes-base64",{bytes:[1],mediaType:"x".repeat(300000)});assert.equal(overWire.status,413);assert.equal(overWire.headers.get("payment-required"),null);
 for(const body of [{bytes:[256],mediaType:"text/plain"},{bytes:[1],mediaType:"text/plain",extra:"ignored before"},{bytes:Array(65537).fill(0),mediaType:"text/plain"}]){
 const refused=await post("/v1/data/bytes-base64",body);assert.equal(refused.status,400);assert.equal(refused.headers.get("payment-required"),null);
 }
 const padBits=await post("/v1/data/base64-bytes",{carrier:{mediaType:"text/plain",contentBase64:"Zh=="}});
 assert.equal(padBits.status,422);assert.equal(padBits.headers.get("payment-required"),null);
 const widened=await post("/v1/data/base64-bytes",{carrier:{mediaType:"text/plain",contentBase64:"Zg=="},maximumBytes:65537});
 assert.equal(widened.status,400);assert.equal(widened.headers.get("payment-required"),null);
 }finally{globalThis.Function=OriginalFunction;globalThis.eval=originalEval;}
});

