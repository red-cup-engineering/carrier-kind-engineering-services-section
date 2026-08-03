// Pure synthesis die: no provider discovery, material access, execution, or attestation.
import { encodeRelationalValue } from "@red-cup-engineering/relation-model-notation-runtime/relational-value";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import {
  CIRCUIT_ASSEMBLY_PROFILE,
  HIERARCHICAL_CIRCUIT_PROFILE,
  hierarchicalCircuitId,
  normalizeCircuitProfile,
  normalizeHierarchicalCircuit,
  verifyCircuitAssembly,
} from "@red-cup-engineering/relation-model-notation-runtime/hierarchical-circuit";

export const FABRICATION_CIRCUIT_PROFILE = "org.emsenn.infomaterial.fabrication-circuit.v2";

const FOUR = Object.freeze([
  Object.freeze({ positiveEvidence: false, negativeEvidence: false }),
  Object.freeze({ positiveEvidence: true, negativeEvidence: false }),
  Object.freeze({ positiveEvidence: false, negativeEvidence: true }),
  Object.freeze({ positiveEvidence: true, negativeEvidence: true }),
]);
const TRUE = Object.freeze({ positiveEvidence: true, negativeEvidence: false });

function ni(label) {
  return identifyJsonSemanticContent({
    objectKind: "recursive-observation-circuit.fabrication-pinout",
    value: { register: "recursive-infomaterial-fabrication", label },
    witnessRoot: EMPTY_WITNESS_ROOT,
  }).token;
}

export const FABRICATION_PINOUT = Object.freeze({
  schedulePredicate: ni("admits exact fabrication schedule"), scheduleCarrier: ni("RecursiveInfomaterialFabricationRequest"),
  platePredicate: ni("witnesses complete shallow plate"), plateCarrier: ni("InfomaterialDirectoryPlateObservation"),
  patchEvidencePredicate: ni("witnesses complete infomaterial patch evidence tensor"), patchEvidenceCarrier: ni("InfomaterialPatchEvidenceTensor"),
});

const identityBehavior = (input = "schedule", output = "receipt") => ({ factors: [{ inputs: [input], outputs: [output], rows: FOUR.map((value) => ({ input: [value], output: [value] })) }] });
const constantTrueBehavior = (input = "schedule", output = "receipt") => ({ factors: [{ inputs: [input], outputs: [output], rows: FOUR.map((value) => ({ input: [value], output: [TRUE] })) }] });
const conjunctionBehavior = () => ({ factors: [{ inputs: ["left", "right"], outputs: ["receipt"], rows: FOUR.flatMap((left) => FOUR.map((right) => ({
  input: [left, right],
  output: [{ positiveEvidence: left.positiveEvidence && right.positiveEvidence, negativeEvidence: left.negativeEvidence || right.negativeEvidence }],
}))) }] });

function port(name, direction, predicate, carrier) { return { name, direction, predicate, carrier, mode: "tensor" }; }
function endpoint(instance, portName) { return { instance, port: portName }; }
function net(name, driver, sink) { return { name, driver, sinks: [sink], mode: "tensor", chain: null, contract: null }; }

function admittedProfile(source, field) {
  try { return normalizeCircuitProfile(source); }
  catch (error) { throw new Error(`${field} ${error.message}`, { cause: error }); }
}

function admittedInterface(source, field) {
  if (!source || Object.keys(source).sort().join("\u0000") !== ["account", "authority", "component", "custody", "territory"].sort().join("\u0000")) throw new Error(`${field} must be one exact sovereign black-box circuit interface`);
  const component = normalizeHierarchicalCircuit(source.component);
  if (component.instances.length !== 0 || component.nets.length !== 0) throw new Error(`${field} must not disclose a provider interior`);
  const membraneProfile = admittedProfile({ account: source.account, law: component.law, authority: source.authority, custody: source.custody, territory: source.territory }, field);
  return { ...membraneProfile, component };
}

function membrane(profile) {
  return { account: profile.account, authority: profile.authority, custody: profile.custody, territory: profile.territory };
}

function leaf(profile, ports, behavior) {
  return normalizeHierarchicalCircuit({ profile: HIERARCHICAL_CIRCUIT_PROFILE, law: profile.law, ports, instances: [], nets: [], behavior });
}

function uniqueComponents(values, rootIdentity) {
  const byId = new Map();
  for (const value of values) {
    const identity = hierarchicalCircuitId(value);
    if (identity !== rootIdentity) byId.set(identity, value);
  }
  return [...byId.values()];
}

function observationNode(left, right, tallyCircuit, boardProfile, tallyProfile) {
  const circuit = normalizeHierarchicalCircuit({
    profile: HIERARCHICAL_CIRCUIT_PROFILE,
    law: boardProfile.law,
    ports: [
      port("schedule", "input", FABRICATION_PINOUT.schedulePredicate, FABRICATION_PINOUT.scheduleCarrier),
      port("receipt", "output", FABRICATION_PINOUT.patchEvidencePredicate, FABRICATION_PINOUT.patchEvidenceCarrier),
    ],
    instances: [
      { name: "left", component: hierarchicalCircuitId(left.circuit) },
      { name: "right", component: hierarchicalCircuitId(right.circuit) },
      { name: "tally", component: hierarchicalCircuitId(tallyCircuit) },
    ],
    nets: [
      { name: "schedule-fanout", driver: endpoint(null, "schedule"), sinks: [endpoint("left", "schedule"), endpoint("right", "schedule")], mode: "tensor", chain: null, contract: null },
      net("left-to-tally", endpoint("left", "receipt"), endpoint("tally", "left")),
      net("right-to-tally", endpoint("right", "receipt"), endpoint("tally", "right")),
      net("tally-to-output", endpoint("tally", "receipt"), endpoint(null, "receipt")),
    ],
    behavior: identityBehavior(),
  });
  return {
    circuit,
    profile: boardProfile,
    children: [
      { name: "left", node: left },
      { name: "right", node: right },
      { name: "tally", node: { circuit: tallyCircuit, profile: tallyProfile, children: [] } },
    ],
  };
}

