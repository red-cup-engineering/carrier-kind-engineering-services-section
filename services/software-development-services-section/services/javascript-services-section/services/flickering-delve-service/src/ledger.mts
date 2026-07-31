/**
 * `ledger` — an append-only, double-entry audit journal for real-money flows.
 *
 * The brief: micropayments are "not the point, but require internal auditability, which is
 * feasible given the ecosystem." So we don't hand-roll bookkeeping — we record every cleared
 * payment as a balanced double-entry transaction and lean on the ecosystem to *prove* the
 * books: the journal is rendered to canonical hledger text, parsed by
 * `@red-cup-engineering/computing-with-ledgers`, and loaded by organizing's accounting ledger, which
 * reports the running balances and flags any malformed/imbalanced entry. "Auditable" here means a third
 * party can replay our journal text through the same standard tooling and get the same
 * balances — the trace is the audit.
 *
 * Append-only: entries are never mutated or deleted, only appended, and persisted as a journal
 * file. That is the same event-sourced discipline the world trace uses, applied to money.
 */
import loadLedger from "@red-cup-engineering/organizing/accounting/ledger";
import { parseHledger } from "@red-cup-engineering/computing-with-ledgers/parse";
import { formatAmount } from "@red-cup-engineering/computing-with-ledgers/decimal";

/** One side of a transaction: an account path and a signed amount in a commodity. */
export interface Posting {
  readonly account: string;
  /** Signed decimal as a string (e.g. "4.99", "-4.99") — exact, never a float. */
  readonly amount: string;
  readonly commodity: string;
}

/** One append-only journal entry: a dated, narrated, balanced set of postings. */
export interface LedgerEntry {
  readonly date: string;
  readonly narration: string;
  readonly postings: readonly Posting[];
  /** The order/event this entry records, for cross-reference with payments. */
  readonly ref: string;
}

/** Sum postings per commodity in integer minor units, to check the double-entry invariant. */
function imbalances(postings: readonly Posting[]): string[] {
  const byCommodity = new Map<string, number>();
  for (const p of postings) {
    const n = Number(p.amount);
    if (!Number.isFinite(n)) return [`non-numeric amount "${p.amount}"`];
    // Work in 1e6 minor units so 3-dp commodities (HIVE/HBD) and 2-dp (USD) are exact enough.
    byCommodity.set(p.commodity, Math.round((byCommodity.get(p.commodity) ?? 0) + n * 1e6));
  }
  const bad: string[] = [];
  for (const [c, sum] of byCommodity) if (sum !== 0) bad.push(`${c} off by ${sum / 1e6}`);
  return bad;
}

/** Render entries to canonical hledger journal text — the portable, replayable artifact. */
export function journalText(entries: readonly LedgerEntry[]): string {
  const out: string[] = [];
  for (const e of entries) {
    out.push(`${e.date} * ${e.narration}  ; ref:${e.ref}`);
    for (const p of e.postings) out.push(`    ${p.account}  ${p.amount} ${p.commodity}`);
    out.push("");
  }
  return out.join("\n");
}

export interface AuditReport {
  readonly entries: number;
  readonly balanced: boolean;
  readonly malformed: number;
  /** account → commodity → formatted balance. */
  readonly balances: Record<string, Record<string, string>>;
  readonly journal: string;
}

export class AuditLedger {
  private readonly entries: LedgerEntry[] = [];

  constructor(initial: readonly LedgerEntry[] = []) {
    this.entries.push(...initial);
  }

  /** All entries (append-only view). */
  all(): readonly LedgerEntry[] {
    return this.entries;
  }

  /**
   * Append a balanced entry. Throws if the postings do not net to zero per commodity — an
   * unbalanced transaction is a bug, and we refuse to record bad books.
   */
  record(entry: LedgerEntry): void {
    const bad = imbalances(entry.postings);
    if (bad.length > 0) throw new RangeError(`ledger: unbalanced entry ${entry.ref}: ${bad.join("; ")}`);
    this.entries.push(entry);
  }

  /** Whether an entry with this ref already exists (idempotency for webhook retries). */
  has(ref: string): boolean {
    return this.entries.some((e) => e.ref === ref);
  }

  /**
   * Audit the books by replaying the journal through the standard ecosystem tooling:
   * parse the hledger text and load it, returning the independently-computed balances and a
   * balanced/malformed verdict. This is the auditability guarantee — the numbers come from
   * organizing's accounting ledger, not from us.
   */
  audit(): AuditReport {
    const journal = journalText(this.entries);
    const balances: Record<string, Record<string, string>> = {};
    let malformed = 0;
    if (this.entries.length > 0) {
      const parsed = parseHledger(journal, {}) as { entries?: unknown[] };
      const list = Array.isArray(parsed) ? parsed : (parsed.entries ?? []);
      const led = loadLedger(list as never);
      malformed = led.malformed.length;
      for (const [account, perCommodity] of led.balances) {
        const row: Record<string, string> = {};
        // The ecosystem's own decimal formatter renders the rational Amount exactly.
        for (const [commodity, amount] of perCommodity) row[commodity] = formatAmount(amount as never);
        balances[account] = row;
      }
    }
    return { entries: this.entries.length, balanced: malformed === 0, malformed, balances, journal };
  }

  toJSON(): readonly LedgerEntry[] {
    return this.entries;
  }
}
