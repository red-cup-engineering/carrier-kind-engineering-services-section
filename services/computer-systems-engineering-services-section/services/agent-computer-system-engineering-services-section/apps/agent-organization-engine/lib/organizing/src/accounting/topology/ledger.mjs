/**
 * @red-cup-engineering/organizing/accounting/topology/ledger — double-entry bookkeeping as a meme-topology carrier.
 *
 * Ported (wave-0) from the current `src/ledger/ledger-topology.mts` +
 * `src/ledger/ledger-section.mts`, folded onto the rebuilt `topology/financial.mts`
 * base. This specializes the financial-topology carrier for the double-entry
 * accounting domain (authority note §4 stage 4 — "conservation = double-entry":
 * every debit a credit, the articulation is conserved), keeping the carrier a
 * settled meme-topology over articulated utterances:
 *
 *   term constructors      — namespaced marks for ledger accounts / transactions /
 *                            commodities / tree roots
 *   utterance constructors — the double-entry conventions claimed as utterances
 *                            (debit-/credit-normal balance, open/closed, sub-account,
 *                            transaction participation, reconciled)
 *   LedgerTopologyCarrier  — a FinancialTopologyCarrier specialized to the ledger
 *                            domain, carrying its settlement filtration and the
 *                            meme-topology fixed-point readings
 *   section readers        — the knowledge-/truth-least sections and per-cell
 *                            reading / per-subject entry queries on them
 *
 * Anti-fetishism law (authority note §1; CLAUDE.md "no free data past Mark"):
 * a ledger fact is never primitive data on the carrier. An account's normal
 * balance, its open/closed standing, a posting's reconciliation — each is the
 * settled image of a predication among agents, read back as a ReadingValue from
 * the section, never stored as a free field. Evidence enters only by articulating
 * utterances; there is no denial. A *closed* account is its own claim of the
 * contrary predicate (`is-closed`), never a polarity against `is-open`; this is
 * what lets `institution/index` read a Desk's H¹ (the unbalanced/unconserved
 * obstruction) directly off the booked accounts via `debitNormalUtterance`.
 *
 * Exact money and the conservation (every-debit-a-credit ⟺ ker ∂) live in
 * `@red-cup-engineering/relating/analysis` (Rational + conservation); they are consumed by the
 * postings/desk layer, not here — this module models *knowledge about* a ledger's
 * structure, not the amounts. No codec imports: use `@emsenn/computing-with-ledgers`
 * to parse beancount/hledger text into entries at the observe edge, then build
 * utterances from those entries.
 */
import { knowledgeReading, utterance } from "@red-cup-engineering/signcell/cell";
import { about, under } from "@red-cup-engineering/signcraft/settle";
import {
  evidenceByBoundary,
  financialAccountTerm,
  financialKnowledgeSection,
  induceFinancialTopology,
  extendFinancialTopology,

} from "./financial.mjs";


// `financialAccountTerm` is the bridge to the financial base: a ledger account
// path is re-homed onto the financial-account namespace so that booked accounts
// read uniformly across both carriers. Re-exported for the constructor surface
// `institution/index` consumes.
export { financialAccountTerm };

// ---------- ledger-specific term constructors ----------

/** Namespaced mark for a ledger account: "ledger.account.<path>" (e.g. "Assets:Cash"). */
export function ledgerAccountTerm(path) {
  return `ledger.account.${path}`;
}

/** Namespaced mark for a ledger transaction: "ledger.transaction.<id>". */
export function ledgerTransactionTerm(id) {
  return `ledger.transaction.${id}`;
}

/** Namespaced mark for a ledger commodity: "ledger.commodity.<symbol>". */
export function ledgerCommodityTerm(symbol) {
  return `ledger.commodity.${symbol}`;
}

/** Namespaced mark for an account-tree path: "ledger.tree.<root>". */
export function ledgerTreeTerm(root) {
  return `ledger.tree.${root}`;
}

// ---------- ledger-specific predicate terms ----------

export function isDebitNormalPredicate() { return "ledger.is-debit-normal"; }
export function isCreditNormalPredicate() { return "ledger.is-credit-normal"; }
export function participatesInPredicate() { return "ledger.participates-in"; }
export function isOpenPredicate() { return "ledger.is-open"; }
/** Contrary of is-open: the account is closed. Its own claim, not a denial. */
export function isClosedPredicate() { return "ledger.is-closed"; }
export function isSubAccountOfPredicate() { return "ledger.is-sub-account-of"; }
export function isReconciledPredicate() { return "ledger.is-reconciled"; }

// ---------- utterance constructors ----------

/**
 * Claim that an account uses the debit-normal balance convention (Assets, Expenses).
 *
 * This is the constructor `institution/index` uses to read a Desk's H¹ off the
 * booked accounts: the normal-balance convention is what orients each posting in
 * the conservation reading (debit-normal accounts increase on the debit side), so
 * the unconserved residue (H¹ ≠ 0 ⟺ books that do not balance) is read against
 * these claims. SIGNATURE FIXED — `debitNormalUtterance(account: string)`.
 */
export function debitNormalUtterance(account) {
  return utterance(ledgerAccountTerm(account), isDebitNormalPredicate());
}

