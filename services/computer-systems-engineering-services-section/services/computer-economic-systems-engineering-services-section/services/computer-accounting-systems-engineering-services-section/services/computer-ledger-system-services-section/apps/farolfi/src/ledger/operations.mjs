/**
 * integrations/ledger — the reading and maintenance surface of a legal entity's books: its own
 * holdings book (the configured book of record) and, where the host keeps them, the books its
 * micro-enterprises keep in their own roots, read one at a time or consolidated.
 * @packageDocumentation
 */
import { existsSync } from "node:fs";
import { readLedgerReport } from "@red-cup-engineering/farolfi/ledger/reports";
import { readSetOfLedgerReadings } from "@red-cup-engineering/farolfi/ledger/readings";
import { deriveChainBalanceAssertions } from "@red-cup-engineering/farolfi/ledger/maintenance/chain-balance-assertions";
import { derivePriceDirectives } from "@red-cup-engineering/farolfi/ledger/maintenance/price-directives";
import { deriveSetOfCandidateTransactions } from "@red-cup-engineering/farolfi/ledger/maintenance/candidate-transactions";
import { deriveSetOfCardPurchaseTransactions } from "./maintenance/card-purchases.mjs";
import { deriveSetOfFixedAssetRegistrations } from "./maintenance/fixed-assets.mjs";
import { deriveSetOfFillTransactions } from "@red-cup-engineering/farolfi/ledger/maintenance/venue-fills";
import { deriveSetOfSettlementTransactions } from "./maintenance/settlements.mjs";
import { processEnvValue } from "@red-cup-engineering/node-process-services-section/environment";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";

const LEDGER_REPORT_NAMES = Object.freeze([
  "balance", "balance-sheet", "income-statement", "cashflow", "register",
  "accounts", "stats", "lots", "valuation", "reconcile", "check",
]);

const ledgerReportFiltersSchema = Object.freeze({
  book: { type: "string", description: "One book to read: a micro-enterprise's own, or the entity's holdings by the entity's id. Omitted, the entity's books consolidated." },
  begin: { type: "string", description: "Inclusive ISO date lower bound for dated reports." },
  end: { type: "string", description: "Exclusive ISO date upper bound for dated reports." },
  account: { type: "string", description: "Account-name regular expression filter." },
  depth: { type: "integer", minimum: 1, description: "Account-tree depth to roll balances up to." },
  status: { type: "string", description: "Posting/transaction status filter." },
  payee: { type: "string", description: "Payee regular expression filter." },
  requireMeta: { type: "string", description: "For report \"check\" only: a transaction metadata key every transaction must carry." },
});

/** Domain schema for `ledger-report`: the section's own request schema minus `journal`,
 *  which this deployment resolves itself rather than accepting from a caller. */
export const ledgerReportRequestContract = schemaFrom({
  $id: "metroplat/ledger/report-request",
  type: "object",
  required: ["report"],
  additionalProperties: false,
  properties: {
    report: { enum: LEDGER_REPORT_NAMES },
    ...ledgerReportFiltersSchema,
  },
});

/** Domain schema for `ledger-readings`: the same filters, no `report` (the reading set is fixed). */
export const ledgerReadingsRequestContract = schemaFrom({
  $id: "metroplat/ledger/readings-request",
  type: "object",
  additionalProperties: false,
  properties: { ...ledgerReportFiltersSchema },
});

const proposalInput = (id, required, properties) => schemaFrom({
  $id: id,
  type: "object",
  required,
  additionalProperties: false,
  properties,
});

export const chainBalanceProposalRequestContract = proposalInput(
  "metroplat/ledger/chain-balance-proposal-request", ["date"], { date: { type: "string" } },
);
export const marketPriceProposalRequestContract = proposalInput(
  "metroplat/ledger/market-price-proposal-request", ["date", "sources"], { date: { type: "string" }, sources: { type: "object" } },
);
export const reconciliationProposalRequestContract = proposalInput(
  "metroplat/ledger/reconciliation-proposal-request", ["mismatches"], { mismatches: { type: "array" } },
);
export const cardPurchaseProposalRequestContract = proposalInput(
  "metroplat/ledger/card-purchase-proposal-request", ["reportingEntity", "purchaseSet"], { reportingEntity: { type: "string" }, purchaseSet: { type: "object" } },
);
export const settlementProposalRequestContract = schemaFrom({
  $id: "metroplat/ledger/settlement-proposal-request",
  type: "object",
  additionalProperties: false,
  properties: {
    settlements: { type: "array", items: { type: "object" }, description: "Settlement, deposit or payout records to post." },
    enterprise: { type: "string", description: "Read this enterprise's recorded settlements instead of passing them." },
    since: { type: "string", description: "With enterprise: only settlements recorded on or after this ISO date." },
  },
});
export const venueFillProposalRequestContract = proposalInput(
  "metroplat/ledger/venue-fill-proposal-request", ["fills"], { fills: { type: "array" } },
);

