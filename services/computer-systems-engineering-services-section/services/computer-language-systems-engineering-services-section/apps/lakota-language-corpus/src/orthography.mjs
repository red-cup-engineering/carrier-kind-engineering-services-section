import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const orthographyRules = Object.freeze([
  Object.freeze({
    id: "sentence-final-declarative-yelo",
    variants: Object.freeze(["weló", "yeló"]),
    normalized: "yeló",
    relation: "sentence-final-particle-variant",
    certainty: "underdetermined",
    witnesses: Object.freeze([
      Object.freeze({
        label: "Black Elk letters local research note",
        locator: "dev/content/researching/notes/lakota-corpus.md/2026-06-26-black-elk-letters.md:21",
      }),
      Object.freeze({
        label: "Black Elk letters local research note",
        locator: "dev/content/researching/notes/lakota-corpus.md/2026-06-26-black-elk-letters.md:75",
      }),
    ]),
  }),
  Object.freeze({
    id: "class-ii-yuha-1sg-surface",
    variants: Object.freeze(["bluhá", "bduhá"]),
    normalized: "bluhá",
    relation: "class-ii-y-stem-1sg-surface-variant",
    certainty: "underdetermined",
    witnesses: Object.freeze([
      Object.freeze({
        label: "LDL 121 Intensive Lakota/Dakota for Beginners",
        locator: "Class II y-stem singular verb examples",
      }),
      Object.freeze({
        label: "Black Elk letters local research note",
        locator: "dev/content/researching/notes/lakota-corpus.md/2026-06-26-black-elk-letters.md:53",
      }),
    ]),
  }),
  Object.freeze({
    id: "class-ii-yuha-2sg-surface",
    variants: Object.freeze(["luhá", "duhá"]),
    normalized: "luhá",
    relation: "class-ii-y-stem-2sg-surface-variant",
    certainty: "underdetermined",
    witnesses: Object.freeze([
      Object.freeze({
        label: "LDL 121 Intensive Lakota/Dakota for Beginners",
        locator: "Class II y-stem singular verb examples",
      }),
      Object.freeze({
        label: "Lakota corpus local research note",
        locator: "dev/content/researching/notes/lakota-corpus.md/2026-06-26-lakota-corpus.md:265",
      }),
    ]),
  }),
]);

const orthographyRuleByVariant = new Map(
  orthographyRules.flatMap((rule) => rule.variants.map((variant) => [variant, rule])),
);

export const lakotaOrthographyRules = orthographyRules;

function wordsOf(input) {
  return input.match(/[\p{L}\p{M}'’]+/gu) ?? [];
}

function orthographyInputText(input) {
  if (typeof input === "string") return input;
  if (typeof input !== "object" || input === null) return "";
  const record = input;
  return typeof record["text"] === "string" ? record["text"] : "";
}

export function normalizeLakotaOrthography(input) {
  const tokens = wordsOf(input).map((text, index) => {
    const rule = orthographyRuleByVariant.get(text.toLowerCase());
    const normalized = rule?.normalized ?? text;
    return Object.freeze({
      text,
      normalized,
      index,
      changed: normalized !== text,
      preservedVariant: text,
      rule: rule?.id ?? null,
      relation: rule?.relation ?? null,
      certainty: rule?.certainty ?? "witnessed",
      witnesses: rule?.witnesses ?? Object.freeze([]),
    });
  });

  return Object.freeze({
    kind: "communicating-in-lakota.orthography-normalization",
    input,
    normalizedText: tokens.map((token) => token.normalized).join(" "),
    tokens: Object.freeze(tokens),
  });
}

export const normalizeLakotaOrthographyAction = operation({
  verb: "normalize-lakota-orthography",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Normalize finite witnessed Lakota orthographic variants without erasing originals.",
  description: "Domain: JSON string or object with text. Codomain: token-level normalized forms that preserve each observed variant and cite the finite evidence for the normalization.",
  run: (input) =>
    jsonResource(normalizeLakotaOrthography(orthographyInputText(input)), "Lakota orthography normalization"),
});