/** Claim that an account uses the credit-normal balance convention (Liabilities, Equity, Income). */
export function creditNormalUtterance(account) {
  return utterance(ledgerAccountTerm(account), isCreditNormalPredicate());
}

/** Claim that an account is open (can receive postings). */
export function accountOpenedUtterance(account) {
  return utterance(ledgerAccountTerm(account), isOpenPredicate());
}

/** Claim that an account is closed. The contrary claim to is-open, in its own right. */
export function accountClosedUtterance(account) {
  return utterance(ledgerAccountTerm(account), isClosedPredicate());
}

/** Claim that account `child` is a sub-account of account `parent` (e.g. Assets:Cash is sub of Assets). */
export function subAccountUtterance(parent, child) {
  return utterance(
    { subject: ledgerAccountTerm(child), object: ledgerAccountTerm(parent) },
    isSubAccountOfPredicate(),
  );
}

/** Claim that an account participates in a transaction (a posting edge of the transaction). */
export function transactionParticipantUtterance(transactionId, account) {
  return utterance(
    { subject: ledgerAccountTerm(account), object: ledgerTransactionTerm(transactionId) },
    participatesInPredicate(),
  );
}

/** Claim that an account's posting in a transaction is reconciled. */
export function reconciledUtterance(account, transactionId) {
  return utterance(
    { subject: ledgerAccountTerm(account), object: ledgerTransactionTerm(transactionId) },
    isReconciledPredicate(),
  );
}

// ---------- carrier settlement ----------

/**
 * A double-entry ledger carrier: a FinancialTopologyCarrier specialized to the
 * ledger domain. It is settled by the same meme-topology engine as its financial
 * base (`induceFinancialTopology`), so its `settlement` filtration and `readings`
 * fixed points are read with the identical section machinery; only the `kind`
 * discriminator and the booked vocabulary differ.
 */

/** Settle a log of ledger utterances into a LedgerTopologyCarrier. */
export function induceLedgerTopology(utterances) {
  const base = induceFinancialTopology(utterances);
  return Object.freeze({
    ...base,
    kind: "ledger.topology.carrier",
  });
}

/** Apply a delta of new utterances to an existing carrier, returning a new settled carrier. */
export function extendLedgerTopology(
  carrier,
  delta,
) {
  const base = extendFinancialTopology(carrier, delta);
  return Object.freeze({
    ...base,
    kind: "ledger.topology.carrier",
  });
}

// ---------- section reads ----------

/** A section's knowledge reading at a subject (or relation pair) under a predicate. */
const readingByBoundary = (section, subject, predicate) => knowledgeReading(evidenceByBoundary(section, subject, predicate));

/** The settled section of a LedgerTopologyCarrier. */
export const ledgerKnowledgeSection = financialKnowledgeSection;

/** The section read in the truth order: the same settled cells. */
export const ledgerTruthSection = financialKnowledgeSection;

// ---------- single-cell reading reads ----------

/** Reading at "account is-debit-normal". */
export function debitNormalReading(section, account) {
  return readingByBoundary(section, ledgerAccountTerm(account), isDebitNormalPredicate());
}

/** Reading at "account is-credit-normal". */
export function creditNormalReading(section, account) {
  return readingByBoundary(section, ledgerAccountTerm(account), isCreditNormalPredicate());
}

/** Reading at "account is-open". */
export function accountOpenReading(section, account) {
  return readingByBoundary(section, ledgerAccountTerm(account), isOpenPredicate());
}

/** Reading at "account is-closed" — the contrary claim to is-open, read in its own cell. */
export function accountClosedReading(section, account) {
  return readingByBoundary(section, ledgerAccountTerm(account), isClosedPredicate());
}

/** Reading at "account participates-in transaction". */
export function participantReading(section, account, transactionId) {
  return readingByBoundary(
    section,
    { subject: ledgerAccountTerm(account), object: ledgerTransactionTerm(transactionId) },
    participatesInPredicate(),
  );
}

/** Reading at "child is-sub-account-of parent". */
export function subAccountReading(section, child, parent) {
  return readingByBoundary(
    section,
    { subject: ledgerAccountTerm(child), object: ledgerAccountTerm(parent) },
    isSubAccountOfPredicate(),
  );
}

/** Reading at "account is-reconciled for transaction". */
export function reconciledReading(section, account, transactionId) {
  return readingByBoundary(
    section,
    { subject: ledgerAccountTerm(account), object: ledgerTransactionTerm(transactionId) },
    isReconciledPredicate(),
  );
}

// ---------- multi-entry section reads ----------

/** All predicates claimed about an account. */
export function ledgerAccountEntries(section, account) {
  return about(section, ledgerAccountTerm(account));
}

/** All accounts that have the debit-normal convention. */
export function allDebitNormal(section) {
  return under(section, isDebitNormalPredicate());
}

/** All accounts that have the credit-normal convention. */
export function allCreditNormal(section) {
  return under(section, isCreditNormalPredicate());
}

/** All accounts claimed open. */
export function allOpen(section) {
  return under(section, isOpenPredicate());
}

/** All accounts claimed closed — the contrary predicate's cells, not a denied bucket. */
export function allClosed(section) {
  return under(section, isClosedPredicate());
}

/** All account postings that participate in any transaction. */
export function allTransactionParticipantAccountEntries(section) {
  return under(section, participatesInPredicate());
}
