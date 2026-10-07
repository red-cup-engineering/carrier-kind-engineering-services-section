/**
 * holography — projections from a communicating whole into readable layers.
 *
 * Holography is the representation boundary, not a codec. It does not encode a
 * carrier for transport; it reads the communicative whole through layer
 * projections whose parts remain accountable to the whole parse.
 */

import { admitCommunication } from "../speaking/listening/parsing/carrier.mjs";
import { lambekProofOfForest } from "../speaking/listening/parsing/lambek.mjs";
import { parseCommunicationForest } from "../speaking/listening/parsing/forest.mjs";
import { cohomology } from "../speaking/listening/parsing/cohomology.mjs";

import { grammaticality } from "../speaking/listening/judging/grammaticality/grammaticality.mjs";

import { discourseInformationOfState } from "../speaking/listening/understanding/discourse-information.mjs";
import { discourseStateOfForest } from "../speaking/listening/understanding/discourse-state.mjs";
import { roles } from "../speaking/listening/understanding/semantics/roles.mjs";
import { resolveReferences } from "../speaking/listening/understanding/referring.mjs";

/** A full report over one sentence: the settled parse and every layer's reading. */

/** Articulate text, take its first sentence, and settle it through the engine. */
export function settle(text, bundle) {
  return parseCommunicationForest(admitCommunication(text), bundle);
}

/** Read a sentence at every layer at once — the headline endomorphism. */
export function read(text, bundle) {
  const forest = settle(text, bundle);
  const lambek = lambekProofOfForest(forest);
  const discourse = discourseStateOfForest(forest, lambek);
  const parsed = forest.readings[0]?.parse ?? {
    words: [],
    arcs: [],
    answers: [],
    compositions: [],
    tower: { folds: 0, fixedPoint: true, sizes: [] },
    conflicts: [],
    voids: [],
    attributions: [],
    modality: { hedges: [], future: [], auxiliaries: [] },
  };
  return {
    text,
    forest,
    lambek,
    discourse,
    discourseInformation: discourseInformationOfState(discourse),
    parse: parsed,
    roles: roles(parsed),
    grammaticality: grammaticality(parsed),
    cohomology: cohomology(parsed),
    reference: resolveReferences(parsed),
  };
}

/** A holographic projection of a reading: layer views accountable to the whole. */
export function projectReading(reading) {
  return {
    text: reading.text,
    forest: {
      reading: reading.forest.reading,
      readings: reading.forest.readings.length,
      glued: reading.forest.glued,
      complete: reading.forest.complete,
      ambiguity: reading.forest.ambiguity,
      obstructions: reading.forest.obstructions,
    },
    lambek: {
      reading: reading.lambek.reading,
      proven: reading.lambek.proven,
      proofs: reading.lambek.proofs.length,
    },
    discourse: {
      reading: reading.discourse.reading,
      entities: reading.discourse.entities.length,
      references: reading.discourse.references.length,
      presuppositions: reading.discourse.presuppositions.length,
      topics: reading.discourse.topics.length,
      commitments: reading.discourse.commitments.length,
      repairs: reading.discourse.repairs.length,
    },
    discourseInformation: {
      stateReading: reading.discourseInformation.stateReading,
      samples: reading.discourseInformation.samples,
      topicEntropy: reading.discourseInformation.topicEntropy,
      commitmentEntropy: reading.discourseInformation.commitmentEntropy,
      repairEntropy: reading.discourseInformation.repairEntropy,
      meanSurprisal: reading.discourseInformation.meanSurprisal,
      redundancy: reading.discourseInformation.redundancy,
      semanticCohesion: reading.discourseInformation.semanticCohesion,
      channel: reading.discourseInformation.channel,
    },
    words: reading.parse.words.map((w) => ({ text: w.text, tags: w.tags, roles: w.roles })),
    arcs: reading.parse.arcs.map((a) => ({ rel: a.rel, head: a.headText, dep: a.depText })),
    roles: reading.roles,
    grammaticality: reading.grammaticality,
    cohomology: {
      glued: reading.cohomology.glued,
      h0: reading.cohomology.h0,
      h1: reading.cohomology.h1,
      obstructions: reading.cohomology.obstructions,
    },
  };
}
