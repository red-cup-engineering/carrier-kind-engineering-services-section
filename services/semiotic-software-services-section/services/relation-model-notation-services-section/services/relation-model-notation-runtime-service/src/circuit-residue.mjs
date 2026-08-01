// Pure placement-independent RMN die material.
import { canonicalEqual, NI_URI as NI } from "./canonical-cbor.mjs";
import { validateFour } from "./four.mjs";
import { normalizeCircuitAssembly, normalizeHierarchicalCircuit, verifyCircuitAssembly } from "./hierarchical-circuit.mjs";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "./relational-value.mjs";

export const CIRCUIT_TRACE_PROFILE = "org.emsenn.rmn.hierarchical-circuit-trace.v6";

const CAIP10 = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}:[-.%a-zA-Z0-9]{1,128}$/u;
const CAIP2 = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}$/u;
const RECEIPT_KEYS = ["chain", "chu", "connection", "contract", "economicCurrentAffinity", "orientation", "originatingSettlement", "priceErasure", "receiptDigest", "receiptId"];
const DISPOSITIONS = new Set(["chu-seam-mismatch", "unpriced-irreversible-defect", "closed-flat", "translational-defect", "rotational-protected-border", "mixed-affine-defect"]);

function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function exactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}
function finiteText(value, maximum = 512) { return typeof value === "string" && value.length > 0 && value.length <= maximum; }
function ni(value, field) { if (!NI.test(value ?? "")) fail("unresolved-receipt", `${field} must be a SHA-256 ni URI`); return value; }
function caip10(value) { if (!CAIP10.test(value ?? "")) fail("unresolved-receipt", "originating settlement must be a CAIP-10 account"); return value.toLowerCase(); }
function signedInteger(value, code = "malformed-request") {
  if (typeof value !== "string" || !/^-?(0|[1-9][0-9]*)$/u.test(value)) fail(code, `expected canonical signed integer string, received ${JSON.stringify(value)}`);
  return BigInt(value);
}
function nonnegativeInteger(value) { const number = signedInteger(value); if (number < 0n) fail("malformed-request", "irreversible and price magnitudes must be nonnegative"); return number; }
function gcd(left, right) { let a = left < 0n ? -left : left, b = right < 0n ? -right : right; while (b !== 0n) [a, b] = [b, a % b]; return a; }
function rational(value) {
  if (!Array.isArray(value) || value.length !== 2) fail("malformed-request", "rational must be [numerator, denominator]");
  let numerator = signedInteger(value[0]), denominator = signedInteger(value[1]);
  if (denominator <= 0n) fail("malformed-request", "rational denominator must be positive");
  const divisor = gcd(numerator, denominator); return [numerator / divisor, denominator / divisor];
}
function addRational([an, ad], [bn, bd]) { const numerator = an * bd + bn * ad, denominator = ad * bd, divisor = gcd(numerator, denominator); return [numerator / divisor, denominator / divisor]; }
function multiplyRational([an, ad], [bn, bd], orientation) { const numerator = an * bn * BigInt(orientation), denominator = ad * bd, divisor = gcd(numerator, denominator); return [numerator / divisor, denominator / divisor]; }
function printRational([numerator, denominator]) { return [numerator.toString(), denominator.toString()]; }
function mod4(value) { const residue = value % 4; return residue < 0 ? residue + 4 : residue; }
function vector(value) {
  if (!Array.isArray(value) || value.length !== 2) fail("malformed-request", "translation must be a pair of canonical signed integer strings");
  return [signedInteger(value[0]), signedInteger(value[1])];
}
function canonicalVector(value) { return printVector(vector(value)); }
function printVector([x, y]) { return [x.toString(), y.toString()]; }
function addVector([x, y], [u, v]) { return [x + u, y + v]; }
function rotateVector(turns, [x, y]) {
  switch (mod4(turns)) { case 0: return [x, y]; case 1: return [-y, x]; case 2: return [-x, -y]; default: return [y, -x]; }
}
function composeAffine(after, before) {
  return { quarterTurns: mod4(after.quarterTurns + before.quarterTurns), translation: addVector(rotateVector(after.quarterTurns, before.translation), after.translation) };
}
function orientedAffine(connection, orientation) {
  if (orientation === 1) return { quarterTurns: connection.quarterTurns, translation: connection.translation };
  const quarterTurns = mod4(-connection.quarterTurns);
  return { quarterTurns, translation: rotateVector(quarterTurns, connection.translation).map((coordinate) => -coordinate) };
}

