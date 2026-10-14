import test from "node:test";
import assert from "node:assert/strict";
import {
  kleinCompose,kleinTransport,kleinSheafEnergy,forecastKleinCapacityFlow
} from "../src/klein-capacity-flow.mjs";

const NI="ni:///sha-256;"+"A".repeat(43);
const now="2026-10-14T05:00:00Z";
const work={kind:"activitypub-delivery",portable:true,requiredRights:["public-federation"]};
const node=(id,change={})=>({
  id,backlog:0,arrivalsPerTick:0,servicePerTick:0,
  observedAt:now,entitlement:"verified",capacityEvidence:NI,
  allowedKinds:[work.kind],rights:["public-federation"],reliabilityRisk:0.1,...change
});
const edge=(from,to,change={})=>({
  from,to,gauge:"id",maxTransfersPerTick:20,latencyMilliseconds:10,
  authorityEvidence:NI,durableTransfer:true,costCeilingKnown:true,weight:1,
  ...change,
});
const base=(changes={})=>({
  nodes:[node("cold-red-gate",{backlog:200,servicePerTick:5}),
    node("oracle-a1",{servicePerTick:8})],
  links:[edge("cold-red-gate","oracle-a1")],
  work,asOf:now,horizonTicks:10,...changes,
});

test("Klein-four is associative, commutative and every element self-inverse",()=>{
  const g=["id","neg","conf","negConf"];
  for(const a of g){
    assert.equal(kleinCompose(a,a),"id");
    assert.equal(kleinCompose("id",a),a);
    for(const b of g){
      assert.equal(kleinCompose(a,b),kleinCompose(b,a));
      for(const c of g)
        assert.equal(kleinCompose(kleinCompose(a,b),c),kleinCompose(a,kleinCompose(b,c)));
    }
  }
});
test("finite sheaf energy is nonnegative and invariant under local K4 gauge transformations",()=>{
  const section={a:[1,0.2],b:[3,-0.7],c:[2,0.4]};
  const edges=[{from:"a",to:"b",gauge:"neg",weight:2},
    {from:"b",to:"c",gauge:"conf",weight:0.5},
    {from:"a",to:"c",gauge:"negConf",weight:0.25}];
  const old=kleinSheafEnergy(section,edges);
  const local={a:"conf",b:"neg",c:"negConf"};
  const transformed=Object.fromEntries(Object.entries(section).map(([id,v])=>[id,kleinTransport(local[id],v)]));
  const changed=edges.map(e=>({...e,gauge:kleinCompose(kleinCompose(local[e.from],e.gauge),local[e.to])}));
  assert.ok(old>=0);
  assert.ok(Math.abs(old-kleinSheafEnergy(transformed,changed))<1e-12);
});

