/**
 * understanding/discourse-information - information readings of discourse state.
 *
 * This layer does not parse or resolve discourse again. It reads the finite
 * discourse-state carrier as empirical distributions: topic entropy, commitment
 * entropy, repair entropy, topic surprisal, redundancy, semantic cohesion, and
 * a commitment/topic channel.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { count } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { shannonEntropy, mutualInformation } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/information";

const readingSchema = { enum: ["absurd", "potential", "active", "stable"] };

const surprisalSchema = {
  type: "object",
  required: ["outcome", "count", "probability", "surprisal"],
  additionalProperties: false,
  properties: {
    outcome: { type: "string", minLength: 1 },
    count: { type: "integer", minimum: 1 },
    probability: { type: "number", minimum: 0 },
    surprisal: { type: "number", minimum: 0 },
  },
};

const channelSchema = {
  type: "object",
  required: ["kind", "samples", "commitmentEntropy", "topicEntropy", "jointEntropy", "mutualInformation"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.discourse-information.channel" },
    samples: { type: "integer", minimum: 0 },
    commitmentEntropy: { type: "number", minimum: 0 },
    topicEntropy: { type: "number", minimum: 0 },
    jointEntropy: { type: "number", minimum: 0 },
    mutualInformation: { type: "number", minimum: 0 },
  },
};

export const discourseInformationSchema = {
  $id: "communicating/understanding/discourse-information",
  type: "object",
  required: [
    "kind",
    "text",
    "stateReading",
    "samples",
    "topicEntropy",
    "commitmentEntropy",
    "repairEntropy",
    "meanSurprisal",
    "redundancy",
    "semanticCohesion",
    "surprisals",
    "channel",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.discourse-information" },
    text: { type: "string" },
    stateReading: readingSchema,
    samples: { type: "integer", minimum: 0 },
    topicEntropy: { type: "number", minimum: 0 },
    commitmentEntropy: { type: "number", minimum: 0 },
    repairEntropy: { type: "number", minimum: 0 },
    meanSurprisal: { type: "number", minimum: 0 },
    redundancy: { type: "number", minimum: 0, maximum: 1 },
    semanticCohesion: { type: "number", minimum: 0, maximum: 1 },
    surprisals: { type: "array", items: surprisalSchema },
    channel: channelSchema,
  },
};

export const discourseInformationCarrier = schemaFrom(discourseInformationSchema);

function clampUnit(value) {
  return Math.max(0, Math.min(1, value));
}

function counts(values) {
  const out = new Map();
  for (const value of values) out.set(value, (out.get(value) ?? 0) + 1);
  return out;
}

function entropyOf(values) {
  return shannonEntropy([...counts(values).values()]);
}

function topicSamples(state) {
  return Object.freeze(state.topics.flatMap((topic) => topic.mentions.map(() => topic.label)));
}

function commitmentSamples(state) {
  return Object.freeze(state.commitments.map((commitment) => `${commitment.basis}:${commitment.reading}`));
}

function repairSamples(state) {
  return Object.freeze(state.repairs.map((repair) => `${repair.kind}:${repair.reading}`));
}

function surprisals(values) {
  const sampleCounts = counts(values);
  const total = values.length;
  if (total === 0) return Object.freeze([]);
  return Object.freeze([...sampleCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([outcome, count]) => {
      const probability = count / total;
      return Object.freeze({
        outcome,
        count,
        probability,
        surprisal: -Math.log2(probability),
      });
    }));
}

function meanSurprisalOf(values) {
  const readings = surprisals(values);
  if (values.length === 0) return 0;
  return readings.reduce((sum, item) => sum + item.probability * item.surprisal, 0);
}

function redundancyOf(values, entropy) {
  const alphabet = counts(values).size;
  if (alphabet === 0) return 0;
  if (alphabet === 1) return 1;
  return clampUnit(1 - entropy / Math.log2(alphabet));
}

function obstructedMass(state) {
  const badReferences = state.references.filter((reference) => reference.status !== "resolved").length;
  const badPresuppositions = state.presuppositions.filter((item) => item.status === "absurd" || item.status === "stable").length;
  const badCommitments = state.commitments.filter((item) => item.basis === "ambiguous" || item.basis === "unproved").length;
  const badRepairs = state.repairs.filter((item) => item.reading === "absurd" || item.reading === "stable").length;
  return badReferences + badPresuppositions + badCommitments + badRepairs;
}

function semanticCohesionOf(state) {
  const obligations =
    state.references.length +
    state.presuppositions.length +
    state.commitments.length +
    state.repairs.length;
  if (obligations === 0) return state.topics.length <= 1 ? 1 : 0;
  return clampUnit(1 - obstructedMass(state) / obligations);
}

function topicsForReading(state, readingId) {
  const prefix = `${readingId}:`;
  const labels = state.topics
    .filter((topic) => topic.mentions.some((mention) => mention.startsWith(prefix)))
    .map((topic) => topic.label);
  return Object.freeze(labels.length === 0 ? ["topic:none"] : labels);
}

function channelOf(state) {
  const pairs = state.commitments.flatMap((commitment) =>
    topicsForReading(state, commitment.readingId).map((topic) => [
      `${commitment.basis}:${commitment.reading}`,
      topic,
    ]));
  const info = mutualInformation(pairs);
  return Object.freeze({
    kind: "communicating.discourse-information.channel",
    samples: info.samples,
    commitmentEntropy: info.entropyX,
    topicEntropy: info.entropyY,
    jointEntropy: info.jointEntropy,
    mutualInformation: info.mutualInformation,
  });
}

export function discourseInformationOfState(state) {
  const topics = topicSamples(state);
  const commitments = commitmentSamples(state);
  const repairs = repairSamples(state);
  const topicEntropy = entropyOf(topics);
  const information = Object.freeze({
    kind: "communicating.discourse-information",
    text: state.text,
    stateReading: state.reading,
    samples: topics.length + commitments.length + repairs.length,
    topicEntropy,
    commitmentEntropy: entropyOf(commitments),
    repairEntropy: entropyOf(repairs),
    meanSurprisal: meanSurprisalOf(topics),
    redundancy: redundancyOf(topics, topicEntropy),
    semanticCohesion: semanticCohesionOf(state),
    surprisals: surprisals(topics),
    channel: channelOf(state),
  });
  discourseInformationCarrier.assert(information, "discourse information");
  return information;
}
