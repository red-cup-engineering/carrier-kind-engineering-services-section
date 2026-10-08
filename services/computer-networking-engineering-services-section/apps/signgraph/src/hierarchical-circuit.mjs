/**
 * signgraph/hierarchical-circuit - placement-independent hierarchical circuits
 * over FOUR evidence: leaf and composite circuits with ports, instances and
 * nets, behavior synthesis and equivalence, circuit families and assemblies,
 * and their identities as relational-value graphs.
 */
import { NI_URI_PATTERN as NI } from "@red-cup-engineering/uri-services-section/ni-uri";
import { canonicalEqual } from "@red-cup-engineering/cbor-services-section";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE, relationalValueId } from "./relational-value.mjs";
import { bytesCompare, semanticId, utf8Bytes } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { FOUR, four, isKnowledgeCover, joinKnowledgeWire, knowledgeLeqWire, validateFour, witnessBit } from "@red-cup-engineering/computer-data-services-section/four";


const joinFour = joinKnowledgeWire;

export const HIERARCHICAL_CIRCUIT_PROFILE = "org.emsenn.sen.hierarchical-circuit.v3";
export const CIRCUIT_ASSEMBLY_PROFILE = "org.emsenn.sen.circuit-assembly.v1";

const CAIP10 = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}:[-.%a-zA-Z0-9]{1,128}$/u;
const CAIP2 = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}$/u;
const DIRECTIONS = new Set(["input", "output"]);
const MODES = new Set(["tensor", "par"]);
const FOUR_VALUES = Object.freeze(Object.values(FOUR));

/** A circuit or assembly as its relational-value graph under ascription. */
function ascribed(value) { const encoded = encodeRelationalValue(value); return ["ascribe", encoded.type, encoded.term]; }
function unascribed(term) {
  if (!Array.isArray(term) || term.length !== 3 || term[0] !== "ascribe" || !canonicalEqual(term[1], RELATIONAL_VALUE_TYPE)) fail("malformed-circuit", "circuit bytes must contain one relational SEN ascription");
  return decodeRelationalValue(term[1], term[2]);
}
function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function exactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}
function text(value, field) {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) fail("malformed-circuit", `${field} must be nonempty bounded text`);
  return value.normalize("NFC");
}
function ni(value, field) { if (typeof value !== "string" || !NI.test(value)) fail("malformed-circuit", `${field} must be a SHA-256 ni URI`); return value; }
function caip10(value, field) { if (typeof value !== "string" || !CAIP10.test(value)) fail("malformed-circuit", `${field} must be a CAIP-10 account`); return value.toLowerCase(); }
function utf8Compare(left, right) { return bytesCompare(utf8Bytes(left), utf8Bytes(right)); }
function fourKey(value) { const checked = validateFour(value); return `${Number(checked.positiveEvidence)}${Number(checked.negativeEvidence)}`; }

function normalizePort(source) {
  if (!exactKeys(source, ["carrier", "direction", "mode", "name", "predicate"])) fail("malformed-circuit", "a port must expose exactly name, direction, predicate, carrier, and mode");
  const port = { name: text(source.name, "port name"), direction: source.direction, predicate: ni(source.predicate, "port predicate"), carrier: ni(source.carrier, "port carrier"), mode: source.mode };
  if (!DIRECTIONS.has(port.direction)) fail("malformed-circuit", "port direction must be input or output");
  if (!MODES.has(port.mode)) fail("malformed-circuit", "port mode must be tensor or par");
  return port;
}

function normalizeInstance(source) {
  if (!exactKeys(source, ["component", "name"])) fail("malformed-circuit", "an instance must expose exactly name and component");
  return { name: text(source.name, "instance name"), component: ni(source.component, "component identity") };
}

function normalizeEndpoint(source, field) {
  if (!exactKeys(source, ["instance", "port"]) || (source.instance !== null && typeof source.instance !== "string")) fail("malformed-circuit", `${field} must expose an instance name or null and a port name`);
  return { instance: source.instance === null ? null : text(source.instance, `${field} instance`), port: text(source.port, `${field} port`) };
}

