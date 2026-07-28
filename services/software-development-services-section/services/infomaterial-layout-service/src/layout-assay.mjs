import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import {
  circuitAssemblyId,
  hierarchicalCircuitId,
  normalizeCircuitAssembly,
  normalizeHierarchicalCircuit,
  verifyCircuitAssembly,
} from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import {
  decodeRelationalValue,
  encodeRelationalValue,
  RELATIONAL_VALUE_TYPE,
} from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { validateDirectoryPatchCoverReceipt } from "@lenticule-science/infomaterial-patch-cover/receipt";
import { validateInfomaterialObservationReceipt } from "@lenticule-science/infomaterial-observation/receipt";
import {
  normalizeWasmFourCarrier,
  WASM_FOUR_CARRIER_PROFILE,
} from "@lenticule-science/wasm-four-carrier-refinement";
import {
  normalizeRmnCircuitBoardCarrier,
  RMN_CIRCUIT_BOARD_CARRIER_PROFILE,
} from "@lenticule-science/rmn-circuit-board-carrier-refinement";
import { normalizeCarrierRefinementReceipt } from "@red-cup-engineering/rmn-semantic-conformance/carrier-refinement";

export const LAYOUT_PROFILE = "org.emsenn.infomaterial.hierarchical-layout.v5";
export const PROVIDER_ACCOUNT = "eip155:31337:0xca4e12feebd87e446c5932113f0c825cf7f9dfda";

const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function exactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}

function ni(value, field) {
  if (typeof value !== "string" || !NI.test(value)) fail("malformed-layout", `${field} must be a SHA-256 ni URI`);
  return value;
}

function name(value, field) {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) fail("malformed-layout", `${field} must be bounded nonempty text`);
  return value.normalize("NFC");
}

function normalizePlacement(source) {
  if (!exactKeys(source, ["carrier", "component", "materialObservation", "mount", "producer"])) fail("malformed-layout", "a carrier placement must expose exactly mount, component, producer, materialObservation, and carrier");
  return {
    mount: name(source.mount, "placement mount"),
    component: ni(source.component, "placement component"),
    producer: source.producer,
    materialObservation: validateInfomaterialObservationReceipt(source.materialObservation),
    carrier: source.carrier?.profile === WASM_FOUR_CARRIER_PROFILE
      ? normalizeWasmFourCarrier(source.carrier)
      : source.carrier?.profile === RMN_CIRCUIT_BOARD_CARRIER_PROFILE
        ? normalizeRmnCircuitBoardCarrier(source.carrier)
        : fail("unsupported-carrier-profile", "placement carrier names no contracted refinement profile"),
  };
}

function normalizeReceiptPlacement(source) {
  if (!exactKeys(source, ["component", "materialRoot", "mount", "proofProfile", "provider", "refinementReceipt"])) fail("malformed-layout", "a receipt placement must expose exactly mount, component, materialRoot, proofProfile, provider, and refinementReceipt");
  return {
    mount: name(source.mount, "receipt placement mount"),
    component: ni(source.component, "receipt placement component"),
    materialRoot: ni(source.materialRoot, "receipt placement materialRoot"),
    proofProfile: name(source.proofProfile, "receipt placement proofProfile"),
    provider: name(source.provider, "receipt placement provider"),
    refinementReceipt: ni(source.refinementReceipt, "receipt placement refinementReceipt"),
  };
}

