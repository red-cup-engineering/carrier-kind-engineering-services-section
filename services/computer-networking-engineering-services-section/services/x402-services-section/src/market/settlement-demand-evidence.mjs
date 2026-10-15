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

// Received from original unmerged emsenn/561-group PR #26 (2026-10-02).
// Preserve settlement evidence separately from independent customer demand;
// the caller still owns actual payment and buyer-authority readback.
function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function amountBaseUnits(value) {
  const text = requiredString(String(value), "settlement amount");
  if (!/^[0-9]+$/u.test(text)) throw new TypeError("settlement amount must be an integer base-unit string");
  return text;
}


export function projectSettlementDemandEvidence(settlement, counterpartyEvidence = []) {
  if (settlement == null || typeof settlement !== "object" || Array.isArray(settlement)) {
    throw new TypeError("settlement must be an object");
  }

  const raw = Object.freeze({
    network: requiredString(settlement.network, "settlement.network"),
    asset: requiredString(settlement.asset, "settlement.asset"),
    amountBaseUnits: amountBaseUnits(settlement.amountBaseUnits ?? settlement.amount),
    transaction: requiredString(settlement.transaction, "settlement.transaction"),
    payer: normalizePayer(settlement.payer),
    sku: requiredString(settlement.sku, "settlement.sku"),
    operation: requiredString(settlement.operation, "settlement.operation"),
    witness: requiredString(settlement.witness, "settlement.witness"),
  });
  const counterparty = classifyCounterparty(raw.payer, counterpartyEvidence);

  return Object.freeze({
    type: "X402SettlementDemandEvidenceReading",
    version: 1,
    settlementRecognized: true,
    independentCustomerDemand: counterparty.classification === "independent-external",
    counterpartyIndependence: counterparty.classification,
    classificationReason: counterparty.reason,
    classificationProvenance: counterparty.evidence,
    raw,
  });
}

function addAmount(map, key, amount) {
  const prior = map.get(key) ?? 0n;
  map.set(key, prior + BigInt(amount));
}

function mapToObject(map) {
  return Object.freeze(Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, value.toString(10)])));
}

export function summarizeSettlementDemandEvidence(readings) {
  if (!Array.isArray(readings)) throw new TypeError("readings must be an array");

  const settledAmounts = new Map();
  const independentAmounts = new Map();
  const classificationCounts = Object.fromEntries(COUNTERPARTY_INDEPENDENCE.map((classification) => [classification, 0]));
  let independentCount = 0;

  for (const [index, reading] of readings.entries()) {
    if (reading?.type !== "X402SettlementDemandEvidenceReading" || reading?.settlementRecognized !== true || reading?.raw == null) {
      throw new TypeError(`readings[${index}] is not a recognized X402 settlement demand-evidence reading`);
    }
    const classification = reading.counterpartyIndependence;
    if (!KNOWN.has(classification)) throw new TypeError(`readings[${index}] has an invalid counterparty classification`);
    classificationCounts[classification] += 1;

    const market = `${reading.raw.network}|${reading.raw.asset}`;
    addAmount(settledAmounts, market, reading.raw.amountBaseUnits);
    if (reading.independentCustomerDemand === true) {
      if (classification !== "independent-external") throw new TypeError("independent demand requires independent-external classification");
      independentCount += 1;
      addAmount(independentAmounts, market, reading.raw.amountBaseUnits);
    }
  }

  return Object.freeze({
    type: "X402EconomicDemandReadout",
    version: 1,
    recognizedSettlement: Object.freeze({
      count: readings.length,
      amountBaseUnitsByMarket: mapToObject(settledAmounts),
    }),
    independentCustomerDemand: Object.freeze({
      count: independentCount,
      amountBaseUnitsByMarket: mapToObject(independentAmounts),
    }),
    counterpartyClassificationCounts: Object.freeze(classificationCounts),
    rule: "recognized settlement and independently evidenced external customer demand are distinct; unmatched payers remain unknown",
  });
}
