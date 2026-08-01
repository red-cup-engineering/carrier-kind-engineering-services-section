import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service";
import { ephemeralAgentCardSigning } from "@red-cup-engineering/a2a-agent-card-key-service/testing";
import { conformTerm } from "../src/client.mjs";
import { decodeCanonical, encodeCanonical } from "../src/canonical-cbor.mjs";
import { CIRCUIT_TRACE_PROFILE, assayCircuitTrace, decodeCircuitTraceReceipt, encodeCircuitTraceRequest } from "../src/circuit-residue.mjs";
import { conformAscribedTerm } from "../src/conformance.mjs";
import { FOUR, isKnowledgeCover } from "../src/four.mjs";
import { CIRCUIT_ASSEMBLY_PROFILE, HIERARCHICAL_CIRCUIT_PROFILE, hierarchicalCircuitId } from "../src/hierarchical-circuit.mjs";
import { compileRmlLaw, decodeCompiledLaw } from "../src/law.mjs";
import { assay, decodeSemantic, formatRml, parseRml, semanticId } from "../src/rmn-core.mjs";
import { decodeRelationalValue, encodeRelationalValue } from "../src/relational-value.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIE_ROOT = resolve(dirname(fileURLToPath(import.meta.resolve("@red-cup-engineering/rmn-semantic-conformance-die"))), "..");
const id = (label) => semanticId(["mark", label]);
const account = (suffix) => `eip155:31337:0x${suffix.padStart(40, "0")}`;

async function freePort() {
  const server = createServer();
  await new Promise((accept) => server.listen(0, "127.0.0.1", accept));
  const port = server.address().port;
  await new Promise((accept) => server.close(accept));
  return port;
}

function effectCell(outcome, evidenceRoot = id("proposal-evidence")) {
  return {
    law: id("law"), caller: account("1"), provider: account("2"),
    precondition: id("pre"), operation: id("operation"), postcondition: id("post"),
    refusal: id("refusal"), evidenceRoot, outcome,
    measures: [{ dimension: "wit", quantity: "1", unit: "wit" }], parent: null,
  };
}

function residueReceipt(label, overrides = {}) {
  return {
    originatingSettlement: account("1"), receiptId: id(`receipt-${label}`), receiptDigest: id(`digest-${label}`), chain: "eip155:31337", contract: id("seam"), orientation: 1,
    chu: { left: FOUR.both, right: FOUR.both }, connection: { quarterTurns: 1 },
    priceErasure: { unit: "erasure", irreversibleAmount: "1", priceAmount: "1" },
    economicCurrentAffinity: { current: ["1", "1"], affinity: ["2", "1"] }, ...overrides,
  };
}

function residueCircuit() {
  const pin = (name, direction) => ({ name, direction, mode: "par", predicate: id("evidences"), carrier: id("FOUR") });
  const leaf = (suffix) => ({
    profile: HIERARCHICAL_CIRCUIT_PROFILE, law: id("trace-law"),
    ports: [pin("in", "input"), pin("out", "output")], instances: [], nets: [],
    behavior: { factors: [{ inputs: ["in"], outputs: ["out"], rows: [FOUR.neither, FOUR.true, FOUR.false, FOUR.both].map((value) => ({ input: [value], output: [value] })) }] },
  });
  const left = leaf("1"), right = leaf("2"), seam = id("seam");
  const circuit = {
    profile: HIERARCHICAL_CIRCUIT_PROFILE, law: id("trace-root-law"),
    ports: [],
    instances: [
      { name: "left", component: hierarchicalCircuitId(left) },
      { name: "right", component: hierarchicalCircuitId(right) },
    ],
    nets: [
      { name: "left-to-right", driver: { instance: "left", port: "out" }, sinks: [{ instance: "right", port: "in" }], mode: "par", chain: "eip155:31337", contract: seam },
      { name: "right-to-left", driver: { instance: "right", port: "out" }, sinks: [{ instance: "left", port: "in" }], mode: "par", chain: "eip155:31337", contract: seam },
    ],
    behavior: { factors: [] },
  };
  const placement = (address, suffix) => ({ address, membrane: { account: account(suffix), authority: id(`authority-${suffix}`), custody: id(`custody-${suffix}`), territory: id(`territory-${suffix}`) } });
  const assembly = { profile: CIRCUIT_ASSEMBLY_PROFILE, circuit: hierarchicalCircuitId(circuit), placements: [placement([], "3"), placement(["left"], "1"), placement(["right"], "2")] };
  return { circuit, components: [left], assembly };
}

function residueTrace(changes = {}) {
  return [
    { net: "left-to-right", sink: { instance: "right", port: "in" }, receipt: residueReceipt("left", changes.left) },
    { net: "right-to-left", sink: { instance: "left", port: "in" }, receipt: residueReceipt("right", { originatingSettlement: account("2"), ...(changes.right ?? {}) }) },
  ];
}


