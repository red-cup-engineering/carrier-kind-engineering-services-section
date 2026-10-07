/**
 * accounting/consolidation — a legal entity's books read as one: its own holdings book and the
 * books of the micro-enterprises it signs for (561 Group note of 2026-09-30, "Micro-enterprises
 * hold their own work": books are federated, and the entity's ledger is their consolidation).
 *
 * - Every transaction carries the book it came from as `book` metadata.
 * - An account is opened once, at its earliest opening in any book.
 * - Amounts between members stand on pairwise credit lines: `Assets:Credit-Lines:<Member>` in the
 *   creditor's book and `Liabilities:Credit-Lines:<Member>` in the debtor's, each naming the other
 *   side. Consolidated, a credit line between two members of the same entity is eliminated: both
 *   sides read as one intra-group account, whose balance is what the two books have not matched.
 *   Balance assertions on an eliminated line are a member's own and are left to its book.
 * - Services one member renders another are booked as `Income:Intra-Group-Services:<Member>` in the
 *   provider's book and `Expenses:Intra-Group-Services:<Member>` in the requester's. Consolidated,
 *   both read as one intra-group services account, zero when every pair agrees, so the entity's
 *   income statement counts only what crossed its border.
 * @packageDocumentation
 */
import { isDirective, isTransaction } from "./ledger.mjs";

/** Where consolidated intra-group credit lines read: zero when every pair of books agrees. */
export const INTRA_GROUP_ACCOUNT = "Assets:Intra-Group:Unmatched-Credit-Lines";

/** Where consolidated intra-group services read: zero when every provider's income meets its requester's expense. */
export const INTRA_GROUP_SERVICES_ACCOUNT = "Income:Intra-Group:Unmatched-Services";

/**
 * The account one book keeps for services exchanged with another member.
 * @param {"provider" | "requester"} side which side of the service the keeping book is on
 * @param {string} counterparty the other book
 */
export function intraGroupServicesAccount(side, counterparty) {
  if (side !== "provider" && side !== "requester") throw new TypeError(`a service is kept as provider or requester, not ${side}`);
  return `${side === "provider" ? "Income" : "Expenses"}:Intra-Group-Services:${bookSegment(counterparty)}`;
}

/** A book's name as an account segment. */
export function bookSegment(book) {
  return String(book).split(/[^A-Za-z0-9]+/u).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join("-");
}

/**
 * The credit-line account one book keeps against another.
 * @param {"creditor" | "debtor"} side which side of the line the keeping book is on
 * @param {string} counterparty the other book
 */
export function creditLineAccount(side, counterparty) {
  if (side !== "creditor" && side !== "debtor") throw new TypeError(`a credit line is kept as creditor or debtor, not ${side}`);
  return `${side === "creditor" ? "Assets" : "Liabilities"}:Credit-Lines:${bookSegment(counterparty)}`;
}

/**
 * @param {readonly { book: string, entries: readonly object[] }[]} books each book's parsed entries
 * @returns {object[]} the consolidated entries
 */
export function consolidateBooks(books) {
  const members = new Set(books.map(({ book }) => bookSegment(book)));
  const memberOf = (pattern, account) => {
    const match = pattern.exec(account ?? "");
    return match !== null && members.has(match[1]);
  };
  const accountOf = (account) => (memberOf(/^(?:Assets|Liabilities):Credit-Lines:([^:]+)$/u, account) ? INTRA_GROUP_ACCOUNT
    : memberOf(/^(?:Income|Expenses):Intra-Group-Services:([^:]+)$/u, account) ? INTRA_GROUP_SERVICES_ACCOUNT : account);
  const eliminated = (account) => accountOf(account) !== account;
  const opened = new Map();
  const entries = [];
  for (const { book, entries: held } of books) {
    for (const entry of held) {
      if (isTransaction(entry)) {
        entries.push(Object.freeze({
          ...entry,
          meta: Object.freeze({ ...entry.meta, book }),
          postings: Object.freeze(entry.postings.map((posting) => (eliminated(posting.account) ? Object.freeze({ ...posting, account: accountOf(posting.account), balanceAssertion: null }) : posting))),
        }));
      } else if (isDirective(entry) && entry.directive === "open") {
        const account = accountOf(entry.account);
        const prior = opened.get(account);
        if (!prior || String(entry.date ?? "") < String(prior.date ?? "")) opened.set(account, Object.freeze({ ...entry, account }));
      } else if (isDirective(entry) && ["balance", "pad", "close"].includes(entry.directive) && eliminated(entry.account)) {
        continue;
      } else if (isDirective(entry) && entry.directive === "include") {
        continue;
      } else {
        entries.push(entry);
      }
    }
  }
  return [...opened.values(), ...entries];
}
