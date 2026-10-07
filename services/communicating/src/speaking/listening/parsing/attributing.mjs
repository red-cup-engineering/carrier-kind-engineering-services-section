

/** Surface forms not reachable by regular suffixation from their lemma. */
const IRREGULAR_REPORTING_FORMS = {
  say: ["said"],
  tell: ["told"],
  write: ["wrote", "written"],
};

/** Generate the regular (and known-irregular) inflected surface forms of a
 * reporting-verb lemma, so a sentence's cue word can be matched by its
 * inflected form ("says", "said") without a full lemmatizer. */
function surfaceFormsOf(lemma) {
  const lower = lemma.toLowerCase();
  const forms = new Set([lower, `${lower}s`]);
  const beforeY = lower.length > 1 ? lower[lower.length - 2] : undefined;
  if (lower.endsWith("e")) {
    forms.add(`${lower}d`);
    forms.add(`${lower.slice(0, -1)}ing`);
  } else if (lower.endsWith("y") && beforeY !== undefined && !"aeiou".includes(beforeY)) {
    forms.add(`${lower.slice(0, -1)}ied`);
    forms.add(`${lower.slice(0, -1)}ies`);
    forms.add(`${lower}ing`);
  } else {
    forms.add(`${lower}ed`);
    forms.add(`${lower}ing`);
  }
  for (const irregular of IRREGULAR_REPORTING_FORMS[lower] ?? []) forms.add(irregular);
  return Object.freeze([...forms]);
}

function isInsideAnyQuote(span, quotes) {
  if (span.start === null || span.end === null) return false;
  const start = span.start;
  const end = span.end;
  return quotes.some((q) => q.start !== null && q.end !== null && start >= q.start && end <= q.end);
}

function spanOfWord(w) {
  return { text: w.span.text, start: w.span.start, end: w.span.end };
}

function spanOf(source) {
  return { text: source.text, start: source.start, end: source.end };
}

/** Extend a single nsubj dependent word leftward through a contiguous run of
 * non-clause-boundary words (skipping determiners, verbs, and anything
 * inside a quote) to recover a multi-word speaker phrase such as a title —
 * "RIPE Managing Director Hans Petter Holen" from the nsubj dependent "Holen". */
function extendSpeakerSpan(
  words,
  subjectIdx,
  quotes,
  fullText,
) {
  const subject = words[subjectIdx];
  const BOUNDARY_TAGS = new Set(["verb", "aux", "cop", "conj", "prep", "det"]);
  let leftIdx = subjectIdx;
  while (leftIdx > 0) {
    const prev = words[leftIdx - 1];
    const cur = words[leftIdx];
    if (prev === undefined || cur === undefined) break;
    if (isInsideAnyQuote(prev.span, quotes)) break;
    if (prev.tags.some((t) => BOUNDARY_TAGS.has(t))) break;
    if (prev.span.start === null || prev.span.end === null || cur.span.start === null) break;
    const gap = fullText.slice(prev.span.end, cur.span.start);
    if (gap.includes(",") || gap.includes('"') || gap.includes("“") || gap.includes("”")) break;
    leftIdx -= 1;
  }
  const first = words[leftIdx];
  const start = first?.span.start ?? subject?.span.start ?? null;
  const end = subject?.span.end ?? null;
  const text = start !== null && end !== null ? fullText.slice(start, end) : (subject?.span.text ?? "");
  return { text, start, end };
}

/** Content span for a reporting-verb attribution: an adjacent quote when one
 * flanks the reporting clause (`"..." X said` or `X said, "..."`), else the
 * words trailing the cue to the end of the sentence's word span. */
function reportingContentSpan(
  words,
  verbIdx,
  quotes,
  speakerSpan,
  fullText,
) {
  const verb = words[verbIdx];
  if (verb === undefined || verb.span.end === null) return null;

  const preceding = quotes
    .filter((q) => q.end !== null && speakerSpan.start !== null && q.end <= speakerSpan.start)
    .sort((a, b) => (b.end ?? 0) - (a.end ?? 0))[0];
  if (preceding !== undefined) return spanOf(preceding);

  const verbEnd = verb.span.end;
  const following = quotes
    .filter((q) => q.start !== null && q.start >= verbEnd)
    .sort((a, b) => (a.start ?? 0) - (b.start ?? 0))[0];
  if (following !== undefined) return spanOf(following);

  const tail = words.slice(verbIdx + 1);
  const first = tail[0];
  const last = tail[tail.length - 1];
  if (first === undefined || last === undefined || first.span.start === null || last.span.end === null) return null;
  return { text: fullText.slice(first.span.start, last.span.end), start: first.span.start, end: last.span.end };
}