function normalizeBorderClass(source) {
  if (!exactKeys(source, ["allowedHolonomy", "type"]) || !["internal", "protected"].includes(source.type)
    || !Number.isInteger(source.allowedHolonomy) || source.allowedHolonomy < 0 || source.allowedHolonomy > 3) {
    fail("undeclared-border-class", "trace border class is absent or invalid");
  }
  return { type: source.type, allowedHolonomy: source.allowedHolonomy };
}

function normalizeReceipt(source) {
  if (!exactKeys(source, RECEIPT_KEYS)) fail("unresolved-receipt", "receipt must expose exactly its chain identity and four typed seam carriers");
  const receipt = {
    originatingSettlement: caip10(source.originatingSettlement),
    receiptId: ni(source.receiptId, "receipt identity"), receiptDigest: ni(source.receiptDigest, "receipt digest"),
    chain: source.chain, contract: ni(source.contract, "contract identity"), orientation: source.orientation,
    chu: source.chu, connection: source.connection, priceErasure: source.priceErasure,
    economicCurrentAffinity: source.economicCurrentAffinity,
  };
  if (!CAIP2.test(receipt.chain ?? "")) fail("unresolved-receipt", "receipt chain must be a CAIP-2 identity");
  if (![-1, 1].includes(receipt.orientation)) fail("malformed-request", "receipt orientation is invalid");
  if (!exactKeys(receipt.chu, ["left", "right"])) fail("unknown-residue-kind", "Chu seam evidence must contain two FOUR values");
  receipt.chu = { left: validateFour(receipt.chu.left), right: validateFour(receipt.chu.right) };
  if (!exactKeys(receipt.connection, ["frame", "quarterTurns", "translation"]) || !NI.test(receipt.connection.frame ?? "") || !Number.isInteger(receipt.connection.quarterTurns) || receipt.connection.quarterTurns < 0 || receipt.connection.quarterTurns > 3) fail("unproved-group-law", "connection evidence must carry one named ambient frame and one C4 element");
  receipt.connection = { frame: receipt.connection.frame, quarterTurns: receipt.connection.quarterTurns, translation: canonicalVector(receipt.connection.translation) };
  if (!exactKeys(receipt.priceErasure, ["irreversibleAmount", "priceAmount", "unit"]) || !finiteText(receipt.priceErasure.unit, 64)) fail("unit-mismatch", "price/erasure evidence requires one exact unit");
  nonnegativeInteger(receipt.priceErasure.irreversibleAmount); nonnegativeInteger(receipt.priceErasure.priceAmount);
  if (!exactKeys(receipt.economicCurrentAffinity, ["affinity", "current"])) fail("unknown-residue-kind", "economic evidence requires separate current and affinity rationals");
  rational(receipt.economicCurrentAffinity.current); rational(receipt.economicCurrentAffinity.affinity);
  return receipt;
}

function normalizeTraceStep(source) {
  if (!exactKeys(source, ["net", "receipt", "sink"]) || !finiteText(source.net, 256)
    || !exactKeys(source.sink, ["instance", "port"]) || !finiteText(source.sink.instance, 256) || !finiteText(source.sink.port, 256)) {
    fail("malformed-request", "each trace step must name one net, one internal sink endpoint, and one receipt");
  }
  return { net: source.net.normalize("NFC"), sink: { instance: source.sink.instance.normalize("NFC"), port: source.sink.port.normalize("NFC") }, receipt: normalizeReceipt(source.receipt) };
}

export function normalizeCircuitTraceRequest(source) {
  if (!exactKeys(source, ["assembly", "borderClass", "circuit", "components", "kind", "profile", "trace"])
    || source.kind !== "HierarchicalCircuitTraceRequest" || source.profile !== CIRCUIT_TRACE_PROFILE
    || !Array.isArray(source.components) || !Array.isArray(source.trace) || source.trace.length < 1 || source.trace.length > 64) {
    fail("malformed-request", "hierarchical circuit trace request has an invalid shape");
  }
  return {
    kind: source.kind, profile: source.profile,
    circuit: normalizeHierarchicalCircuit(source.circuit), components: source.components.map(normalizeHierarchicalCircuit), assembly: normalizeCircuitAssembly(source.assembly),
    borderClass: normalizeBorderClass(source.borderClass), trace: source.trace.map(normalizeTraceStep),
  };
}

