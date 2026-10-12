import { negotiateType } from "@red-cup-engineering/negotiate-http-content-type-service";
export { negotiateType };
import { parseAccept } from "@red-cup-engineering/negotiate-http-content-type-service";
export { parseAccept };
// accept.mts — the Accept header representation and the media-type choice.
//
// parseAccept decodes the header text into ranked entries; negotiateType
// chooses among offered media types. Negotiation is codec selection: the
// chosen representation determines which codec a traversal uses.

/** Ranked media-range preference decoded from an HTTP Accept header. */
export type AcceptEntry = { type: string; subtype: string; q: number; specificity: number; order: number };

function mediaTypeParts(value: string): [string, string] {
  const [mediaType = "*/*"] = value.split(";", 1);
  const [type = "*", subtype = "*"] = mediaType.trim().toLowerCase().split("/");
  return [type, subtype];
}



function acceptsType(entry: AcceptEntry, candidate: string): boolean {
  const [t, s] = mediaTypeParts(candidate);
  if (entry.type === "*") return true;
  if (entry.type !== t) return false;
  return entry.subtype === "*" || entry.subtype === s;
}

function mediaPreference(entries: readonly AcceptEntry[], offered: string): AcceptEntry | null {
  const matches = entries
    .filter((entry) => acceptsType(entry, offered))
    .sort((a, b) => b.specificity - a.specificity || b.q - a.q || a.order - b.order);
  return matches[0] ?? null;
}


