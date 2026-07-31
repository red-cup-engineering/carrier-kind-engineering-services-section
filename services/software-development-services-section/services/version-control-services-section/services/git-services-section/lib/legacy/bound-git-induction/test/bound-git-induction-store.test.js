import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { claimNonce, nonceHistory, transitionNonce } from "../src/bound-git-induction-store.js";

const ID="ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
function cardEvidence(){
  return {
    route:{actor:"urn:ame:test",agentCardUrl:"https://test.invalid/.well-known/agent-card.json",account:null},
    evidence:{card:ID,signature:ID,kid:"test-key",jwks:"https://test.invalid/.well-known/jwks.json",algorithm:"EdDSA"},
  };
}

test("nonce custody is exact-request and forward-only", () => {
  const root = mkdtempSync(join(tmpdir(), "bound-git-store-"));
  try {
    assert.equal(claimNonce({ root, customer: "c", nonce: "n", requestId: "r" }).replay, false);
    assert.equal(claimNonce({ root, customer: "c", nonce: "n", requestId: "r" }).replay, true);
    assert.throws(() => claimNonce({ root, customer: "c", nonce: "n", requestId: "other" }), /grant-replay/u);
    assert.equal(transitionNonce({ root, customer: "c", nonce: "n", requestId: "r", state: "child-requested" }).state, "child-requested");
    assert.throws(() => transitionNonce({ root, customer: "c", nonce: "n", requestId: "r", state: "completed" }), /invalid-transition/u);
    assert.equal(nonceHistory({root,customer:"c",nonce:"n"}).length,2);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("nonce transitions retain exact receiver evidence for fresh-process replay", () => {
  const root = mkdtempSync(join(tmpdir(), "bound-git-store-evidence-"));
  try {
    const requestId=ID;
    claimNonce({root,customer:"c",nonce:"n",requestId,request:{type:"fixture"},requestBytes:Buffer.from([1,2]),requestJws:{protected:"a",payload:"AQI",signature:"b"},requestCardEvidence:cardEvidence()});
    transitionNonce({root,customer:"c",nonce:"n",requestId,state:"child-requested",childOperationId:requestId,profileOperationBytes:Buffer.from([5,6]),profileOperationJws:{protected:"e",payload:"BQY",signature:"f"},profileOperationCardEvidence:{card:requestId},evidenceRequest:{type:"request"},evidenceResultBytes:Buffer.from([3,4]),evidenceResultJws:{protected:"c",payload:"AwQ",signature:"d"},evidenceResultCardEvidence:cardEvidence(),releaseResultId:requestId,allocationId:requestId});
    const record=nonceHistory({root,customer:"c",nonce:"n"}).at(-1);
    assert.deepEqual(Buffer.from(record.evidenceResultBytes.data),Buffer.from([3,4]));
    assert.deepEqual(record.evidenceResultJws,{protected:"c",payload:"AwQ",signature:"d"});
    assert.equal(record.requestCardEvidence.evidence.card,requestId);
    assert.deepEqual(Buffer.from(record.profileOperationBytes.data),Buffer.from([5,6]));
    assert.equal(record.profileOperationCardEvidence.card,requestId);
    assert.equal(record.evidenceResultCardEvidence.evidence.card,requestId);
    assert.equal(record.releaseResultId,requestId);
    assert.equal(record.allocationId,requestId);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("malformed authenticated-card evidence refuses before nonce history grows",()=>{
  const root=mkdtempSync(join(tmpdir(),"bound-git-store-card-refusal-"));
  try{
    const variants=[];
    let value=cardEvidence();delete value.route;variants.push(value);
    value=cardEvidence();value.extra=true;variants.push(value);
    value=cardEvidence();value.route=undefined;variants.push(value);
    value=cardEvidence();delete value.route.actor;variants.push(value);
    value=cardEvidence();value.route.extra=true;variants.push(value);
    value=cardEvidence();value.route.actor=undefined;variants.push(value);
    value=cardEvidence();delete value.evidence.algorithm;variants.push(value);
    value=cardEvidence();value.evidence.extra=true;variants.push(value);
    value=cardEvidence();value.evidence.kid=undefined;variants.push(value);
    for(const [index,requestCardEvidence] of variants.entries()){
      const nonce=`n-${index}`;
      assert.throws(()=>claimNonce({root,customer:"c",nonce,requestId:ID,requestCardEvidence}),/authenticated-card-evidence-malformed/u);
      assert.equal(nonceHistory({root,customer:"c",nonce}).length,0);
    }
  }finally{rmSync(root,{recursive:true,force:true})}
});