export function encodeCircuitTraceRequest({ circuit, components = [], assembly, borderClass, trace }) {
  const value = normalizeCircuitTraceRequest({ kind: "HierarchicalCircuitTraceRequest", profile: CIRCUIT_TRACE_PROFILE, circuit, components, assembly, borderClass, trace });
  const encoded = encodeRelationalValue(value); return { value, type: encoded.type, term: encoded.term };
}

function membraneAt(assembly, address) {
  return assembly.placements.find((placement) => JSON.stringify(placement.address) === JSON.stringify(address))?.membrane;
}

function traceRoute(request, verified) {
  const circuit = verified.family.root, instances = new Map(circuit.instances.map((instance) => [instance.name, instance]));
  if (instances.size === 0) fail("open-trace", "a closed trace cannot be assayed over a leaf die");
  const route = [];
  for (const step of request.trace) {
    const net = circuit.nets.find((candidate) => candidate.name === step.net);
    if (!net) fail("unknown-net", `trace names unknown net ${step.net}`);
    if (net.mode !== "par") fail("nonconsensus-trace", `trace net ${step.net} is tensor-factorable and has no consensus residue`);
    if (net.driver.instance === null) fail("open-trace", `trace net ${step.net} begins outside the assayed die`);
    const sink = net.sinks.find((candidate) => candidate.instance === step.sink.instance && candidate.port === step.sink.port);
    if (!sink) fail("unknown-pin", `trace sink ${step.sink.instance}.${step.sink.port} is not on net ${step.net}`);
    if (sink.instance === null) fail("open-trace", `trace net ${step.net} ends outside the assayed die`);
    const receipt = step.receipt;
    if (receipt.chain !== net.chain || receipt.contract !== net.contract) fail("seam-commitment-mismatch", `trace receipt does not attest net ${step.net}'s declared chain and contract`);
    const forward = receipt.orientation === 1;
    const from = forward ? net.driver.instance : sink.instance, to = forward ? sink.instance : net.driver.instance;
    if (receipt.originatingSettlement !== membraneAt(verified.assembly, [from])?.account) fail("authority-mismatch", `trace receipt origin does not control route origin ${from}`);
    route.push({ from, to, net, receipt });
  }
  for (let index = 0; index < route.length; index += 1) {
    const here = route[index], next = route[(index + 1) % route.length];
    if (here.to !== next.from) fail("open-trace", `trace does not close between ${here.net.name} and ${next.net.name}`);
  }
  return route;
}

