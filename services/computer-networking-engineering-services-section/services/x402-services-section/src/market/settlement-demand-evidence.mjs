// Counterparty relationships require their own evidence. This classifier makes no
// payment, delivery, revenue or customer-demand claim; a journal object is not proof of money.

export const COUNTERPARTY_INDEPENDENCE = Object.freeze(["independent-external", "house-self", "linked-non-independent", "unknown"]);
const KNOWN = new Set(COUNTERPARTY_INDEPENDENCE);
const ASSERTED = new Set(COUNTERPARTY_INDEPENDENCE.filter((value) => value !== "unknown"));

/** A payer as a lower-case address or CAIP-10 account; null when undisclosed. */
export function normalizePayer(value) {
  if (value == null || value === "undisclosed") return null;
  const text = String(value).trim();
  if (text === "") return null;
  if (/^0x[0-9a-fA-F]{40}$/u.test(text)) return text.toLowerCase();
  const caip = /^(eip155:[0-9]+:)(0x[0-9a-fA-F]{40})$/u.exec(text);
  return caip ? `${caip[1]}${caip[2].toLowerCase()}` : text;
}

/** The payer's independence from the evidence that names it: one asserted class, or unknown with why. */
export function classifyCounterparty(payer, evidence = []) {
  const who = normalizePayer(payer);
  if (who === null) return Object.freeze({ classification: "unknown", reason: "payer-undisclosed", evidence: Object.freeze([]) });
  if (!Array.isArray(evidence)) throw new TypeError("counterparty evidence must be an array");
  const matches = evidence.map((entry, index) => {
    if (!KNOWN.has(entry?.classification)) throw new TypeError(`counterparty evidence[${index}] has an unsupported classification`);
    if (typeof entry.source !== "string" || entry.source.trim() === "") throw new TypeError(`counterparty evidence[${index}] needs a source`);
    return { payer: normalizePayer(entry.payer), classification: entry.classification, source: entry.source };
  }).filter((entry) => entry.payer === who).map(({ classification, source }) => Object.freeze({ classification, source }));
  if (matches.length === 0) return Object.freeze({ classification: "unknown", reason: "no-counterparty-evidence", evidence: Object.freeze([]) });
  const asserted = new Set(matches.map((entry) => entry.classification).filter((value) => ASSERTED.has(value)));
  if (asserted.size !== 1) {
    return Object.freeze({ classification: "unknown", reason: asserted.size === 0 ? "explicit-unknown" : "conflicting-counterparty-evidence", evidence: Object.freeze(matches) });
  }
  return Object.freeze({ classification: [...asserted][0], reason: "evidenced", evidence: Object.freeze(matches) });
}

