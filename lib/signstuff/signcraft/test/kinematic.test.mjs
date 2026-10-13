import { test } from "node:test";
import assert from "node:assert/strict";
import { motionOfDerivation } from "../src/inference/kinematic.mjs";

const event=(attr,premises=[],by="given",ruleId)=>({
  attr,premises,by,...(ruleId===undefined?{}:{ruleId})
});

test("real signed-inference event identities yield ordered kinematic motions",()=>{
  const D=new Map([
    ["a",event("a")],
    ["b",event("b",["a"],"specialization","rule:spec-1")],
    ["c",event("c",["b","a"],"converse","rule:converse-2")],
  ]);
  const motion=motionOfDerivation(D,"c");
  assert.deepEqual(motion.chain,[
    event("a"),
    event("b",["a"],"specialization","rule:spec-1"),
    event("c",["b","a"],"converse","rule:converse-2")
  ]);
  assert.deepEqual(motion.stages.map(x=>x.stage),[0,1,2]);
  assert.equal(motion.criticalPathLength,2);
  assert.equal(motion.eventCount,3);
  assert.equal(motion.dependencyCount,3);
  assert.equal(motionOfDerivation(D,"not-present"),null);
});

test("cannot pass missing, malformed or cyclic witnesses as a path",()=>{
  assert.throws(()=>motionOfDerivation(new Map([["a",event("a",["x"],"rule")]]),"a"),/missing premise/);
  assert.throws(()=>motionOfDerivation(new Map([
    ["a",event("a",["b"],"rule")],
    ["b",event("b",["a"],"rule")]
  ]),"a"),/cyclic proof motion/);
  assert.throws(()=>motionOfDerivation(new Map([["a",event("wrong")]]),"a"),/malformed derivation/);
  assert.throws(()=>motionOfDerivation(new Map([["a",event("a",[undefined],"rule")]]),"a"),/unresolved premise/);
});

test("very long inference histories no longer exhaust the JavaScript recursion stack",()=>{
  const n=24000;
  const D=new Map();
  D.set("0",event("0"));
  for(let i=1;i<n;i++)D.set(String(i),event(String(i),[String(i-1)],"advance","rule:"+i));
  const motion=motionOfDerivation(D,String(n-1));
  assert.equal(motion.eventCount,n);
  assert.equal(motion.criticalPathLength,n-1);
  assert.equal(motion.stages.at(-1).attr,String(n-1));
  assert.equal(motion.stages.at(0).stage,0);
});