function normalizeNet(source) {
  if (!exactKeys(source, ["chain", "contract", "driver", "mode", "name", "sinks"])) fail("malformed-circuit", "a net must expose exactly name, driver, sinks, mode, chain, and contract");
  if (!MODES.has(source.mode)) fail("malformed-circuit", "net mode must be tensor or par");
  if (!Array.isArray(source.sinks) || source.sinks.length === 0) fail("malformed-circuit", "a net must have at least one sink");
  if (source.mode === "tensor" && (source.chain !== null || source.contract !== null)) fail("consensus-leak", "tensor nets cannot name consensus state");
  if (source.mode === "par" && (!CAIP2.test(source.chain ?? "") || !NI.test(source.contract ?? ""))) fail("unsettled-par", "par nets require a CAIP-2 execution chain and SEN contract identity");
  const sinks = source.sinks.map((endpoint) => normalizeEndpoint(endpoint, "net sink"));
  const sinkKeys = new Set(sinks.map((endpoint) => `${endpoint.instance ?? "@"}\u0000${endpoint.port}`));
  if (sinkKeys.size !== sinks.length) fail("malformed-circuit", "a net cannot repeat a sink");
  sinks.sort((left, right) => utf8Compare(`${left.instance ?? ""}\u0000${left.port}`, `${right.instance ?? ""}\u0000${right.port}`));
  return { name: text(source.name, "net name"), driver: normalizeEndpoint(source.driver, "net driver"), sinks, mode: source.mode, chain: source.chain, contract: source.contract };
}

function valuationKey(values) { return values.map(fourKey).join(""); }
function enumerateValuations(width) {
  let rows = [[]];
  for (let index = 0; index < width; index += 1) rows = rows.flatMap((prefix) => FOUR_VALUES.map((value) => [...prefix, value]));
  return rows;
}

function normalizeRows(source, inputCount, outputCount) {
  if (!Array.isArray(source)) fail("malformed-circuit", "behavior factor rows must be a sequence");
  const expectedRows = 4 ** inputCount;
  if (expectedRows > 4096) fail("circuit-limit", "one irreducible behavior factor may expose at most six FOUR inputs");
  if (source.length !== expectedRows) fail("incomplete-behavior", `behavior factor requires exactly ${expectedRows} input rows`);
  const rows = source.map((row) => {
    if (!exactKeys(row, ["input", "output"]) || !Array.isArray(row.input) || row.input.length !== inputCount || !Array.isArray(row.output) || row.output.length !== outputCount) fail("malformed-circuit", "behavior row arity does not match the pinout");
    return { input: row.input.map(validateFour), output: row.output.map(validateFour) };
  });
  const byInput = new Map();
  for (const row of rows) {
    const key = valuationKey(row.input);
    if (byInput.has(key)) fail("malformed-circuit", `behavior repeats input valuation ${key}`);
    byInput.set(key, row);
  }
  for (const valuation of enumerateValuations(inputCount)) if (!byInput.has(valuationKey(valuation))) fail("incomplete-behavior", `behavior omits input valuation ${valuationKey(valuation)}`);
  for (const left of rows) for (const right of rows) {
    if (!left.input.every((value, index) => knowledgeLeqWire(value, right.input[index]))) continue;
    if (!left.output.every((value, index) => knowledgeLeqWire(value, right.output[index]))) fail("nonmonotone-behavior", "component behavior must be monotone in the FOUR knowledge order");
  }
  return [...rows].sort((left, right) => utf8Compare(valuationKey(left.input), valuationKey(right.input)));
}

function factorKey(factor) { return `${factor.inputs.join("\u0000")}\u0001${factor.outputs.join("\u0000")}`; }

