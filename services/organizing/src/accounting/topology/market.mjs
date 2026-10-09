/**
 * accounting/topology/market — venue-generic market record-state topology.
 *
 * The market topology is economic record-state: venues list books, orders bid
 * or ask, fills execute, quotes observe, and known owners glue back to generic
 * financial accounts. The market *game* lives in `@red-cup-engineering/gaming/market`; this
 * module owns the organizing-scale topology those game/social/computing faces
 * can read.
 *
 * Venue-generic exchange structure: a venue lists books (trading pairs), orders
 * bid or ask on books, fills execute on books, quotes observe books. Venue
 * specializations bind these terms to real chains and exchanges. Accounts, when
 * an order's owner is known, are `./financial.mts` accounts — so a market carrier
 * is a specialization of `FinancialTopologyCarrier` and merges with financial,
 * chain, and ledger carriers.
 *
 * Anti-fetishism law (CLAUDE.md "no free data"; note §1). Evidence enters ONLY by
 * articulating utterances, and a evidence is the section of a settling over a
 * society, never a property of a thing. There is no denial: a contrary market
 * fact is its own claim of a contrary predicate — delisted, bid-ended, ask-ended
 * — never a polarity against the original claim.
 *
 * The value-free topology law. Quantities do NOT live in the topology. Prices and
 * sizes ride as exact decimal strings in `MarketProvenance`, carried in this
 * package's `ProvenancedUtterance` structure BESIDE the utterance — provenance is
 * never kernel evidence. Quantities are exact decimals (rendered/parsed at the
 * edge), never floats and never evidence on the carrier; the quantitative laws over
 * book data are exact-rational arithmetic in the microstructure/computing readings.
 */
import { utterance } from "@red-cup-engineering/signcell/cell";
import { about, under } from "@red-cup-engineering/signcraft/settle";


import {
  evidenceByBoundary,
  financialAccountTerm,
  induceFinancialTopology,
} from "./financial.mjs";

export { financialAccountTerm };


// ---------- provenance (value-free topology law) ----------

/**
 * The provenance shape market utterances are expected to ride with. All
 * quantities are exact decimal strings, never floats. Prices are stated in the
 * book's quote commodity per one unit of its base commodity. This rides BESIDE
 * the utterance and is never kernel evidence on the carrier.
 */

/** An utterance with its market provenance carried beside it — package
 *  structure, never kernel evidence. */

/** Pair an utterance with its market provenance. */
export function provenancedUtterance(
  utteranceCarrier,
  provenance,
) {
  return Object.freeze({
    kind: "market-topology.provenancedUtterance",
    utterance: utteranceCarrier,
    provenance,
  });
}

// ---------- term constructors ----------

/** Namespaced mark for a market venue: "market.venue.<id>" */
export function marketVenueTerm(venueId) {
  return `market.venue.${venueId}`;
}

/** Namespaced mark for a book (trading pair at a venue): "market.book.<venue>.<BASE>/<QUOTE>" */
export function marketBookTerm(venueId, baseSymbol, quoteSymbol) {
  return `market.book.${venueId}.${baseSymbol}/${quoteSymbol}`;
}

/** Namespaced mark for an order at a venue: "market.order.<venue>.<id>" */
export function marketOrderTerm(venueId, orderId) {
  return `market.order.${venueId}.${orderId}`;
}

/** Namespaced mark for a fill (executed trade) at a venue: "market.fill.<venue>.<id>" */
export function marketFillTerm(venueId, fillId) {
  return `market.fill.${venueId}.${fillId}`;
}

/** Namespaced mark for a quote observation at a venue: "market.quote.<venue>.<id>" */
export function marketQuoteTerm(venueId, quoteId) {
  return `market.quote.${venueId}.${quoteId}`;
}

// ---------- predicate terms ----------

