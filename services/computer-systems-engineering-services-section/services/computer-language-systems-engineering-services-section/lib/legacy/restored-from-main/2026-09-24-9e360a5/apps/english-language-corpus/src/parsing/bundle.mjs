/**
 * english/bundle — a compiled lexicon + role-strategy profile for one language.
 *
 * A `RawBundle` is hand-authored data: closed-class word lists, morphological
 * suffix/verb-form rules, irregular forms, and the role strategies dependency
 * rules use to find a relation's filler (by linear position, since English marks
 * grammatical role by word order, not case). `compileBundle` resolves that data
 * into the lookup functions the rest of `parsing` calls per word.
 */

/** How a dependency rule locates the filler of a relation: nearest nominal by
 *  linear position (English's strategy — no case marking), or a fixed particle
 *  (e.g. "that" marking a ccomp). */

/** Compiled language bundle: raw data resolved into fast lookup functions. */

/** Compile a raw language bundle into efficient lookup functions. */
export function compileBundle(raw) {
  const { lexicon, morphology, reference, segmentation } = raw;

  const detSet = new Set(lexicon.determiners.map((w) => w.toLowerCase()));
  const prepSet = new Set(lexicon.prepositions.map((w) => w.toLowerCase()));
  const pronSet = new Set(lexicon.pronouns.map((w) => w.toLowerCase()));
  const conjSet = new Set(lexicon.conjunctions.map((w) => w.toLowerCase()));
  const auxSet = new Set(lexicon.auxiliaries.map((w) => w.toLowerCase()));
  const negSet = new Set(lexicon.negators.map((w) => w.toLowerCase()));
  const copSet = new Set(lexicon.copula.map((w) => w.toLowerCase()));

  const suffixMatchers = morphology.suffixRules.map((r) => ({ re: new RegExp(r.pattern, "i"), tag: r.tag }));
  const verbFormMatchers = morphology.verbFormRules.map((r) => ({ re: new RegExp(r.pattern, "i"), form: r.tag }));

  const pronRef = new Map(
    Object.entries(reference.pronouns).map(([w, f]) => [w.toLowerCase(), f]),
  );

  const irregularPlurals = new Map(Object.entries(morphology.irregularPlurals));
  const numberSuffixRe = morphology.numberSuffixPattern === "" ? null : new RegExp(morphology.numberSuffixPattern, "i");
  const numberWordSet = new Set(morphology.numberWords.map((w) => w.toLowerCase()));

  // Irregular verb forms (be/was/gone/saw/...) carry no recognizable suffix, so
  // without this lookup they would default to "noun" — every irregular past-tense
  // narration ("I saw", "we went") would silently lose its verb.
  const irregularVerbFormSet = new Set(
    Object.entries(morphology.irregularVerbs).flatMap(([base, forms]) => [base, ...Object.values(forms)]),
  );
  // The base lemma is the "base" verb form (agrees with plural subjects); each
  // named inflection ("3sg"/"past"/"nonfin") already carries its own form name.
  const irregularVerbFormToForm = new Map();
  for (const [base, forms] of Object.entries(morphology.irregularVerbs)) {
    irregularVerbFormToForm.set(base, "base");
    for (const [form, surface] of Object.entries(forms)) irregularVerbFormToForm.set(surface, form);
  }

  const irregularAdjectiveSet = new Set(morphology.irregularAdjectives.map((w) => w.toLowerCase()));

  const abbrevSet = new Set(segmentation.abbreviations.map((a) => a.toLowerCase()));
  const sentTermRe = new RegExp(segmentation.sentenceTerminatorPattern, "gu");

  // Closed classes are not mutually exclusive: "what"/"which"/"whose" are
  // both determiner ("what book") and pronoun ("what's open"); "that" is both
  // determiner and conjunction; "for" is both preposition and conjunction.
  // Every class composes, the same way "no" already composed as neg+det —
  // this was this function's own documented contract ("a negator composes");
  // the prior first-match chain only ever honored it for `neg`.
  function closedClassTags(lower) {
    const tags = [];
    if (detSet.has(lower)) tags.push("det");
    if (prepSet.has(lower)) tags.push("prep");
    if (pronSet.has(lower)) tags.push("pron");
    if (conjSet.has(lower)) tags.push("conj");
    if (auxSet.has(lower)) tags.push("aux");
    if (copSet.has(lower)) tags.push("cop");
    if (negSet.has(lower)) tags.unshift("neg");
    return Object.freeze(tags);
  }

  function morphologyTags(word) {
    const tags = [];
    const lower = word.toLowerCase();
    if (/^\d[\d,.]*$/.test(word) || numberWordSet.has(lower)) tags.push("num");
    if (irregularVerbFormSet.has(lower)) tags.push("verb");
    if (irregularAdjectiveSet.has(lower)) tags.push("adj");
    for (const { re, tag } of suffixMatchers) {
      if (re.test(word) && !tags.includes(tag)) tags.push(tag);
    }
    if (tags.length === 0) tags.push("noun");
    return tags;
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
    if (irregularPlurals.has(lower)) return ["pl"];
    if (numberSuffixRe?.test(lower)) return ["pl"];
    return ["sg"];
  }

  function verbForm(word, tags) {
    const lower = word.toLowerCase();
    const irregularForm = irregularVerbFormToForm.get(lower);
    if (irregularForm !== undefined) return irregularForm;
    for (const { re, form } of verbFormMatchers) if (re.test(word)) return form;
    // A verb-tagged word with no other recognized inflection is the bare
    // present/base form (walk, run, see) unless it carries the regular
    // third-person-singular "-s" ending (walks, runs).
    if (tags.includes("verb")) return /.{2,}s$/i.test(word) ? "3sg" : "base";
    return null;
  }

  const pronounFeatures = (lower) => pronRef.get(lower) ?? null;
  const isAbbreviation = (word) => abbrevSet.has(word.toLowerCase());

  return Object.freeze({
    raw,
    roleStrategies: raw.roleStrategies,
    attachment: raw.attachment,
    closedClassTags,
    morphologyTags,
    numberFeatures,
    verbForm,
    pronounFeatures,
    isAbbreviation,
    sentenceTerminators: sentTermRe,
  });
}