function reportingVerbAttributions(
  words,
  arcs,
  quotes,
  fullText,
  reportingLemmas,
) {
  const formMap = new Map();
  for (const lemma of reportingLemmas) {
    for (const form of surfaceFormsOf(lemma)) formMap.set(form, lemma.toLowerCase());
  }

  const results = [];
  for (let idx = 0; idx < words.length; idx += 1) {
    const w = words[idx];
    if (w === undefined) continue;
    if (isInsideAnyQuote(w.span, quotes)) continue;
    if (!formMap.has(w.span.text.toLowerCase())) continue;

    const nsubjArc = arcs.find((a) => a.head === w.id && a.rel === "nsubj" && a.value !== "absurd");
    if (nsubjArc === undefined) continue;
    const subjectIdx = words.findIndex((sw) => sw.id === nsubjArc.dependent);
    if (subjectIdx === -1) continue;

    const speakerSpan = extendSpeakerSpan(words, subjectIdx, quotes, fullText);
    const contentSpan = reportingContentSpan(words, idx, quotes, speakerSpan, fullText);
    if (contentSpan === null) continue;

    results.push(Object.freeze({
      speaker: speakerSpan,
      cue: spanOfWord(w),
      content: contentSpan,
      kind: "reporting-verb",
    }));
  }
  return results;
}

function markerAttributions(
  words,
  fullText,
  markers,
) {
  if (words.length === 0) return [];
  const first = words[0];
  const last = words[words.length - 1];
  if (first === undefined || last === undefined || first.span.start === null || last.span.end === null) return [];
  const sentenceStart = first.span.start;
  const sentenceEnd = last.span.end;
  const sentenceText = fullText.slice(sentenceStart, sentenceEnd);
  const sentenceTextLower = sentenceText.toLowerCase();

  for (const marker of markers) {
    const markerLower = marker.toLowerCase();
    if (!sentenceTextLower.startsWith(markerLower)) continue;

    const markerEnd = sentenceStart + marker.length;
    const rest = fullText.slice(markerEnd, sentenceEnd);
    const commaIdx = rest.indexOf(",");
    if (commaIdx === -1) continue;

    const speakerStart0 = markerEnd;
    const speakerEnd0 = markerEnd + commaIdx;
    const speakerRaw = fullText.slice(speakerStart0, speakerEnd0);
    const speakerText = speakerRaw.trim();
    if (speakerText.length === 0) continue;
    const speakerLead = speakerRaw.length - speakerRaw.trimStart().length;
    const speakerStart = speakerStart0 + speakerLead;
    const speakerEnd = speakerStart + speakerText.length;

    const contentRaw = fullText.slice(speakerEnd0 + 1, sentenceEnd);
    const contentText = contentRaw.trim();
    if (contentText.length === 0) continue;
    const contentLead = contentRaw.length - contentRaw.trimStart().length;
    const contentStart = speakerEnd0 + 1 + contentLead;
    const contentEnd = contentStart + contentText.length;

    return [Object.freeze({
      speaker: Object.freeze({ text: speakerText, start: speakerStart, end: speakerEnd }),
      cue: Object.freeze({ text: fullText.slice(sentenceStart, markerEnd), start: sentenceStart, end: markerEnd }),
      content: Object.freeze({ text: contentText, start: contentStart, end: contentEnd }),
      kind: "marker",
    })];
  }
  return [];
}

/** Read attributions (speaker/cue/content) for one sentence, from the
 * bundle's optional `reportingVerbs` and `attributionMarkers` hooks. Empty
 * when the bundle carries neither hook. */
export function attributionsFromWords(
  words,
  arcs,
  quotes,
  fullText,
  bundle,
) {
  const reportingLemmas = bundle.reportingVerbs ?? [];
  const markers = bundle.attributionMarkers ?? [];
  if (reportingLemmas.length === 0 && markers.length === 0) return Object.freeze([]);

  const results = [];
  if (reportingLemmas.length > 0) {
    results.push(...reportingVerbAttributions(words, arcs, quotes, fullText, reportingLemmas));
  }
  if (markers.length > 0) {
    results.push(...markerAttributions(words, fullText, markers));
  }
  return Object.freeze(results);
}