function normalizeBehavior(source, ports) {
  if (!exactKeys(source, ["factors"]) || !Array.isArray(source.factors)) fail("malformed-circuit", "behavior must expose exactly a factor sequence");
  const inputs = new Map(ports.filter(({ direction }) => direction === "input").map((port) => [port.name, port]));
  const outputs = new Map(ports.filter(({ direction }) => direction === "output").map((port) => [port.name, port]));
  const usedInputs = new Set(), usedOutputs = new Set();
  const factors = source.factors.map((sourceFactor) => {
    if (!exactKeys(sourceFactor, ["inputs", "outputs", "rows"]) || !Array.isArray(sourceFactor.inputs) || !Array.isArray(sourceFactor.outputs)) fail("malformed-circuit", "a behavior factor must expose exactly inputs, outputs, and rows");
    const factorInputs = sourceFactor.inputs.map((name) => text(name, "behavior factor input")).sort(utf8Compare);
    const factorOutputs = sourceFactor.outputs.map((name) => text(name, "behavior factor output")).sort(utf8Compare);
    if (factorInputs.length + factorOutputs.length === 0) fail("malformed-circuit", "an empty behavior factor is not material");
    if (new Set(factorInputs).size !== factorInputs.length || new Set(factorOutputs).size !== factorOutputs.length) fail("overlapping-factor", "a behavior factor cannot repeat a pin");
    for (const name of factorInputs) {
      if (!inputs.has(name)) fail("unknown-pin", `behavior factor names unknown input pin ${name}`);
      if (usedInputs.has(name)) fail("overlapping-factor", `input pin ${name} occurs in more than one behavior factor`);
      usedInputs.add(name);
    }
    for (const name of factorOutputs) {
      if (!outputs.has(name)) fail("unknown-pin", `behavior factor names unknown output pin ${name}`);
      if (usedOutputs.has(name)) fail("overlapping-factor", `output pin ${name} occurs in more than one behavior factor`);
      usedOutputs.add(name);
    }
    return { inputs: factorInputs, outputs: factorOutputs, rows: normalizeRows(sourceFactor.rows, factorInputs.length, factorOutputs.length) };
  }).sort((left, right) => utf8Compare(factorKey(left), factorKey(right)));
  for (const name of inputs.keys()) if (!usedInputs.has(name)) fail("incomplete-behavior", `behavior factors omit input pin ${name}`);
  for (const name of outputs.keys()) if (!usedOutputs.has(name)) fail("incomplete-behavior", `behavior factors omit output pin ${name}`);
  return { factors };
}

function assertUniqueNames(values, kind) {
  const names = new Set(values.map(({ name }) => name));
  if (names.size !== values.length) fail("malformed-circuit", `${kind} names must be unique`);
}

export function normalizeCircuitProfile(source) {
  if (!exactKeys(source, ["account", "authority", "custody", "law", "territory"])) fail("malformed-circuit", "circuit profile must expose exactly account, law, authority, custody, and territory");
  return {
    account: caip10(source.account, "circuit profile account"),
    law: ni(source.law, "circuit profile law"),
    authority: ni(source.authority, "circuit profile authority"),
    custody: ni(source.custody, "circuit profile custody"),
    territory: ni(source.territory, "circuit profile territory"),
  };
}

function normalizeCircuitMembrane(source) {
  if (!exactKeys(source, ["account", "authority", "custody", "territory"])) fail("malformed-circuit", "a circuit membrane must expose exactly account, authority, custody, and territory");
  return {
    account: caip10(source.account, "circuit membrane account"),
    authority: ni(source.authority, "circuit membrane authority"),
    custody: ni(source.custody, "circuit membrane custody"),
    territory: ni(source.territory, "circuit membrane territory"),
  };
}


