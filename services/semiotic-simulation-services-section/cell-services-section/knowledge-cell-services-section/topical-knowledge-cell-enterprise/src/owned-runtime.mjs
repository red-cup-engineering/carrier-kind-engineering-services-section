import { resolve } from "node:path";
import { agentCardSignatureEvidence, discoverSignedAgentCard } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { conformTerm } from "@red-cup-engineering/rmn-semantic-conformance/client";
import { querySettlementRecords, recordSettlementRecord, relationalRwilDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";

const ACTOR = "urn:ame:topical-knowledge-cell-enterprise-carrier";
const NODE_ID = "topical-knowledge-cell-enterprise";
const ACCOUNT = "eip155:31337:0x81bd9590bb875abca3ec853d7cf8a83b8f38e311";
const CATEGORY = "topical-knowledge-cell-instance-admission-receipts";

async function verified(binding, role) {
  if (!binding?.agentUrl || !binding.agentCardIdentity || !binding.agentCardSignature) throw new Error(`topical-cell carrier requires an exact ${role} binding`);
  const evidence = agentCardSignatureEvidence(await discoverSignedAgentCard({ agentUrl: binding.agentUrl }));
  if (evidence.card !== binding.agentCardIdentity || evidence.signature !== binding.agentCardSignature) throw new Error(`topical-cell carrier ${role} provider identity changed`);
  return binding.agentUrl;
}

export async function createTopicalKnowledgeCellEnterpriseRuntime({ boundary, root }) {
  const bindingReceipt = semanticId(relationalRwilDocument(boundary.providerBindings));
  let rmnAgentUrl = boundary.providerBindings?.rmnSemanticConformance?.agentUrl;
  let rwilAgentUrl = boundary.providerBindings?.rwilRdf?.agentUrl;
  if (process.env.TOPICAL_CELL_PROVIDER_BINDING_RECEIPT !== bindingReceipt) {
    rmnAgentUrl = await verified(boundary.providerBindings?.rmnSemanticConformance, "RMN");
    rwilAgentUrl = await verified(boundary.providerBindings?.rwilRdf, "RWIL");
    process.env.TOPICAL_CELL_PROVIDER_BINDING_RECEIPT = bindingReceipt;
  }
  const dataRoot = resolve(root, "data");
  async function identify(value) {
    const document = relationalRwilDocument(value);
    const evidence = await conformTerm({ agentUrl: rmnAgentUrl, term: document[2], expectedType: document[1] });
    return { id: semanticId(document), evidence: { provider: rmnAgentUrl, request: evidence.requestNi, response: evidence.exchange.outputNi, normalForm: evidence.normalFormId } };
  }
  return {
    providers: {
      identify,
      lookupRequest: async (requestId) => (await querySettlementRecords(CATEGORY)).find((record) => record.requestId === requestId) ?? null,
      record: async (record) => recordSettlementRecord({ agentUrl: rwilAgentUrl, settlement: ACCOUNT, actor: ACTOR, category: CATEGORY, recordedAt: record.recordedAt, record }),
    },
    options: {},
  };
}
