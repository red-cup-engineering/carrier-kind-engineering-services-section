// Pure placement-independent SEN die assay.
import assert from "node:assert/strict";
import test from "node:test";
import { circuitInterfaceFromAgentCard, SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION, SOVEREIGN_CIRCUIT_INTERFACE_PROFILE } from "@red-cup-engineering/a2a-services-section/circuit-interface";
import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import {
  CIRCUIT_ASSEMBLY_PROFILE,
  HIERARCHICAL_CIRCUIT_PROFILE,
  circuitAssemblyId,
  decodeHierarchicalCircuit,
  encodeHierarchicalCircuit,
  hierarchicalCircuitId,
  normalizeHierarchicalCircuit,
  readCircuitContext,
  synthesizeCircuitBehavior,
  verifyCircuitFamily,
  verifyCircuitRealization,
  verifyCircuitEquivalence,
  verifyCircuitAssembly,
} from "../src/hierarchical-circuit.mjs";

const id = (label) => semanticId(["mark", label]);
const account = (suffix) => `eip155:31337:0x${suffix.padStart(40, "0")}`;
const N = Object.freeze({ positiveEvidence: false, negativeEvidence: false });
const T = Object.freeze({ positiveEvidence: true, negativeEvidence: false });
const F = Object.freeze({ positiveEvidence: false, negativeEvidence: true });
const B = Object.freeze({ positiveEvidence: true, negativeEvidence: true });
const rows = (outputs = [N, T, F, B]) => [N, T, F, B].map((input, index) => ({ input: [input], output: [outputs[index]] }));
const pin = (name, direction, mode = "tensor") => ({ name, direction, mode, predicate: id("evidences"), carrier: id("FOUR") });
const behavior = (inputs = ["a"], outputs = ["z"], table = rows()) => ({ factors: [{ inputs, outputs, rows: table }] });

function membrane(suffix, label) {
  return { account: account(suffix), authority: id(`${label}-authority`), custody: id(`${label}-custody`), territory: id(`${label}-territory`) };
}

function leaf() {
  return {
    profile: HIERARCHICAL_CIRCUIT_PROFILE,
    law: id("identity-law"),
    ports: [pin("z", "output"), pin("a", "input")], instances: [], nets: [],
    behavior: behavior(),
  };
}

function parent(child) {
  return {
    profile: HIERARCHICAL_CIRCUIT_PROFILE,
    law: id("parent-law"),
    ports: [pin("z", "output"), pin("a", "input")],
    instances: [{ name: "die", component: hierarchicalCircuitId(child) }],
    nets: [
      { name: "n-in", driver: { instance: null, port: "a" }, sinks: [{ instance: "die", port: "a" }], mode: "tensor", chain: null, contract: null },
      { name: "n-out", driver: { instance: "die", port: "z" }, sinks: [{ instance: null, port: "z" }], mode: "tensor", chain: null, contract: null },
    ],
    behavior: behavior(),
  };
}

function assembly(circuit, placements) {
  return {
    profile: CIRCUIT_ASSEMBLY_PROFILE,
    circuit: hierarchicalCircuitId(circuit),
    placements: placements.map(([address, suffix, label]) => ({ address, membrane: membrane(suffix, label) })),
  };
}

test("hierarchical circuits have one deterministic typed SEN identity", () => {
  const source = leaf(), normalized = normalizeHierarchicalCircuit(source), term = encodeHierarchicalCircuit(source);
  assert.deepEqual(decodeHierarchicalCircuit(term), normalized);
  assert.equal(hierarchicalCircuitId(source), hierarchicalCircuitId({ ...source, ports: [...source.ports].reverse(), behavior: { factors: [{ ...source.behavior.factors[0], rows: [...source.behavior.factors[0].rows].reverse() }] } }));
  assert.match(hierarchicalCircuitId(source), /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u);
});

test("an A2A Agent Card interface exposes one sovereign black-box die without its interior", () => {
  const source = { component: leaf(), ...membrane("7", "card") };
  const card = { capabilities: { extensions: [{
    uri: SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION,
    description: "fixture", required: false,
    params: { profile: SOVEREIGN_CIRCUIT_INTERFACE_PROFILE, ...source },
  }] } };
  assert.deepEqual(circuitInterfaceFromAgentCard(card), { ...source, component: normalizeHierarchicalCircuit(source.component) });
  card.capabilities.extensions.push(card.capabilities.extensions[0]);
  assert.throws(() => circuitInterfaceFromAgentCard(card), /exactly one/u);
  const composite = parent(leaf());
  card.capabilities.extensions = [{ ...card.capabilities.extensions[0], params: { profile: SOVEREIGN_CIRCUIT_INTERFACE_PROFILE, ...source, component: composite } }];
  assert.throws(() => circuitInterfaceFromAgentCard(card), /black-box leaf/u);
});