export function normalizeLayoutAssayReceipt(source) {
  const fields = ["assembly", "behavior", "carrierBytesRetained", "childInteriorsRead", "circuit", "complete", "componentTypes", "equivalenceProvider", "equivalenceReceipt", "kind", "materialCover", "materialRoot", "nonOverlapping", "occurrenceCount", "placements", "profile", "provider"];
  if (!exactKeys(source, fields) || source.kind !== "HierarchicalInfomaterialLayoutAssayReceipt" || source.profile !== LAYOUT_PROFILE) fail("malformed-layout", "layout assay receipt has an unknown, absent, or legacy field");
  if (source.complete !== true || source.nonOverlapping !== true || source.childInteriorsRead !== false || source.carrierBytesRetained !== false) fail("malformed-layout", "layout assay receipt does not attest a complete sovereign refinement-gated layout");
  if (!Number.isSafeInteger(source.occurrenceCount) || source.occurrenceCount < 1) fail("malformed-layout", "layout occurrenceCount must be a positive safe integer");
  if (!Array.isArray(source.componentTypes) || source.componentTypes.length < 1 || !Array.isArray(source.placements)) fail("malformed-layout", "layout receipt components and placements must be sequences");
  const componentTypes = source.componentTypes.map((identity) => ni(identity, "layout component type"));
  if (new Set(componentTypes).size !== componentTypes.length) fail("malformed-layout", "layout receipt repeats a component type");
  return {
    kind: source.kind,
    profile: source.profile,
    provider: source.provider === PROVIDER_ACCOUNT ? source.provider : fail("malformed-layout", "layout receipt provider must be the exact service smart account"),
    circuit: ni(source.circuit, "layout circuit"),
    assembly: ni(source.assembly, "layout assembly"),
    behavior: ni(source.behavior, "layout behavior"),
    equivalenceProvider: name(source.equivalenceProvider, "layout equivalence provider"),
    equivalenceReceipt: ni(source.equivalenceReceipt, "layout equivalence receipt"),
    materialCover: ni(source.materialCover, "layout material cover"),
    materialRoot: ni(source.materialRoot, "layout material root"),
    componentTypes: [...componentTypes].sort(),
    occurrenceCount: source.occurrenceCount,
    placements: source.placements.map(normalizeReceiptPlacement),
    complete: true,
    nonOverlapping: true,
    childInteriorsRead: false,
    carrierBytesRetained: false,
  };
}

function typed(value) {
  const encoded = encodeRelationalValue(value);
  const term = ["ascribe", encoded.type, encoded.term];
  return { bytes: semanticBytes(term), id: semanticId(term), term };
}

export function encodeLayoutAssayRequest(source) {
  if (!exactKeys(source, ["assembly", "circuit", "components", "coverReceipt", "kind", "placements"]) || source.kind !== "HierarchicalInfomaterialLayoutAssayRequest") fail("malformed-layout", "layout assay request has an unknown, absent, or legacy field");
  if (!Array.isArray(source.components) || !Array.isArray(source.placements)) fail("malformed-layout", "components and placements must be sequences");
  const value = {
    kind: source.kind,
    circuit: normalizeHierarchicalCircuit(source.circuit),
    components: source.components.map(normalizeHierarchicalCircuit),
    assembly: normalizeCircuitAssembly(source.assembly),
    coverReceipt: source.coverReceipt,
    placements: source.placements.map(normalizePlacement),
  };
  const encoded = encodeRelationalValue(value);
  return { value, type: encoded.type, term: encoded.term };
}

export function decodeLayoutAssayRequest(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("malformed-layout", "layout request must use the relational RMN type");
  return encodeLayoutAssayRequest(decodeRelationalValue(type, term)).value;
}

export function decodeLayoutAssayReceipt(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("malformed-layout", "layout receipt must use the relational RMN type");
  return normalizeLayoutAssayReceipt(decodeRelationalValue(type, term));
}

