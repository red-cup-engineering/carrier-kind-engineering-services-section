/**
 * accounting/topology/financial — generic financial-entity meme-topology carrier.
 *
 * WAVE-0 ported topology carrier. This module is the value-free spine reused by
 * every later stage's predications: it models *knowledge about* finances as a
 * meme-topology over relating's descent engine (term → predicate → utterance →
 * induce → section → evidence), and nothing more. Quantities (price, amount, qty)
 * ride elsewhere as provenance; they are never kernel evidence here, so no money
 * type (`@red-cup-engineering/relating/analysis` Rational / GradedRational) is imported into
 * this layer. The topology is the value-free skeleton over which the §4 descent
 * (commodity=evidence → exchange=cut → value-form → conservation → price=consensus
 * → market=CGS → valuation → capital=reseed → institution) is hung — see
 * dev/docs/notes/2026-06-22-trading-as-settling-over-value-categories.md §7
 * ("topology carriers … already the relating idiom; keep, rewire onto faces").
 *
 * Three layers:
 *   term constructors      — namespaced strings for financial entities
 *   utterance constructors — financial relationships claimed as utterances
 *   FinancialTopologyCarrier — financial utterances with their settlement and
 *                              fixed-point readings, plus the section reads on top
 *
 * Denial-free law (the anti-fetishism rule, content/CLAUDE.md): evidence enters
 * ONLY by articulating utterances; there is no denial and no polarity flip. A
 * contrary fact — a closed position, a reversed transfer — is its OWN predicate
 * cell (`closed-position`, `transfer-reversed-to`), an independent claim, never a
 * negative evidence aimed at the original claim. Contradiction therefore surfaces
 * only as the bilattice's settled evidence over genuinely conflicting utterances,
 * not as a hand-stamped sign.
 *
 * No codec imports; this library models knowledge about finances, not wire
 * encoding. Hive, stock, crypto, and fiat positions are all specializations of
 * the generic model here.
 *
 * Ported VERBATIM from the pre-rebuild src/financial/{financial-topology,
 * financial-section}.mts (already in relating's idiom); only the cross-file
 * package-internal import paths were collapsed into this single module.
 */
import { tokenValue, utterance } from "@red-cup-engineering/signcell/cell";

import { about, evidenceIn, under } from "@red-cup-engineering/signcraft/settle";
import { relationPairOf, settleMembrane } from "@red-cup-engineering/signcraft/membrane";


// ---------- term constructors ----------

/** Namespaced mark for a financial entity (person, org, protocol): "financial.entity.<id>" */
export function financialEntityTerm(id) {
  return `financial.entity.${id}`;
}

/** Namespaced mark for a financial account: "financial.account.<id>" */
export function financialAccountTerm(id) {
  return `financial.account.${id}`;
}

/** Namespaced mark for a commodity/currency/token: "financial.commodity.<symbol>" */
export function financialCommodityTerm(symbol) {
  return `financial.commodity.${symbol}`;
}

/** Namespaced mark for a financial position (an account's holding in a commodity): "financial.position.<accountId>.<symbol>" */
export function financialPositionTerm(accountId, symbol) {
  return `financial.position.${accountId}.${symbol}`;
}

/** Namespaced mark for a flow between two accounts: "financial.flow.<fromId>.<toId>" */
export function financialFlowTerm(fromId, toId) {
  return `financial.flow.${fromId}.${toId}`;
}

// ---------- standard predicate terms ----------

export function holdsPositionPredicate() { return "financial.holds-position"; }
/** Contrary of holds-position: the position is closed. Its own claim, not a denial. */
export function closedPositionPredicate() { return "financial.closed-position"; }
export function denominatedInPredicate() { return "financial.denominated-in"; }
export function ownedByPredicate() { return "financial.owned-by"; }
export function transferredToPredicate() { return "financial.transferred-to"; }
/** Contrary of transferred-to: the transfer was reversed. Its own claim, not a denial. */
export function transferReversedToPredicate() { return "financial.transfer-reversed-to"; }
export function hasExposureToPredicate() { return "financial.has-exposure-to"; }
export function isLiquidPredicate() { return "financial.is-liquid"; }
export function isStakedPredicate() { return "financial.is-staked"; }