export function normalizeHierarchicalCircuit(source) {
  if (!exactKeys(source, ["behavior", "instances", "law", "nets", "ports", "profile"])) fail("malformed-circuit", "circuit design has an unknown, absent, or legacy field");
  if (source.profile !== HIERARCHICAL_CIRCUIT_PROFILE) fail("malformed-circuit", `profile must be ${HIERARCHICAL_CIRCUIT_PROFILE}`);
  const law = ni(source.law, "circuit law");
  if (!Array.isArray(source.ports) || !Array.isArray(source.instances) || !Array.isArray(source.nets)) fail("malformed-circuit", "ports, instances, and nets must be sequences");
  const ports = source.ports.map(normalizePort).sort((left, right) => utf8Compare(left.name, right.name));
  const instances = source.instances.map(normalizeInstance).sort((left, right) => utf8Compare(left.name, right.name));
  const nets = source.nets.map(normalizeNet).sort((left, right) => utf8Compare(left.name, right.name));
  assertUniqueNames(ports, "port"); assertUniqueNames(instances, "instance"); assertUniqueNames(nets, "net");
  if ((instances.length === 0) !== (nets.length === 0)) fail("malformed-circuit", "a leaf has neither instances nor nets; a composite has both");
  const portByName = new Map(ports.map((port) => [port.name, port])), instanceNames = new Set(instances.map(({ name }) => name));
  const externalDrivers = new Map(), externalSinks = new Map();
  for (const net of nets) {
    const endpoints = [net.driver, ...net.sinks];
    for (const endpoint of endpoints) if (endpoint.instance !== null && !instanceNames.has(endpoint.instance)) fail("unknown-pin", `net ${net.name} names unknown instance ${endpoint.instance}`);
    if (net.driver.instance === null) {
      const port = portByName.get(net.driver.port);
      if (!port || port.direction !== "input") fail("unknown-pin", `net ${net.name} external driver must be an input pin`);
      if (port.mode !== net.mode) fail("mode-mismatch", `net ${net.name} disagrees with external pin ${port.name}`);
      externalDrivers.set(port.name, (externalDrivers.get(port.name) ?? 0) + 1);
    }
    for (const sink of net.sinks) if (sink.instance === null) {
      const port = portByName.get(sink.port);
      if (!port || port.direction !== "output") fail("unknown-pin", `net ${net.name} external sink must be an output pin`);
      if (port.mode !== net.mode) fail("mode-mismatch", `net ${net.name} disagrees with external pin ${port.name}`);
      externalSinks.set(port.name, (externalSinks.get(port.name) ?? 0) + 1);
    }
  }
  if (instances.length > 0) for (const port of ports) {
    const count = port.direction === "input" ? externalDrivers.get(port.name) : externalSinks.get(port.name);
    if (count !== 1) fail("unrouted-pin", `external ${port.direction} pin ${port.name} must occur on exactly one net`);
  }
  const behavior = normalizeBehavior(source.behavior, ports);
  return { profile: HIERARCHICAL_CIRCUIT_PROFILE, law, ports, instances, nets, behavior };
}

export function encodeHierarchicalCircuit(source) {
  return ascribed(normalizeHierarchicalCircuit(source));
}

export function decodeHierarchicalCircuit(term) {
  return normalizeHierarchicalCircuit(unascribed(term));
}

export function hierarchicalCircuitId(source) { return relationalValueId(normalizeHierarchicalCircuit(source)); }

export function behaviorAt(circuitSource, input) {
  const circuit = normalizeHierarchicalCircuit(circuitSource), inputs = circuit.ports.filter(({ direction }) => direction === "input");
  if (!Array.isArray(input) || input.length !== inputs.length) fail("malformed-circuit", "input valuation arity does not match the circuit pinout");
  const inputByName = new Map(inputs.map((port, index) => [port.name, validateFour(input[index])]));
  const outputByName = new Map();
  for (const factor of circuit.behavior.factors) {
    const factorInput = factor.inputs.map((name) => inputByName.get(name));
    const row = factor.rows.find((candidate) => candidate.input.every((value, index) => canonicalEqual(value, factorInput[index])));
    if (!row) fail("incomplete-behavior", `input valuation is absent from factor ${factorKey(factor)}`);
    factor.outputs.forEach((name, index) => outputByName.set(name, row.output[index]));
  }
  return circuit.ports.filter(({ direction }) => direction === "output").map(({ name }) => outputByName.get(name));
}

export function joinCircuitEvidence(left, right) { return joinFour(left, right); }

