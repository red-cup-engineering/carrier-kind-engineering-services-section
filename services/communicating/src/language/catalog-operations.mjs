/** Journal-backed orchestration for the language-owned term catalog ABI. */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { isArtifactRef } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { parse } from "@red-cup-engineering/json-services-section";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import {
  admitTerm,
  readTermCatalog,

} from "@red-cup-engineering/communicating/language/catalog";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { journal, openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { toEavt, eavtKey, eavtRecord } from "@red-cup-engineering/eavt/row";

const termAdmissionResultContract = schemaFrom({
  $id: "metroplat/language/term-admission-result",
  type: "object",
});

const termCatalogResultContract = schemaFrom({
  $id: "metroplat/language/term-catalog-readout",
  type: "object",
  required: ["kind", "designations", "obstructions"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.language.term-catalog" },
    designations: { type: "array" },
    obstructions: { type: "array" },
  },
});

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : undefined;
}

function artifactRef(value) {
  return isArtifactRef(value) ? value : undefined;
}

function proposalOf(row) {
  const { a, v } = eavtRecord(row);
  const attribute = record(a);
  const proposal = record(v);
  if (attribute?.["event"] !== "term-name-proposal" || proposal?.["kind"] !== "metroplat.language.term-name-proposal") return undefined;
  const name = proposal["name"];
  const term = artifactRef(proposal["term"]);
  const admission = artifactRef(proposal["admission"]);
  if (proposal["version"] !== 1 || typeof name !== "string" || name.length === 0 || term === undefined || admission === undefined) return undefined;
  return Object.freeze({
    kind: "metroplat.language.term-name-proposal",
    version: 1,
    name,
    term,
    admission,
  });
}

function verifyProposal(binding, row, proposal) {
  const termSource = journal.readArtifact(binding.dataRoot, proposal.term);
  const receiptSource = journal.readArtifact(binding.dataRoot, proposal.admission);
  if (termSource === undefined) return `proposal ${eavtKey(row)} is missing term artifact ${proposal.term}`;
  if (receiptSource === undefined) return `proposal ${eavtKey(row)} is missing admission receipt ${proposal.admission}`;
  const termEnvelope = record(parse(termSource.canonicalText));
  const receipt = record(parse(receiptSource.canonicalText));
  if (termEnvelope?.["kind"] !== "metroplat.language.term" || termEnvelope["version"] !== 1 || !("term" in termEnvelope)) {
    return `proposal ${eavtKey(row)} references a non-term artifact`;
  }
  if (
    receipt?.kind !== "metroplat.language.term-admission"
    || receipt.version !== 1
    || receipt.term !== proposal.term
  ) return `proposal ${eavtKey(row)} references an incompatible admission receipt`;
  const replay = admitTerm(termEnvelope["term"], receipt.type);
  if (
    replay.kind !== "metroplat.language.term-admission:witness"
    || replay.term !== proposal.term
    || replay.receipt !== proposal.admission
    || replay.normalForm !== receipt.normalForm
  ) return `proposal ${eavtKey(row)} does not replay to its admission evidence`;
  return undefined;
}

export function admitTermName(
  binding,
  input,
) {
  const candidate = record(input);
  const name = candidate?.["name"];
  if (typeof name !== "string" || name.length === 0) {
    return Object.freeze({
      kind: "metroplat.language.term-name-proposal:obstruction",
      code: "invalid-name",
      message: "term proposal name must be a nonempty string",
    });
  }
  const admission = admitTerm(candidate?.["term"], candidate?.["type"]);
  if (admission.kind !== "metroplat.language.term-admission:witness") return admission;
  const at = binding.now();
  const proposal = Object.freeze({
    kind: "metroplat.language.term-name-proposal",
    version: 1,
    name,
    term: admission.term,
    admission: admission.receipt,
  });
  const result = openJournal(binding.dataRoot).appendRows("term-catalog", [toEavt({
    e: `term:${name}`,
    a: Object.freeze({ event: "term-name-proposal" }),
    v: proposal,
    t: at,
  })], {
    at,
    subject: "term-catalog",
    eventClaim: tm.mark("metroplat.language.term-name-proposal"),
    eventArtifacts: admission.sources,
  });
  return Object.freeze({
    ...admission,
    name,
    proposals: result.statements,
  });
}

export function readWitnessedTermCatalog(binding) {
  const proposals = [];
  const obstructions = [];
  journal.scanTerritory(binding.dataRoot, undefined, (_accumulator, row) => {
    const proposal = proposalOf(row);
    if (proposal === undefined) return undefined;
    const problem = verifyProposal(binding, row, proposal);
    if (problem !== undefined) obstructions.push(problem);
    else proposals.push(Object.freeze({ ...proposal, witness: eavtKey(row) }));
    return undefined;
  });
  const catalog = readTermCatalog(proposals);
  return Object.freeze({
    ...catalog,
    obstructions: Object.freeze(obstructions.sort()),
  });
}

export function termCatalogOperations(binding) {
  return Object.freeze([
    operation({
      verb: "admit-term",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit an exact typed SEN term and witness a name proposal.",
      description: "Domain: { name, term, type? }. Returns an explicit admission witness or obstruction; successful proposals are journaled with their exact term, normal form, and typing receipt artifacts.",
      codomain: termAdmissionResultContract,
      run: (input) => admitTermName(binding, input),
    }),
    operation({
      verb: "read-term-catalog",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read witnessed SEN name proposals and explicit conflicts.",
      description: "Derives name designations solely from admitted journal proposals and verified exact term artifacts; multiple term refs for one name remain contested.",
      codomain: termCatalogResultContract,
      run: () => readWitnessedTermCatalog(binding),
    }),
  ]);
}
