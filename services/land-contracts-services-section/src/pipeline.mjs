/**
 * The land contract pipeline's own readings: its sales procedure (stages, the office that moves
 * each, and the reasons a deal dies there), matching parcels to buyers' buy boxes, offer ceilings,
 * parcel rows and search, and template filling. Contacts, interest, orders, the funnel and the call
 * queue are the enterprise layer's (@red-cup-engineering/organizing/enterprise).
 * @packageDocumentation
 */
import { contactOutcomes, interestReading as enterpriseInterest, latest, procedure } from "@red-cup-engineering/organizing/enterprise";
import { absentee, offerGuide, ownerKind, ownerMailing, parcelLocation, propertyKind, scoreSellerLead, standardLots } from "./leads.mjs";

/** The land enterprise's id in the agency registry and the enterprise store. */
export const LAND_ENTERPRISE = "land-contracts";

/**
 * The sales procedure, stage by stage: what the stage means, which office moves a deal out of
 * it, what moves it on, and the reasons a deal ends there. A lead that stops is recorded as
 * `dead` with one of its stage's reasons, so every loss is counted where it happened.
 */
const LAND_STAGES = [
  { stage: "lead", means: "a parcel matched to a buy box and ready to call", office: "land-caller", next: "the owner is reached", deadReasons: ["wrong number", "not owner", "owner deceased, no heir reached", "never reached"] },
  { stage: "contacted", means: "the owner was reached", office: "land-caller", next: "the owner names a price or asks for an offer", deadReasons: ["not interested", "remove", "keeping it", "listed with an agent"] },
  { stage: "interested", means: "the owner named a price or asked for an offer", office: "land-acquisitions-lead", next: "the Group makes an offer", deadReasons: ["asking above ceiling", "no matched buyer", "title problem named by owner", "owner unresponsive"] },
  { stage: "offered", means: "the Group made an offer", office: "land-acquisitions-lead", next: "the purchase agreement is signed and earnest money deposited", deadReasons: ["offer declined", "owner unresponsive", "another buyer"] },
  { stage: "contracted", means: "the purchase agreement is signed and earnest money deposited", office: "land-dispositions-lead", next: "the contract is sent to matched buyers", deadReasons: ["title failed", "due diligence found a defect", "seller backed out"] },
  { stage: "marketed", means: "the contract was sent to matched buyers", office: "land-dispositions-lead", next: "a buyer signs the assignment and pays its deposit", deadReasons: ["no buyer at the assignment price", "contract expired"] },
  { stage: "assigned", means: "a buyer signed the assignment and paid its deposit", office: "land-transaction-coordinator", next: "the title company closes", deadReasons: ["assignee failed to close", "title failed"] },
  { stage: "closed", means: "the title company closed and paid the fee", office: "land-transaction-coordinator", next: null, deadReasons: [] },
];

/** The land sales procedure, as the enterprise layer reads it. */
export const LAND_PROCEDURE = procedure(LAND_STAGES);
export const STAGES = LAND_PROCEDURE.stages;
export const DEAL_STAGES = LAND_PROCEDURE.names;
export const DEAD_REASONS = LAND_PROCEDURE.deadReasons;

/** The contact outcomes a land caller logs, with the side of the party's interest each tells. */
export const CONTACT_OUTCOMES = contactOutcomes(["no answer", "voicemail", "wrong number", "not owner", "letter sent", "callback", "interested", "offer call set", "not interested", "remove"]);

/** A party's interest read from its contacts: unknown, held, denied or contested. */
export const interestReading = (contacts, party = "party") => enterpriseInterest(contacts, { party, relation: "sells-to", enterprise: LAND_ENTERPRISE, outcomes: CONTACT_OUTCOMES });

export { latest };

const upper = (values) => (values ?? []).map((value) => String(value).toUpperCase()).filter(Boolean);

/**
 * Does a parcel fit a buyer's buy box? Markets and kinds must match when named; areas match the
 * place, plat, legal description, street address or ZIP; size is acres or standard lots; classes
 * are county class names or prefixes; the price is what the parcel would open at.
 */
export function fitsBuyBox(parcel, box, settings) {
  if ((box.markets ?? []).length > 0 && !box.markets.includes(parcel.market)) return false;
  if ((box.kinds ?? []).length > 0 && !box.kinds.includes(propertyKind(parcel))) return false;
  const areas = upper(box.areas);
  if (areas.length > 0) {
    const place = [parcel.place, parcel.plat, parcel.legal, parcel.address, parcel.zip].join(" ").toUpperCase();
    if (!areas.some((area) => place.includes(area))) return false;
  }
  if (box.minAcres !== undefined && parcel.acres < box.minAcres) return false;
  if (box.maxAcres !== undefined && parcel.acres > box.maxAcres) return false;
  if (box.minStandardLots !== undefined && standardLots(parcel) < box.minStandardLots) return false;
  if ((box.classes ?? []).length > 0 && !box.classes.some((name) => parcel.useClass.startsWith(name))) return false;
  if (box.maxPrice !== undefined && offerGuide(parcel, settings).open > box.maxPrice) return false;
  return true;
}