function libraryCircuit(library, identity) {
  const source = library instanceof Map ? library.get(identity) : library?.[identity];
  if (!source) fail("missing-component", `component ${identity} is not available for synthesis`);
  const circuit = normalizeHierarchicalCircuit(source);
  if (hierarchicalCircuitId(circuit) !== identity) fail("component-drift", `component ${identity} bytes do not match its referenced identity`);
  return circuit;
}

function endpointKey(endpoint) { return `${endpoint.instance ?? "@"}\u0000${endpoint.port}`; }

function elaborate(circuit, library) {
  const instances = new Map(circuit.instances.map((instance) => [instance.name, { ...instance, circuit: libraryCircuit(library, instance.component) }]));
  const portFor = (endpoint) => {
    if (endpoint.instance === null) return circuit.ports.find(({ name }) => name === endpoint.port);
    return instances.get(endpoint.instance)?.circuit.ports.find(({ name }) => name === endpoint.port);
  };
  const driven = new Map(), sunk = new Map();
  for (const net of circuit.nets) {
    const driver = portFor(net.driver);
    if (!driver || driver.direction !== (net.driver.instance === null ? "input" : "output")) fail("unknown-pin", `net ${net.name} has an invalid driver ${endpointKey(net.driver)}`);
    if (driver.mode !== net.mode) fail("mode-mismatch", `net ${net.name} disagrees with driver ${endpointKey(net.driver)}`);
    driven.set(endpointKey(net.driver), (driven.get(endpointKey(net.driver)) ?? 0) + 1);
    for (const endpoint of net.sinks) {
      const sink = portFor(endpoint);
      if (!sink || sink.direction !== (endpoint.instance === null ? "output" : "input")) fail("unknown-pin", `net ${net.name} has an invalid sink ${endpointKey(endpoint)}`);
      if (sink.mode !== net.mode || sink.carrier !== driver.carrier || sink.predicate !== driver.predicate) fail("pin-type-mismatch", `net ${net.name} does not preserve predicate, carrier, and execution mode`);
      sunk.set(endpointKey(endpoint), (sunk.get(endpointKey(endpoint)) ?? 0) + 1);
    }
  }
  for (const [name, instance] of instances) {
    for (const port of instance.circuit.ports) {
      const count = (port.direction === "input" ? sunk : driven).get(`${name}\u0000${port.name}`);
      if (count !== 1) fail("unrouted-pin", `instance ${name} ${port.direction} pin ${port.name} must occur on exactly one net`);
    }
  }
  return instances;
}

function settleValuation(circuit, instances, input) {
  const values = new Map(circuit.nets.map(({ name }) => [name, FOUR_VALUES[0]]));
  const netBySink = new Map(), netByDriver = new Map();
  for (const net of circuit.nets) {
    netByDriver.set(endpointKey(net.driver), net.name);
    for (const sink of net.sinks) netBySink.set(endpointKey(sink), net.name);
  }
  const inputs = circuit.ports.filter(({ direction }) => direction === "input");
  inputs.forEach((port, index) => values.set(netByDriver.get(`@\u0000${port.name}`), validateFour(input[index])));
  const maximumSteps = Math.max(1, circuit.nets.length * 2 + circuit.instances.length * 2);
  for (let step = 0; step <= maximumSteps; step += 1) {
    let changed = false;
    for (const [name, instance] of instances) {
      const childInputs = instance.circuit.ports.filter(({ direction }) => direction === "input").map((port) => values.get(netBySink.get(`${name}\u0000${port.name}`)) ?? FOUR_VALUES[0]);
      const childOutputs = behaviorAt(instance.circuit, childInputs);
      instance.circuit.ports.filter(({ direction }) => direction === "output").forEach((port, index) => {
        const net = netByDriver.get(`${name}\u0000${port.name}`), next = joinFour(values.get(net), childOutputs[index]);
        if (!canonicalEqual(values.get(net), next)) { values.set(net, next); changed = true; }
      });
    }
    if (!changed) {
      return circuit.ports.filter(({ direction }) => direction === "output").map((port) => values.get(netBySink.get(`@\u0000${port.name}`)) ?? FOUR_VALUES[0]);
    }
  }
  fail("nonconvergent-circuit", "FOUR circuit did not reach its least knowledge fixed point within the finite-height bound");
}