test("RFC 8949 core-deterministic CBOR is exact and rejects noncanonical input", () => {
  const bytes = encodeCanonical(["star"]);
  assert.equal(bytes.toString("hex"), "816473746172");
  assert.deepEqual(decodeCanonical(bytes), ["star"]);
  assert.throws(() => decodeCanonical(Buffer.from([0x18, 0x00])), /not in RFC 8949 core deterministic form/u);
});

test("relational values round-trip structured carrier data as typed RMN without JSON", () => {
  const source = { z: [true, null, { amount: 7, price: 2.5 }], a: "é" };
  const encoded = encodeRelationalValue(source);
  assert.deepEqual(decodeRelationalValue(encoded.type, encoded.term), source);
  assert.deepEqual(encodeRelationalValue({ a: "é", z: [true, null, { price: 2.5, amount: 7 }] }), encoded);
});

test("RML laws have one deterministic typed RMN identity and require the full effect boundary", () => {
  const left = compileRmlLaw('#lang rmn/v2\n(map ("type" "ServiceLaw") ("version" 1) ("precondition" "admitted") ("operation" "act") ("postcondition" "settled") ("refusal" "refused"))');
  const right = compileRmlLaw('#lang rmn/v2\n(map ("refusal" "refused") ("postcondition" "settled") ("operation" "act") ("precondition" "admitted") ("version" 1) ("type" "ServiceLaw"))');
  assert.equal(left.id, right.id);
  assert.deepEqual(left.bytes, right.bytes);
  assert.deepEqual(decodeCompiledLaw(decodeSemantic(left.bytes)), left.value);
  assert.throws(() => compileRmlLaw('#lang rmn/v2\n(map ("type" "IncompleteLaw") ("version" 1) ("precondition" "x") ("operation" "x") ("postcondition" "x"))'), /requires refusal/u);
});

