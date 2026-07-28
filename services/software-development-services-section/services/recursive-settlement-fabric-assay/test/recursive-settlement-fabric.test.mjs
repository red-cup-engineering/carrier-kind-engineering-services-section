import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { HIERARCHICAL_CIRCUIT_PROFILE, SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION, SOVEREIGN_CIRCUIT_INTERFACE_PROFILE, hierarchicalCircuitId } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";
import { assayRecursiveSettlementFabric } from "../src/assay-recursive-settlement-fabric.mjs";
import { authorizeFabricTerritory } from "../src/protocol.mjs";

const N = { positiveEvidence: false, negativeEvidence: false }, T = { positiveEvidence: true, negativeEvidence: false }, F = { positiveEvidence: false, negativeEvidence: true }, B = { positiveEvidence: true, negativeEvidence: true };
const id = (label) => semanticId(["mark", label]);
const rows = [N, T, F, B].map((value) => ({ input: [value], output: [value] }));
const lawSource = (type) => `#lang rmn/v2\n(map ("type" "${type}") ("version" 1) ("precondition" "input") ("operation" "transform") ("postcondition" "output") ("refusal" "malformed"))\n`;
const port = (name, direction) => ({ name, direction, predicate: id("evidence"), carrier: id("FOUR"), mode: "tensor" });
let base;
test.beforeEach(() => { base = mkdtempSync(join(tmpdir(), "recursive-fabric-")); });
test.afterEach(() => rmSync(base, { recursive: true, force: true }));

function membrane(suffix) { return { account: `eip155:31337:0x${suffix.padStart(40, "0")}`, authority: id(`authority-${suffix}`), custody: id(`custody-${suffix}`), territory: id(`territory-${suffix}`) }; }
function leaf(law) { return { profile: HIERARCHICAL_CIRCUIT_PROFILE, law, ports: [port("in", "input"), port("out", "output")], instances: [], nets: [], behavior: { factors: [{ inputs: ["in"], outputs: ["out"], rows }] } }; }
function rml(value) {
  if (value === null) return "nil";
  if (typeof value === "boolean") return value ? "#t" : "#f";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `(${value.map(rml).join(" ")})`;
  return `(map ${Object.entries(value).map(([key, child]) => `(${JSON.stringify(key)} ${rml(child)})`).join(" ")})`;
}
function settlement(root, name, suffix, lawType = `${name}Law`) {
  mkdirSync(join(root, "content", "contracts"), { recursive: true });
  mkdirSync(join(root, "content", "agent-cards"), { recursive: true });
  mkdirSync(join(root, "content", "evm", "accounts"), { recursive: true });
  const source = lawSource(lawType), law = compileRmlLaw(source).id, component = leaf(law), placement = membrane(suffix);
  writeFileSync(join(root, "package.json"), JSON.stringify({ name, "x-agentic-metro-enterprise": { "node-id": name, actor: `urn:ame:${name}`, "operation-catalog": { operate: { protocol: "A2A 1.0", legacyCompatibility: false } } } }));
  writeFileSync(join(root, "content", "contracts", `${name}.rml`), source);
  writeFileSync(join(root, "content", "agent-cards", `${name}.json`), JSON.stringify({ name, capabilities: { extensions: [{ uri: SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION, required: true, params: { profile: SOVEREIGN_CIRCUIT_INTERFACE_PROFILE, ...placement, component } }] } }));
  writeFileSync(join(root, "content", "evm", "accounts", "eip155-31337.json"), JSON.stringify({ profile: "org.emsenn.evm.sovereign-enterprise-account.v3", enterprise: { nodeId: name, urn: `urn:ame:${name}`, enterpriseId: `0x${"11".repeat(32)}` }, chain: { chainId: 31337, caip2: "eip155:31337" }, account: { address: placement.account.split(":").at(-1), caip10: placement.account }, deployment: { transaction: `0x${"22".repeat(32)}`, block: 1 } }));
  return { component, placement };
}

test("one law and one black-box interface form an irreducible die", () => {
  settlement(base, "only-die", "1");
  const result = assayRecursiveSettlementFabric(base);
  assert.equal(result.conforming, true, JSON.stringify(result.violations));
  assert.equal(result.settlements[0].kind, "die");
});

test("a board may compose independently contracted dies without owning their settlement interiors", () => {
  const board = settlement(base, "contracted-board", "7");
  const manifestPath = join(base, "package.json"), manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest["x-agentic-metro-enterprise"]["organizational-kind"] = "circuit-board-nation";
  writeFileSync(manifestPath, JSON.stringify(manifest));
  mkdirSync(join(base, "content", "circuits"), { recursive: true });
  writeFileSync(join(base, "content", "circuits", "family.rml"), `#lang rmn/v2\n${rml({ profile: "org.emsenn.rmn.contracted-circuit-family.v1", law: board.component.law, providerRoles: ["observer", "assembler"], synthesisRequired: true, independentEquivalenceRequired: true, localMaterialAccess: false })}\n`);
  const result = assayRecursiveSettlementFabric(base);
  assert.equal(result.conforming, true, JSON.stringify(result.violations));
  assert.equal(result.settlements[0].kind, "board");
  assert.equal(result.settlements[0].composition, "contracted");
  assert.equal(result.settlements[0].realization.realized, "per-contract");
});

