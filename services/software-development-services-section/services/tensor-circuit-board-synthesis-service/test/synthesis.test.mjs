import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { decodeSemantic, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import {
  HIERARCHICAL_CIRCUIT_PROFILE,
  hierarchicalCircuitId,
  readCircuitContext,
  verifyCircuitAssembly,
} from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { decodeSynthesisReceipt, synthesizeTensorCircuitBoard } from "../src/synthesis.mjs";

const FOUR = [
  { positiveEvidence: false, negativeEvidence: false },
  { positiveEvidence: true, negativeEvidence: false },
  { positiveEvidence: false, negativeEvidence: true },
  { positiveEvidence: true, negativeEvidence: true },
];
const id = (label) => semanticId(["constant", ["base", "Text"], label]);
const account = (index) => `eip155:31337:0x${String((index % 9) + 1).repeat(40)}`;
const profile = (label, index = 0) => ({ account: account(index), law: id(`${label}:law`), authority: id(`${label}:authority`), custody: id(`${label}:custody`), territory: id(`${label}:territory`) });
const port = (name, direction, label, mode = "tensor") => ({ name, direction, predicate: id(`${label}:predicate`), carrier: id(`${label}:carrier`), mode });
const identityBehavior = (input, output) => ({ factors: [{ inputs: [input], outputs: [output], rows: FOUR.map((value) => ({ input: [value], output: [value] })) }] });

function component(label, mode = "tensor") {
  return {
    profile: HIERARCHICAL_CIRCUIT_PROFILE,
    law: id(`${label}:law`),
    ports: [port("request", "input", label, mode), port("receipt", "output", label, mode)],
    instances: [], nets: [], behavior: identityBehavior("request", "receipt"),
  };
}

function face(name, index, sharedComponent) {
  const membrane = profile(name, index);
  return {
    name,
    interface: {
      account: membrane.account,
      authority: membrane.authority,
      custody: membrane.custody,
      territory: membrane.territory,
      component: sharedComponent ?? component(name),
    },
  };
}

const request = (faces) => ({ kind: "TensorCircuitBoardSynthesisRequest", root: profile("root"), faces });

test("seventeen sovereign faces remain seventeen independent behavior factors and exact placements", () => {
  const faces = Array.from({ length: 17 }, (_value, index) => face(`die-${String(index).padStart(2, "0")}`, index + 1));
  const result = synthesizeTensorCircuitBoard(request(faces));
  const { receipt } = result;
  const verified = verifyCircuitAssembly(receipt.assembly, receipt.circuit, receipt.components);
  assert.equal(receipt.circuit.instances.length, 17);
  assert.equal(receipt.circuit.behavior.factors.length, 17);
  assert.equal(receipt.circuit.behavior.factors.reduce((count, factor) => count + factor.rows.length, 0), 68);
  assert.equal(verified.contexts.length, 18);
  assert.equal(receipt.faceAddresses.length, 17);
  for (const faceSource of faces) {
    const context = readCircuitContext({ circuit: receipt.circuit, components: receipt.components, assembly: receipt.assembly, address: [faceSource.name] });
    assert.equal(context.membrane.account, faceSource.interface.account);
  }
  const term = decodeSemantic(result.canonicalBytes);
  assert.equal(decodeSynthesisReceipt(term[1], term[2]).circuitId, receipt.circuitId);
});

test("one reusable die definition may occupy several sovereign occurrences without collapsing membranes", () => {
  const reusable = component("shared");
  const receipt = synthesizeTensorCircuitBoard(request([face("alpha", 1, reusable), face("beta", 2, reusable)])).receipt;
  assert.equal(receipt.components.length, 1);
  assert.equal(receipt.circuit.instances[0].component, hierarchicalCircuitId(reusable));
  assert.equal(receipt.circuit.instances[1].component, hierarchicalCircuitId(reusable));
  assert.notEqual(receipt.assembly.placements[1].membrane.account, receipt.assembly.placements[2].membrane.account);
});

test("the die refuses repeated occurrence names and par faces rather than fabricating a seam", () => {
  assert.throws(() => synthesizeTensorCircuitBoard(request([face("same", 1), face("same", 2)])), (error) => error.code === "repeated-face");
  assert.throws(() => synthesizeTensorCircuitBoard(request([face("joint", 1, component("joint", "par"))])), (error) => error.code === "unsettled-par");
});

test("the live boundary receives one colony-owned socket instead of allocating its port", () => {
  const server = readFileSync(new URL("../scripts/server.mjs", import.meta.url), "utf8");
  const unit = readFileSync(new URL("../ops/systemd/tensor-circuit-board-synthesis-service.service", import.meta.url), "utf8");
  const socket = readFileSync(new URL("../ops/systemd/tensor-circuit-board-synthesis-service.socket", import.meta.url), "utf8");
  assert.match(server, /process\.env\.PORT \?\? 19848/);
  assert.doesNotMatch(unit, /^Environment=PORT=/m);
  assert.match(unit, /^Environment=BASE_URL=http:\/\/127\.0\.0\.1:19848$/m);
  assert.match(unit, /^Sockets=tensor-circuit-board-synthesis-service\.socket$/m);
  assert.match(socket, /^ListenStream=127\.0\.0\.1:19848$/m);
  assert.match(socket, /^FileDescriptorName=a2a$/m);
  assert.match(socket, /^Service=tensor-circuit-board-synthesis-service\.service$/m);
});