test("spare evidenced compute increases useful work without inventing or losing queued work",()=>{
  const out=forecastKleinCapacityFlow(base());
  assert.equal(out.kind,"K4ConstrainedCapacityFlowForecast");
  assert.equal(out.baseline.completed,50);
  assert.equal(out.routed.completed,130);
  assert.equal(out.goodputGainUnits,80);
  assert.deepEqual(out.routed.transfers,[{route:"cold-red-gate→oracle-a1",forecastWorkUnits:80}]);
  assert.equal(out.baseline.acceptedWork,200);
  assert.equal(out.routed.acceptedWork,200);
  assert.equal(out.routed.completed+Object.values(out.routed.remaining).reduce((a,b)=>a+b,0),200);
  assert.equal(out.actionable,false);
  assert.equal(out.forecastOnly,true);
  assert.equal(out.providerReadbackIndependentlyVerified,false);
});
test("network/custody rate caps constrain goodput and never oversubscribe destination",()=>{
  const out=forecastKleinCapacityFlow(base({links:[edge("cold-red-gate","oracle-a1",{maxTransfersPerTick:3})]}));
  assert.equal(out.routed.completed,80);
  assert.equal(out.goodputGainUnits,30);
  assert.equal(out.routed.transfers[0].forecastWorkUnits,30);
  assert.equal(out.routed.remaining["oracle-a1"],0);
});
test("contradictory Klein holonomy prevents all transfer in its affected component",()=>{
  const nodes=[node("a",{backlog:30,servicePerTick:1}),node("b",{servicePerTick:5}),
    node("c",{servicePerTick:5})];
  const links=[edge("a","b",{gauge:"neg"}),edge("b","c",{gauge:"neg"}),
    edge("a","c",{gauge:"neg"})];
  const out=forecastKleinCapacityFlow(base({nodes,links}));
  assert.ok(out.kleinGauge.holonomyConflicts.length>=1);
  assert.equal(out.goodputGainUnits,0);
  assert.equal(out.refusedLinks.length,links.length);
  assert.ok(out.refusedLinks.every(e=>e.reason==="nontrivial-K4-holonomy"));
});
test("consistent nontrivial K4 connections allow only the physical, unsigned transfer model",()=>{
  const nodes=[node("a",{backlog:30,servicePerTick:1}),node("b",{servicePerTick:5}),
    node("c",{servicePerTick:5})];
  const links=[edge("a","b",{gauge:"neg"}),edge("b","c",{gauge:"neg"}),
    edge("a","c",{gauge:"id"})];
  const out=forecastKleinCapacityFlow(base({nodes,links,horizonTicks:3}));
  assert.equal(out.kleinGauge.holonomyConflicts.length,0);
  assert.ok(out.goodputGainUnits>0);
  assert.ok(out.kleinGauge.sheafEnergy>=0);
  assert.equal(out.kleinGauge.energyIsPhysicalCapacity,false);
});
test("expired or missing provider entitlement cannot become an offload target",()=>{
  for(const change of [
    {entitlement:"unknown"},{capacityEvidence:null},
    {observedAt:"2026-10-14T02:00:00Z"},
    {rights:["private-only"]},{allowedKinds:["unrelated"]},
  ]){
    const out=forecastKleinCapacityFlow(base({nodes:[
      node("cold-red-gate",{backlog:100,servicePerTick:5}),node("oracle-a1",{servicePerTick:8,...change})]}));
    assert.equal(out.goodputGainUnits,0);
    assert.equal(out.refusedLinks[0].reason,"destination-capacity-or-rights-unverified");
  }
});
test("missing atomic custody and cost ceilings never lead to transferable units",()=>{
  for(const linkChange of [{authorityEvidence:"missing"},{durableTransfer:false},{costCeilingKnown:false},
    {latencyMilliseconds:2000}]){
    const result=forecastKleinCapacityFlow(base({links:[edge("cold-red-gate","oracle-a1",linkChange)]}));
    assert.equal(result.goodputGainUnits,0);
    assert.equal(result.refusedLinks.length,1);
    assert.equal(result.routed.transfers.length,0);
  }
});
test("unavailable compute may keep its source backlog but cannot synthesize service",()=>{
  const out=forecastKleinCapacityFlow(base({nodes:[node("a",{backlog:100,servicePerTick:0}),
    node("b",{servicePerTick:0})],links:[edge("a","b")]}));
  assert.equal(out.baseline.completed,0);
  assert.equal(out.routed.completed,0);
  assert.equal(out.routed.remaining.a,100);
});
test("arrival pressure, capacity, and the shortage remain explicitly conserved",()=>{
  const out=forecastKleinCapacityFlow(base({nodes:[
    node("cold-red-gate",{backlog:100,arrivalsPerTick:6,servicePerTick:5}),
    node("oracle-a1",{servicePerTick:8})]}));
  assert.equal(out.baseline.acceptedWork,160);
  assert.equal(out.baseline.completed,50);
  assert.equal(out.routed.acceptedWork,160);
  assert.equal(out.routed.completed,130);
  assert.equal(Object.values(out.routed.remaining).reduce((a,b)=>a+b,0),30);
});
test("bad authority topology and invalid quantities refuse before forecast",()=>{
  for(const data of [
    {nodes:[node("a"),node("a")]},
    {links:[edge("cold-red-gate","unknown")]},
    {links:[edge("cold-red-gate","oracle-a1"),edge("oracle-a1","cold-red-gate")]},
    {nodes:[node("cold-red-gate",{backlog:-1}),node("oracle-a1")]},
    {work:{...work,portable:false}},
  ])assert.throws(()=>forecastKleinCapacityFlow(base(data)),TypeError);
});