export async function assayHierarchicalMaterialLayout(source, { conform, refine }) {
  if (typeof conform !== "function") fail("missing-provider", "an independent hierarchical circuit equivalence provider is required");
  if (typeof refine !== "function") fail("missing-provider", "an independent carrier refinement provider is required");
  const request = encodeLayoutAssayRequest(source).value;
  const cover = validateDirectoryPatchCoverReceipt(request.coverReceipt);
  const circuitIdentity = hierarchicalCircuitId(request.circuit), assemblyIdentity = circuitAssemblyId(request.assembly);
  const localAssembly = verifyCircuitAssembly(request.assembly, request.circuit, request.components);
  const equivalence = await conform({ circuit: request.circuit, components: request.components, assembly: request.assembly });
  if (equivalence?.assay?.equivalent !== true || equivalence.assay.circuit !== circuitIdentity || equivalence.assay.assembly !== assemblyIdentity) fail("equivalence-refusal", "the equivalence die did not attest the exact circuit design and sovereign assembly");
  ni(equivalence.assay.behavior, "equivalence behavior");
  ni(equivalence.receiptNi, "equivalence receipt");

  const mounts = new Map();
  for (const mount of cover.mounts) {
    if (mounts.has(mount.name)) fail("malformed-cover", `cover repeats mount ${mount.name}`);
    mounts.set(mount.name, mount);
  }
  const definitions = new Map([[localAssembly.family.rootIdentity, localAssembly.family.root], ...localAssembly.family.library]);
  const reachableComponents = new Set(definitions.keys());
  const placedMounts = new Set(), carriedComponents = new Set(), placements = [];
  for (const placement of request.placements) {
    if (placedMounts.has(placement.mount)) fail("layout-overlap", `mount ${placement.mount} is placed more than once`);
    const mount = mounts.get(placement.mount);
    if (!mount) fail("unknown-mount", `placement names uncovered mount ${placement.mount}`);
    if (!reachableComponents.has(placement.component)) fail("unknown-component", `placement names unreachable component ${placement.component}`);
    if (placement.materialObservation.semanticId !== mount.observation || placement.materialObservation.materialRoot !== mount.materialRoot) fail("material-drift", `placement observation differs from covered mount ${placement.mount}`);
    const refinedResult = await refine({ producer: placement.producer, circuit: request.circuit, components: request.components, assembly: request.assembly, component: definitions.get(placement.component), materialObservation: placement.materialObservation, carrier: placement.carrier });
    const refined = normalizeCarrierRefinementReceipt(refinedResult?.receipt);
    const refinementReceipt = ni(refinedResult?.receiptNi, "carrier refinement receipt");
    if (refined.component !== placement.component || refined.materialRoot !== mount.materialRoot || refined.observation !== mount.observation) fail("refinement-drift", `carrier refinement differs from mount or component ${placement.mount}`);
    placedMounts.add(placement.mount);
    carriedComponents.add(placement.component);
    placements.push({ mount: placement.mount, component: placement.component, materialRoot: mount.materialRoot, proofProfile: refined.proofProfile, provider: refined.provider, refinementReceipt });
  }
  const missingMount = [...mounts.keys()].find((mount) => !placedMounts.has(mount));
  if (missingMount !== undefined) fail("layout-gap", `cover mount ${missingMount} has no mechanically refined component carrier`);
  const missingComponent = [...reachableComponents].find((component) => !carriedComponents.has(component));
  if (missingComponent !== undefined) fail("layout-gap", `circuit component ${missingComponent} has no material carrier`);

  placements.sort((left, right) => Buffer.compare(Buffer.from(left.mount, "utf8"), Buffer.from(right.mount, "utf8")));
  const receipt = {
    kind: "HierarchicalInfomaterialLayoutAssayReceipt",
    profile: LAYOUT_PROFILE,
    provider: PROVIDER_ACCOUNT,
    circuit: circuitIdentity,
    assembly: assemblyIdentity,
    behavior: equivalence.assay.behavior,
    equivalenceProvider: name(equivalence.assay.provider, "equivalence provider"),
    equivalenceReceipt: equivalence.receiptNi,
    materialCover: request.coverReceipt.semanticId,
    materialRoot: cover.materialRoot,
    componentTypes: [...reachableComponents].sort(),
    occurrenceCount: localAssembly.contexts.length,
    placements,
    complete: true,
    nonOverlapping: true,
    childInteriorsRead: false,
    carrierBytesRetained: false,
  };
  const document = typed(receipt);
  return { receipt, semanticId: document.id, canonicalBytes: document.bytes };
}
