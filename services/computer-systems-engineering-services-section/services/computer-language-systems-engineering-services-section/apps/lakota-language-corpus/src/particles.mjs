import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const particleRules = Object.freeze([
  {
    form: "weló",
    normalizedForm: "yeló",
    position: "sentence-final",
    function: "attested-declarative-final",
    certainty: "underdetermined",
    features: Object.freeze([
      "particle:attested-declarative-final",
      "particle:orthographic-variant:weló",
      "function:underdetermined",
    ]),
    witnesses: Object.freeze([
      Object.freeze({
        label: "Black Elk letters local research note",
        locator: "dev/content/researching/notes/lakota-corpus.md/2026-06-26-black-elk-letters.md:21",
      }),
    ]),
  },
  {
    form: "yeló",
    normalizedForm: "yeló",
    position: "sentence-final",
    function: "attested-declarative-final",
    certainty: "underdetermined",
    features: Object.freeze(["particle:attested-declarative-final", "function:underdetermined"]),
    witnesses: Object.freeze([
      Object.freeze({
        label: "Black Elk letters local research note",
        locator: "dev/content/researching/notes/lakota-corpus.md/2026-06-26-black-elk-letters.md:75",
      }),
    ]),
  },
  {
    form: "he",
    normalizedForm: "he",
    position: "sentence-final",
    function: "attested-interrogative-final",
    certainty: "underdetermined",
    features: Object.freeze(["particle:attested-interrogative-final", "function:underdetermined"]),
    witnesses: Object.freeze([
      Object.freeze({
        label: "Lakota corpus local research note",
        locator: "dev/content/researching/notes/lakota-corpus.md/2026-06-26-lakota-corpus.md:171",
      }),
    ]),
  },
  {
    form: "hwo",
    normalizedForm: "hwo",
    position: "sentence-final",
    function: "attested-interrogative-final",
    certainty: "underdetermined",
    features: Object.freeze(["particle:attested-interrogative-final", "function:underdetermined"]),
    witnesses: Object.freeze([
      Object.freeze({
        label: "Lakota corpus local research note",
        locator: "dev/content/researching/notes/lakota-corpus.md/2026-06-26-lakota-corpus.md:242",
      }),
    ]),
  },
  {
    form: "kštó",
    normalizedForm: "kštó",
    position: "sentence-final",
    function: "attested-emphatic-final",
    certainty: "underdetermined",
    features: Object.freeze(["particle:attested-emphatic-final", "function:underdetermined"]),
    witnesses: Object.freeze([
      Object.freeze({
        label: "Lakota corpus local research note",
        locator: "dev/content/researching/notes/lakota-corpus.md/2026-06-26-lakota-corpus.md:196",
      }),
    ]),
  },
]);

const particleRuleByForm = new Map(
  particleRules.map((rule) => [rule.form, rule]),
);

function wordsOf(input) {
  return input.match(/[\p{L}\p{M}'’]+/gu) ?? [];
}

export const lakotaParticleRules = particleRules;

export function analyzeLakotaParticles(input) {
  const particles = wordsOf(input).flatMap((text, index) => {
    const rule = particleRuleByForm.get(text.toLowerCase());
    if (rule === undefined) return [];
    return [Object.freeze({
      text,
      normalizedForm: rule.normalizedForm,
      index,
      position: rule.position,
      function: rule.function,
      certainty: rule.certainty,
      features: rule.features,
      witnesses: rule.witnesses,
    })];
  });

  return Object.freeze({
    kind: "communicating-in-lakota.particle-analysis",
    input,
    particles: Object.freeze(particles),
  });
}

function particleInputText(input) {
  if (typeof input === "string") return input;
  if (typeof input !== "object" || input === null) return "";
  const record = input;
  return typeof record["text"] === "string" ? record["text"] : "";
}

export const analyzeLakotaParticlesAction = operation({
  verb: "analyze-lakota-particles",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Analyze finite witnessed Lakota sentence-final particles.",
  description: "Domain: JSON string or object with text. Codomain: line-cited, underdetermined Lakota particle witnesses; this is finite evidence readback, not a complete particle grammar.",
  run: (input) =>
    jsonResource(analyzeLakotaParticles(particleInputText(input)), "Lakota particle analysis"),
});
