import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { makeContentDigest, verifyContentDigest } from "../src/content-digest.mjs";
import { signRequest, verifyRequest, contentDigest } from "../src/message-signatures.mjs";

test("Content-Digest verifies exact binary content and distinguishes mismatches from malformed fields", async () => {
  const bytes=Buffer.from([0,255,1,128]), carrier={mediaType:"application/octet-stream",contentBase64:bytes.toString("base64")};
  const made=await makeContentDigest({carrier,algorithms:["sha-256","sha-512"]});
  const expected=["sha-256","sha-512"].map(a=>`${a}=:${createHash(a.replace("-","")).update(bytes).digest("base64")}:`).join(", ");
  assert.equal(made.contentDigest,expected);
  assert.equal((await verifyContentDigest({carrier,contentDigest:expected})).matches,true);
  const changed={...carrier,contentBase64:Buffer.from([0,255,1,129]).toString("base64")};
  assert.equal((await verifyContentDigest({carrier:changed,contentDigest:expected})).matches,false);
  const mixed=await verifyContentDigest({carrier,contentDigest:expected+", future=::"});
  assert.equal(mixed.matches,true);assert.deepEqual(mixed.unsupported,["future"]);
  for(const field of ["future=::","", "sha-256=token", "sha-256=::;p", "sha-256=:!:"]) await assert.rejects(verifyContentDigest({carrier,contentDigest:field}));
  assert.equal(contentDigest(bytes),expected.split(", ")[0]);
  await assert.rejects(makeContentDigest({carrier:{...carrier,contentBase64:"AB=="}}));
});
test("existing Ed25519 node profile uses native fields while retaining peer-key and time authority", async () => {
  const {privateKey,publicKey}=generateKeyPairSync("ed25519");
  for(const keyId of ["https://peer.test", 'peer\\path"quoted']) {
    const request={method:"POST",path:"/arrivals",body:'{"x":1}',keyId,privateKey,created:1000};
    const headers=signRequest(request);let resolutions=0;
    const check=extra=>verifyRequest({...request,headers,now:1000,publicKeyFor:async id=>{assert.equal(id,keyId);resolutions++;return publicKey;},...extra});
    assert.deepEqual(await check(),{ok:true,keyId});
    for(const extra of [{body:'{"x":2}'},{path:"/other"},{now:1400},{headers:{...headers,signature:"sig1=:AB==:"}},{headers:{...headers,"signature-input":'sig1=("@method");created=1000;keyid="x";alg="ed25519"'}}]) assert.equal((await check(extra)).ok,false);
    assert.equal(resolutions,2); // Valid request and cryptographically bad path only.
  }
  const headers=signRequest({method:"POST",path:"/arrivals",body:"",keyId:"peer",privateKey,created:1000});
  assert.equal((await verifyRequest({method:"POST",path:"/arrivals",body:"",headers,now:1000,publicKeyFor:()=>"invalid key"})).ok,false);
});
