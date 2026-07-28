import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { generateKeyPairSync } from "node:crypto";
import { createAgentCardSigningConfiguration } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { verifyCircuitAssembly } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { synthesizeRecursiveObservationCircuit } from "@red-cup-engineering/recursive-observation-circuit-synthesis";
import { HIERARCHICAL_CIRCUIT_PROFILE, SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION, SOVEREIGN_CIRCUIT_INTERFACE_PROFILE } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { FABRICATION_PINOUT } from "@red-cup-engineering/recursive-observation-circuit-synthesis/pinout";

const FOUR = [
  { positiveEvidence: false, negativeEvidence: false }, { positiveEvidence: true, negativeEvidence: false },
  { positiveEvidence: false, negativeEvidence: true }, { positiveEvidence: true, negativeEvidence: true },
];

function identity(label) { return semanticId(["constant", ["base", "Text"], label]); }
function account(index) {
  const digit = String((index % 9) + 1);
  return `eip155:31337:0x${digit.repeat(40)}`;
}

export function circuitProfile(label, index = 0) {
  return {
    account: account(index),
    law: identity(`${label}:law`),
    authority: identity(`${label}:authority`),
    custody: identity(`${label}:custody`),
    territory: identity(`${label}:territory`),
  };
}

function port(name, direction, predicate, carrier) { return { name, direction, predicate, carrier, mode: "tensor" }; }
function identityBehavior(input = "schedule", output = "receipt") { return { factors: [{ inputs: [input], outputs: [output], rows: FOUR.map((value) => ({ input: [value], output: [value] })) }] }; }
function conjunctionBehavior() { return { factors: [{ inputs: ["observations", "plate"], outputs: ["receipt"], rows: FOUR.flatMap((left) => FOUR.map((right) => ({ input: [left, right], output: [{ positiveEvidence: left.positiveEvidence && right.positiveEvidence, negativeEvidence: left.negativeEvidence || right.negativeEvidence }] }))) }] }; }

export function circuitInterface(role, label, index = 0) {
  const membrane = circuitProfile(label, index), unary = role !== "cover";
  const ports = role === "plate" ? [port("schedule", "input", FABRICATION_PINOUT.schedulePredicate, FABRICATION_PINOUT.scheduleCarrier), port("receipt", "output", FABRICATION_PINOUT.platePredicate, FABRICATION_PINOUT.plateCarrier)]
    : role === "cover" ? [port("observations", "input", FABRICATION_PINOUT.patchEvidencePredicate, FABRICATION_PINOUT.patchEvidenceCarrier), port("plate", "input", FABRICATION_PINOUT.platePredicate, FABRICATION_PINOUT.plateCarrier), port("receipt", "output", FABRICATION_PINOUT.patchEvidencePredicate, FABRICATION_PINOUT.patchEvidenceCarrier)]
      : [port("schedule", "input", FABRICATION_PINOUT.schedulePredicate, FABRICATION_PINOUT.scheduleCarrier), port("receipt", "output", FABRICATION_PINOUT.patchEvidencePredicate, FABRICATION_PINOUT.patchEvidenceCarrier)];
  return { account: membrane.account, authority: membrane.authority, custody: membrane.custody, territory: membrane.territory, component: { profile: HIERARCHICAL_CIRCUIT_PROFILE, law: membrane.law, ports, instances: [], nets: [], behavior: unary ? identityBehavior(ports.find(({ direction }) => direction === "input").name, "receipt") : conjunctionBehavior() } };
}

export function fabricationProfiles(label = "fixture") {
  return {
    root: circuitProfile(`${label}:root`, 0),
    plate: circuitInterface("plate", `${label}:plate`, 1),
    cover: circuitInterface("cover", `${label}:cover`, 2),
    tally: circuitProfile(`${label}:tally`, 0),
  };
}

export function observerProfile(index, label = "fixture") {
  return circuitInterface("observer", `${label}:observer:${index}`, index + 3);
}

export function agentCard(profile, origin = "http://fixture.test") {
  const protectedHeader = Buffer.from(JSON.stringify({ alg: "EdDSA", kid: "fixture-ed25519", typ: "JOSE", jku: `${origin}/.well-known/jwks.json` }), "utf8").toString("base64url");
  return { capabilities: { extensions: [{
    uri: SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION,
    description: "test sovereign circuit interface",
    required: false,
    params: { profile: SOVEREIGN_CIRCUIT_INTERFACE_PROFILE, ...profile },
  }] }, signatures: [{ protected: protectedHeader, signature: Buffer.alloc(64).toString("base64url"), header: undefined }] };
}

export function fixtureDiscovery({ label = "fixture" } = {}) {
  return async ({ agentUrl }) => {
    const host = new URL(agentUrl).hostname;
    const origin = new URL(agentUrl).origin;
    if (host.includes("equivalence")) return agentCard(circuitInterface("observer", `${label}:equivalence`, 8), origin);
    if (host.includes("synthesis")) return agentCard(circuitInterface("observer", `${label}:synthesis`, 7), origin);
    if (host.includes("plate")) return agentCard(circuitInterface("plate", `${label}:plate`, 1), origin);
    if (host.includes("cover")) return agentCard(circuitInterface("cover", `${label}:cover`, 2), origin);
    const ordinal = host.includes("two") ? 1 : 0;
    if (host.includes("observer")) return agentCard(observerProfile(ordinal, label), origin);
    throw new Error(`unrecognized fixture agent ${agentUrl}`);
  };
}

export async function localCircuitSynthesis({ root, plate, cover, tally, observers }) {
  const result = synthesizeRecursiveObservationCircuit({ kind: "RecursiveObservationCircuitSynthesisRequest", root, plate, cover, tally, observers });
  return { receipt: result.receipt, receiptNi: result.semanticId, exchange: { inputNi: identity(`synthesis:${result.semanticId}:input`), outputNi: identity(`synthesis:${result.semanticId}:output`) } };
}

export async function localCircuitAssay({ circuit, components, assembly }) {
  const verified = verifyCircuitAssembly(assembly, circuit, components);
  const receiptNi = identity(`assay:${verified.family.rootIdentity}:${verified.assemblyIdentity}:receipt`);
  return {
    receipt: { circuit: verified.family.rootIdentity, assembly: verified.assemblyIdentity, equivalent: true },
    receiptNi,
    exchange: {
      inputNi: identity(`assay:${verified.family.rootIdentity}:input`),
      outputNi: identity(`assay:${verified.family.rootIdentity}:output`),
    },
  };
}

export function ephemeralAgentCardSigning(baseUrl, label = "fixture") {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return createAgentCardSigningConfiguration({ baseUrl, kid: `${label}-ed25519`, privateKey, publicJwk: publicKey.export({ format: "jwk" }) });
}