/**
 * Reads `METROPLAT_LEDGER_JOURNAL` from the process environment.
 * @throws {TypeError} When the setting is unset or empty — never a silent empty result.
 */
export function ledgerJournalPath() {
  const path = processEnvValue("METROPLAT_LEDGER_JOURNAL");
  if (path === undefined || path.trim() === "") {
    throw new TypeError("ledger-report: METROPLAT_LEDGER_JOURNAL is not set; this deployment has no configured book of record");
  }
  return path;
}

/**
 * @typedef {{ entity?: string, holdings?: string, members: { book: string, path: string }[] }} EntityBooks
 *   a legal entity's own holdings book and the books of the micro-enterprises it signs for
 */

/** Without a host's books, the entity's books are the configured book of record alone. */
const configuredBooks = (books) => (books ? books() : { holdings: ledgerJournalPath(), members: [] });

/**
 * The journal one reading takes: a named book, or the entity's books consolidated.
 * @param {(() => EntityBooks) | undefined} books
 * @param {string} [book]
 */
export function journalOfBooks(books, book) {
  const { entity, holdings, members } = configuredBooks(books);
  const names = [...(holdings ? [entity ?? "holdings"] : []), ...members.map((member) => member.book)];
  if (book === undefined) {
    if (members.length === 0) return { path: holdings ?? ledgerJournalPath() };
    return { books: [...(holdings ? [{ book: entity ?? "holdings", path: holdings }] : []), ...members] };
  }
  if (holdings && book === (entity ?? "holdings")) return { path: holdings };
  const member = members.find((candidate) => candidate.book === book);
  if (!member) throw new TypeError(`no book ${book}: the books are ${names.join(", ")}`);
  return existsSync(member.path) ? { path: member.path } : { text: "", format: "beancount" };
}

/**
 * @param {unknown} [_binding] the host binding a family factory is called with; unused
 * @param {{ books?: () => EntityBooks }} [options] the host's books; without them, the configured book of record
 * @returns The two ledger reading operations.
 */
export function ledgerReportOperations(_binding, { books } = {}) {
  return Object.freeze([
    operation({
      verb: "ledger-report",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read one accounting report from the entity's books, consolidated or one book at a time.",
      description: "Domain: { report, book?, begin?, end?, account?, depth?, status?, payee?, requireMeta? }. Without book, reads the entity's holdings book (METROPLAT_LEDGER_JOURNAL) consolidated with each micro-enterprise's own book, intra-group credit lines eliminated; with book, that book alone.",
      domain: ledgerReportRequestContract,
      run: async ({ book, ...input }) => readLedgerReport({
        ...input,
        journal: journalOfBooks(books, book),
      }),
    }),
    operation({
      verb: "ledger-readings",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read the standard set of books readings (balance sheet, income statement, reconcile, stats, accounts) in one call.",
      description: "Domain: { book?, begin?, end?, account?, depth?, status?, payee?, requireMeta? }. Reads the standard books view of the entity's consolidated books, or of one book.",
      domain: ledgerReadingsRequestContract,
      run: async ({ book, ...input }) => readSetOfLedgerReadings({
        ...input,
        journal: journalOfBooks(books, book),
      }),
    }),
  ]);
}

async function openAccountsIn(journal) {
  const report = await readLedgerReport({ journal, report: "accounts" });
  return Array.isArray(report.accounts) ? report.accounts : [];
}
const openAccountsInConfiguredBook = () => openAccountsIn({ path: ledgerJournalPath() });

/**
 * Propose book changes at the only real operating boundary: Metroplat's configured
 * book of record. These operations never write a caller-selected server path; they
 * return reviewable Beancount material for the operator to accept deliberately.
 */
/**
 * @param {unknown} [_binding] the host binding a family factory is called with; unused
 * @param {{ settlementsOf?: (enterprise: string, since?: string) => object[], books?: () => EntityBooks }} [options]
 *   where an enterprise's recorded settlements are read from, when the host keeps an enterprise
 *   store, and the host's books, so an enterprise's settlements are proposed against its own book.
 */
