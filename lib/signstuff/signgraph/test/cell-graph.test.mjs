import test from "node:test";
import assert from "node:assert/strict";
import { samePoint } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { cell } from "@red-cup-engineering/signcell/cell";
import { at, transpose } from "@red-cup-engineering/metrologic/chu";
import { cellGraph, relationGraphOfCells, flowNetworkOfCells, flowNetwork } from "../src/cell-graph.mjs";

const cellOf = (subject, predicate, object) => cell(subject, predicate, object);

test("cellGraph: a cell reads present at an observation that names it, absent otherwise", () => {
  const a = cellOf("alice", "knows", "bob");
  const b = cellOf("bob", "knows", "carol");
  const graph = cellGraph([a, b], [
    { name: "subject-is-alice", evaluate: (c) => (c.subject === "alice" ? "potential" : "active") },
  ]);
  assert.ok(samePoint(at(graph, a, "subject-is-alice"), "potential"));
  assert.ok(samePoint(at(graph, b, "subject-is-alice"), "active"));
});

test("cellGraph: transpose swaps points and states, preserving the value at the swapped coordinate", () => {
  const a = cellOf("alice", "knows", "bob");
  const graph = cellGraph([a], [
    { name: "always-potential", evaluate: () => "potential" },
  ]);
  const flipped = transpose(graph);
  assert.ok(samePoint(at(flipped, "always-potential", a), "potential"));
});


test("flowNetworkOfCells keeps source-to-proof direction that symmetric relation graphs necessarily forget",()=>{
  const evidence=cellOf("source-receipt","is-premise-of","derived-proof");
  const converse=cellOf("derived-proof","is-premise-of","source-receipt");
  const forward=flowNetworkOfCells([evidence]);
  const backward=flowNetworkOfCells([converse]);
  assert.deepEqual(
    relationGraphOfCells([evidence]).weights,
    relationGraphOfCells([converse]).weights,
    "symmetric relation weights cannot prove causal orientation",
  );
  assert.deepEqual(forward.edges.map(e=>[e.from,e.to]),[["source-receipt","derived-proof"]]);
  assert.deepEqual(backward.edges.map(e=>[e.from,e.to]),[["derived-proof","source-receipt"]]);
  assert.notDeepEqual(forward.edges,backward.edges);
  assert.equal(forward.edges[0].fromIndex,0);
  assert.equal(forward.edges[0].toIndex,1);
});

test("oriented 1-chains preserve boundary conservation and distinguish causal cycles",()=>{
  const cells=[
    cellOf("original-data","supports","model"),
    cellOf("model","supports","evaluation"),
    cellOf("evaluation","supports","original-data"),
  ];
  const graph=flowNetworkOfCells(cells);
  const boundary=Array(graph.terms.length).fill(0);
  for(const edge of graph.edges){
    boundary[edge.fromIndex]-=1;
    boundary[edge.toIndex]+=1;
  }
  assert.deepEqual(boundary,[0,0,0],"directed cycle is a 1-chain with zero boundary");
  assert.equal(graph.edges.length,3);
  assert.equal(graph.kind,"signgraph.flowNetwork");
  assert.equal(Object.isFrozen(graph.edges),true);
});

test("flow network of raw SignCells is the existing section flow reading, not a second graph type",()=>{
  const cells=[
    cellOf("forecast","supports","proof"),
    cellOf("forecast","supports","proof"),
    cellOf("proof","refers","proof"),
  ];
  const direct=flowNetworkOfCells(cells);
  const section=flowNetwork({entries:cells.map(value=>({cell:value}))});
  assert.deepEqual(direct,section);
  assert.equal(direct.terms.length,2);
  assert.equal(direct.edges.length,2,"parallel evidence remains separate incidence edges");
  assert.ok(direct.edges.every(edge=>edge.from==="forecast"&&edge.to==="proof"));
});

test("empty SignCells cannot fabricate a graph with an independently received proof",()=>{
  assert.throws(()=>flowNetworkOfCells([]),TypeError);
});