export function marketListsPredicate() { return "market.lists"; }
export function marketDelistedPredicate() { return "market.delisted"; }
export function marketBidsPredicate() { return "market.bids"; }
export function marketBidEndedPredicate() { return "market.bid-ended"; }
export function marketAsksPredicate() { return "market.asks"; }
export function marketAskEndedPredicate() { return "market.ask-ended"; }
export function marketPlacedPredicate() { return "market.placed"; }
export function marketFilledOnPredicate() { return "market.filled-on"; }
export function marketQuotesPredicate() { return "market.quotes"; }

// ---------- utterance constructors ----------
//
// bid/ask = the P/O polarity of the exchange (note §4.2): an order bidding is a
// proponent move, an order asking is an opponent move; a fill is cut-elimination.
// Here those are venue-generic predications; the gaming face lifts them to a CGS.

/** Claim that a venue lists a book. */
export function marketListedUtterance(
  venueId,
  baseSymbol,
  quoteSymbol,
) {
  return utterance(
    { subject: marketVenueTerm(venueId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) },
    marketListsPredicate(),
  );
}

/** Claim that a venue delisted a book — its own claim, not a denial of the listing. */
export function marketDelistedUtterance(
  venueId,
  baseSymbol,
  quoteSymbol,
) {
  return utterance(
    { subject: marketVenueTerm(venueId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) },
    marketDelistedPredicate(),
  );
}

/** Claim that an order bids on a book (buy side / proponent polarity). */
export function marketBidUtterance(
  venueId,
  baseSymbol,
  quoteSymbol,
  orderId,
) {
  return utterance(
    { subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) },
    marketBidsPredicate(),
  );
}

/** Claim that an order's bid on a book ended (filled, cancelled, or expired)
 *  — its own claim, not a denial of the bid. */
export function marketBidEndedUtterance(
  venueId,
  baseSymbol,
  quoteSymbol,
  orderId,
) {
  return utterance(
    { subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) },
    marketBidEndedPredicate(),
  );
}

/** Claim that an order asks on a book (sell side / opponent polarity). */
export function marketAskUtterance(
  venueId,
  baseSymbol,
  quoteSymbol,
  orderId,
) {
  return utterance(
    { subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) },
    marketAsksPredicate(),
  );
}

/** Claim that an order's ask on a book ended (filled, cancelled, or expired)
 *  — its own claim, not a denial of the ask. */
export function marketAskEndedUtterance(
  venueId,
  baseSymbol,
  quoteSymbol,
  orderId,
) {
  return utterance(
    { subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) },
    marketAskEndedPredicate(),
  );
}

/** Claim that an account placed an order (when the owner is known). The subject
 *  is a `./financial.mts` account, gluing market and financial carriers. */
export function marketOrderPlacedUtterance(
  account,
  venueId,
  orderId,
) {
  return utterance(
    { subject: financialAccountTerm(account), object: marketOrderTerm(venueId, orderId) },
    marketPlacedPredicate(),
  );
}

/** Claim that a fill executed on a book. Fills are events; no contrary fact exists. */
export function marketFillUtterance(
  venueId,
  baseSymbol,
  quoteSymbol,
  fillId,
) {
  return utterance(
    { subject: marketFillTerm(venueId, fillId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) },
    marketFilledOnPredicate(),
  );
}

/** Claim that a quote was observed on a book. Staleness is the reader's judgment, not the carrier's. */
export function marketQuoteUtterance(
  venueId,
  baseSymbol,
  quoteSymbol,
  quoteId,
) {
  return utterance(
    { subject: marketQuoteTerm(venueId, quoteId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) },
    marketQuotesPredicate(),
  );
}

// ---------- carrier settlement ----------

/**
 * A settled market topology. Specializes `FinancialTopologyCarrier` (so market
 * carriers compose with financial/chain/ledger carriers) and re-tags `kind` to
 * the market discriminator.
 */

/** Induce a settled MarketTopologyCarrier from an utterance log. */
export function induceMarketTopology(utterances) {
  return Object.freeze({ ...induceFinancialTopology(utterances), kind: "market.topology.carrier" });
}

