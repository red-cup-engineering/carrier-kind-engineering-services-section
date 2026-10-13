import { test } from "node:test";
import assert from "node:assert/strict";
import { motionOfDerivation, scheduleOfDerivation } from "../src/inference/kinematic.mjs";

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


test("diamond proof motion admits parallel dependencies and minimal wavefront", () => {
  const d = new Map([
    ["source", event("source")],
    ["left", event("left", ["source"], "rule", "left-license")],
    ["right", event("right", ["source"], "rule", "right-license")],
    ["goal", event("goal", ["left", "right"], "join", "join-license")],
  ]);
  const plan = scheduleOfDerivation(d, "goal", ["source"]);
  assert.equal(plan.admissionLevel, "structural-only");
  assert.equal(plan.complete, true);
  assert.deepEqual(plan.waves.map(w => w.map(e => e.attr)), [["left", "right"], ["goal"]]);
  assert.equal(plan.parallelRounds, 2);
  assert.equal(plan.executableEventCount, 3);
  assert.equal(plan.prunedEventCount, 1);
  assert.equal(plan.waves[1][0].ruleId, "join-license");
  assert.ok(Object.isFrozen(plan.waves[0]) && Object.isFrozen(plan.waves[0][0]));
});

test("cached intermediary prunes its entire ancestry rather than scheduling useless work", () => {
  const d = new Map([
    ["a", event("a")],
    ["b", event("b", ["a"], "derive")],
    ["c", event("c", ["b"], "derive")],
  ]);
  const onlyC = scheduleOfDerivation(d, "c", ["b"]);
  assert.deepEqual(onlyC.waves.map(w => w.map(e => e.attr)), [["c"]]);
  assert.equal(onlyC.prunedEventCount, 2);
  const done = scheduleOfDerivation(d, "c", ["c"]);
  assert.equal(done.parallelRounds, 0);
  assert.equal(done.prunedEventCount, 3);
  assert.equal(done.complete, true);
});

test("missing given facts stay open, blocking dependents rather than fabricating a proof", () => {
  const d = new Map([
    ["premise", event("premise")],
    ["independent", event("independent", [], "rule", "axiom-1")],
    ["goal", event("goal", ["premise", "independent"], "rule", "join-1")],
  ]);
  const plan = scheduleOfDerivation(d, "goal");
  assert.equal(plan.complete, false);
  assert.deepEqual(plan.openAssumptions, ["premise"]);
  assert.deepEqual(plan.blockedEvents, ["goal", "premise"]);
  assert.deepEqual(plan.waves.map(w => w.map(e => e.attr)), [["independent"]]);
  assert.deepEqual(scheduleOfDerivation(d, "goal", ["premise"]).waves.map(w => w.map(e => e.attr)),
    [["independent"], ["goal"]]);
});

test("cached events never conceal cycles or forged unavailable inputs", () => {
  const cyclic = new Map([
    ["a", event("a", ["b"], "rule")],
    ["b", event("b", ["a"], "rule")],
  ]);
  assert.throws(() => scheduleOfDerivation(cyclic, "a", ["a"]), /cyclic proof motion/);
  assert.throws(() => scheduleOfDerivation(new Map([["a", event("a")]]), "a", [null]), /available attributes/);
  assert.equal(scheduleOfDerivation(new Map(), "absent", []), null);
});

test("very long dependency plans do not recur or invent intermediate history", () => {
  const n = 24000, d = new Map();
  d.set("0", event("0"));
  for (let i=1;i<n;i++) d.set(String(i), event(String(i), [String(i-1)], "advance"));
  const planned = scheduleOfDerivation(d, String(n-1), ["0"]);
  assert.equal(planned.complete, true);
  assert.equal(planned.parallelRounds, n-1);
  assert.equal(planned.executableEventCount, n-1);
  assert.deepEqual(planned.waves.at(-1).map(e => e.attr), [String(n-1)]);
});