function populate(node, address, placements, components, observerAddresses) {
  placements.push({ address, membrane: membrane(node.profile) });
  components.push(node.circuit);
  if (Number.isInteger(node.observerIndex)) observerAddresses[node.observerIndex] = address;
  for (const child of node.children) populate(child.node, [...address, child.name], placements, components, observerAddresses);
}

export function buildFabricationCircuitFamily({ root, plate, cover, observers, tally }) {
  if (!Array.isArray(observers)) throw new Error("observers must be an exact route-ordered membrane profile sequence");
  const rootProfile = admittedProfile(root, "root"), plateProfile = admittedInterface(plate, "plate"), coverProfile = admittedInterface(cover, "cover"), tallyProfile = admittedProfile(tally, "tally");
  const observerProfiles = observers.map((profile, index) => admittedInterface(profile, `observer ${index}`));
  const plateCircuit = plateProfile.component;
  const observerNodes = observerProfiles.map((profile, observerIndex) => ({
    circuit: profile.component,
    profile,
    children: [],
    observerIndex,
  }));
  const coverCircuit = coverProfile.component;
  const tallyCircuit = leaf(tallyProfile, [
    port("left", "input", FABRICATION_PINOUT.patchEvidencePredicate, FABRICATION_PINOUT.patchEvidenceCarrier),
    port("right", "input", FABRICATION_PINOUT.patchEvidencePredicate, FABRICATION_PINOUT.patchEvidenceCarrier),
    port("receipt", "output", FABRICATION_PINOUT.patchEvidencePredicate, FABRICATION_PINOUT.patchEvidenceCarrier),
  ], conjunctionBehavior());
  const emptyCircuit = leaf(tallyProfile, [
    port("schedule", "input", FABRICATION_PINOUT.schedulePredicate, FABRICATION_PINOUT.scheduleCarrier),
    port("receipt", "output", FABRICATION_PINOUT.patchEvidencePredicate, FABRICATION_PINOUT.patchEvidenceCarrier),
  ], constantTrueBehavior());

  let frontier = observerNodes.length > 0
    ? observerNodes
    : [{ circuit: emptyCircuit, profile: tallyProfile, children: [] }];
  while (frontier.length > 1) {
    const next = [];
    for (let index = 0; index < frontier.length; index += 2) {
      next.push(index + 1 === frontier.length
        ? frontier[index]
        : observationNode(frontier[index], frontier[index + 1], tallyCircuit, rootProfile, tallyProfile));
    }
    frontier = next;
  }
  const observationNetwork = frontier[0];
  const circuit = normalizeHierarchicalCircuit({
    profile: HIERARCHICAL_CIRCUIT_PROFILE,
    law: rootProfile.law,
    ports: [
      port("schedule", "input", FABRICATION_PINOUT.schedulePredicate, FABRICATION_PINOUT.scheduleCarrier),
      port("receipt", "output", FABRICATION_PINOUT.patchEvidencePredicate, FABRICATION_PINOUT.patchEvidenceCarrier),
    ],
    instances: [
      { name: "plate-provider", component: hierarchicalCircuitId(plateCircuit) },
      { name: "observation-network", component: hierarchicalCircuitId(observationNetwork.circuit) },
      { name: "cover-provider", component: hierarchicalCircuitId(coverCircuit) },
    ],
    nets: [
      { name: "schedule-fanout", driver: endpoint(null, "schedule"), sinks: [endpoint("plate-provider", "schedule"), endpoint("observation-network", "schedule")], mode: "tensor", chain: null, contract: null },
      net("plate-to-cover", endpoint("plate-provider", "receipt"), endpoint("cover-provider", "plate")),
      net("observations-to-cover", endpoint("observation-network", "receipt"), endpoint("cover-provider", "observations")),
      net("cover-to-output", endpoint("cover-provider", "receipt"), endpoint(null, "receipt")),
    ],
    behavior: identityBehavior(),
  });
  const rootNode = {
    circuit,
    profile: rootProfile,
    children: [
      { name: "plate-provider", node: { circuit: plateCircuit, profile: plateProfile, children: [] } },
      { name: "observation-network", node: observationNetwork },
      { name: "cover-provider", node: { circuit: coverCircuit, profile: coverProfile, children: [] } },
    ],
  };
  const placements = [], componentOccurrences = [], observerAddresses = [];
  populate(rootNode, [], placements, componentOccurrences, observerAddresses);
  const circuitId = hierarchicalCircuitId(circuit), components = uniqueComponents(componentOccurrences, circuitId);
  const assembly = { profile: CIRCUIT_ASSEMBLY_PROFILE, circuit: circuitId, placements };
  const verified = verifyCircuitAssembly(assembly, circuit, components);
  return {
    profile: FABRICATION_CIRCUIT_PROFILE,
    circuit,
    components,
    assembly: verified.assembly,
    assemblyId: verified.assemblyIdentity,
    circuitId,
    observerAddresses,
    behavior: verified.family.verified.get(circuitId).behavior,
  };
}
