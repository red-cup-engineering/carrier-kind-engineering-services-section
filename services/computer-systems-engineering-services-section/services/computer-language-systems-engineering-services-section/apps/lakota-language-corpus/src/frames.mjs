import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { read as readOver } from "@red-cup-engineering/eavt-services-section/verbs";


import lakota from "./compiled.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const frameRules = Object.freeze([
  Object.freeze({
    root: "čhíŋ",
    frame: "desire/want",
    valence: "actor plus possible desired complement; complement underdetermined when absent",
    certainty: "underdetermined",
    roles: Object.freeze(["actor", "possible-complement"]),
    witnesses: Object.freeze([
      "LDL 121 packet, Class I singular verb examples",
      "dev/content/researching/notes/lakota-corpus.md/2026-06-26-black-elk-letters.md:21",
      "dev/content/researching/notes/lakota-corpus.md/2026-06-26-lakota-corpus.md:171",
    ]),
  }),
  Object.freeze({
    root: "yuhá",
    frame: "possession/having",
    valence: "actor/possessor plus possible possessed theme; theme underdetermined when absent",
    certainty: "underdetermined",
    roles: Object.freeze(["actor-or-possessor", "possible-theme"]),
    witnesses: Object.freeze([
      "LDL 121 packet, Class II y-stem singular verb examples",
      "dev/content/researching/notes/lakota-corpus.md/2026-06-26-black-elk-letters.md:53",
      "dev/content/researching/notes/lakota-corpus.md/2026-06-26-lakota-corpus.md:265",
    ]),
  }),
  Object.freeze({
    root: "úŋ",
    frame: "stative-being/location",
    valence: "undergoer/state-holder; state or location complement underdetermined when absent",
    certainty: "underdetermined",
    roles: Object.freeze(["undergoer-or-state-holder", "possible-state-or-location"]),
    witnesses: Object.freeze([
      "LDL 121 packet, Class III singular verb examples",
      "dev/content/researching/notes/lakota-corpus.md/2026-06-26-lakota-corpus.md:272",
      "dev/content/researching/notes/lakota-corpus.md/2026-06-26-lakota-corpus.md:273",
    ]),
  }),
  Object.freeze({
    root: "ečíyapi",
    frame: "naming/calling",
    valence: "undergoer/name-bearer plus possible name content; name content underdetermined when absent",
    certainty: "underdetermined",
    roles: Object.freeze(["undergoer-or-name-bearer", "possible-name-content"]),
    witnesses: Object.freeze([
      "LDL 121 packet, singular forms for ečíyapi",
      "dev/content/researching/notes/lakota-corpus.md/2026-06-26-black-elk-letters.md:85",
    ]),
  }),
]);

const frameRuleByRoot = new Map(
  frameRules.map((rule) => [rule.root, rule]),
);

export const lakotaFrameRules = frameRules;

function featureValue(features, prefix) {
  const found = features.find((feature) => feature.startsWith(prefix));
  return found === undefined ? null : found.slice(prefix.length);
}

function participantFromFeature(feature) {
  const actor = "agreement:actor:";
  const undergoer = "agreement:undergoer:";
  const role = feature.startsWith(actor)
    ? "actor"
    : feature.startsWith(undergoer)
      ? "undergoer"
      : null;
  if (role === null) return null;

  const value = feature.slice(role === "actor" ? actor.length : undergoer.length);
  const participantValue =
    value === "1sg" ? "speaker" : value === "2sg" ? "listener" : "third-or-unmarked";

  return Object.freeze({
    role,
    value: participantValue,
    sourceFeature: feature,
    implicit: true,
    certainty: value === "3sg-or-unmarked" ? "underdetermined" : "witnessed",
  });
}

function frameInputText(input) {
  if (typeof input === "string") return input;
  if (typeof input !== "object" || input === null) return "";
  const record = input;
  return typeof record["text"] === "string" ? record["text"] : "";
}

function sentenceTexts(input) {
  return Object.freeze((input.match(/[^.!?]+[.!?]?/gu) ?? [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0));
}

function analyzeSentenceFrames(input, sentenceIndex) {
  const result = readOver(input, lakota).parse;
  const frames = result.words.flatMap((word) => {
    if (!word.tags.includes("verb")) return [];
    const root = featureValue(word.feats, "root:");
    if (root === null) return [];
    const rule = frameRuleByRoot.get(root);
    if (rule === undefined) return [];

    const participants = word.feats
      .map(participantFromFeature)
      .filter((participant) =>
        participant !== null);
    const template = featureValue(word.feats, "template:");

    return [Object.freeze({
      surface: word.text,
      sentenceIndex,
      index: word.i,
      root,
      template,
      frame: rule.frame,
      valence: rule.valence,
      certainty: rule.certainty,
      participants: Object.freeze(participants),
      features: word.feats,
      witnesses: rule.witnesses,
    })];
  });
  return Object.freeze(frames);
}

export function analyzeLakotaFrames(input) {
  const frames = sentenceTexts(input).flatMap((sentence, sentenceIndex) =>
    analyzeSentenceFrames(sentence, sentenceIndex));
  return Object.freeze({
    kind: "communicating-in-lakota.frame-analysis",
    input,
    frames: Object.freeze(frames),
  });
}

export const analyzeLakotaFramesAction = operation({
  verb: "analyze-lakota-frames",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Analyze finite witnessed Lakota verb frames.",
  description: "Domain: JSON string or object with text. Codomain: manifest-backed Lakota verb-frame carriers with agreement-derived implicit participants; this is finite evidence readback, not a complete semantic parser.",
  run: (input) =>
    jsonResource(analyzeLakotaFrames(frameInputText(input)), "Lakota frame analysis"),
});
