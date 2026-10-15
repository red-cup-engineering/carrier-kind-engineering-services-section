// The Agent Card face of a sovereign circuit die: this section's
// circuitInterfaceFromAgentCard over SignGraph's hierarchical circuits.
import assert from "node:assert/strict";
import test from "node:test";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { HIERARCHICAL_CIRCUIT_PROFILE, hierarchicalCircuitId, normalizeHierarchicalCircuit } from "@red-cup-engineering/signgraph/hierarchical-circuit";
import { circuitInterfaceFromAgentCard, SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION, SOVEREIGN_CIRCUIT_INTERFACE_PROFILE } from "../scripts/circuit-interface.mjs";

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