test("a circuit of a sovereign die synthesizes the same black-box FOUR behavior", () => {
  const child = normalizeHierarchicalCircuit(leaf()), design = parent(child), library = new Map([[hierarchicalCircuitId(child), child]]);
  assert.deepEqual(synthesizeCircuitBehavior(design, library), normalizeHierarchicalCircuit(design).behavior);
  assert.deepEqual(verifyCircuitEquivalence(design, library).equivalent, true);
});

test("recursive containment is verified to arbitrary depth and read relative to an address", () => {
  const child = normalizeHierarchicalCircuit(leaf()), middle = normalizeHierarchicalCircuit(parent(child));
  const root = parent(middle), components = [child, middle];
  const populated = assembly(root, [[[], "3", "root"], [["die"], "2", "middle"], [["die", "die"], "1", "leaf"]]);
  const family = verifyCircuitFamily(root, components);
  assert.equal(family.verified.size, 3);
  const middleView = readCircuitContext({ circuit: root, components, assembly: populated, address: ["die"] });
  const childView = readCircuitContext({ circuit: root, components, assembly: populated, address: ["die", "die"] });
  assert.equal(middleView.circuit, hierarchicalCircuitId(middle));
  assert.equal(childView.circuit, hierarchicalCircuitId(child));
  assert.deepEqual(childView.address, ["die", "die"]);
  assert.equal(childView.parent.circuit, hierarchicalCircuitId(middle));
  assert.equal(childView.membrane.account, account("1"));
  assert.equal(Object.hasOwn(childView, "scale"), false);
});

test("one placement-neutral die design may inhabit distinct sovereign occurrences", () => {
  const child = normalizeHierarchicalCircuit(leaf()), root = normalizeHierarchicalCircuit({
    ...parent(child),
    ports: [],
    instances: [{ name: "left", component: hierarchicalCircuitId(child) }, { name: "right", component: hierarchicalCircuitId(child) }],
    nets: [
      { name: "loop-left-right", driver: { instance: "left", port: "z" }, sinks: [{ instance: "right", port: "a" }], mode: "tensor", chain: null, contract: null },
      { name: "loop-right-left", driver: { instance: "right", port: "z" }, sinks: [{ instance: "left", port: "a" }], mode: "tensor", chain: null, contract: null },
    ],
    behavior: { factors: [] },
  });
  const populated = assembly(root, [[[], "3", "root"], [["left"], "1", "left"], [["right"], "2", "right"]]);
  const verified = verifyCircuitAssembly(populated, root, [child]);
  assert.equal(verified.contexts.length, 3);
  assert.equal(readCircuitContext({ circuit: root, components: [child], assembly: populated, address: ["left"] }).circuit,
    readCircuitContext({ circuit: root, components: [child], assembly: populated, address: ["right"] }).circuit);
  assert.notEqual(readCircuitContext({ circuit: root, components: [child], assembly: populated, address: ["left"] }).membrane.account,
    readCircuitContext({ circuit: root, components: [child], assembly: populated, address: ["right"] }).membrane.account);
  assert.throws(() => verifyCircuitAssembly({ ...populated, placements: populated.placements.slice(0, 2) }, root, [child]), /omits circuit occurrence/u);
});

test("a board realizes its public black-box die exactly through sovereign child occurrences", () => {
  const child = normalizeHierarchicalCircuit(leaf()), implementation = normalizeHierarchicalCircuit(parent(child));
  const publicInterface = normalizeHierarchicalCircuit({ ...implementation, instances: [], nets: [] });
  const populated = assembly(implementation, [[[], "3", "board"], [["die"], "1", "child"]]);
  const realized = verifyCircuitRealization({ interface: publicInterface, circuit: implementation, components: [child], assembly: populated });
  assert.equal(realized.realized, true);
  assert.equal(realized.interface, hierarchicalCircuitId(publicInterface));
  assert.equal(realized.circuit, hierarchicalCircuitId(implementation));
  assert.deepEqual(realized.components, [hierarchicalCircuitId(child)]);

  const wrongLaw = { ...publicInterface, law: id("foreign-law") };
  assert.throws(() => verifyCircuitRealization({ interface: wrongLaw, circuit: implementation, components: [child], assembly: populated }), /same SEN law/u);
  const wrongPins = { ...publicInterface, ports: [pin("different", "output"), pin("a", "input")], behavior: behavior(["a"], ["different"]) };
  assert.throws(() => verifyCircuitRealization({ interface: wrongPins, circuit: implementation, components: [child], assembly: populated }), /pinout/u);
});

