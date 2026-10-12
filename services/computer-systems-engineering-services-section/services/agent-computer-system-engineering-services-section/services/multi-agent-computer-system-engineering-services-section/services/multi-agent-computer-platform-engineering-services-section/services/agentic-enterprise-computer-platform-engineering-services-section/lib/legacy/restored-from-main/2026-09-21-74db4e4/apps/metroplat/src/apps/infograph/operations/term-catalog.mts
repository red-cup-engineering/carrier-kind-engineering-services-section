/** Journal-backed orchestration for the language-owned term catalog ABI. */
import { operation, type Operation } from "../../../rpc/index.mts";
import { parseArtifactRef, isIdentityWitness, type ArtifactRef, type ArtifactSource } from "../../../lib/identity/index.mts";
import { parse, type JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { toEavt, eavtId, eavtObject, type EAVT } from "../../../lib/codecs/json/jsonl/eavt/index.mts";
import { tm } from "../../../lib/language/ast/index.mts";
import {
  admitTerm,
  readTermCatalog,
  type AdmittedTerm,
  type TermAdmissionReceipt,
  type TermNameProposal,
} from "../../../lib/language/catalog.mts";
import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";
import { journal, openJournal } from "../../../journal/index.mts";

export interface TermCatalogBinding {
  readonly dataRoot: string;
  readonly now?: () => string;
}

const termAdmissionResultContract = schemaFrom({
  $id: "metroplat/language/term-admission-result",
  type: "object",
} as const);

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
} as const);

function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : undefined;
}

function artifactRef(value: unknown): ArtifactRef | undefined {
  const parsed = parseArtifactRef(value);
  return isIdentityWitness(parsed) ? value as ArtifactRef : undefined;
}

function proposalOf(row: EAVT): Omit<TermNameProposal, "witness"> | undefined {
  const { a, v } = eavtObject(row);
  const attribute = record(a);
  const proposal = record(v);
  if (attribute?.["event"] !== "term-name-proposal" || proposal?.["kind"] !== "metroplat.language.term-name-proposal") return undefined;
  const name = proposal["name"];
  const term = artifactRef(proposal["term"]);
  const admission = artifactRef(proposal["admission"]);
  if (proposal["version"] !== 1 || typeof name !== "string" || name.length === 0 || term === undefined || admission === undefined) return undefined;
  return Object.freeze({
    kind: "metroplat.language.term-name-proposal" as const,
    version: 1 as const,
    name,
    term,
    admission,
  });
}

function verifyProposal(binding: TermCatalogBinding, row: EAVT, proposal: Omit<TermNameProposal, "witness">): string | undefined {
  const termSource = journal.readArtifact(binding.dataRoot, proposal.term);
  const receiptSource = journal.readArtifact(binding.dataRoot, proposal.admission);
  if (termSource === undefined) return `proposal ${eavtId(row)} is missing term artifact ${proposal.term}`;
  if (receiptSource === undefined) return `proposal ${eavtId(row)} is missing admission receipt ${proposal.admission}`;
  const termEnvelope = record(parse(termSource.canonicalText));
  const receipt = record(parse(receiptSource.canonicalText)) as unknown as TermAdmissionReceipt | undefined;
  if (termEnvelope?.["kind"] !== "metroplat.language.term" || termEnvelope["version"] !== 1 || !("term" in termEnvelope)) {
    return `proposal ${eavtId(row)} references a non-term artifact`;
  }
  if (
    receipt?.kind !== "metroplat.language.term-admission"
    || receipt.version !== 1
    || receipt.term !== proposal.term
  ) return `proposal ${eavtId(row)} references an incompatible admission receipt`;
  const replay = admitTerm(termEnvelope["term"], receipt.type);
  if (
    replay.kind !== "metroplat.language.term-admission:witness"
    || replay.term !== proposal.term
    || replay.receipt !== proposal.admission
    || replay.normalForm !== receipt.normalForm
  ) return `proposal ${eavtId(row)} does not replay to its admission evidence`;
  return undefined;
}

export function admitTermName(
  binding: TermCatalogBinding,
  input: unknown,
): unknown {
  const candidate = record(input);
  const name = candidate?.["name"];
  if (typeof name !== "string" || name.length === 0) {
    return Object.freeze({
      kind: "metroplat.language.term-name-proposal:obstruction" as const,
      code: "invalid-name" as const,
      message: "term proposal name must be a nonempty string",
    });
  }
  const admission = admitTerm(candidate?.["term"], candidate?.["type"]);
  if (admission.kind !== "metroplat.language.term-admission:witness") return admission;
  const at = binding.now?.() ?? new Date().toISOString();
  const proposal = Object.freeze({
    kind: "metroplat.language.term-name-proposal" as const,
    version: 1 as const,
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
    eventArtifacts: admission.sources as readonly ArtifactSource[],
  });
  return Object.freeze({
    ...admission,
    name,
    proposals: result.statements,
  });
}

export function readWitnessedTermCatalog(binding: TermCatalogBinding): unknown {
  const proposals: TermNameProposal[] = [];
  const obstructions: string[] = [];
  journal.scanTerritory(binding.dataRoot, undefined, (_accumulator, row) => {
    const proposal = proposalOf(row);
    if (proposal === undefined) return undefined;
    const problem = verifyProposal(binding, row, proposal);
    if (problem !== undefined) obstructions.push(problem);
    else proposals.push(Object.freeze({ ...proposal, witness: eavtId(row) }));
    return undefined;
  });
  const catalog = readTermCatalog(proposals);
  return Object.freeze({
    ...catalog,
    obstructions: Object.freeze(obstructions.sort()),
  });
}

export function termCatalogOperations(binding: TermCatalogBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "admit-term",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit an exact typed RMN term and witness a name proposal.",
      description: "Domain: { name, term, type? }. Returns an explicit admission witness or obstruction; successful proposals are journaled with their exact term, normal form, and typing receipt artifacts.",
      codomain: termAdmissionResultContract,
      run: (input: unknown): unknown => admitTermName(binding, input),
    }),
    operation({
      verb: "read-term-catalog",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read witnessed RMN name proposals and explicit conflicts.",
      description: "Derives name designations solely from admitted journal proposals and verified exact term artifacts; multiple term refs for one name remain contested.",
      codomain: termCatalogResultContract,
      run: (): unknown => readWitnessedTermCatalog(binding),
    }),
  ]);
}
