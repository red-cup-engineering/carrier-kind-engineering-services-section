/**
 * carriers - the package's validating carrier objects.
 *
 * The library (`lib/`) declares each carrier as a pure JSON-Schema literal with a bare
 * `$id` - data, no machinery. Here the runtime kernel wraps those schemas into
 * Carrier objects: it binds the structural validator and registers them in the live
 * category, so downstream faculties get `.validate`/`.assert` and can type their
 * actions by these domains and codomains. This module is the seam between the
 * static declarations and the machinery that runs claims against them.
 */
export * from "./causal-set/index.mjs";
export * from "./running/index.mjs";
export * from "./articulating/predicating/index.mjs";
export * from "./articulating/predicating/positing/index.mjs";
export * from "./articulating/predicating/positing/settling/index.mjs";
export { readingDescriptorSchema, readingDescriptorCarrier, logReadingDescriptorSchema, logReadingDescriptorCarrier, coherenceReportSchema, coherenceReportCarrier, logCoherenceReportSchema, logCoherenceReportCarrier } from "@red-cup-engineering/eavt/ledger/reading-schema";
export { structuralProvenanceSignatureSchema, structuralProvenanceSignatureCarrier, signedProvenanceSourceSchema, signedProvenanceSourceCarrier, attestationLinkSchema, attestationLinkCarrier, provenanceReadingSchema, provenanceReadingCarrier } from "@red-cup-engineering/eavt/ledger/provenance-schema";
export { timeAnchorSchema, timeAnchorCarrier, timestampedWitnessSchema, timestampedWitnessCarrier, timeAnchorReadingSchema, timeAnchorReadingCarrier } from "@red-cup-engineering/eavt/ledger/time-anchor-schema";
export { mementoSnapshotSchema, mementoSnapshotCarrier, timeMapSchema, timeMapCarrier } from "@red-cup-engineering/eavt/ledger/memento-schema";
export { presentedCategoryDiagramSchema, presentedCategoryDiagramCarrier } from "@red-cup-engineering/signgraph/diagram-schema";

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { cellSchema, utteranceSchema } from "@red-cup-engineering/signcell/cell";
import { evidenceSchema } from "@red-cup-engineering/signchain/bilattice";
import { TySchema, TmSchema } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";

/** The base admission carrier: an utterance, a token and a claim (SignCell). */
export const utteranceCarrier = schemaFrom(utteranceSchema);

/** An articulated utterance: its reflexive cell, told for by its token (a SignCell). */
export const articulationCellCarrier = schemaFrom(cellSchema);

/** A meme: a predication cell with the evidence told for and against it — a SignCell. */
export const memeCarrier = schemaFrom(cellSchema);

/** A reading: an evidence pair on its own (SignChain). */
export const evidenceCarrier = schemaFrom(evidenceSchema);

/** The SEN type-language carrier (`Ty`). */
export const tyCarrier = schemaFrom(TySchema);

/** The SEN term-language carrier (`Tm`). */
export const tmCarrier = schemaFrom(TmSchema);
