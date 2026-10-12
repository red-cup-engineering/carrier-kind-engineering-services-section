/**
 * Screening a name against the consolidated screening list. The matching is the text-comparison
 * service's name matcher (names folded, company forms ignored, words weighted by rarity across the
 * list); what is the list's own is how a match is read: an exact match is `listed`, a near one
 * `possible`, and an exact match on OFAC's SDN list `blocked`, since US persons may not deal with
 * that party at all. Every match carries the list it comes from, since each list restricts a
 * different thing. Pure: the caller supplies the entries.
 * @packageDocumentation
 */
import { matchName, nameIndex } from "@red-cup-engineering/text-comparison-service/match-names";

/** OFAC lists whose entries US persons may not deal with at all (the non-SDN lists restrict narrower things). */
const BLOCKING_SOURCES = [/Specially Designated Nationals/i];

const countriesOf = (entry) => [...new Set((entry.addresses ?? []).map((a) => a.country).filter(Boolean))];

/** The list indexed for screening: every entry's name and alternate names. */
export const screeningIndex = (entries) => nameIndex(entries, { namesOf: (entry) => [entry.name, ...(entry.alt_names ?? [])] });

const indexes = new WeakMap();
const indexOf = (list) => {
  if (!Array.isArray(list)) return list;
  if (!indexes.has(list)) indexes.set(list, screeningIndex(list));
  return indexes.get(list);
};

/**
 * Screen one name. `country` (ISO-2), when given, keeps possible matches to entries with an
 * address there or none; listed matches are kept wherever they are.
 * @param {object[]|ReturnType<typeof screeningIndex>} list consolidated screening list entries, or their index
 * @param {string} name the party's name
 * @returns {{name: string, reading: "clear"|"possible"|"listed"|"blocked", matches: object[]}}
 */
export function screenName(list, name, { country, threshold } = {}) {
  const matches = [];
  for (const match of matchName(indexOf(list), name, { threshold })) {
    const entry = match.record;
    const kind = match.kind === "exact" ? "listed" : "possible";
    const countries = countriesOf(entry);
    if (kind === "possible" && country && countries.length > 0 && !countries.includes(country)) continue;
    matches.push(Object.freeze({
      kind, matched: match.matched, score: match.score, name: entry.name,
      source: entry.source ?? null, programs: Object.freeze([...(entry.programs ?? [])]), type: entry.type ?? null,
      countries: Object.freeze(countries), id: entry.id ?? entry.entity_number ?? null,
      blocking: BLOCKING_SOURCES.some((pattern) => pattern.test(entry.source ?? "")),
    }));
  }
  const listed = matches.filter((m) => m.kind === "listed");
  const reading = listed.some((m) => m.blocking) ? "blocked" : listed.length > 0 ? "listed" : matches.length > 0 ? "possible" : "clear";
  return Object.freeze({ name, reading, matches: Object.freeze(matches) });
}