/** Extend an existing MarketTopologyCarrier with new utterances. */
export function extendMarketTopology(
  carrier,
  delta,
) {
  return induceMarketTopology([...carrier.utterances, ...delta]);
}

// ---------- section layer ----------
//
// Market queries on a settled MarketTopologyCarrier. Thin wrappers over the
// generic meme-topology section layer with market term naming. The evidence at a
// cell is the section of the settling — read it, never assign it.

/** The settled section of a MarketTopologyCarrier. */
export const marketKnowledgeSection = (carrier) => carrier.settlement.settled;

/** The section read in the truth order: the same settled cells. */
export const marketTruthSection = marketKnowledgeSection;

// ---------- single-cell evidence reads ----------

/** Evidence at "venue lists book". */
export function marketListedEvidence(
  section,
  venueId,
  baseSymbol,
  quoteSymbol,
) {
  return evidenceByBoundary(section, { subject: marketVenueTerm(venueId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketListsPredicate());
}

/** Evidence at "venue delisted book" — the contrary claim, its own cell. */
export function marketDelistedEvidence(
  section,
  venueId,
  baseSymbol,
  quoteSymbol,
) {
  return evidenceByBoundary(section, { subject: marketVenueTerm(venueId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketDelistedPredicate());
}

/** Evidence at "order bids book". */
export function marketBidEvidence(
  section,
  venueId,
  baseSymbol,
  quoteSymbol,
  orderId,
) {
  return evidenceByBoundary(section, { subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketBidsPredicate());
}

/** Evidence at "order's bid on book ended" — the contrary claim, its own cell. */
export function marketBidEndedEvidence(
  section,
  venueId,
  baseSymbol,
  quoteSymbol,
  orderId,
) {
  return evidenceByBoundary(section, { subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketBidEndedPredicate());
}

/** Evidence at "order asks book". */
export function marketAskEvidence(
  section,
  venueId,
  baseSymbol,
  quoteSymbol,
  orderId,
) {
  return evidenceByBoundary(section, { subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketAsksPredicate());
}

/** Evidence at "order's ask on book ended" — the contrary claim, its own cell. */
export function marketAskEndedEvidence(
  section,
  venueId,
  baseSymbol,
  quoteSymbol,
  orderId,
) {
  return evidenceByBoundary(section, { subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketAskEndedPredicate());
}

/** Evidence at "account placed order". */
export function marketPlacedEvidence(
  section,
  account,
  venueId,
  orderId,
) {
  return evidenceByBoundary(section, { subject: financialAccountTerm(account), object: marketOrderTerm(venueId, orderId) }, marketPlacedPredicate());
}

/** Evidence at "fill executed on book". */
export function marketFillEvidence(
  section,
  venueId,
  baseSymbol,
  quoteSymbol,
  fillId,
) {
  return evidenceByBoundary(section, { subject: marketFillTerm(venueId, fillId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketFilledOnPredicate());
}

/** Evidence at "quote observed on book". */
export function marketQuoteEvidence(
  section,
  venueId,
  baseSymbol,
  quoteSymbol,
  quoteId,
) {
  return evidenceByBoundary(section, { subject: marketQuoteTerm(venueId, quoteId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketQuotesPredicate());
}

// ---------- multi-entry section reads ----------

/** All predicates claimed of a venue. */
export function marketVenueEntries(section, venueId) {
  return about(section, marketVenueTerm(venueId));
}

/** All predicates claimed of an order. */
export function marketOrderEntries(section, venueId, orderId) {
  return about(section, marketOrderTerm(venueId, orderId));
}

/** All bid entries. */
export function marketAllBidEntries(section) {
  return under(section, marketBidsPredicate());
}

/** All ask entries. */
export function marketAllAskEntries(section) {
  return under(section, marketAsksPredicate());
}

/** All fill entries. */
export function marketAllFillEntries(section) {
  return under(section, marketFilledOnPredicate());
}

/** All quote entries. */
export function marketAllQuoteEntries(section) {
  return under(section, marketQuotesPredicate());
}
