import { negotiateLanguage } from "@red-cup-engineering/negotiate-http-language-service";
export { negotiateLanguage };
import { parseAcceptLanguage } from "@red-cup-engineering/negotiate-http-language-service";
export { parseAcceptLanguage };
// accept-language.mts — the Accept-Language representation and the
// language choice (RFC 4647 basic filtering).

/** Ranked language-range preference decoded from an HTTP Accept-Language header. */
export type AcceptLanguageEntry = { range: string; q: number; specificity: number; order: number };

function languageSpecificity(range: string): number {
  if (range === "*") return 0;
  return range.split("-").filter(Boolean).length;
}



function matchesLanguage(entry: AcceptLanguageEntry, offered: string): boolean {
  if (entry.range === "*") return true;
  const tag = offered.toLowerCase();
  return tag === entry.range || tag.startsWith(`${entry.range}-`);
}

function languagePreference(entries: readonly AcceptLanguageEntry[], offered: string): AcceptLanguageEntry | null {
  const matches = entries
    .filter((entry) => matchesLanguage(entry, offered))
    .sort((a, b) => b.specificity - a.specificity || a.order - b.order);
  return matches[0] ?? null;
}