test("scale labels and consensus leakage are rejected rather than shimmed", () => {
  const source = leaf();
  assert.throws(() => normalizeHierarchicalCircuit({ ...source, ["sca" + "le"]: "enterprise" }), /legacy field/u);
  const child = normalizeHierarchicalCircuit(source), design = parent(child);
  design.nets[0] = { ...design.nets[0], chain: "eip155:31337", contract: id("wrong") };
  assert.throws(() => normalizeHierarchicalCircuit(design), /tensor nets cannot name consensus/u);
});

test("declared parent behavior must equal Beh(Synth(D))", () => {
  const child = normalizeHierarchicalCircuit(leaf()), design = parent(child), library = new Map([[hierarchicalCircuitId(child), child]]);
  design.behavior = behavior(["a"], ["z"], rows([N, N, N, N]));
  assert.throws(() => verifyCircuitEquivalence(design, library), /does not equal/u);
});

test("tensor-factorized boards preserve sixteen independent die relations without global truth-table expansion", () => {
  const children = Array.from({ length: 16 }, (_value, index) => normalizeHierarchicalCircuit({
    profile: HIERARCHICAL_CIRCUIT_PROFILE,
    law: id(`child-law-${index}`),
    ports: [
      { ...pin("request", "input"), predicate: id(`predicate-${index}`), carrier: id(`carrier-${index}`) },
      { ...pin("receipt", "output"), predicate: id(`predicate-${index}`), carrier: id(`carrier-${index}`) },
    ],
    instances: [], nets: [], behavior: behavior(["request"], ["receipt"]),
  }));
  const ports = children.flatMap((child, index) => child.ports.map((port) => ({ ...port, name: `${index}-${port.name}` })));
  const design = {
    profile: HIERARCHICAL_CIRCUIT_PROFILE,
    law: id("sixteen-die-board"),
    ports,
    instances: children.map((child, index) => ({ name: `die-${index}`, component: hierarchicalCircuitId(child) })),
    nets: children.flatMap((_child, index) => [
      { name: `in-${index}`, driver: { instance: null, port: `${index}-request` }, sinks: [{ instance: `die-${index}`, port: "request" }], mode: "tensor", chain: null, contract: null },
      { name: `out-${index}`, driver: { instance: `die-${index}`, port: "receipt" }, sinks: [{ instance: null, port: `${index}-receipt` }], mode: "tensor", chain: null, contract: null },
    ]),
    behavior: { factors: children.map((_child, index) => ({ inputs: [`${index}-request`], outputs: [`${index}-receipt`], rows: rows() })) },
  };
  const library = new Map(children.map((child) => [hierarchicalCircuitId(child), child]));
  const synthesized = synthesizeCircuitBehavior(design, library);
  assert.equal(synthesized.factors.length, 16);
  assert.equal(synthesized.factors.reduce((count, factor) => count + factor.rows.length, 0), 64);
  assert.equal(verifyCircuitEquivalence(design, library).equivalent, true);
  const collapsed = structuredClone(design);
  collapsed.behavior.factors = [{ inputs: ports.filter(({ direction }) => direction === "input").map(({ name }) => name), outputs: ports.filter(({ direction }) => direction === "output").map(({ name }) => name), rows: [] }];
  assert.throws(() => normalizeHierarchicalCircuit(collapsed), /at most six FOUR inputs/u);
});

test("factorized behavior refuses overlaps, omissions, and false independence", () => {
  const source = leaf();
  source.behavior.factors.push({ inputs: ["a"], outputs: [], rows: [N, T, F, B].map((input) => ({ input: [input], output: [] })) });
  assert.throws(() => normalizeHierarchicalCircuit(source), /more than one behavior factor/u);
  const omitted = leaf(); omitted.behavior = { factors: [] };
  assert.throws(() => normalizeHierarchicalCircuit(omitted), /omit input pin/u);
});

