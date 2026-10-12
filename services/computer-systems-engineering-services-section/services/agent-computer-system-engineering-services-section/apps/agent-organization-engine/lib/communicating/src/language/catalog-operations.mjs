/**
 * Store-backed orchestration for the language-owned term catalog ABI: a name proposal is a
 * `term-name-proposal` record, and the term artifacts it cites are `term-artifact` records found by a
 * head named by the artifact's reference.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { isArtifactRef } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { parse } from "@red-cup-engineering/json-services-section";
import {
  admitTerm,
  readTermCatalog,

} from "@red-cup-engineering/communicating/language/catalog";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { each, get, put, readHead, threadName, writeHead } from "@red-cup-engineering/semiotic-eavt-services-section/store";

/** The store types of a term-name proposal and of the artifacts it cites (a record `{ ref, canonicalText }`, found by the head named by its reference). */
export const TERM_PROPOSAL_TYPE = "term-name-proposal";
export const TERM_ARTIFACT_TYPE = "term-artifact";

const artifactName = (ref) => threadName(ref);
function keepArtifact(root, artifact) {
  const address = put(root, TERM_ARTIFACT_TYPE, { ref: artifact.ref, canonicalText: artifact.canonicalText });
  writeHead(root, TERM_ARTIFACT_TYPE, artifactName(artifact.ref), { frontier: [address] });
}
function readArtifact(root, ref) {
  const address = readHead(root, TERM_ARTIFACT_TYPE, artifactName(ref))?.frontier[0];
  const held = address === undefined ? undefined : get(root, TERM_ARTIFACT_TYPE, address);
  return held?.ref === ref ? held : undefined;
}

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

function proposalOf(value) {
  const proposal = record(value);
  if (proposal?.["kind"] !== "metroplat.language.term-name-proposal") return undefined;
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

function verifyProposal(binding, address, proposal) {
  const termSource = readArtifact(binding.dataRoot, proposal.term);
  const receiptSource = readArtifact(binding.dataRoot, proposal.admission);
  if (termSource === undefined) return `proposal ${address} is missing term artifact ${proposal.term}`;
  if (receiptSource === undefined) return `proposal ${address} is missing admission receipt ${proposal.admission}`;
  const termEnvelope = record(parse(termSource.canonicalText));
  const receipt = record(parse(receiptSource.canonicalText));
  if (termEnvelope?.["kind"] !== "metroplat.language.term" || termEnvelope["version"] !== 1 || !("term" in termEnvelope)) {
    return `proposal ${address} references a non-term artifact`;
  }
  if (
    receipt?.kind !== "metroplat.language.term-admission"
    || receipt.version !== 1
    || receipt.term !== proposal.term
  ) return `proposal ${address} references an incompatible admission receipt`;
  const replay = admitTerm(termEnvelope["term"], receipt.type);
  if (
    replay.kind !== "metroplat.language.term-admission:witness"
    || replay.term !== proposal.term
    || replay.receipt !== proposal.admission
    || replay.normalForm !== receipt.normalForm
  ) return `proposal ${address} does not replay to its admission evidence`;
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
  for (const artifact of admission.sources) keepArtifact(binding.dataRoot, artifact);
  const address = put(binding.dataRoot, TERM_PROPOSAL_TYPE, { ...proposal, name, at });
  return Object.freeze({
    ...admission,
    name,
    proposals: Object.freeze([Object.freeze({ id: address })]),
  });
}

export function readWitnessedTermCatalog(binding) {
  const proposals = [];
  const obstructions = [];
  for (const { address, record: held } of each(binding.dataRoot, TERM_PROPOSAL_TYPE)) {
    const proposal = proposalOf(held);
    if (proposal === undefined) continue;
    const problem = verifyProposal(binding, address, proposal);
    if (problem !== undefined) obstructions.push(problem);
    else proposals.push(Object.freeze({ ...proposal, witness: address }));
  }
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
