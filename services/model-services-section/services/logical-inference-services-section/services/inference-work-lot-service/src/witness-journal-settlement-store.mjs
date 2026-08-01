import { relationalWitnessJournalDocument, projectWitnessJournalBatch } from "@lenticule-science/witness-journal-rdf-projection-service";
import { querySettlementRecords, resolveSettlementAccount } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { createImmutableContentCustody } from "@red-cup-engineering/immutable-content-custody-service";
import { createCategoryReferenceIndex } from "@red-cup-engineering/category-reference-index-service";

let networkAuthorities;

function admittedNetworkAuthorities() {
  networkAuthorities ??= Object.freeze({
    custody: createImmutableContentCustody(),
    categoryIndex: createCategoryReferenceIndex(),
  });
  return networkAuthorities;
}

export async function createInferenceSettlementStore({ settlementRoot, caip2, rpcUrl, request } = {}) {
  if (!settlementRoot) throw new Error("settlementRoot is required");
  const account = await resolveSettlementAccount(settlementRoot, { caip2, rpcUrl, request });
  const { custody, categoryIndex } = admittedNetworkAuthorities();
  return Object.freeze({
    ...account,
    records: (category) => querySettlementRecords(category, { custody, categoryIndex }),
    async record({ category, recordedAt, record, assertions = [] }) {
      const document = relationalWitnessJournalDocument({ type: "SettlementRecord", category, recordedAt, record });
      const graph = semanticId(document);
      const projection = await projectWitnessJournalBatch({
        settlement: account.settlement,
        graph,
        recordedAt,
        document,
        assertions: [
          { subject: account.actor, predicate: "urn:emsenn:witness-journal:recorded", object: { kind: "iri", value: graph } },
          { subject: graph, predicate: "urn:emsenn:witness-journal:category", object: { kind: "literal", value: category } },
          ...assertions,
        ],
      });
      const [graphReference, documentReference] = await Promise.all([
        custody.put({ ni: projection.digest, bytes: Buffer.from(projection.canonicalNQuads, "utf8"), mediaType: "application/n-quads" }),
        custody.put({ ni: projection.documentNi, bytes: projection.documentBytes, mediaType: "application/rmn+cbor" }),
      ]);
      const indexReference = await categoryIndex.add({ predicate: "urn:emsenn:witness-journal:category", category, ni: projection.documentNi });
      return Object.freeze({
        digest: projection.digest,
        documentNi: projection.documentNi,
        statementCount: projection.statementCount,
        reference: Object.freeze({
          profile: "org.lenticule-science.witness-journal-network-custody.v1",
          graph: graphReference,
          document: documentReference,
          indexes: Object.freeze([indexReference]),
        }),
      });
    },
  });
}
