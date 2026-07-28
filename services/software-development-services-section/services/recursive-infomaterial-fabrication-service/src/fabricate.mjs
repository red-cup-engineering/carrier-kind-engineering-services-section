import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { encodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { requestDirectoryPlateObservation } from "@lenticule-science/infomaterial-directory-plate-observation/client";
import { requestDirectoryCover } from "@lenticule-science/infomaterial-patch-cover/client";
import { requestInfomaterialPatchEvidence } from "@lenticule-science/infomaterial-patch-cover/evidence-client";
import { requestHierarchicalCircuitEquivalence } from "@lenticule-science/hierarchical-circuit-equivalence-assay/client";
import { circuitInterfaceFromAgentCard } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { agentCardSignatureEvidence, discoverSignedAgentCard } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { requestRecursiveObservationCircuitSynthesis } from "@red-cup-engineering/recursive-observation-circuit-synthesis/client";
import { RECURSIVE_FABRICATION_CIRCUIT_PROFILE, RECURSIVE_FABRICATION_TALLY_PROFILE } from "./own-circuit-profile.mjs";

export const FABRICATION_PROFILE = "org.emsenn.infomaterial.recursive-fabrication.v6";

function exactKeys(value, keys) { return value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0"); }
function endpoint(value, field) { let parsed; try { parsed = new URL(value); } catch { throw new Error(`${field} must be an absolute HTTP Agent Card URL`); } if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(`${field} must use HTTP or HTTPS`); return parsed.href; }
function route(source) {
  if (!exactKeys(source, ["mount", "providerAgent", "request"])) throw new Error("each patch route must expose exactly mount, providerAgent, and request");
  if (typeof source.mount !== "string" || source.mount.length === 0) throw new Error("route mount must be nonempty text");
  if (!source.request || Object.getPrototypeOf(source.request) !== Object.prototype) throw new Error("route request must be one provider-law-specific relational value");
  return { mount: source.mount.normalize("NFC"), providerAgent: endpoint(source.providerAgent, "providerAgent"), request: source.request };
}
function typed(value) { const encoded = encodeRelationalValue(value), term = ["ascribe", encoded.type, encoded.term]; return { id: semanticId(term), bytes: semanticBytes(term) }; }

export async function fabricateDirectoryPatch(source, {
  plate = requestDirectoryPlateObservation,
  observe = requestInfomaterialPatchEvidence,
  cover = requestDirectoryCover,
  assay = requestHierarchicalCircuitEquivalence,
  synthesize = requestRecursiveObservationCircuitSynthesis,
  discover = discoverSignedAgentCard,
  rootCircuit = RECURSIVE_FABRICATION_CIRCUIT_PROFILE,
  tallyCircuit = RECURSIVE_FABRICATION_TALLY_PROFILE,
} = {}) {
  if (!exactKeys(source, ["coverAgent", "equivalenceAgent", "maximumMounts", "maximumParallel", "plateAgent", "plateRelativePath", "routes", "synthesisAgent"]) || !Array.isArray(source.routes)) throw new Error("fabrication request has an unknown, absent, or legacy field");
  if (!Number.isSafeInteger(source.maximumMounts) || source.maximumMounts < 0 || source.maximumMounts > 100_000) throw new Error("maximumMounts is outside the plate profile");
  if (!Number.isSafeInteger(source.maximumParallel) || source.maximumParallel < 1 || source.maximumParallel > 256) throw new Error("maximumParallel must be 1..256");
  const plateAgent = endpoint(source.plateAgent, "plateAgent"), coverAgent = endpoint(source.coverAgent, "coverAgent"), equivalenceAgent = endpoint(source.equivalenceAgent, "equivalenceAgent"), synthesisAgent = endpoint(source.synthesisAgent, "synthesisAgent");
  const routes = source.routes.map(route);
  const distinctAgents = [...new Set([equivalenceAgent, synthesisAgent, plateAgent, coverAgent, ...routes.map(({ providerAgent }) => providerAgent)])];
  const cards = new Map(await Promise.all(distinctAgents.map(async (agentUrl) => [agentUrl, await discover({ agentUrl })])));
  const profileAt = (agentUrl) => circuitInterfaceFromAgentCard(cards.get(agentUrl));
  const synthesisResult = await synthesize({ agentUrl: synthesisAgent,
    root: rootCircuit,
    plate: profileAt(plateAgent),
    cover: profileAt(coverAgent),
    tally: tallyCircuit,
    observers: routes.map(({ providerAgent }) => profileAt(providerAgent)),
  });
  const family = synthesisResult.receipt;
  const circuitAssay = await assay({ agentUrl: equivalenceAgent, circuit: family.circuit, components: family.components, assembly: family.assembly });
  const equivalenceReceipt = circuitAssay.receipt;
  if (equivalenceReceipt?.circuit !== family.circuitId || equivalenceReceipt.assembly !== family.assemblyId || equivalenceReceipt.equivalent !== true) throw new Error("equivalence provider did not attest the exact synthesized and populated fabrication circuit");
  const plateResult = await plate({ agentUrl: plateAgent, relativePath: source.plateRelativePath, maximumMounts: source.maximumMounts });
  const plateReceipt = plateResult.receipt, byMount = new Map();
  for (const item of routes) { if (byMount.has(item.mount)) throw new Error(`duplicate observer route for mount ${item.mount}`); byMount.set(item.mount, item); }
  if (routes.length !== plateReceipt.mounts.length) throw new Error("observer routes do not cover the plate frontier exactly");
  for (const mount of plateReceipt.mounts) if (!byMount.has(mount.name)) throw new Error(`missing observer route for mount ${mount.name}`);
  for (const item of routes) if (!plateReceipt.mounts.some(({ name }) => name === item.mount)) throw new Error(`observer route names unknown mount ${item.mount}`);
  const results = new Array(routes.length); let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor; cursor += 1; if (index >= routes.length) return;
      const item = routes[index], result = await observe({ agentUrl: item.providerAgent, request: item.request });
      const expected = plateReceipt.mounts.find(({ name }) => name === item.mount);
      if (result.receipt.rootKind !== expected.kind) throw new Error(`observer route ${item.mount} returned ${result.receipt.rootKind}, expected ${expected.kind}`);
      results[index] = result;
    }
  }
  await Promise.all(Array.from({ length: Math.min(source.maximumParallel, routes.length || 1) }, worker));
  const bindings = routes.map((item, index) => ({ mount: item.mount, receipt: results[index].receipt }));
  const coverResult = await cover({ agentUrl: coverAgent, plateReceipt, bindings });
  const receipt = {
    kind: "RecursiveInfomaterialFabricationReceipt", profile: FABRICATION_PROFILE,
    circuit: family.circuitId, assembly: family.assemblyId, equivalenceAgent,
    synthesis: synthesisResult.receiptNi, synthesisSeam: { input: synthesisResult.exchange.inputNi, output: synthesisResult.exchange.outputNi },
    equivalenceReceipt: circuitAssay.receiptNi,
    equivalenceSeam: { input: circuitAssay.exchange.inputNi, output: circuitAssay.exchange.outputNi },
    providers: distinctAgents.map((agent) => ({ agent, account: profileAt(agent).account, ...agentCardSignatureEvidence(cards.get(agent)) })),
    plate: plateReceipt.semanticId, plateSeam: { input: plateResult.exchange.inputNi, output: plateResult.exchange.outputNi },
    children: routes.map((item, index) => ({ mount: item.mount, providerAgent: item.providerAgent, providerAccount: profileAt(item.providerAgent).account, evidence: results[index].receipt.semanticId, seam: { input: results[index].exchange.inputNi, output: results[index].exchange.outputNi } })),
    cover: coverResult.receipt.semanticId, coverSeam: { input: coverResult.exchange.inputNi, output: coverResult.exchange.outputNi },
    materialRoot: coverResult.receipt.materialRoot, complete: true, localMaterialRead: false,
  };
  const document = typed(receipt);
  return { coverReceipt: coverResult.receipt, receipt, semanticId: document.id, canonicalBytes: document.bytes };
}