test("NFC-equivalent terms have one RFC 6920 identity", () => {
  assert.equal(semanticId(["mark", "e\u0301"]), semanticId(["mark", "é"]));
  assert.match(semanticId(["star"]), /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.throws(() => semanticId({ "e\u0301": 1, "é": 2 }), /collide after NFC normalization/u);
});

test("an uninterpreted byte carrier is admitted exactly as a Mark", () => {
  const bytes = Buffer.from([0x7b, 0xff, 0x00, 0x0a]);
  const accepted = conformAscribedTerm(["ascribe", ["mark"], ["mark", bytes]]);
  assert.deepEqual(accepted.response, ["ascribe", ["mark"], ["mark", bytes]]);
});

test("published language-neutral CBOR and ni vectors remain exact", () => {
  const values = new Map([
    ["star", ["star"]], ["four-neither", ["four", false, false]], ["mark-nfc-e-acute", ["mark", "é"]],
    ["identity-rml", ["app", ["lam", ["var", 0]], ["star"]]],
  ]);
  const lines = readFileSync(join(DIE_ROOT, "content/vectors/rmn-core-v2.tsv"), "utf8").split("\n").filter((line) => line && !line.startsWith("#"));
  for (const line of lines) {
    const [name, hex, ni] = line.split("\t"), value = values.get(name);
    assert.ok(value, `unknown vector ${name}`);
    assert.equal(encodeCanonical(value).toString("hex"), hex);
    assert.equal(semanticId(value), ni);
  }
});

test("RML surface variation normalizes to one typed RMN term", () => {
  const left = assay({ rml: readFileSync(join(DIE_ROOT, "content/vectors/identity.rml"), "utf8"), expectedType: ["unit"], fuel: 4 });
  const right = assay({ rml: "#lang rmn/v2\n; same term\n( app\n (lam (var 0)) (star) )", expectedType: ["unit"], fuel: 4 });
  assert.equal(left.semanticId, right.semanticId);
  assert.deepEqual(left.normalForm, ["star"]);
});

test("one deterministic RML projector round-trips normalized carrier material", () => {
  const source = { zeta: [null, true, false, 3, "é"], alpha: { nested: "value" } };
  const projected = formatRml(source);
  assert.equal(projected.startsWith("#lang rmn/v2\n(map (\"alpha\""), true);
  assert.deepEqual(parseRml(projected), source);
  assert.equal(formatRml(parseRml(projected)), projected);
  assert.throws(() => formatRml(Buffer.from("not-in-rml-v2-text-profile")), (error) => error.code === "unprojectable-rml");
});

test("typed products, sums, lists, FOUR, and WIT remain one RMN algebra", () => {
  const marks = ["cons", ["mark", "alpha"], ["cons", ["mark", "beta"], ["nil", ["mark"]]]];
  assert.deepEqual(assay({ term: marks, expectedType: ["list", ["mark"]], fuel: 0 }).normalForm, marks);
  assert.deepEqual(assay({ term: ["left", ["mark", "present"], ["unit"]], expectedType: ["sum", ["mark"], ["unit"]], fuel: 0 }).normalForm[0], "left");
  const enterprise = ["base", "Enterprise"], service = ["base", "Service"];
  const grounded = ["ground", ["predicate", "offers", enterprise, service], ["constant", enterprise, id("enterprise")], ["constant", service, id("service")]];
  const witness = ["witness", grounded, ["four", false, false], ["four", true, false], id("evidence")];
  assert.deepEqual(assay({ term: witness, expectedType: ["wit", ["grounded", enterprise, service]], fuel: 0 }).normalForm, witness);
  assert.equal(isKnowledgeCover(FOUR.neither, FOUR.true), true);
  const vector = ["vector", ["mark"], Array.from({ length: 20_000 }, (_, index) => ["mark", String(index)])];
  assert.equal(assay({ term: vector, expectedType: ["vector", ["mark"]], fuel: 0 }).normalForm[2].length, 20_000);
});

test("type ascription is the sole service request shape and normalizes its term", () => {
  const result = conformAscribedTerm(["ascribe", ["unit"], ["app", ["lam", ["var", 0]], ["star"]]]);
  assert.deepEqual(result.response, ["ascribe", ["unit"], ["star"]]);
  assert.throws(() => conformAscribedTerm(["star"]), /requires one \(ascribe Type Term\)/u);
});

test("effect bundles retain typed measures and require exact operation identity", () => {
  const operation = ["mark", "prompt"];
  const cell = { ...effectCell(FOUR.neither), operation: semanticId(operation), measures: [
    { dimension: "wit", quantity: "1", unit: "wit" }, { dimension: "gas", quantity: "0", unit: "gas" },
  ] };
  const type = ["product", ["effect"], ["mark"]];
  const accepted = conformAscribedTerm(["ascribe", type, ["pair", ["effect", cell], operation]]);
  assert.deepEqual(accepted.effectCell.measures.map(({ dimension }) => dimension), ["gas", "wit"]);
  assert.throws(() => conformAscribedTerm(["ascribe", type, ["pair", ["effect", { ...cell, operation: id("other") }], operation]]), /does not identify/u);
});

test("the general normalizer keeps WIT transition as a distinct typed judgment", () => {
  const evidence = id("completion-evidence");
  const proposal = effectCell(FOUR.neither);
  const completion = effectCell(FOUR.true, evidence);
  const type = ["product", ["product", ["effect"], ["effect"]], ["base", "Evidence"]];
  const term = ["pair", ["pair", ["effect", proposal], ["effect", completion]], ["constant", ["base", "Evidence"], evidence]];
  assert.throws(() => conformAscribedTerm(["ascribe", type, term]));
});

test("typed circuit traces follow recursive par topology and keep protected holonomy distinct from unpriced erasure", () => {
  const { circuit, components, assembly } = residueCircuit(), trace = residueTrace({ right: { connection: { quarterTurns: 0 } } });
  const source = { kind: "HierarchicalCircuitTraceRequest", profile: CIRCUIT_TRACE_PROFILE, circuit, components, assembly, borderClass: { type: "protected", allowedHolonomy: 1 }, trace };
  const protectedResult = assayCircuitTrace(source);
  assert.equal(protectedResult.disposition, "protected-border");
  const request = encodeCircuitTraceRequest(source);
  assert.throws(() => conformAscribedTerm(["ascribe", request.type, request.term]));
  const unpriced = assayCircuitTrace({ ...source, borderClass: { type: "internal", allowedHolonomy: 0 }, trace: residueTrace({ left: { connection: { quarterTurns: 0 }, priceErasure: { unit: "erasure", irreversibleAmount: "1", priceAmount: "0" } }, right: { connection: { quarterTurns: 0 } } }) });
  assert.equal(unpriced.disposition, "unpriced-irreversible-defect");
  assert.throws(() => assayCircuitTrace({ ...source, trace: [trace[0], trace[0]] }), /does not close|receipt .* duplicated/u);
});

test("official A2A 1.0 carries the typed RMN request and response end to end", async () => {
  const port = await freePort(), baseUrl = `http://127.0.0.1:${port}`;
  const running = await serveContractedAgent({
    port, host: "127.0.0.1", baseUrl,
    agentCard: join(ROOT, "content/agent-cards/rmn-semantic-conformance.json"),
    executor: process.execPath, executorArgs: [join(ROOT, "bin/execute-a2a-task.mjs")],
    ...ephemeralAgentCardSigning(baseUrl, "rmn-semantic-conformance-test"),
  });
  try {
    const result = await conformTerm({ agentUrl: `${baseUrl}/.well-known/agent-card.json`, term: ["app", ["lam", ["var", 0]], ["star"]], expectedType: ["unit"], signal: AbortSignal.timeout(10_000) });
    assert.deepEqual(result.normalForm, ["star"]);
  } finally {
    await new Promise((accept) => running.server.close(accept));
  }
});