// ---------- utterance constructors ----------

/** Claim that an account holds a position in a commodity. */
export function holdingUtterance(accountId, symbol) {
  return utterance(
    { subject: financialAccountTerm(accountId), object: financialCommodityTerm(symbol) },
    holdsPositionPredicate(),
  );
}

/** Claim that an account's position in a commodity is closed. */
export function holdingClosedUtterance(accountId, symbol) {
  return utterance(
    { subject: financialAccountTerm(accountId), object: financialCommodityTerm(symbol) },
    closedPositionPredicate(),
  );
}

/** Claim that an account is denominated in a commodity (its base currency). */
export function denominationUtterance(accountId, symbol) {
  return utterance(
    { subject: financialAccountTerm(accountId), object: financialCommodityTerm(symbol) },
    denominatedInPredicate(),
  );
}

/** Claim that an entity owns an account. */
export function ownershipUtterance(entityId, accountId) {
  return utterance(
    { subject: financialEntityTerm(entityId), object: financialAccountTerm(accountId) },
    ownedByPredicate(),
  );
}

/** Claim that value flowed from one account to another. */
export function transferUtterance(fromAccountId, toAccountId) {
  return utterance(
    { subject: financialAccountTerm(fromAccountId), object: financialAccountTerm(toAccountId) },
    transferredToPredicate(),
  );
}

/** Claim that a previously recorded transfer was reversed. */
export function transferReversalUtterance(fromAccountId, toAccountId) {
  return utterance(
    { subject: financialAccountTerm(fromAccountId), object: financialAccountTerm(toAccountId) },
    transferReversedToPredicate(),
  );
}

/** Claim that an entity has exposure to a commodity (risk, not necessarily holding). */
export function exposureUtterance(entityId, symbol) {
  return utterance(
    { subject: financialEntityTerm(entityId), object: financialCommodityTerm(symbol) },
    hasExposureToPredicate(),
  );
}

/** Claim that a position is liquid (can be transferred immediately). */
export function liquidPositionUtterance(accountId, symbol) {
  return utterance(
    { subject: financialPositionTerm(accountId, symbol), object: financialCommodityTerm(symbol) },
    isLiquidPredicate(),
  );
}

/** Claim that a position is staked/locked. */
export function stakedPositionUtterance(accountId, symbol) {
  return utterance(
    { subject: financialPositionTerm(accountId, symbol), object: financialCommodityTerm(symbol) },
    isStakedPredicate(),
  );
}

// ---------- carrier settlement ----------

/** Settle a log of financial utterances into a FinancialTopologyCarrier. */
export function induceFinancialTopology(utterances) {
  const log = Object.freeze([...utterances]);
  return Object.freeze({
    kind: "financial.topology.carrier",
    utterances: log,
    // Each utterance tells its cell, witnessed by its own token (relating's membrane), settled by SignCraft.
    settlement: settleMembrane(log, tokenValue),
  });
}

/** Apply a delta of new utterances to an existing carrier, returning a new settled carrier. */
export function extendFinancialTopology(
  carrier,
  delta,
) {
  return induceFinancialTopology([...carrier.utterances, ...delta]);
}

// ---------- section reads (financial queries on a settled carrier) ----------
// A section is the settled cell set. A relation-pair subject { subject, object } reads the cell
// (subject, predicate, object); any other subject its reflexive cell.

/** A section's evidence at a subject (or relation pair) under a predicate. */
export const evidenceByBoundary = (section, subject, predicate) => {
  const pair = relationPairOf(subject);
  return pair === undefined ? evidenceIn(section, subject, predicate) : evidenceIn(section, pair.subject, predicate, pair.object);
};

