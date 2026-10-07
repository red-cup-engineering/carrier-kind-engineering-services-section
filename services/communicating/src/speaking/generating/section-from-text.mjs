// section-from-text.ts — bridge language-parsing parse output into a language-generation section.

import { rawBundle } from "@lenticule-science/english-language-algebra";
import { load } from "../listening/algebra/compile.mjs";

import { lemma, conjugate } from "../listening/algebra/morphology.mjs";
import { articulate } from "../listening/parsing/articulating.mjs";
import { parse } from "../listening/parsing/parsing.mjs";
import { roles } from "../listening/understanding/semantics/roles.mjs";
import { polarity } from "../listening/understanding/semantics/polarity.mjs";
import { temporal } from "../listening/understanding/semantics/tense.mjs";
import { witnessedReading } from "@red-cup-engineering/signchain/bilattice";
import { readingFamilies } from "@red-cup-engineering/computer-data-engineering-services-section/four";
const english = load(rawBundle);

/** A clause's evidence from its polarity reading, witnessed by the text it was read from. */
const evidenceFor = (value, text) => witnessedReading(readingFamilies.knowledge.includes(value) ? value : "absurd", text);

function firstSentence(text, bundle) {
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  return { base, sentence };
}

function predicateBase(
  word,
  tags,
  tense,
  bundle,
) {
  const [candidate = word.toLowerCase()] = lemma(word, tags, bundle);
  if (!tags.includes("verb") || tense !== "past") return candidate;

  const lower = word.toLowerCase();
  const regularCandidates = lower.endsWith("ed")
    ? [lower.slice(0, -1), lower.slice(0, -2)].filter((item) => item.length > 0)
    : [];
  return regularCandidates.find((item) => conjugate(item, { tense: "past" }, bundle) === lower)
    ?? candidate;
}

/** Parse prose with language-parsing and lift its role/polarity/tense analysis into a settled section. */
export function sectionFromText(text, bundle = english) {
  const { base, sentence } = firstSentence(text, bundle);
  const parsed = parse(sentence, base, bundle);
  const roleFrames = roles(parsed);
  const polarityFrames = polarity(parsed);
  const temporalFrames = temporal(parsed);

  const roleByVerb = new Map(roleFrames.map((r) => [r.verb, r]));
  const tenseByVerb = new Map(temporalFrames.map((t) => [t.verb, t]));

  const cells = polarityFrames.map((pol, index) => {
    const role = roleByVerb.get(pol.verb) ?? roleFrames[index];
    const tense = tenseByVerb.get(pol.verb)?.tense;
    const verbWord = parsed.words.find((w) => w.text === pol.verb);
    const clauseTense = tense === "future" ? "future" : tense ?? "present";
    const predicate = predicateBase(pol.verb, verbWord?.tags ?? ["verb"], clauseTense, bundle);
    const obliques = [
      ...(role?.instrument ? [{ prep: "with", object: role.instrument }] : []),
      ...(role?.recipient ? [{ prep: "to", object: role.recipient }] : []),
      ...(role?.location ? [{ prep: "in", object: role.location }] : []),
    ];
    return {
      predicate,
      object: role?.patient ?? null,
      evidence: evidenceFor(pol.asserted, text),
      tense: clauseTense,
      ...(obliques.length > 0 ? { obliques } : {}),
    };
  });

  return {
    subject: roleFrames[0]?.agent ?? null,
    cells,
    source: { text, base, sentence, parsed },
  };
}

export default sectionFromText;