export function synthesizeCircuitBehavior(circuitSource, library = new Map()) {
  const circuit = normalizeHierarchicalCircuit(circuitSource);
  if (circuit.instances.length === 0) return circuit.behavior;
  const instances = elaborate(circuit, library);
  const netBySink = new Map(), netByDriver = new Map();
  for (const net of circuit.nets) {
    netByDriver.set(endpointKey(net.driver), net.name);
    for (const sink of net.sinks) netBySink.set(endpointKey(sink), net.name);
  }
  const parent = new Map(circuit.nets.map(({ name }) => [name, name]));
  const find = (name) => { const p = parent.get(name); if (p !== name) parent.set(name, find(p)); return parent.get(name); };
  const union = (left, right) => { const a = find(left), b = find(right); if (a !== b) parent.set(b, a); };
  for (const [name, instance] of instances) for (const factor of instance.circuit.behavior.factors) {
    const nets = [
      ...factor.inputs.map((port) => netBySink.get(`${name}\u0000${port}`)),
      ...factor.outputs.map((port) => netByDriver.get(`${name}\u0000${port}`)),
    ];
    for (let index = 1; index < nets.length; index += 1) union(nets[0], nets[index]);
  }
  const inputPorts = circuit.ports.filter(({ direction }) => direction === "input");
  const outputPorts = circuit.ports.filter(({ direction }) => direction === "output");
  const groups = new Map();
  const group = (net) => { const root = find(net); if (!groups.has(root)) groups.set(root, { inputs: [], outputs: [] }); return groups.get(root); };
  for (const port of inputPorts) group(netByDriver.get(`@\u0000${port.name}`)).inputs.push(port.name);
  for (const port of outputPorts) group(netBySink.get(`@\u0000${port.name}`)).outputs.push(port.name);
  const inputIndex = new Map(inputPorts.map((port, index) => [port.name, index]));
  const outputIndex = new Map(outputPorts.map((port, index) => [port.name, index]));
  const factors = [...groups.values()].filter(({ inputs, outputs }) => inputs.length + outputs.length > 0).map(({ inputs, outputs }) => {
    inputs.sort(utf8Compare); outputs.sort(utf8Compare);
    const rows = enumerateValuations(inputs.length).map((valuation) => {
      const wholeInput = inputPorts.map(() => FOUR_VALUES[0]);
      inputs.forEach((name, index) => { wholeInput[inputIndex.get(name)] = valuation[index]; });
      const wholeOutput = settleValuation(circuit, instances, wholeInput);
      return { input: valuation, output: outputs.map((name) => wholeOutput[outputIndex.get(name)]) };
    });
    return { inputs, outputs, rows };
  });
  return normalizeBehavior({ factors }, circuit.ports);
}

export function verifyCircuitEquivalence(circuitSource, library = new Map()) {
  const circuit = normalizeHierarchicalCircuit(circuitSource), synthesized = synthesizeCircuitBehavior(circuit, library);
  if (!canonicalEqual(circuit.behavior, synthesized)) fail("behavior-mismatch", "Beh(Synth(D)) does not equal the declared composition behavior");
  const encoded = encodeRelationalValue(synthesized);
  return { circuit: hierarchicalCircuitId(circuit), behavior: relationalValueId(synthesized), equivalent: true };
}

function normalizedLibrary(components) {
  const library = new Map();
  for (const source of components) {
    const component = normalizeHierarchicalCircuit(source), identity = hierarchicalCircuitId(component);
    if (library.has(identity)) fail("malformed-circuit", `component ${identity} is repeated`);
    library.set(identity, component);
  }
  return library;
}

