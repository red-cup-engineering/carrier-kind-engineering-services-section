/**
 * The evidence a translation carries, line by line. Each check the house can
 * run without a person tells a witness for or against a segment's English:
 *
 *   glossary     a term the module glossary, the buyer's glossary or the
 *                series memory lists is in the source, and its rendering is
 *                (for) or is not (against) in the English; a form of address
 *                is also rendered by an English address (Mr. Gu, sir, ma'am);
 *   untranslated the English holds no Han characters (for) or does (against);
 *   fit          a subtitle cue's English lines are within the module's width
 *                and a reading speed of 20 characters a second (for), or not;
 *   rule         a module rule, stated as data, finds what it forbids
 *                (against), e.g. a bare title as a form of address.
 *
 * The evidence is SignChain's wire shape, { for, against } witness sets, and
 * its point is read in FOUR's extremal family: unknown (nothing told), held,
 * denied, or contested (told both ways, kept, not resolved). A response's
 * reading is the knowledge join of its segments', the union of their sides.
 * Nothing here hashes or reads a file, so it runs within an edge request.
 */
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { measureSubtitleCue } from "@red-cup-engineering/computer-text-content-engineering-services-section/subtitles";

const HAN = /\p{Script=Han}/gu;
const MAX_CHARACTERS_PER_SECOND = 20;

/** The English forms a gloss accepts: parentheticals dropped, split at ; and "or", placeholders skipped. */
export function renderingsOf(gloss) {
  return gloss.replace(/\([^()]*\)/gu, "").split(/;|,\s*or\s+|\s+or\s+/u).map((form) => form.trim().replace(/^["']|["']$/gu, "")).filter((form) => form !== "" && !/[<>]/u.test(form));
}

/** How English speech addresses someone by title: a courtesy title and a name, or sir, ma'am, madam. */
const ADDRESS = /\b(?:(?:Mr|Mrs|Ms|Miss|Dr)\.? [A-Z][\p{L}'-]+|[Ss]ir|[Mm]a'am|[Mm]adam)\b/u;

const contains = (english, form) => new RegExp(`(^|[^\\p{L}])${form.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}($|[^\\p{L}])`, "iu").test(english);

/**
 * The evidence for one segment's English. `terms` are { source, target }
 * entries (module glossary, buyer glossary, series memory, in that order of
 * precedence); `rules` are the module's { id, pattern, message }; `cue` is the
 * subtitle cue when the segment is one, with the wrapped lines it was given.
 */
export function segmentEvidence({ source, english, terms = [], rules = [], cue, lineWidth }) {
  const forSide = [];
  const againstSide = [];
  const seen = new Set();
  for (const term of terms) {
    if (seen.has(term.source) || !source.includes(term.source)) continue;
    seen.add(term.source);
    const forms = renderingsOf(term.target);
    if (forms.length === 0) continue;
    const rendered = forms.some((form) => contains(english, form)) || (term.kind === "form-of-address" && ADDRESS.test(english));
    (rendered ? forSide : againstSide).push(Object.freeze({ check: "glossary", source: term.source, expected: term.target }));
  }
  const residue = english.match(HAN);
  (residue === null ? forSide : againstSide).push(Object.freeze({ check: "untranslated", ...(residue === null ? {} : { characters: residue.join("") }) }));
  if (cue !== undefined) {
    const measure = measureSubtitleCue(cue);
    const fits = measure.longestLine <= lineWidth && measure.charactersPerSecond <= MAX_CHARACTERS_PER_SECOND;
    (fits ? forSide : againstSide).push(Object.freeze({ check: "fit", longestLine: measure.longestLine, lineWidth, charactersPerSecond: Math.round(measure.charactersPerSecond * 10) / 10, maxCharactersPerSecond: MAX_CHARACTERS_PER_SECOND }));
  }
  for (const rule of rules) {
    const found = english.match(new RegExp(rule.pattern, "u"));
    if (found !== null) againstSide.push(Object.freeze({ check: "rule", rule: rule.id, found: found[0], message: rule.message }));
  }
  return Object.freeze({
    for: Object.freeze(forSide),
    against: Object.freeze(againstSide),
    reading: readingOfSides("extremal", forSide.length > 0, againstSide.length > 0),
  });
}

/** The knowledge join of segments' evidence readings: what any segment told, for and against. */
export function joinedReading(evidences) {
  return readingOfSides("extremal", evidences.some((evidence) => evidence.for.length > 0), evidences.some((evidence) => evidence.against.length > 0));
}

/** How many segments read at each point, and each check's count of witnesses against. */
export function evidenceCensus(evidences) {
  const readings = { unknown: 0, held: 0, denied: 0, contested: 0 };
  const against = {};
  for (const evidence of evidences) {
    readings[evidence.reading] += 1;
    for (const witness of evidence.against) against[witness.check] = (against[witness.check] ?? 0) + 1;
  }
  return Object.freeze({ readings: Object.freeze(readings), against: Object.freeze(against) });
}