export function ledgerMaintenanceOperations(_binding, { settlementsOf, books } = {}) {
  return Object.freeze([
    operation({
      verb: "ledger-chain-balance-proposal", inputFormat: "json", outputFormat: "json",
      summary: "Observe configured custody wallets and propose balance assertions for the configured book.",
      description: "Domain: { date }. Observes Hive, Hive-Engine, and Base at the supplied cutoff against METROPLAT_LEDGER_JOURNAL; returns directives and a reviewable proposal without writing a sidecar.",
      domain: chainBalanceProposalRequestContract,
      run: (input) => deriveChainBalanceAssertions({ ledger: ledgerJournalPath(), date: input.date }),
    }),
    operation({
      verb: "ledger-market-price-proposal", inputFormat: "json", outputFormat: "json",
      summary: "Observe market prices and propose price directives for the configured book.",
      description: "Domain: { date, sources }. Sources maps commodity symbols to their CoinGecko identities; returns a reviewable proposal and never writes a caller-selected file.",
      domain: marketPriceProposalRequestContract,
      run: (input) => derivePriceDirectives({ ledger: ledgerJournalPath(), date: input.date, sourcesMap: input.sources }),
    }),
    operation({
      verb: "ledger-reconciliation-proposal", inputFormat: "json", outputFormat: "json",
      summary: "Turn verified chain-versus-book mismatches into reviewable balancing transaction candidates.",
      description: "Domain: { mismatches }. Existing accounts are read from METROPLAT_LEDGER_JOURNAL so only genuinely absent accounts are proposed for opening.",
      domain: reconciliationProposalRequestContract,
      run: async (input) => deriveSetOfCandidateTransactions({ ...input, openAccounts: await openAccountsInConfiguredBook() }),
    }),
    operation({
      verb: "ledger-card-purchase-proposal", inputFormat: "json", outputFormat: "json",
      summary: "Apply the two-book law to card-purchase evidence and propose both postings and asset-register entries.",
      description: "Domain: { reportingEntity, purchaseSet }. One operation produces the related transaction and fixed-asset-register material together against the configured book.",
      domain: cardPurchaseProposalRequestContract,
      run: async (input) => {
        const openAccounts = await openAccountsInConfiguredBook();
        return Object.freeze({
          kind: "ledger-card-purchase-proposal",
          transactions: deriveSetOfCardPurchaseTransactions({ ...input, openAccounts }),
          fixedAssets: deriveSetOfFixedAssetRegistrations({ ...input, openAccounts }),
        });
      },
    }),
    operation({
      verb: "ledger-settlement-proposal", inputFormat: "json", outputFormat: "json",
      summary: "Turn an enterprise's closings, earnest-money deposits and value-added payouts into reviewable transaction candidates.",
      description: "Domain: { settlements } or { enterprise, since }. A settlement receives its fee as the enterprise's service income, returns credited deposits, and accrues each value-added share as payable to its party; with enterprise, the settlements are read from its own records and existing accounts from its own book, otherwise from the configured book.",
      domain: settlementProposalRequestContract,
      run: async ({ settlements, enterprise, since } = {}) => {
        const records = settlements ?? (enterprise && settlementsOf ? settlementsOf(enterprise, since) : undefined);
        if (!records) throw new TypeError("ledger-settlement-proposal: pass settlements, or an enterprise on a host that keeps an enterprise store");
        const book = enterprise && books ? configuredBooks(books).members.find((member) => member.book === enterprise) : undefined;
        const openAccounts = book ? (existsSync(book.path) ? await openAccountsIn({ path: book.path }) : []) : await openAccountsInConfiguredBook();
        return Object.freeze({ ...deriveSetOfSettlementTransactions({ settlements: records, openAccounts }), ...(book ? { book: book.path } : {}) });
      },
    }),
    operation({
      verb: "ledger-venue-fill-proposal", inputFormat: "json", outputFormat: "json",
      summary: "Turn witnessed venue fills into FIFO, gain-or-loss-aware transaction candidates.",
      description: "Domain: { fills }. Existing accounts are read from the configured book; witness disagreement remains a refusal in the returned proposal.",
      domain: venueFillProposalRequestContract,
      run: async (input) => deriveSetOfFillTransactions({ ...input, openAccounts: await openAccountsInConfiguredBook() }),
    }),
  ]);
}
