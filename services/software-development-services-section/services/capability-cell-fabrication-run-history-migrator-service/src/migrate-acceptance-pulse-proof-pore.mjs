import { rawNiUri } from "@red-cup-engineering/rmn-semantic-conformance-die/canonical-cbor";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { supplierDesignId } from "@red-cup-engineering/acceptance-capsule-procurement-service/proof-foam";
import { createProofPoreJournal } from "@red-cup-engineering/acceptance-capsule-procurement-service/proof-pore-journal";

const sourceIdentity = rawNiUri;

function providerFor(path) {
  const segments = resolve(path).split(sep);
  const services = segments.lastIndexOf("services");
  const team = services === -1 ? null : segments[services + 1];
  if (!team?.endsWith("-inference-team")) throw new Error(`cannot derive provider from exchange path ${path}`);
  return `urn:ame:${team}`;
}

function projectedArtifact(exchange, subject) {
  if (exchange?.outcome !== "completion" || typeof exchange?.completion?.text !== "string") {
    throw new Error("legacy pulse source is not a completed inference exchange");
  }
  const demand = JSON.parse(exchange.packet?.messages?.at(-1)?.content ?? "null");
  const workLot = demand?.workLot?.id;
  if (typeof workLot !== "string" || !workLot.startsWith(`${subject}:acceptance-supplier:pulse:`)) {
    throw new Error("legacy pulse source belongs to a foreign acceptance subject");
  }
  const projection = demand?.outputContract?.projection;
  if (demand?.outputContract?.format !== "projected" || projection?.type !== "single-source-artifact" || typeof projection.path !== "string") {
    throw new Error("legacy pulse source has no single-source acceptance projection");
  }
  const fenced = [...exchange.completion.text.matchAll(/```[^\n]*\n([\s\S]*?)```/gu)];
  if (fenced.length > 1) throw new Error("legacy pulse completion has ambiguous fenced source blocks");
  const text = `${(fenced.length === 1 ? fenced[0][1] : exchange.completion.text).replace(/\s+$/u, "")}\n`;
  return {
    workLot,
    artifact: { path: projection.path, text },
    rationale: "Migrated provider source; independent customer assay remains required.",
  };
}

export function migrateAcceptancePulseProofPore({ subject, exchangePaths, targetRoot, receiptPath, migratedAt }) {
  if (typeof subject !== "string" || subject.length === 0) throw new Error("acceptance pulse migration requires a subject");
  if (!Array.isArray(exchangePaths) || exchangePaths.length === 0) throw new Error("acceptance pulse migration requires source exchanges");
  const sources = exchangePaths.map((path) => {
    const bytes = readFileSync(resolve(path));
    const exchange = JSON.parse(bytes);
    return { path: resolve(path), bytes: sourceIdentity(bytes), exchange, projected: projectedArtifact(exchange, subject) };
  }).sort((left, right) => left.exchange.recordedAt.localeCompare(right.exchange.recordedAt));
  const design = supplierDesignId({ subject, residue: [] });
  const journal = createProofPoreJournal({ root: resolve(targetRoot), now: () => migratedAt });
  if (journal.read(subject).length !== 0) throw new Error("acceptance proof pore already contains material for this subject");
  journal.append(subject, {
    transitionKey: `supplier-demanded:${design}`,
    transition: "supplier-demanded",
    pore: "supplier",
    design,
    polarity: "positive",
    migratedFromPulseHistory: true,
  });
  const material = sources[0];
  const provider = providerFor(material.path);
  const candidate = semanticId(relationalWitnessJournalDocument({
    type: "AcceptanceOracleCandidate",
    artifact: material.projected.artifact,
    provider,
  }));
  journal.append(subject, {
    transitionKey: `supplier-delivered:${design}`,
    transition: "supplier-delivered",
    pore: "supplier",
    design,
    polarity: "negative",
    candidate,
    record: { id: design, provider, endpoint: null, migratedSource: material.bytes },
    supplied: { artifact: material.projected.artifact, rationale: material.projected.rationale },
  });
  for (const source of sources.slice(1)) {
    journal.append(subject, {
      transitionKey: `legacy-ballast:${source.bytes}`,
      transition: "legacy-supplier-delivered-ballast",
      pore: "supplier",
      polarity: "positive",
      legacyWorkLot: source.projected.workLot,
      source: source.bytes,
      reason: "same semantic supplier pore was already answered",
    });
  }
  const body = {
    type: "AcceptancePulseProofPoreMigration",
    migratedAt,
    subject,
    design,
    candidate,
    materialSource: material.bytes,
    ballastSources: sources.slice(1).map(({ bytes }) => bytes),
    sourceCount: String(sources.length),
    target: journal.root,
  };
  const receipt = { id: semanticId(relationalWitnessJournalDocument(body)), ...body };
  mkdirSync(dirname(resolve(receiptPath)), { recursive: true });
  writeFileSync(resolve(receiptPath), `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
  return Object.freeze(receipt);
}

/**
 * Reclassify exact historical assay refusals that were produced before the
 * A2A boundary distinguished a behavioural counterexample from a carrier or
 * infrastructure obstruction.  The source events remain immutable.  Their
 * pressure is removed only by successor transitions naming the exact
 * candidate and expected historical reason.
 */
export function migrateAcceptanceAssayCarrierObstructions({
  subject,
  targetRoot,
  expectedRefusals,
  receiptPath,
  migratedAt,
}) {
  if (typeof subject !== "string" || subject.length === 0) throw new Error("acceptance assay reclassification requires a subject");
  if (!Array.isArray(expectedRefusals) || expectedRefusals.length === 0) throw new Error("acceptance assay reclassification requires expected refusals");
  const journal = createProofPoreJournal({ root: resolve(targetRoot), now: () => migratedAt });
  const history = journal.read(subject);
  const migrated = expectedRefusals.map(({ candidate, reason }) => {
    const source = history.find((event) => event.transition === "assay-refused" && event.candidate === candidate);
    if (!source) throw new Error(`expected assay refusal is absent for ${candidate}`);
    if (source.residue?.reason !== reason || source.residue?.oracleAssay != null) {
      throw new Error(`expected assay refusal does not match carrier obstruction for ${candidate}`);
    }
    const successor = journal.append(subject, {
      transitionKey: `assay-refusal-reclassified:${candidate}`,
      transition: "assay-refusal-reclassified",
      pore: "assay",
      polarity: "negative",
      candidate,
      source: source.id,
      priorDisposition: "behavioral-refusal",
      correctedDisposition: "carrier-obstruction",
      obstruction: reason,
    });
    return { candidate, source: source.id, successor: successor.id };
  });
  const body = {
    type: "AcceptanceAssayCarrierObstructionMigration",
    migratedAt,
    subject,
    migrated,
    target: journal.root,
  };
  const receipt = { id: semanticId(relationalWitnessJournalDocument(body)), ...body };
  mkdirSync(dirname(resolve(receiptPath)), { recursive: true });
  writeFileSync(resolve(receiptPath), `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
  return Object.freeze(receipt);
}
