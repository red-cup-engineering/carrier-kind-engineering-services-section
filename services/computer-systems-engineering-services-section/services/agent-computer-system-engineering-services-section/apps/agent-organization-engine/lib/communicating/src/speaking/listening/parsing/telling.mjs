


const TRUE = "potential";
const FALSE = "active";
const BOTTOM = "absurd";

/** A sentence's tellings from its words and arc proposals: entries (each a triple and the reading the
 *  construal tells of it), specialization edges, and the questions the settlement answers — for descend(). */
export function tell(words, arcs) {
  const entries = [];
  const specialization = [];
  const questions = [];

  for (const w of words) {
    // A word dual-tagged noun+verb (a suffix-only 3sg reading colliding with a
    // noun-plural reading, or any other morphological double-match) has its
    // is-noun/is-verb settled below from arc evidence, not asserted outright.
    const posAmbiguous = w.tags.includes("noun") && w.tags.includes("verb");
    for (const t of w.tags) {
      if (posAmbiguous && (t === "noun" || t === "verb")) continue;
      entries.push({ subject: w.id, predicate: `is-${t}`, reading: TRUE });
    }
    for (const f of w.feats) {
      entries.push({ subject: w.id, predicate: `is-${f}`, reading: TRUE });
    }
  }

  for (const w of words) {
    if (!w.tags.includes("noun") || !w.tags.includes("verb")) continue;

    // House thesis: morphology must not argmax. An nsubj/dobj arc landing ON
    // the word as dependent settles it noun; the word taking its own nsubj as
    // head settles it verb; absent either, the reading stays an open
    // question — a void in the cohomology reading (h1) — never a silent guess.
    const nounEvidence = arcs.some((a) => a.dependent === w.id && (a.rel === "nsubj" || a.rel === "dobj"));
    const verbEvidence = arcs.some((a) => a.head === w.id && a.rel === "nsubj");

    entries.push({
      subject: w.id,
      predicate: "is-noun",
      reading: nounEvidence ? TRUE : verbEvidence ? FALSE : BOTTOM,
    });
    entries.push({
      subject: w.id,
      predicate: "is-verb",
      reading: verbEvidence ? TRUE : nounEvidence ? FALSE : BOTTOM,
    });
    questions.push({ subject: w.id, predicate: "is-verb", label: "pos-ambiguity", on: w.span.text });
  }

  const prepHeads = new Map();

  for (const a of arcs) {
    entries.push({ subject: a.head, predicate: a.rel, object: a.dependent, reading: TRUE });

    if (a.rel === "prep") {
      const heads = prepHeads.get(a.dependent) ?? [];
      heads.push(a.head);
      prepHeads.set(a.dependent, heads);
    }
  }

  for (const [prepId, heads] of prepHeads) {
    if (heads.length < 2) continue;
    const hasVerb = arcs.some((a) => a.dependent === prepId && a.rel === "prep" && a.headSpan?.tier === "word");
    if (!hasVerb) continue;

    entries.push(
      { subject: prepId, predicate: "pp-high", reading: TRUE },
      { subject: prepId, predicate: "pp-low", reading: FALSE },
      { subject: prepId, predicate: "pp-attaches-high", reading: BOTTOM },
    );
    specialization.push(
      { source: "pp-high", target: "pp-attaches-high" },
      { source: "pp-low", target: "pp-attaches-high" },
    );
    questions.push({
      subject: prepId,
      predicate: "pp-attaches-high",
      label: "pp-attachment",
      on: prepId,
    });
  }

  for (const a of arcs) {
    if (a.rel !== "nsubj") continue;
    const verb = words.find((w) => w.id === a.head);
    const subj = words.find((w) => w.id === a.dependent);
    if (!verb || !subj) continue;

    const verbForms = verb.feats.filter((f) => f === "3sg" || f === "base");
    const subjNums = subj.feats.filter((f) => f === "sg" || f === "pl");

    for (const n of subjNums) {
      for (const vf of verbForms) {
        const agrees = (n === "sg" && vf === "3sg") || (n === "pl" && vf === "base");
        entries.push({
          subject: verb.id,
          predicate: `agree-${n}`,
          reading: agrees ? TRUE : FALSE,
        });
      }
    }

    if (verbForms.length > 0 && subjNums.length > 0) {
      entries.push({ subject: verb.id, predicate: "subject-verb-agrees", reading: BOTTOM });
      for (const n of subjNums) {
        specialization.push({ source: `agree-${n}`, target: "subject-verb-agrees" });
      }
      questions.push({
        subject: verb.id,
        predicate: "subject-verb-agrees",
        label: "agreement",
        on: verb.span.text,
      });
    }
  }

  const inArc = new Set();
  for (const a of arcs) {
    inArc.add(a.head);
    inArc.add(a.dependent);
  }
  for (const w of words) {
    entries.push({
      subject: w.id,
      predicate: "is-connected",
      reading: inArc.has(w.id) ? TRUE : BOTTOM,
    });
    questions.push({
      subject: w.id,
      predicate: "is-connected",
      label: "connectivity",
      on: w.span.text,
    });
  }

  return { entries, specialization, questions };
}