/**
 * The offer ceiling for a parcel given the buyers it fits: the best buyer price minus the target
 * fee, never above the county-estimate ceiling for its kind; that ceiling alone when no buyer
 * names a price.
 */
export function offerCeiling(parcel, boxes, { targetFee = 3000, settings } = {}) {
  const county = offerGuide(parcel, settings).ceiling;
  const prices = boxes.map((box) => box.maxPrice).filter((price) => Number.isFinite(price));
  if (prices.length === 0) return county;
  return Math.max(0, Math.min(county, Math.max(...prices) - targetFee));
}

/** One scored, readable row for a parcel with its matched buyers, interest and deal stage. */
export function parcelRow(parcel, { buyers = [], contacts = [], deals = [], year, settings } = {}) {
  const { score, reasons } = scoreSellerLead(parcel, { year });
  const matched = buyers.filter((buyer) => fitsBuyBox(parcel, buyer, settings));
  const offer = offerGuide(parcel, settings);
  const deal = latest(deals);
  return Object.freeze({
    parcel: parcel.parcel,
    market: parcel.market,
    kind: propertyKind(parcel),
    score,
    why: reasons.join("; "),
    owner: parcel.owner,
    ownerKind: ownerKind(parcel),
    ownerLives: absentee(parcel),
    mailing: ownerMailing(parcel).line,
    lot: parcelLocation(parcel),
    place: parcel.place,
    zip: parcel.zip || null,
    acres: Number(parcel.acres.toFixed(3)),
    standardLots: standardLots(parcel),
    class: parcel.useClass,
    landEstimate: parcel.landValue,
    buildingEstimate: parcel.buildingValue,
    estimate: offer.estimate,
    backTaxes: offer.backTaxes,
    forfeitYear: parcel.forfeitYear,
    lastSaleYear: parcel.lastSaleYear,
    openOffer: offer.open,
    maxOffer: offerCeiling(parcel, matched, { targetFee: settings?.["target-fee"] ?? 3000, settings }),
    buyers: matched.map((buyer) => buyer.buyer),
    interest: interestReading(contacts, parcel.parcel),
    contacts: contacts.length,
    stage: deal?.stage ?? (interestReading(contacts) === "held" ? "interested" : contacts.length ? "contacted" : "lead"),
  });
}

const inRange = (value, min, max) => (min === undefined || value >= min) && (max === undefined || value <= max);

/**
 * Filter and sort parcel rows. Every filter is optional; lists match any member. `buyer` keeps
 * only parcels matched to that buyer, `matchedOnly` only parcels matched to any buyer.
 */
export function findParcels(rows, filter = {}) {
  const list = (value) => (value === undefined || value === "" ? [] : Array.isArray(value) ? value : String(value).split(","));
  const classes = list(filter.classes);
  const kinds = list(filter.kinds);
  const ownerLives = list(filter.ownerLives);
  const ownerKinds = list(filter.ownerKinds);
  const interests = list(filter.interest);
  const stages = list(filter.stages);
  const place = filter.place ? String(filter.place).toUpperCase() : null;
  const kept = rows.filter((row) =>
    inRange(row.acres, filter.minAcres, filter.maxAcres)
    && inRange(row.standardLots, filter.minStandardLots, filter.maxStandardLots)
    && inRange(row.estimate, filter.minLandEstimate, filter.maxLandEstimate)
    && inRange(row.score, filter.minScore, undefined)
    && (kinds.length === 0 || kinds.includes(row.kind))
    && (classes.length === 0 || classes.some((name) => String(row.class ?? "").startsWith(name)))
    && (ownerLives.length === 0 || ownerLives.includes(row.ownerLives))
    && (ownerKinds.length === 0 || ownerKinds.includes(row.ownerKind))
    && (!filter.delinquent || row.backTaxes > 0)
    && (filter.forfeitBy === undefined || (row.forfeitYear !== null && row.forfeitYear <= filter.forfeitBy))
    && (filter.soldBefore === undefined || row.lastSaleYear === null || row.lastSaleYear < filter.soldBefore)
    && (!place || [row.lot, row.place, row.zip, row.mailing].join(" ").toUpperCase().includes(place))
    && (!filter.buyer || row.buyers.includes(filter.buyer))
    && (!filter.matchedOnly || row.buyers.length > 0)
    && (interests.length === 0 || interests.includes(row.interest))
    && (stages.length === 0 || stages.includes(row.stage)));
  const sorts = {
    score: (a, b) => b.score - a.score || b.estimate - a.estimate,
    fit: (a, b) => b.buyers.length - a.buyers.length || b.score - a.score,
    value: (a, b) => b.estimate - a.estimate,
    size: (a, b) => b.acres - a.acres,
  };
  kept.sort(sorts[filter.sort ?? "score"] ?? sorts.score);
  const offset = filter.offset ?? 0;
  const limit = filter.limit ?? 100;
  return Object.freeze({ total: kept.length, offset, rows: kept.slice(offset, offset + limit) });
}