export function assayCircuitTrace(source, { fuel = 64 } = {}) {
  const request = normalizeCircuitTraceRequest(source);
  if (!Number.isInteger(fuel) || fuel < 1 || fuel > 64) fail("malformed-request", "fuel must be an integer from 1 through 64");
  if (request.trace.length > fuel) fail("fuel-exceeded", `trace has ${request.trace.length} seams but fuel is ${fuel}`);
  const verified = verifyCircuitAssembly(request.assembly, request.circuit, request.components), route = traceRoute(request, verified);
  const identities = new Set(), chuMismatches = [], priceByUnit = new Map(); let holonomy = 0, economic = [0n, 1n], affine = { quarterTurns: 0, translation: [0n, 0n] }, frame = null;
  for (const { receipt } of route) {
    const identity = `${receipt.originatingSettlement}\u0000${receipt.receiptId}`;
    if (identities.has(identity)) fail("receipt-replay", `receipt ${receipt.receiptId} is duplicated in the trace denominator`);
    identities.add(identity);
    if (!canonicalEqual(receipt.chu.left, receipt.chu.right)) chuMismatches.push(receipt.receiptId);
    if (frame !== null && frame !== receipt.connection.frame) fail("frame-transport-mismatch", "every seam translation must already be transported into one declared ambient frame");
    frame ??= receipt.connection.frame;
    const edgeAffine = orientedAffine({ ...receipt.connection, translation: vector(receipt.connection.translation) }, receipt.orientation);
    affine = composeAffine(edgeAffine, affine);
    holonomy = affine.quarterTurns;
    const unit = receipt.priceErasure.unit, price = nonnegativeInteger(receipt.priceErasure.priceAmount), irreversible = nonnegativeInteger(receipt.priceErasure.irreversibleAmount);
    const aggregate = priceByUnit.get(unit) ?? { orientedPrice: 0n, irreversibleMagnitude: 0n, unpricedIrreversibleReceipts: [] };
    aggregate.orientedPrice += BigInt(receipt.orientation) * price; aggregate.irreversibleMagnitude += irreversible;
    if (irreversible > 0n && price === 0n) aggregate.unpricedIrreversibleReceipts.push(receipt.receiptId);
    priceByUnit.set(unit, aggregate);
    economic = addRational(economic, multiplyRational(rational(receipt.economicCurrentAffinity.current), rational(receipt.economicCurrentAffinity.affinity), receipt.orientation));
  }
  const priceErasureResidue = [...priceByUnit].sort(([left], [right]) => left.localeCompare(right)).map(([unit, value]) => ({
    unit, orientedPrice: value.orientedPrice.toString(), irreversibleMagnitude: value.irreversibleMagnitude.toString(), unpricedIrreversibleReceipts: value.unpricedIrreversibleReceipts,
  }));
  const unpriced = priceErasureResidue.flatMap((entry) => entry.unpricedIrreversibleReceipts);
  let disposition;
  if (chuMismatches.length > 0) disposition = "chu-seam-mismatch";
  else if (unpriced.length > 0) disposition = "unpriced-irreversible-defect";
  else if (holonomy === 0 && affine.translation[0] === 0n && affine.translation[1] === 0n && request.borderClass.type === "internal" && request.borderClass.allowedHolonomy === 0) disposition = "closed-flat";
  else if (holonomy === 0 && (affine.translation[0] !== 0n || affine.translation[1] !== 0n)) disposition = "translational-defect";
  else if (request.borderClass.type === "protected" && holonomy !== 0 && request.borderClass.allowedHolonomy === holonomy && affine.translation[0] === 0n && affine.translation[1] === 0n) disposition = "rotational-protected-border";
  else if (holonomy !== 0 && (affine.translation[0] !== 0n || affine.translation[1] !== 0n)) disposition = "mixed-affine-defect";
  else fail("undeclared-border-class", `C4 affine holonomy (${holonomy}, ${printVector(affine.translation).join(",")}) is not admitted by the declared border class`);
  return {
    kind: "HierarchicalCircuitTraceReceipt", profile: CIRCUIT_TRACE_PROFILE,
    circuit: verified.family.rootIdentity, assembly: verified.assemblyIdentity, components: [...verified.family.library.keys()].sort(), disposition,
    residues: {
      chuSeamDefect: { mismatchCount: chuMismatches.length, mismatchedReceipts: chuMismatches },
      connectionHolonomy: { group: "C4", quarterTurns: holonomy, identity: holonomy === 0 },
      translationalHolonomy: { group: "Z^2", frame, vector: printVector(affine.translation), identity: affine.translation[0] === 0n && affine.translation[1] === 0n },
      affineHolonomy: { group: "C4-semidirect-Z^2", frame, quarterTurns: holonomy, translation: printVector(affine.translation), closed: holonomy === 0 && affine.translation[0] === 0n && affine.translation[1] === 0n },
      priceErasureResidue,
      economicCurrentAffinity: { exactRational: printRational(economic), zero: economic[0] === 0n },
    },
    receiptCount: route.length, fuelUsed: route.length,
  };
}

export function assayCircuitTraceRequest(value) {
  const receipt = assayCircuitTrace(value), encoded = encodeRelationalValue(receipt);
  return { receipt, type: encoded.type, term: encoded.term };
}

export function decodeCircuitTraceReceipt(type, term) {
  if (!canonicalEqual(type, RELATIONAL_VALUE_TYPE)) fail("malformed-request", "hierarchical circuit trace receipt must use the relational RMN type");
  const value = decodeRelationalValue(type, term);
  if (!exactKeys(value, ["assembly", "circuit", "components", "disposition", "fuelUsed", "kind", "profile", "receiptCount", "residues"])
    || value.kind !== "HierarchicalCircuitTraceReceipt" || value.profile !== CIRCUIT_TRACE_PROFILE || !NI.test(value.circuit ?? "") || !NI.test(value.assembly ?? "")
    || !Array.isArray(value.components) || !value.components.every((identity) => NI.test(identity)) || !DISPOSITIONS.has(value.disposition)) {
    fail("malformed-request", "hierarchical circuit trace receipt is invalid");
  }
  return value;
}
