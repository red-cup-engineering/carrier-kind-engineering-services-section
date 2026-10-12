import { mimeTypeEssence } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/mime-type";
import { parseAccept, parseAcceptEncoding, parseAcceptLanguage } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/preferences";

/** Specific ranges establish a representation's preference before quality
 * ranks offered representations. q=0 therefore overrides a broader range. */
function selectRepresentation(entries, offered, matches, qualityTie = false) {
  let best = null;
  let bestQ = 0;
  let bestSpecificity = -1;
  for (const value of offered) {
    let preference = null;
    for (const entry of entries) {
      if (!matches(entry, value)) continue;
      if (!preference || entry.specificity > preference.specificity ||
          (entry.specificity === preference.specificity &&
           (qualityTie && entry.q !== preference.q ? entry.q > preference.q : entry.order < preference.order))) preference = entry;
    }
    if (preference && preference.q > 0 && (preference.q > bestQ ||
        (preference.q === bestQ && preference.specificity > bestSpecificity))) {
      best = value;
      bestQ = preference.q;
      bestSpecificity = preference.specificity;
    }
  }
  return best;
}

export function negotiateType(header, offered) {
  const representations = offered.filter(value => mimeTypeEssence(value) !== null);
  if (!header) return representations[0] ?? null;
  return selectRepresentation(parseAccept(header), representations, (entry, candidate) => {
    const [type, subtype] = mimeTypeEssence(candidate).split("/");
    return entry.type === "*" || (entry.type === type && (entry.subtype === "*" || entry.subtype === subtype));
  }, true);
}

export function negotiateLanguage(header, offered) {
  if (!header) return offered[0] ?? null;
  return selectRepresentation(parseAcceptLanguage(header), offered, (entry, candidate) => {
    const tag = candidate.toLowerCase();
    return entry.range === "*" || tag === entry.range || tag.startsWith(`${entry.range}-`);
  });
}

export function negotiateEncoding(header, offered) {
  if (header === undefined) return offered.includes("identity") ? "identity" : (offered[0] ?? null);
  const preferences = parseAcceptEncoding(header);
  let best = null;
  let quality = 0;
  for (const coding of offered) {
    const q = preferences.get(coding) ?? preferences.get("*") ?? (coding === "identity" ? Number.EPSILON : 0);
    if (q > quality) { best = coding; quality = q; }
  }
  return best;
}