export function verifyCircuitFamily(circuitSource, components = []) {
  if (!Array.isArray(components)) fail("malformed-circuit", "circuit components must be a sequence");
  const root = normalizeHierarchicalCircuit(circuitSource), rootIdentity = hierarchicalCircuitId(root), library = normalizedLibrary(components);
  const visiting = new Set(), verified = new Map();
  const visit = (circuit, identity) => {
    if (verified.has(identity)) return;
    if (visiting.has(identity)) fail("recursive-component-cycle", `component containment cycle reaches ${identity}`);
    visiting.add(identity);
    for (const instance of circuit.instances) {
      const child = libraryCircuit(library, instance.component);
      visit(child, instance.component);
    }
    verified.set(identity, verifyCircuitEquivalence(circuit, library));
    visiting.delete(identity);
  };
  visit(root, rootIdentity);
  const unreachable = [...library.keys()].filter((identity) => !verified.has(identity));
  if (unreachable.length > 0) fail("unreachable-component", `component ${unreachable.sort(utf8Compare)[0]} is not contained by the root circuit`);
  return { root, rootIdentity, library, verified };
}

function normalizeCircuitAddress(source) {
  if (!Array.isArray(source)) fail("malformed-circuit", "a circuit address must be a sequence of instance names");
  return source.map((part) => text(part, "circuit address part"));
}

function addressKey(address) { return JSON.stringify(address); }

function normalizeAssemblyPlacement(source) {
  if (!exactKeys(source, ["address", "membrane"])) fail("malformed-circuit", "an assembly placement must expose exactly address and membrane");
  return { address: normalizeCircuitAddress(source.address), membrane: normalizeCircuitMembrane(source.membrane) };
}

export function normalizeCircuitAssembly(source) {
  if (!exactKeys(source, ["circuit", "placements", "profile"]) || source.profile !== CIRCUIT_ASSEMBLY_PROFILE || !Array.isArray(source.placements)) fail("malformed-circuit", "circuit assembly has an unknown, absent, or legacy field");
  const placements = source.placements.map(normalizeAssemblyPlacement).sort((left, right) => utf8Compare(addressKey(left.address), addressKey(right.address)));
  const addresses = new Set(placements.map(({ address }) => addressKey(address)));
  if (addresses.size !== placements.length) fail("malformed-circuit", "a circuit assembly cannot place one occurrence more than once");
  return { profile: CIRCUIT_ASSEMBLY_PROFILE, circuit: ni(source.circuit, "assembly root circuit"), placements };
}

export function encodeCircuitAssembly(source) {
  return ascribed(normalizeCircuitAssembly(source));
}

export function circuitAssemblyId(source) { return relationalValueId(normalizeCircuitAssembly(source)); }

function circuitContexts(family) {
  const contexts = [];
  const visit = (circuit, identity, address, parent) => {
    contexts.push({ address, circuit, identity, parent });
    for (const instance of circuit.instances) visit(
      family.library.get(instance.component),
      instance.component,
      [...address, instance.name],
      { circuit: identity, instance: instance.name },
    );
  };
  visit(family.root, family.rootIdentity, [], null);
  return contexts;
}

export function verifyCircuitAssembly(assemblySource, circuitSource, components = []) {
  const family = verifyCircuitFamily(circuitSource, components), assembly = normalizeCircuitAssembly(assemblySource);
  if (assembly.circuit !== family.rootIdentity) fail("assembly-root-mismatch", "assembly does not populate the assayed root circuit");
  const contexts = circuitContexts(family), expected = new Map(contexts.map((context) => [addressKey(context.address), context]));
  const placements = new Map(assembly.placements.map((placement) => [addressKey(placement.address), placement]));
  for (const [key, context] of expected) if (!placements.has(key)) fail("unplaced-circuit", `assembly omits circuit occurrence ${context.address.join("/") || "@"}`);
  for (const [key, placement] of placements) if (!expected.has(key)) fail("unknown-placement", `assembly places unknown circuit occurrence ${placement.address.join("/") || "@"}`);
  return { assembly, assemblyIdentity: circuitAssemblyId(assembly), family, contexts, placements };
}

