import assert from "node:assert/strict";
import test from "node:test";
import { semanticId } from "@red-cup-engineering/relation-model-notation-runtime";
import { HIERARCHICAL_CIRCUIT_PROFILE, readCircuitContext, verifyCircuitAssembly } from "@red-cup-engineering/relation-model-notation-runtime/hierarchical-circuit";
import { FABRICATION_PINOUT } from "../src/circuit-family.mjs";
import { decodeSynthesisReceipt, synthesizeRecursiveObservationCircuit } from "../src/synthesis.mjs";
import { decodeSemantic } from "@red-cup-engineering/relation-model-notation-runtime";

const FOUR = [{ positiveEvidence: false, negativeEvidence: false }, { positiveEvidence: true, negativeEvidence: false }, { positiveEvidence: false, negativeEvidence: true }, { positiveEvidence: true, negativeEvidence: true }];
const id = (label) => semanticId(["constant", ["base", "Text"], label]);
const account = (index) => `eip155:31337:0x${String((index % 9) + 1).repeat(40)}`;
function profile(label, index) { return { account: account(index), law: id(`${label}:law`), authority: id(`${label}:authority`), custody: id(`${label}:custody`), territory: id(`${label}:territory`) }; }
function port(name, direction, predicate, carrier) { return { name, direction, predicate, carrier, mode: "tensor" }; }
function identity(input = "schedule", output = "receipt") { return { factors: [{ inputs: [input], outputs: [output], rows: FOUR.map((value) => ({ input: [value], output: [value] })) }] }; }
function conjunction() { return { factors: [{ inputs: ["observations", "plate"], outputs: ["receipt"], rows: FOUR.flatMap((left) => FOUR.map((right) => ({ input: [left, right], output: [{ positiveEvidence: left.positiveEvidence && right.positiveEvidence, negativeEvidence: left.negativeEvidence || right.negativeEvidence }] }))) }] }; }
function face(role, label, index) {
  const membrane = profile(label, index), ports = role === "plate"
    ? [port("schedule", "input", FABRICATION_PINOUT.schedulePredicate, FABRICATION_PINOUT.scheduleCarrier), port("receipt", "output", FABRICATION_PINOUT.platePredicate, FABRICATION_PINOUT.plateCarrier)]
    : role === "cover"
      ? [port("observations", "input", FABRICATION_PINOUT.patchEvidencePredicate, FABRICATION_PINOUT.patchEvidenceCarrier), port("plate", "input", FABRICATION_PINOUT.platePredicate, FABRICATION_PINOUT.plateCarrier), port("receipt", "output", FABRICATION_PINOUT.patchEvidencePredicate, FABRICATION_PINOUT.patchEvidenceCarrier)]
      : [port("schedule", "input", FABRICATION_PINOUT.schedulePredicate, FABRICATION_PINOUT.scheduleCarrier), port("receipt", "output", FABRICATION_PINOUT.patchEvidencePredicate, FABRICATION_PINOUT.patchEvidenceCarrier)];
  return { account: membrane.account, authority: membrane.authority, custody: membrane.custody, territory: membrane.territory, component: { profile: HIERARCHICAL_CIRCUIT_PROFILE, law: membrane.law, ports, instances: [], nets: [], behavior: role === "cover" ? conjunction() : identity(ports.find(({ direction }) => direction === "input").name, "receipt") } };
}
function request(width) { return { kind: "RecursiveObservationCircuitSynthesisRequest", root: profile("root", 0), tally: profile("tally", 0), plate: face("plate", "plate", 1), cover: face("cover", "cover", 2), observers: Array.from({ length: width }, (_value, index) => face("observer", `observer-${index}`, index + 3)) }; }

test("one synthesis die emits a bounded recursive board and exact occurrence assembly", () => {
  const result = synthesizeRecursiveObservationCircuit(request(17)), receipt = result.receipt;
  const verified = verifyCircuitAssembly(receipt.assembly, receipt.circuit, receipt.components);
  assert.equal(verified.family.rootIdentity, receipt.circuitId);
  assert.equal(receipt.observerAddresses.length, 17);
  assert.equal(verified.contexts.filter(({ address }) => address.at(-1) === "tally").length, 16);
  assert.equal(Math.max(...receipt.components.map(({ ports }) => ports.filter(({ direction }) => direction === "input").length)), 2);
  assert.equal(readCircuitContext({ circuit: receipt.circuit, components: receipt.components, assembly: receipt.assembly, address: receipt.observerAddresses[0] }).membrane.account, account(3));
  const term = decodeSemantic(result.canonicalBytes); assert.equal(decodeSynthesisReceipt(term[1], term[2]).circuitId, receipt.circuitId);
});

test("an empty frontier still has an explicit witnessed observation die", () => {
  const receipt = synthesizeRecursiveObservationCircuit(request(0)).receipt;
  const empty = readCircuitContext({ circuit: receipt.circuit, components: receipt.components, assembly: receipt.assembly, address: ["observation-network"] });
  assert.equal(empty.ports.some(({ name }) => name === "schedule"), true);
});