test("a board is accepted only when its public die is realized by sovereign children", () => {
  const board = settlement(base, "board", "9", "SharedLaw"), childRoot = join(base, "services", "child"), child = settlement(childRoot, "child", "1", "SharedLaw");
  const implementation = { ...board.component, instances: [{ name: "child", component: hierarchicalCircuitId(child.component) }], nets: [
    { name: "input", driver: { instance: null, port: "in" }, sinks: [{ instance: "child", port: "in" }], mode: "tensor", chain: null, contract: null },
    { name: "output", driver: { instance: "child", port: "out" }, sinks: [{ instance: null, port: "out" }], mode: "tensor", chain: null, contract: null },
  ] };
  const assembly = { profile: "org.emsenn.rmn.circuit-assembly.v1", circuit: hierarchicalCircuitId(implementation), placements: [{ address: [], membrane: board.placement }, { address: ["child"], membrane: child.placement }] };
  mkdirSync(join(base, "content", "circuits"), { recursive: true });
  writeFileSync(join(base, "content", "circuits", "implementation.rml"), `#lang rmn/v2\n${rml(implementation)}\n`);
  writeFileSync(join(base, "content", "circuits", "assembly.rml"), `#lang rmn/v2\n${rml(assembly)}\n`);
  const result = assayRecursiveSettlementFabric(base);
  assert.equal(result.conforming, true, JSON.stringify(result.violations));
  assert.equal(result.settlements.find(({ nodeId }) => nodeId === "board").realization.realized, true);
});

test("one reusable die design may inhabit two distinct sovereign child settlements", () => {
  const board = settlement(base, "board", "9", "SharedLaw"), left = settlement(join(base, "services", "left"), "left", "1", "SharedLaw"), right = settlement(join(base, "services", "right"), "right", "2", "SharedLaw");
  const component = hierarchicalCircuitId(left.component);
  assert.equal(component, hierarchicalCircuitId(right.component));
  const implementation = { ...board.component, instances: [{ name: "left", component }, { name: "right", component }], nets: [
    { name: "input", driver: { instance: null, port: "in" }, sinks: [{ instance: "left", port: "in" }], mode: "tensor", chain: null, contract: null },
    { name: "middle", driver: { instance: "left", port: "out" }, sinks: [{ instance: "right", port: "in" }], mode: "tensor", chain: null, contract: null },
    { name: "output", driver: { instance: "right", port: "out" }, sinks: [{ instance: null, port: "out" }], mode: "tensor", chain: null, contract: null },
  ] };
  const assembly = { profile: "org.emsenn.rmn.circuit-assembly.v1", circuit: hierarchicalCircuitId(implementation), placements: [{ address: [], membrane: board.placement }, { address: ["left"], membrane: left.placement }, { address: ["right"], membrane: right.placement }] };
  mkdirSync(join(base, "content", "circuits"), { recursive: true });
  writeFileSync(join(base, "content", "circuits", "implementation.rml"), `#lang rmn/v2\n${rml(implementation)}\n`);
  writeFileSync(join(base, "content", "circuits", "assembly.rml"), `#lang rmn/v2\n${rml(assembly)}\n`);
  const result = assayRecursiveSettlementFabric(base);
  assert.equal(result.conforming, true, JSON.stringify(result.violations));
});

test("a multi-law leaf is a cut frontier rather than a giant die", () => {
  settlement(base, "uncut", "1");
  writeFileSync(join(base, "content", "contracts", "second.rml"), lawSource("SecondLaw"));
  const result = assayRecursiveSettlementFabric(base);
  assert.equal(result.conforming, false);
  assert(result.violations.some(({ code }) => code === "mixed-law-settlement"));
  assert.deepEqual(result.frontier, ["."]);
});

test("one package cannot conceal several independently contractable operations inside one die", () => {
  settlement(base, "uncut-operations", "1");
  const manifestPath = join(base, "package.json"), manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest["x-agentic-metro-enterprise"]["operation-catalog"].second = { protocol: "A2A 1.0", legacyCompatibility: false };
  writeFileSync(manifestPath, JSON.stringify(manifest));
  const result = assayRecursiveSettlementFabric(base);
  assert.equal(result.conforming, false);
  assert(result.violations.some(({ code }) => code === "die-operation-cardinality"));
});

test("a label-only wallet claim cannot energize a die", () => {
  settlement(base, "mismatch", "1");
  const cardPath = join(base, "content", "agent-cards", "mismatch.json"), card = JSON.parse(readFileSync(cardPath, "utf8"));
  card.capabilities.extensions[0].params.account = membrane("2").account;
  writeFileSync(cardPath, JSON.stringify(card));
  const result = assayRecursiveSettlementFabric(base);
  assert.equal(result.conforming, false);
  assert(result.violations.some(({ code }) => code === "boundary-account-mismatch"));
});

test("a malformed package manifest cannot disappear into a false conforming empty territory", () => {
  writeFileSync(join(base, "package.json"), "{not-json");
  const result = assayRecursiveSettlementFabric(base);
  assert.equal(result.conforming, false);
  assert.equal(result.settlementCount, 0);
  assert(result.violations.some(({ code }) => code === "invalid-settlement-manifest"));
});

test("the A2A deployment read grant bounds the exact requested territory", () => {
  assert.equal(authorizeFabricTerritory("/home/emsenn/info/lib", "/home/emsenn/info"), "/home/emsenn/info/lib");
  assert.throws(() => authorizeFabricTerritory("/home/emsenn/.ssh", "/home/emsenn/info"), /outside/u);
  assert.throws(() => authorizeFabricTerritory("/home/emsenn/info", ""), /explicitly authorize/u);
});