/** The settled section of a FinancialTopologyCarrier (its least fixed point in the knowledge order). */
export const financialKnowledgeSection = (carrier) => carrier.settlement.settled;

/** The section read in the truth order: the same settled cells — the truth order reads the evidence the
 *  knowledge-order closure settled; there is one section. */
export const financialTruthSection = financialKnowledgeSection;

// ---------- single-cell evidence reads ----------

/** Evidence at "account holds-position commodity". */
export function holdingEvidence(
  section,
  accountId,
  symbol,
) {
  return evidenceByBoundary(section, { subject: financialAccountTerm(accountId), object: financialCommodityTerm(symbol) }, holdsPositionPredicate());
}

/** Evidence at "account closed-position commodity" — the contrary predicate of holds-position. */
export function closedPositionEvidence(
  section,
  accountId,
  symbol,
) {
  return evidenceByBoundary(section, { subject: financialAccountTerm(accountId), object: financialCommodityTerm(symbol) }, closedPositionPredicate());
}

/** Evidence at "account denominated-in commodity". */
export function denominationEvidence(
  section,
  accountId,
  symbol,
) {
  return evidenceByBoundary(section, { subject: financialAccountTerm(accountId), object: financialCommodityTerm(symbol) }, denominatedInPredicate());
}

/** Evidence at "entity owned-by account". */
export function ownershipEvidence(
  section,
  entityId,
  accountId,
) {
  return evidenceByBoundary(section, { subject: financialEntityTerm(entityId), object: financialAccountTerm(accountId) }, ownedByPredicate());
}

/** Evidence at "fromAccount transferred-to toAccount". */
export function transferEvidence(
  section,
  fromAccountId,
  toAccountId,
) {
  return evidenceByBoundary(section, { subject: financialAccountTerm(fromAccountId), object: financialAccountTerm(toAccountId) }, transferredToPredicate());
}

/** Evidence at "fromAccount transfer-reversed-to toAccount" — the contrary predicate of transferred-to. */
export function transferReversedEvidence(
  section,
  fromAccountId,
  toAccountId,
) {
  return evidenceByBoundary(section, { subject: financialAccountTerm(fromAccountId), object: financialAccountTerm(toAccountId) }, transferReversedToPredicate());
}

/** Evidence at "entity has-exposure-to commodity". */
export function exposureEvidence(
  section,
  entityId,
  symbol,
) {
  return evidenceByBoundary(section, { subject: financialEntityTerm(entityId), object: financialCommodityTerm(symbol) }, hasExposureToPredicate());
}

/** Evidence at "position is-liquid commodity". */
export function liquidEvidence(
  section,
  accountId,
  symbol,
) {
  return evidenceByBoundary(section, { subject: financialPositionTerm(accountId, symbol), object: financialCommodityTerm(symbol) }, isLiquidPredicate());
}

/** Evidence at "position is-staked commodity". */
export function stakedEvidence(
  section,
  accountId,
  symbol,
) {
  return evidenceByBoundary(section, { subject: financialPositionTerm(accountId, symbol), object: financialCommodityTerm(symbol) }, isStakedPredicate());
}

// ---------- multi-entry section reads ----------

/** All predicates claimed about an account. */
export function financialAccountEntries(section, accountId) {
  const account = financialAccountTerm(accountId);
  return about(section, account);
}

/** All predicates claimed about an entity. */
export function financialEntityEntries(section, entityId) {
  return about(section, financialEntityTerm(entityId));
}

/** All accounts that hold any position (subjects of holds-position). */
export function allHoldingAccountEntries(section) {
  return under(section, holdsPositionPredicate());
}

/** All subjects that have transfer flows. */
export function allTransferEntries(section) {
  return under(section, transferredToPredicate());
}

/** All accounts with exposure claims. */
export function allExposureEntries(section) {
  return under(section, hasExposureToPredicate());
}