export function verifyCircuitRealization({ interface: interfaceSource, circuit: circuitSource, components = [], assembly: assemblySource }) {
  const publicInterface = normalizeHierarchicalCircuit(interfaceSource);
  if (publicInterface.instances.length !== 0 || publicInterface.nets.length !== 0) fail("interior-disclosure", "a public circuit realization interface must be one black-box leaf definition");
  const verified = verifyCircuitAssembly(assemblySource, circuitSource, components);
  const implementation = verified.family.root;
  if (publicInterface.law !== implementation.law) fail("law-mismatch", "public interface and composed implementation must enact the same SEN law");
  if (!canonicalEqual(publicInterface.ports, implementation.ports)) fail("pinout-mismatch", "public interface pinout does not equal the composed implementation pinout");
  if (!canonicalEqual(publicInterface.behavior, implementation.behavior)) fail("behavior-mismatch", "public interface behavior does not equal Beh(Synth(D)) of the composed implementation");
  return {
    interface: hierarchicalCircuitId(publicInterface),
    circuit: verified.family.rootIdentity,
    assembly: verified.assemblyIdentity,
    behavior: verified.family.verified.get(verified.family.rootIdentity).behavior,
    components: [...verified.family.library.keys()].sort(utf8Compare),
    realized: true,
  };
}

export function readCircuitContext({ circuit: circuitSource, components = [], assembly: assemblySource, address = [] }) {
  const normalizedAddress = normalizeCircuitAddress(address), verified = verifyCircuitAssembly(assemblySource, circuitSource, components);
  const context = verified.contexts.find((candidate) => addressKey(candidate.address) === addressKey(normalizedAddress));
  if (!context) fail("unknown-instance", `assembly has no circuit occurrence ${normalizedAddress.join("/") || "@"}`);
  return {
    address: context.address,
    circuit: context.identity,
    membrane: verified.placements.get(addressKey(context.address)).membrane,
    parent: context.parent,
    instances: context.circuit.instances.map(({ name, component }) => ({
      name,
      component,
      membrane: verified.placements.get(addressKey([...context.address, name])).membrane,
    })),
    ports: context.circuit.ports,
  };
}

export function encodeCircuitAssayRequest({ circuit, components = [], assembly }) {
  if (!Array.isArray(components)) fail("malformed-circuit", "assay components must be a sequence");
  const value = {
    kind: "HierarchicalCircuitAssayRequest",
    circuit: normalizeHierarchicalCircuit(circuit),
    components: components.map(normalizeHierarchicalCircuit),
    assembly: normalizeCircuitAssembly(assembly),
  };
  const encoded = encodeRelationalValue(value);
  return { value, type: encoded.type, term: encoded.term };
}

export function assayHierarchicalCircuitRequest(value) {
  if (!exactKeys(value, ["assembly", "circuit", "components", "kind"]) || value.kind !== "HierarchicalCircuitAssayRequest" || !Array.isArray(value.components)) fail("malformed-circuit", "hierarchical circuit assay request has an invalid shape");
  const verified = verifyCircuitAssembly(value.assembly, value.circuit, value.components), result = verified.family.verified.get(verified.family.rootIdentity);
  const receipt = {
    kind: "HierarchicalCircuitAssayReceipt",
    circuit: result.circuit,
    assembly: verified.assemblyIdentity,
    behavior: result.behavior,
    equivalent: true,
    components: [...verified.family.library.keys()].sort(utf8Compare),
  };
  const encoded = encodeRelationalValue(receipt);
  return { receipt, type: encoded.type, term: encoded.term };
}

export function decodeCircuitAssayReceipt(type, term) {
  if (!canonicalEqual(type, RELATIONAL_VALUE_TYPE)) fail("malformed-circuit", "hierarchical circuit receipt must use the relational SEN type");
  const value = decodeRelationalValue(type, term);
  if (!exactKeys(value, ["assembly", "behavior", "circuit", "components", "equivalent", "kind"]) || value.kind !== "HierarchicalCircuitAssayReceipt" || value.equivalent !== true || !NI.test(value.circuit ?? "") || !NI.test(value.assembly ?? "") || !NI.test(value.behavior ?? "") || !Array.isArray(value.components) || !value.components.every((identity) => NI.test(identity))) fail("malformed-circuit", "hierarchical circuit assay receipt is invalid");
  return value;
}
