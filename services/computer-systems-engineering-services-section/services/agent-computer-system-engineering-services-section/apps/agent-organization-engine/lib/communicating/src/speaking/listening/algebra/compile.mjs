

import { grammarProfileFromLegacyBundle } from "./profile.mjs";
import { languageRegisterFiber } from "./register-fiber.mjs";

/** Compile a raw language bundle into efficient lookup functions. */
export function load(raw) {
  const { lexicon, morphology, reference, segmentation } = raw;

  const detSet = new Set(lexicon.determiners.map((w) => w.toLowerCase()));
  const prepSet = new Set(lexicon.prepositions.map((w) => w.toLowerCase()));
  const pronSet = new Set(lexicon.pronouns.map((w) => w.toLowerCase()));
  const conjSet = new Set(lexicon.conjunctions.map((w) => w.toLowerCase()));
  const auxSet = new Set(lexicon.auxiliaries.map((w) => w.toLowerCase()));
  const copSet = new Set(lexicon.copula.map((w) => w.toLowerCase()));
  const negSet = new Set((lexicon.negators ?? []).map((w) => w.toLowerCase()));
  const irregularAdjectiveSet = new Set((morphology.irregularAdjectives ?? []).map((w) => w.toLowerCase()));

  // Case-preserved mirrors of the same lexicon entries, kept in their
  // authored case, so an all-caps acronym can be matched verbatim before any
  // reading is attempted through the lowercase path (see closedClassTagsCased).
  const detSetCased = new Set(lexicon.determiners);
  const prepSetCased = new Set(lexicon.prepositions);
  const pronSetCased = new Set(lexicon.pronouns);
  const conjSetCased = new Set(lexicon.conjunctions);
  const auxSetCased = new Set(lexicon.auxiliaries);
  const copSetCased = new Set(lexicon.copula);

  const suffixMatchers = morphology.suffixRules.map((r) => ({
    re: new RegExp(r.pattern, "i"),
    tag: r.tag,
  }));
  const featureMatchers = (morphology.featureRules ?? []).map((r) => ({
    re: new RegExp(r.pattern, "i"),
    feature: r.tag,
  }));
  const rootPatternMatchers = (morphology.rootPatternRules ?? []).map((r) => ({
    re: new RegExp(r.pattern, "iu"),
    tag: r.tag,
    features: r.features ?? [],
    root: r.root,
    template: r.template,
  }));
  const verbFormMatchers = morphology.verbFormRules.map((r) => ({
    re: new RegExp(r.pattern, "i"),
    form: r.tag,
  }));

  const pronRef = new Map(
    Object.entries(reference.pronouns).map(([w, f]) => [w.toLowerCase(), f]),
  );

  const irregularPlurals = new Map(Object.entries(morphology.irregularPlurals ?? {}));
  const irregularPluralForms = new Set(
    Object.values(morphology.irregularPlurals ?? {}).map((surface) => surface.toLowerCase()),
  );

  const irregularVerbBases = new Set(Object.keys(morphology.irregularVerbs ?? {}).map((w) => w.toLowerCase()));
  const irregularVerbForms = new Map();
  for (const [, forms] of Object.entries(morphology.irregularVerbs ?? {})) {
    for (const [slot, surface] of Object.entries(forms)) {
      irregularVerbForms.set(surface.toLowerCase(), slot);
    }
  }

  const verbStemSet = new Set((morphology.verbStems ?? []).map((w) => w.toLowerCase()));
  const numberSuffixRe = morphology.numberSuffixPattern === ""
    ? null
    : new RegExp(morphology.numberSuffixPattern, "i");
  const numberWordSet = new Set(morphology.numberWords.map((w) => w.toLowerCase()));

  // Abbreviation surface forms may be stored with or without their trailing period
  // ("Inc." or "Inc") — `isAbbreviation` below always looks up a period-stripped
  // word (the terminator regex match excludes the period it matched), so both
  // conventions resolve the same way.
  const abbrevSet = new Set(segmentation.abbreviations.map((a) => a.toLowerCase().replace(/\.$/, "")));

  const sentTermRe = new RegExp(segmentation.sentenceTerminatorPattern, "gu");

  // A negator composes with its class ("no" is neg+det); every other class is first-match.
  const withNegation = (lower, tags) => (negSet.has(lower) ? ["neg", ...tags] : tags);

  function closedClassTags(lower) {
    return withNegation(lower, classTags(lower));
  }

  function classTags(lower) {
    if (detSet.has(lower)) return ["det"];
    if (prepSet.has(lower)) return ["prep"];
    if (pronSet.has(lower)) return ["pron"];
    if (conjSet.has(lower)) return ["conj"];
    if (auxSet.has(lower)) return ["aux"];
    if (copSet.has(lower)) return ["cop"];
    return [];
  }

  function closedClassTagsCased(word) {
    return withNegation(word.toLowerCase(), classTagsCased(word));
  }

  function classTagsCased(word) {
    if (detSetCased.has(word)) return ["det"];
    if (prepSetCased.has(word)) return ["prep"];
    if (pronSetCased.has(word)) return ["pron"];
    if (conjSetCased.has(word)) return ["conj"];
    if (auxSetCased.has(word)) return ["aux"];
    if (copSetCased.has(word)) return ["cop"];
    return [];
  }

  function morphologyTags(word) {
    const tags = [];
    const lower = word.toLowerCase();
    if (/^\d[\d,.]*$/.test(word) || numberWordSet.has(lower)) {
      tags.push("num");
    }
    for (const { re, tag } of suffixMatchers) {
      if (re.test(word) && !tags.includes(tag)) tags.push(tag);
    }
    for (const { re, tag, root } of rootPatternMatchers) {
      if (!re.test(word)) continue;
      if (!tags.includes(tag)) tags.push(tag);
      if (root !== undefined && negSet.has(root.toLowerCase()) && !tags.includes("neg")) tags.unshift("neg");
    }
    if (irregularAdjectiveSet.has(lower) && !tags.includes("adj")) tags.push("adj");

    if ((irregularVerbBases.has(lower) || irregularVerbForms.has(lower) || verbStemSet.has(lower)) && !tags.includes("verb")) {
      tags.push("verb");
    }

    for (const { re, form } of verbFormMatchers) {
      if ((form === "3sg" || form === "base") && re.test(word) && !tags.includes("verb")) {
        if (form === "3sg" && numberSuffixRe?.test(word)) {
          // Suffix-only 3sg evidence collides with the noun-plural suffix ("cats"
          // reads equally as 3sg-verb and plural-noun): emit both tags, never argmax
          // — charging.mts settles the reading from arc evidence.
          tags.push("verb");
          if (!tags.includes("noun")) tags.push("noun");
        } else {
          tags.push("verb");
        }
      }
    }
    if (tags.length === 0) tags.push("noun");
    return tags;
  }

  function featureTags(word, _tags) {
    const features = [];
    for (const { re, feature } of featureMatchers) {
      if (re.test(word) && !features.includes(feature)) features.push(feature);
    }
    for (const { re, features: matchedFeatures, root, template } of rootPatternMatchers) {
      if (!re.test(word)) continue;
      for (const feature of matchedFeatures) if (!features.includes(feature)) features.push(feature);
      if (root !== undefined) {
        const rootFeature = `root:${root}`;
        if (!features.includes(rootFeature)) features.push(rootFeature);
      }
      if (template !== undefined) {
        const templateFeature = `template:${template}`;
        if (!features.includes(templateFeature)) features.push(templateFeature);
      }
    }
    return features;
  }

  function numberFeatures(word, tags) {
    const lower = word.toLowerCase();

    const pf = pronRef.get(lower);
    if (pf) {
      if (pf.number === null) return [];
      if (pf.number === "both") return ["sg", "pl"];
      return [pf.number];
    }
    if (!tags.includes("noun")) return [];
    // irregularPlurals is keyed by the SINGULAR lemma ("mouse" -> "mice"); a word
    // is plural only when it IS one of the irregular plural surface forms, not
    // when it's a key of the map (that mistagged "mouse" itself as plural).
    if (irregularPluralForms.has(lower)) return ["pl"];

    if (numberSuffixRe?.test(lower)) return ["pl"];

    return ["sg"];
  }

  function verbForm(word, _tags) {
    const lower = word.toLowerCase();

    const irregularSlot = irregularVerbForms.get(lower);
    if (irregularSlot !== undefined) return irregularSlot;
    if (irregularVerbBases.has(lower) || verbStemSet.has(lower)) return "base";
    for (const { re, form } of verbFormMatchers) {
      if (re.test(word)) return form;
    }
    return null;
  }

  return {
    raw,
    meta: raw.meta,
    wordOrder: raw.wordOrder,
    ...(raw.roleBy !== undefined ? { roleBy: raw.roleBy } : {}),
    grammar: raw.grammar ?? grammarProfileFromLegacyBundle(raw),
    registerFiber: languageRegisterFiber(raw.meta.code, raw.registerFiber),
    attachment: raw.attachment,
    closedClassTags,
    closedClassTagsCased,
    morphologyTags,
    featureTags,
    numberFeatures,
    verbForm,
    isCopula: (lower) => copSet.has(lower),
    isPronoun: (lower) => pronSet.has(lower),
    pronounFeatures: (lower) => pronRef.get(lower) ?? null,
    isAbbreviation: (word) => abbrevSet.has(word.toLowerCase()),
    sentenceTerminators: sentTermRe,
    ...(raw.segment !== undefined ? { segment: raw.segment } : {}),
    ...(raw.reportingVerbs !== undefined ? { reportingVerbs: raw.reportingVerbs } : {}),
    ...(raw.attributionMarkers !== undefined ? { attributionMarkers: raw.attributionMarkers } : {}),
    ...(raw.hedges !== undefined ? { hedges: raw.hedges } : {}),
  };
}
