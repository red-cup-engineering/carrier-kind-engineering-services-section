import type { Coding } from "@red-cup-engineering/code-http-content-coding-service";
export type { Coding } from "@red-cup-engineering/code-http-content-coding-service";

/** RFC 9110 §§12.4.2, 12.5.3. Malformed weights exclude their coding;
 * repeated codings retain the last preference, as in the original API. */
export function parseAcceptEncoding(header: string): Map<string, number> {
  const prefs = new Map<string, number>();
  for (const part of header.split(",")) {
    const [coding = "", ...params] = part.trim().split(";");
    const token = coding.trim().toLowerCase();
    if (!/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(token)) continue;
    const weight = params.length === 1
      ? /^[ \t]*q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)[ \t]*$/i.exec(params[0]!)
      : null;
    prefs.set(token, params.length === 0 ? 1 : weight ? Number(weight[1]) : 0);
  }
  return prefs;
}

/** Select an acceptable offered coding; ties retain the caller's order.
 * With no header, prefer identity if offered. An implicit identity is a
 * fallback unless a wildcard supplies its weight; explicit identity wins
 * over the wildcard, including its exclusion. */
export function negotiateEncoding(
  acceptEncodingHeader: string | undefined,
  offered: readonly Coding[],
): Coding | null {
  if (acceptEncodingHeader === undefined) return offered.includes("identity") ? "identity" : (offered[0] ?? null);
  const prefs = parseAcceptEncoding(acceptEncodingHeader);
  let best: Coding | null = null;
  let bestQ = 0;
  for (const coding of offered) {
    const q = prefs.get(coding) ?? prefs.get("*") ?? (coding === "identity" ? Number.EPSILON : 0);
    if (q > bestQ) { best = coding; bestQ = q; }
  }
  return best;
}
