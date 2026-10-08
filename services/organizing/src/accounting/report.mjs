/**
 * @red-cup-engineering/organizing/accounting/report — the full ledger report suite, the
 * settled readings of the adjudicated accounting record-state (stage 9
 * substrate; the ported double-entry reporting layer of
 * dev/docs/notes/2026-06-22-trading-as-settling-over-value-categories.md §4 stage 9
 * and §7 "double-entry ledger engine → the `organizing` adjudicated record-state;
 * reports = settled readings").
 *
 * A report here is never a computation that mutates the books — it is a *reading* of
 * the already-settled `LoadedLedger` (the cleared record-state `institute`/`adjudicate`
 * formed). Thirteen readings, consolidated into
 * one module for the rebuild wave:
 *
 *   - **balance / balsheet / incomestmt** — ledger balance, balance sheet, and income
 *     statement readings over a scoped window.
 *   - **cashflow** — cash-account movement over a period. It is not a classified
 *     statement of cash flows unless the selected account structure supplies that
 *     classification.
 *   - **register** — the chronological posting journal with a per-commodity running
 *     total (a bank-statement reading when scoped to one account).
 *   - **accounts / stats** — the structural readings (the account set; the journal
 *     summary, whose distinctive line is the count of HELD ⊤ contradictions).
 *   - **lots** — open native positions with acquisition date, historical unit cost,
 *     and book value kept separate from transaction and market prices.
 *   - **valuation** — those open lots measured by the latest eligible dated price,
 *     with missing prices explicit and historical cost left unchanged.
 *   - **check** — the HEADLINE and the clearest expression of the package's no-halt
 *     thesis. Where beancount/hledger print the FIRST error and exit non-zero (halting
 *     the books), `checkReport` lists EVERY held problem — ⊤ contradictions on the
 *     worklist, failed checks, malformed lines — and **ALWAYS returns `exitCode: 0`**.
 *     The contradictions are carried, not fatal (the §4 anti-fetishism reading: a held
 *     ⊤ is evidence on the carrier, surfaced as a reconciliation worklist, never a
 *     thrown halt). `cohomologyVanishesInRegime`-style "no obstruction ⟹ glued" is the
 *     `ok` line; a non-empty worklist is the carried H¹ residue, still exit 0.
 *   - **print** — render parsed entries back to journal text (beancount/hledger).
 *   - **tree / filter** — the shared scaffolding (the account hierarchy with rolled-up
 *     subtree totals; the pure regex/period selectors).
 *
 * THE ONE DISPLAY RULE (the saturation point). A rational becomes a decimal
 * string ONLY at the render edge, and that edge is
 * `@red-cup-engineering/gaming/market` `gradedToDecimalString`: never a float, never an
 * ad-hoc `.toString()`. Every report computes over the layer-1 `Money`
 * carrier, a graded exact rational value.
 *
 * Capability-preserving (CLAUDE.md normalization rule): this ports — never drops — the
 * eleven live readings of the current package; only the money substrate and the display
 * edge are re-homed.
 */

import loadLedger, {
  runningBalances,
  isTransaction,
  isDirective,
  isMalformed,
  postingHolding,
} from "./ledger.mjs";
import { gradeOf, gradedAdd, gradedFromParts, gradedIsZero, gradedNegate, gradedSubtract, gradedTimes, gradedToDecimalString, gradedToExactString } from "@red-cup-engineering/exact-number-data-service/graded";


// ════════════════════════════════════════════════════════════════════════════════════
// render — the SOLE rational→decimal display edge
// ════════════════════════════════════════════════════════════════════════════════════
// The saturation layer. A `Money` becomes a string ONLY here, via the
// layer-1 economy display edge. Reports compute in exact graded rationals and
// call these to print. `registry` is accepted for signature stability but the
// display precision is decided by `gradedToDecimalString`, not threaded precision.

/** fmt — one Money to "1,234.56 USD" (number, a space, then its commodity). */
export const fmt = (amount, _registry) =>
  `${gradedToDecimalString(amount)} ${gradeOf(amount)}`;

/** fmtNum — just the number part (no commodity), for columnar layouts. */
export const fmtNum = (amount, _registry) =>
  gradedToDecimalString(amount);

/** fmtBag — a Map<commodity, Money> to an array of strings, sorted by commodity. Empty bag → []. */
export const fmtBag = (
  bag,
  registry,
) =>
  [...(bag ?? new Map()).entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, amt]) => fmt(amt, registry));

/** renderTable — rows of cells to a left-aligned, space-padded monospace table. `align` is
 *  an array of "l"|"r" per column (default left); columns are sized to their widest cell. */
export const renderTable = (
  rows,
  { align = [], gap = 2 } = {},
) => {
  if (rows.length === 0) return "";
  const cols = Math.max(...rows.map((r) => r.length));
  const width = [];
  for (let c = 0; c < cols; c++) width[c] = Math.max(...rows.map((r) => (r[c] ?? "").length));
  const pad = (s, w, a) => (a === "r" ? s.padStart(w) : s.padEnd(w));
  return rows
    .map((r) =>
      r
        .map((cell, c) => pad(cell ?? "", width[c] ?? 0, align[c] ?? "l"))
        .join(" ".repeat(gap))
        .replace(/\s+$/, ""),
    )
    .join("\n");
};

/** indent — n levels of two-space indent. */
export const indent = (n) => "  ".repeat(Math.max(0, n));

/** toCSV — rows of cells to CSV (quoting cells with commas/quotes/newlines). */
export const toCSV = (rows) =>
  rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");

// ════════════════════════════════════════════════════════════════════════════════════
// tree — the account hierarchy with rolled-up subtree totals
// ════════════════════════════════════════════════════════════════════════════════════
// Turn a flat Map<account, Map<commodity, Money>> into a hierarchy keyed by the
// colon-delimited account segments; each node carries its OWN per-commodity balance and
// a rolled-up SUBTREE TOTAL. Feeds balance / balsheet / incomestmt / cashflow.

const node = (name, segment, depth) => ({
  name,
  segment,
  depth,
  own: new Map(),
  total: new Map(),
  children: new Map(),
});

const addInto = (bag, amt) => {
  const ccy = gradeOf(amt);
  const cur = bag.get(ccy);
  bag.set(ccy, cur ? gradedAdd(cur, amt) : amt);
};

/** buildTree — flat per-account balances → the rolled-up account tree. */
export function buildTree(balances) {
  const root = node("", "", -1);
  for (const [account, bag] of balances) {
    const parts = account.split(":");
    let cur = root;
    let path = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] ?? "";
      path = i === 0 ? part : `${path}:${part}`;
      let child = cur.children.get(part);
      if (!child) {
        child = node(path, part, i);
        cur.children.set(part, child);
      }
      cur = child;
    }
    for (const [, amt] of bag) addInto(cur.own, amt);
  }
  rollup(root);
  return root;
}

function rollup(n) {
  const total = new Map();
  for (const [, amt] of n.own) addInto(total, amt);
  for (const [, child] of n.children) {
    rollup(child);
    for (const [, amt] of child.total) addInto(total, amt);
  }
  n.total = total;
}

/** walk — visit every node depth-first, children in sorted segment order. */
export function walk(root, visit) {
  const rec = (n) => {
    for (const seg of [...n.children.keys()].sort()) {
      const child = n.children.get(seg);
      visit(child);
      rec(child);
    }
  };
  rec(root);
}

/** subtree — the immediate child node for a top-level segment (e.g. "Assets"), or null. */
export function subtree(root, rootSegment) {
  return root.children.get(rootSegment) ?? null;
}

// ════════════════════════════════════════════════════════════════════════════════════
// filter — pure period / regex selectors over transactions and balances
// ════════════════════════════════════════════════════════════════════════════════════
// Every function returns a NEW filtered collection, mutating nothing. Never throws on a
// bad regex (an unparseable pattern compiles to the never-matching `/a^/`).

const compileRe = (pat) => {
  if (!pat) return null;
  try {
    return new RegExp(pat);
  } catch {
    return /a^/;
  }
};

/** filterTransactions — select by account/period/status/payee (each criterion optional). */
export function filterTransactions(
  txns,
  {
    account,
    begin,
    end,
    status,
    payee,
  }

 = {},
) {
  const accRe = compileRe(account ?? null);
  const payeeRe = compileRe(payee ?? null);
  const statusSet = status ? new Set(Array.isArray(status) ? status : [status]) : null;
  return txns.filter((t) => {
    if (begin && t.date < begin) return false;
    if (end && t.date >= end) return false;
    if (statusSet && !statusSet.has(t.flag ?? "")) return false;
    if (payeeRe && !payeeRe.test(`${t.payee ?? ""} ${t.narration}`)) return false;
    if (accRe && !t.postings.some((p) => accRe.test(p.account))) return false;
    return true;
  });
}

/** filterBalances — select balances by account regex, optionally collapsing to a max depth. */
export function filterBalances(
  balances,
  { account, depth } = {},
) {
  const accRe = compileRe(account ?? null);
  const out = new Map();
  for (const [acct, bag] of balances) {
    if (accRe && !accRe.test(acct)) continue;
    const key = depth ? acct.split(":").slice(0, depth).join(":") : acct;
    let target = out.get(key);
    if (!target) {
      target = new Map();
      out.set(key, target);
    }
    for (const [ccy, amt] of bag) {
      const cur = target.get(ccy);
      target.set(ccy, cur ? gradedAdd(cur, amt) : amt);
    }
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════════════
// statement scaffolding — shared multi-section financial-statement helpers
// ════════════════════════════════════════════════════════════════════════════════════
// Each statement is: build the account tree, pull named root subtrees, print each as an
// indented section with a subtotal, then a closing net line. Amounts stay exact graded
// rationals until render.

/** sumMaps — sum a list of Map<ccy, Money> into one bag. */
export function sumMaps(maps) {
  const out = new Map();
  for (const m of maps) {
    for (const [ccy, amt] of m ?? []) {
      const cur = out.get(ccy);
      out.set(ccy, cur ? gradedAdd(cur, amt) : amt);
    }
  }
  return out;
}

/** negateBag — flip the sign of every amount in a bag (e.g. to show Income/Liabilities as positives). */
export function negateBag(bag) {
  const out = new Map();
  for (const [ccy, amt] of bag ?? []) out.set(ccy, gradedNegate(amt));
  return out;
}

/** sectionRows — an indented account/amount table for ONE root subtree, with a subtotal
 *  line. `flip` negates display amounts (Income, Liabilities and Equity read naturally as
 *  positives). */
export function sectionRows(
  root,
  segment,
  registry,
  { flip = false } = {},
) {
  const sub = subtree(root, segment);
  const rows = [[segment, ""]];
  if (sub) {
    walk(sub, (n) => {
      if (n.total.size === 0) return;
      const bag = flip ? negateBag(n.total) : n.total;
      const amts = fmtBag(bag, registry);
      rows.push([indent(n.depth) + n.segment, amts[0] ?? ""]);
      for (let i = 1; i < amts.length; i++) rows.push(["", amts[i] ?? ""]);
    });
  }
  const subtotal = sub ? (flip ? negateBag(sub.total) : sub.total) : new Map();
  const subAmts = fmtBag(subtotal, registry);
  rows.push([indent(1) + `Total ${segment}`, subAmts[0] ?? "0"]);
  for (let i = 1; i < subAmts.length; i++) rows.push(["", subAmts[i] ?? ""]);
  return { rows, total: sub ? sub.total : new Map() };
}

/** netRow — a labelled net line from an already-summed bag. */
export function netRow(label, bag, registry) {
  const amts = fmtBag(bag, registry);
  const rows = [[label, amts[0] ?? "0"]];
  for (let i = 1; i < amts.length; i++) rows.push(["", amts[i] ?? ""]);
  return rows;
}

// ════════════════════════════════════════════════════════════════════════════════════
// balance — per-account balances, hierarchically rolled up; plus the period helpers
// ════════════════════════════════════════════════════════════════════════════════════

const allTxns = (led) => [...led.transactions, ...led.synthesized];

/** balancesCumulative — every posting strictly before `end` (or all, if no end). */
export function balancesCumulative(
  led,
  { end } = {},
) {
  if (!end) return led.balances;
  const txns = allTxns(led).filter((t) => t.date < end);
  return runningBalances(txns, led.registry);
}

/** balancesRange — the CHANGE per account over [begin, end): balance before `end` minus
 *  balance strictly before `begin`. With no bounds it equals the cumulative balances. */
export function balancesRange(
  led,
  { begin, end } = {},
) {
  if (!begin && !end) return led.balances;
  const txns = allTxns(led);
  const endBal = runningBalances(end ? txns.filter((t) => t.date < end) : txns, led.registry);
  if (!begin) return endBal;
  const beginBal = runningBalances(txns.filter((t) => t.date < begin), led.registry);

  const out = new Map();
  for (const acct of new Set([...endBal.keys(), ...beginBal.keys()])) {
    const e = endBal.get(acct) ?? new Map();
    const b = beginBal.get(acct) ?? new Map();
    const bag = new Map();
    for (const ccy of new Set([...e.keys(), ...b.keys()])) {
      const ea = e.get(ccy);
      const ba = b.get(ccy);
      let delta;
      if (ea && ba) delta = gradedSubtract(ea, ba);
      else if (ea) delta = ea;
      else delta = gradedNegate(ba);
      if (!gradedIsZero(delta)) bag.set(ccy, delta);
    }
    if (bag.size) out.set(acct, bag);
  }
  return out;
}

/** balanceReport — the `bal` reading: cumulative per-account balances, scoped by
 *  account/depth/end, rolled into the account tree. */
export function balanceReport(
  led,
  opts = {},
) {
  const { account, depth, end } = opts;
  const cumOpts = {};
  if (end != null) cumOpts.end = end;
  const filtOpts = {};
  if (account != null) filtOpts.account = account;
  if (depth != null) filtOpts.depth = depth;
  const balances = filterBalances(balancesCumulative(led, cumOpts), filtOpts);
  return { tree: buildTree(balances) };
}

export function renderBalance(report, led) {
  const { tree } = report;
  const rows = [];
  walk(tree, (node) => {
    if (node.total.size === 0) return;
    const amts = fmtBag(node.total, led.registry);
    rows.push([indent(node.depth) + node.segment, amts[0] ?? ""]);
    for (let i = 1; i < amts.length; i++) rows.push(["", amts[i] ?? ""]);
  });
  const totals = [...tree.total.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  rows.push(["", ""]);
  rows.push(["Total", totals.length && totals[0] ? fmt(totals[0][1], led.registry) : "0"]);
  for (let i = 1; i < totals.length; i++) rows.push(["", fmt(totals[i][1], led.registry)]);
  return renderTable(rows, { align: ["l", "r"] });
}

// ════════════════════════════════════════════════════════════════════════════════════
// balsheet — point-in-time Assets / Liabilities / Equity
// ════════════════════════════════════════════════════════════════════════════════════
// Liabilities and Equity are shown flipped so they read as positives; the net line is
// Assets − (Liabilities + Equity), zero for books that balance.

export function balanceSheetReport(led, opts = {}) {
  const cumOpts = {};
  if (opts.end != null) cumOpts.end = opts.end;
  const tree = buildTree(balancesCumulative(led, cumOpts));
  return { tree };
}

export function renderBalanceSheet(report, led) {
  const { tree } = report;
  const reg = led.registry;
  const assets = sectionRows(tree, "Assets", reg);
  const liabilities = sectionRows(tree, "Liabilities", reg, { flip: true });
  const equity = sectionRows(tree, "Equity", reg, { flip: true });

  const a = subtree(tree, "Assets")?.total ?? new Map();
  const le = sumMaps([
    negateBag(subtree(tree, "Liabilities")?.total ?? new Map()),
    negateBag(subtree(tree, "Equity")?.total ?? new Map()),
  ]);
  const net = new Map();
  for (const ccy of new Set([...a.keys(), ...le.keys()])) {
    const av = a.get(ccy);
    const lv = le.get(ccy);
    let v;
    if (av && lv) v = gradedSubtract(av, lv);
    else if (av) v = av;
    else v = gradedNegate(lv);
    if (!gradedIsZero(v)) net.set(ccy, v);
  }

  const rows = [
    ...assets.rows,
    ["", ""],
    ...liabilities.rows,
    ["", ""],
    ...equity.rows,
    ["", ""],
    ...netRow("Assets − (Liabilities + Equity)", net, reg),
  ];
  return renderTable(rows, { align: ["l", "r"] });
}

// ════════════════════════════════════════════════════════════════════════════════════
// incomestmt — Income and Expenses over a period, with net income
// ════════════════════════════════════════════════════════════════════════════════════
// By the accounting identity (all five roots sum to zero), net income = −(Income +
// Expenses); Income is shown flipped so revenue reads positive.

export function incomeStatementReport(
  led,
  opts = {},
) {
  const rangeOpts = {};
  if (opts.begin != null) rangeOpts.begin = opts.begin;
  if (opts.end != null) rangeOpts.end = opts.end;
  const tree = buildTree(balancesRange(led, rangeOpts));
  return { tree };
}

export function renderIncomeStatement(report, led) {
  const { tree } = report;
  const reg = led.registry;
  const income = sectionRows(tree, "Income", reg, { flip: true });
  const expenses = sectionRows(tree, "Expenses", reg);

  const both = sumMaps([
    subtree(tree, "Income")?.total ?? new Map(),
    subtree(tree, "Expenses")?.total ?? new Map(),
  ]);
  const net = new Map();
  for (const [ccy, amt] of both) if (!gradedIsZero(amt)) net.set(ccy, gradedNegate(amt));

  const rows = [
    ...income.rows,
    ["", ""],
    ...expenses.rows,
    ["", ""],
    ...netRow("Net income", net, reg),
  ];
  return renderTable(rows, { align: ["l", "r"] });
}

// ════════════════════════════════════════════════════════════════════════════════════
// cashflow — the CHANGE in selected cash accounts over a period
// ════════════════════════════════════════════════════════════════════════════════════
// By default "cash" is the Assets:Cash subtree (override with a regex); shows the net
// movement per account = cash that flowed in (+) or out (−) over the window. This is a
// cash-account movement reading, not an operating/investing/financing classification.

export function cashflowReport(
  led,
  opts = {},
) {
  const rangeOpts = {};
  if (opts.begin != null) rangeOpts.begin = opts.begin;
  if (opts.end != null) rangeOpts.end = opts.end;
  const account = opts.account ?? "^Assets:Cash(?::|$)";
  const delta = filterBalances(balancesRange(led, rangeOpts), { account });
  return { tree: buildTree(delta) };
}

export function renderCashflow(report, led) {
  const { tree } = report;
  const reg = led.registry;
  const rows = [["Cash flow (change over period)", ""]];
  walk(tree, (node) => {
    if (node.total.size === 0) return;
    const amts = fmtBag(node.total, reg);
    rows.push([indent(node.depth) + node.segment, amts[0] ?? ""]);
    for (let i = 1; i < amts.length; i++) rows.push(["", amts[i] ?? ""]);
  });
  const totals = [...tree.total.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  rows.push(["", ""]);
  rows.push(["Net cash flow", totals.length && totals[0] ? fmt(totals[0][1], reg) : "0"]);
  for (let i = 1; i < totals.length; i++) rows.push(["", fmt(totals[i][1], reg)]);
  return renderTable(rows, { align: ["l", "r"] });
}

// ════════════════════════════════════════════════════════════════════════════════════
// register — chronological postings with a per-commodity running total
// ════════════════════════════════════════════════════════════════════════════════════
// Scoped to an account it reads like a bank statement; unscoped it is the full posting
// journal. The running total is per commodity, exact until rendered.

const safeRe = (p) => {
  try {
    return new RegExp(p);
  } catch {
    return /a^/;
  }
};

const byDate = (a, b) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : 0;

export function registerReport(
  led,
  opts

 = {},
) {
  const filtOpts

 = {};
  if (opts.account != null) filtOpts.account = opts.account;
  if (opts.begin != null) filtOpts.begin = opts.begin;
  if (opts.end != null) filtOpts.end = opts.end;
  if (opts.status != null) filtOpts.status = opts.status;
  if (opts.payee != null) filtOpts.payee = opts.payee;
  const txns = filterTransactions(led.transactions, filtOpts).slice().sort(byDate);
  const { account } = opts;
  const accRe = account ? safeRe(account) : null;
  const running = new Map();
  const rows = [];
  for (const t of txns) {
    let first = true;
    for (const p of t.postings) {
      if (accRe && !accRe.test(p.account)) continue;
      const w = postingHolding(p);
      if (w) {
        const ccy = gradeOf(w);
        const cur = running.get(ccy);
        running.set(ccy, cur ? gradedAdd(cur, w) : w);
      }
      rows.push({
        date: first ? t.date : "",
        description: first ? (t.payee ? `${t.payee} | ${t.narration}` : t.narration) : "",
        account: p.account,
        amount: w,
        total: w ? running.get(gradeOf(w)) ?? null : null,
      });
      first = false;
    }
  }
  return { rows };
}

export function renderRegister(report, led) {
  const table = report.rows.map((r) => [
    r.date,
    r.description,
    r.account,
    r.amount ? fmt(r.amount, led.registry) : "",
    r.total ? fmt(r.total, led.registry) : "",
  ]);
  return renderTable(table, { align: ["l", "l", "l", "r", "r"] });
}

// ════════════════════════════════════════════════════════════════════════════════════
// accounts — the sorted, de-duplicated set of every named account
// ════════════════════════════════════════════════════════════════════════════════════
// Named by a posting, an open/close, a pad, or a balance assertion. Optionally filtered
// by regex.

export function accountsReport(led, { account } = {}) {
  const re = account ? safeRe(account) : null;
  const names = new Set();
  for (const t of led.transactions) for (const p of t.postings) names.add(p.account);
  for (const d of led.directives) {
    if ("account" in d && typeof (d).account === "string") {
      names.add((d).account);
    }
    if ("padAccount" in d && typeof (d).padAccount === "string") {
      names.add((d).padAccount);
    }
  }
  const list = [...names].filter((n) => !re || re.test(n)).sort();
  return { accounts: list };
}

export function renderAccounts(report) {
  return report.accounts.join("\n");
}

// ════════════════════════════════════════════════════════════════════════════════════
// stats — a quick journal summary; the distinctive line is the count of HELD ⊤
// ════════════════════════════════════════════════════════════════════════════════════
// Counts transactions, postings, accounts, commodities, the date span, plus the no-halt
// ledger's signature: the number of held contradictions (⊤ on the worklist) and
// malformed records. A healthy ledger has zero held.

export function statsReport(led) {
  let postings = 0;
  const commodities = new Set();
  let minDate = null;
  let maxDate = null;
  for (const t of led.transactions) {
    postings += t.postings.length;
    if (!minDate || t.date < minDate) minDate = t.date;
    if (!maxDate || t.date > maxDate) maxDate = t.date;
    for (const p of t.postings) {
      if (p.amount) commodities.add(gradeOf(p.amount));
      if (p.cost?.amount) commodities.add(gradeOf(p.cost.amount));
    }
  }
  return {
    transactions: led.transactions.length,
    postings,
    accounts: accountsReport(led, {}).accounts.length,
    commodities: commodities.size,
    directives: led.directives.length,
    span: minDate ? `${minDate} … ${maxDate}` : "(empty)",
    malformed: led.malformed.length,
    held: led.worklist.length,
    synthesized: led.synthesized.length,
  };
}

export function renderStats(s) {
  const rows = [
    ["Transactions", s.transactions],
    ["Postings", s.postings],
    ["Accounts", s.accounts],
    ["Commodities", s.commodities],
    ["Directives", s.directives],
    ["Date span", s.span],
    ["Pad-synthesized txns", s.synthesized],
    ["Malformed (held)", s.malformed],
    ["Contradictions ⊤ (held)", s.held],
  ];
  return rows.map(([k, v]) => `${String(k).padEnd(26)} ${v}`).join("\n");
}

// ════════════════════════════════════════════════════════════════════════════════════
// lots — native open positions with historical cost, never current market value
// ════════════════════════════════════════════════════════════════════════════════════

export function lotsReport(
  led,
  opts = {},
) {
  const scoped = ledgerBefore(led, opts.end ?? null);
  const account = compileRe(opts.account ?? null);
  return {
    lots: Object.freeze(scoped.lots.filter((lot) => account === null || account.test(lot.account))),
  };
}

export function renderLots(report, led) {
  const rows = [["Account", "Units", "Unit cost", "Book value", "Acquired", "Label"]];
  for (const lot of report.lots) {
    const bookValue = gradedTimes(lot.units, lot.unitCost, gradeOf(lot.unitCost));
    rows.push([
      lot.account,
      fmt(lot.units, led.registry),
      fmt(lot.unitCost, led.registry),
      fmt(bookValue, led.registry),
      lot.date,
      lot.label ?? "",
    ]);
  }
  if (report.lots.length === 0) rows.push(["(no open costed lots)", "", "", "", "", ""]);
  return renderTable(rows, { align: ["l", "r", "r", "r", "l", "l"] });
}

/** Re-settle the original journal at an exclusive reporting cutoff. */
function ledgerBefore(led, end) {
  if (end === null) return led;
  const entries = led.entries.filter((entry) => {
    if (isTransaction(entry)) return entry.date < end;
    if (isDirective(entry) && entry.date !== null) return entry.date < end;
    return true;
  });
  return loadLedger(entries);
}

/**
 * Value asset positions from dated price directives without altering quantity or cost.
 * Costed lots use their cost commodity; uncosted positions use the requested reporting
 * commodity and retain missing book value/unrealized gain instead of manufacturing zero.
 */
export function valuationReport(
  led,
  opts = {},
) {
  const end = opts.end ?? null;
  const scoped = ledgerBefore(led, end);
  const reportingCommodity = opts.reportingCommodity ?? "USD";
  const account = compileRe(opts.account ?? "^Assets(?::|$)");
  const lots = scoped.lots.filter((lot) => account.test(lot.account));
  const quoteFor = (commodity, quoteCommodity) =>
    scoped.directives
      .filter((directive) =>
        directive.directive === "price" &&
        directive.commodity === commodity &&
        gradeOf(directive.amount) === quoteCommodity)
      .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
      .at(-1) ?? null;

  const rows = lots.map((lot) => {
    const selfQuoted = gradeOf(lot.units) === gradeOf(lot.unitCost);
    const quote = selfQuoted ? null : quoteFor(gradeOf(lot.units), gradeOf(lot.unitCost));
    const marketPrice = selfQuoted ? gradedFromParts(1n, 1n, gradeOf(lot.unitCost)) : quote?.amount ?? null;
    const bookValue = gradedTimes(lot.units, lot.unitCost, gradeOf(lot.unitCost));
    const marketValue = marketPrice === null
      ? null
      : gradedTimes(lot.units, marketPrice, gradeOf(marketPrice));
    return Object.freeze({
      account: lot.account,
      units: lot.units,
      lot,
      bookValue,
      marketPrice,
      marketValue,
      unrealized: marketValue === null ? null : gradedSubtract(marketValue, bookValue),
      priceDate: quote?.date ?? null,
    });
  });

  const costedUnits = new Map();
  for (const lot of lots) {
    const key = `${lot.account}\u0000${gradeOf(lot.units)}`;
    const current = costedUnits.get(key);
    costedUnits.set(key, current ? gradedAdd(current, lot.units) : lot.units);
  }
  for (const [accountName, bag] of scoped.balances) {
    if (!account.test(accountName)) continue;
    for (const [commodity, balance] of bag) {
      const costed = costedUnits.get(`${accountName}\u0000${commodity}`);
      const units = costed === undefined ? balance : gradedSubtract(balance, costed);
      if (gradedIsZero(units)) continue;
      const selfQuoted = commodity === reportingCommodity;
      const quote = selfQuoted ? null : quoteFor(commodity, reportingCommodity);
      const marketPrice = selfQuoted ? gradedFromParts(1n, 1n, reportingCommodity) : quote?.amount ?? null;
      const marketValue = marketPrice === null
        ? null
        : gradedTimes(units, marketPrice, gradeOf(marketPrice));
      rows.push(Object.freeze({
        account: accountName,
        units,
        lot: null,
        bookValue: null,
        marketPrice,
        marketValue,
        unrealized: null,
        priceDate: quote?.date ?? null,
      }));
    }
  }
  rows.sort((a, b) => a.account < b.account ? -1 : a.account > b.account ? 1 : 0);
  return Object.freeze({ rows: Object.freeze(rows), end, reportingCommodity });
}

export function renderValuation(report, led) {
  const rows = [[
    "Account", "Units", "Book value", "Market price", "Market value", "Unrealized", "Price date",
  ]];
  for (const row of report.rows) {
    rows.push([
      row.account,
      fmt(row.units, led.registry),
      row.bookValue === null ? "(missing)" : fmt(row.bookValue, led.registry),
      row.marketPrice === null ? "(missing)" : fmt(row.marketPrice, led.registry),
      row.marketValue === null ? "(missing)" : fmt(row.marketValue, led.registry),
      row.unrealized === null ? "(missing)" : fmt(row.unrealized, led.registry),
      row.priceDate ?? "",
    ]);
  }
  if (report.rows.length === 0) rows.push(["(no asset positions)", "", "", "", "", "", ""]);
  return renderTable(rows, { align: ["l", "r", "r", "r", "r", "r", "l"] });
}

// ════════════════════════════════════════════════════════════════════════════════════
// check — THE HEADLINE: the no-halt thesis (exitCode ALWAYS 0)
// ════════════════════════════════════════════════════════════════════════════════════
// Where beancount/hledger print the FIRST error and exit non-zero (halting the books),
// `checkReport` lists EVERY held problem — ⊤ contradictions on the worklist, failed
// checks, malformed lines — and ALWAYS exits 0. The contradictions are carried, not
// fatal: the books still rendered, and here is the reconciliation worklist (§4: a held
// ⊤ is evidence on the carrier, not a thrown halt). The carried worklist is the H¹
// residue; `ok` is the no-obstruction reading.

// A settled cell reads back as its subject mark (carrying the evidence — residual
// amounts, computed vs asserted) and its predicate mark (the claim).
const heldItem = (entry) => ({
  subject: entry.subject,
  predicate: entry.predicate,
});

export function checkReport(led) {
  // ⊤ — held problems on the worklist: imbalanced transactions, mismatched balance
  // assertions, and any derived ⊤ (held contradiction). Carried, never fatal.
  const contradictions = led.worklist.map(heldItem);

  // f — failed checks: denied-only cells in clean. The engine derives none today (it has
  // no denial verb), so this is empty until imbalance is modelled as a genuine ⊤ cell.
  // Kept for shape stability.
  const failures = [];

  // malformed — lines that could not be parsed at all (carried, not dropped).
  const malformed = led.malformed.map((m) => ({
    reason: m.reason,
    raw: m.raw,
    source: m.source,
  }));

  const ok = contradictions.length === 0 && failures.length === 0 && malformed.length === 0;
  // exitCode is ALWAYS 0 — the no-halt thesis: held contradictions are carried as a
  // reconciliation worklist, never a process-killing failure.
  return { ok, contradictions, failures, malformed, exitCode: 0 };
}

export function renderCheck(r) {
  if (r.ok) return "✓ no held contradictions, no failed checks, no malformed lines.";
  const out = [];
  if (r.contradictions.length) {
    out.push(`⊤ held problems (${r.contradictions.length}) — the reconciliation worklist:`);
    for (const c of r.contradictions) {
      out.push(`  ⊤ [${JSON.stringify(c.predicate)}] ${JSON.stringify(c.subject)}`);
    }
  }
  if (r.failures.length) {
    out.push(`f failed checks (${r.failures.length}):`);
    for (const f of r.failures) {
      out.push(`  f [${JSON.stringify(f.predicate)}] ${JSON.stringify(f.subject)}`);
    }
  }
  if (r.malformed.length) {
    out.push(`malformed lines (${r.malformed.length}) — held, not dropped:`);
    for (const m of r.malformed) out.push(`  ; (${m.reason}) ${m.raw}`);
  }
  out.push("");
  out.push("(books still rendered; this is the worklist, not a halt — exit 0)");
  return out.join("\n");
}

// ════════════════════════════════════════════════════════════════════════════════════
// reconcile — posted balances vs balance assertions, joined per (account, commodity)
// ════════════════════════════════════════════════════════════════════════════════════
// Two independent witnesses to an account's true balance: what was POSTED (the ledger's
// own running total, `balancesCumulative`) and what was ASSERTED (a `balance` directive
// or inline posting assertion, settled by `loadLedger` into `ledger.balance-holds` /
// `ledger.balance-mismatch` cells on `clean`/`worklist`). This reading joins the two per
// account and commodity so an account with neither posting nor assertion stays visibly
// unknown rather than printing as a false zero — the same anti-fetishism reading as
// `checkReport`, aimed at the reconciliation question instead of the held-problem list.

const isBalanceCheckSubject = (
  value,
) =>
  typeof value === "object" && value !== null && (value).kind === "balance-check";

// collectBalanceCheckEvidence — the latest balance-check cell per (account, commodity),
// scoped to assertions dated on or before `end`. `clean` cells hold (BALANCE_HOLDS);
// `worklist` cells mismatch (BALANCE_MISMATCH) — membership in the two arrays IS the
// verdict, per loadLedger's settlement (ledger.mts ~1041-1060).
function collectBalanceCheckEvidence(
  led,
  end,
) {
  const latest = new Map();
  const consider = (entries, held) => {
    for (const entry of entries) {
      const subject = entry.subject;
      if (!isBalanceCheckSubject(subject)) continue;
      if (end && subject.date > end) continue;
      const key = `${subject.account} ${subject.commodity}`;
      const existing = latest.get(key);
      if (existing && existing.date >= subject.date) continue;
      latest.set(key, {
        account: subject.account,
        commodity: subject.commodity,
        date: subject.date,
        assertedStr: subject.asserted ?? subject.computed,
        held,
      });
    }
  };
  consider(led.clean, false);
  consider(led.worklist, true);
  return latest;
}

/** reconciliationReport — postings vs balance assertions, joined per (account,
 *  commodity), scoped by an account regex and an `end` cutoff (assertions dated on or
 *  before `end`; postings strictly before `end`, matching `balancesCumulative`). An
 *  account with postings and no assertion is `posted-only`; an assertion with no
 *  postings is `asserted-only` if it held, `mismatch` if it didn't (a mismatch always
 *  wins, postings or not); an `open`ed account with neither is `inactive`, one row,
 *  `commodity` null — never printed as a zero balance. */
export function reconciliationReport(
  led,
  opts = {},
) {
  const end = opts.end ?? null;
  const accRe = compileRe(opts.account ?? null);

  const posted = balancesCumulative(led, { end });
  const evidence = collectBalanceCheckEvidence(led, end);

  const rows = [];
  const seen = new Set();
  const activeAccounts = new Set();

  for (const [account, bag] of posted) {
    if (accRe && !accRe.test(account)) continue;
    for (const [commodity, amt] of bag) {
      activeAccounts.add(account);
      const key = `${account} ${commodity}`;
      seen.add(key);
      const ev = evidence.get(key);
      const postedStr = gradedToExactString(amt);
      rows.push(ev
        ? { account, commodity, posted: postedStr, asserted: ev.assertedStr, assertedAt: ev.date, verdict: ev.held ? "mismatch" : "agreed" }
        : { account, commodity, posted: postedStr, asserted: null, assertedAt: null, verdict: "posted-only" });
    }
  }

  for (const [key, ev] of evidence) {
    if (accRe && !accRe.test(ev.account)) continue;
    activeAccounts.add(ev.account);
    if (seen.has(key)) continue;
    rows.push({
      account: ev.account,
      commodity: ev.commodity,
      posted: null,
      asserted: ev.assertedStr,
      assertedAt: ev.date,
      verdict: ev.held ? "mismatch" : "asserted-only",
    });
  }

  const inactiveAdded = new Set();
  for (const d of led.directives) {
    if (d.directive !== "open") continue;
    if (accRe && !accRe.test(d.account)) continue;
    if (activeAccounts.has(d.account) || inactiveAdded.has(d.account)) continue;
    inactiveAdded.add(d.account);
    rows.push({ account: d.account, commodity: null, posted: null, asserted: null, assertedAt: null, verdict: "inactive" });
  }

  rows.sort((a, b) =>
    a.account === b.account
      ? (a.commodity ?? "").localeCompare(b.commodity ?? "")
      : a.account < b.account ? -1 : 1,
  );

  const summary = {
    agreed: 0,
    mismatch: 0,
    "posted-only": 0,
    "asserted-only": 0,
    inactive: 0,
  };
  for (const row of rows) summary[row.verdict]++;

  return { rows, summary };
}

/** renderReconciliation — an aligned text table (account, commodity, posted, asserted,
 *  as-of date, verdict) followed by a one-line verdict-count summary. */
export function renderReconciliation(report) {
  const rows = [["Account", "Commodity", "Posted", "Asserted", "As of", "Verdict"]];
  for (const r of report.rows) {
    rows.push([r.account, r.commodity ?? "", r.posted ?? "", r.asserted ?? "", r.assertedAt ?? "", r.verdict]);
  }
  const table = renderTable(rows, { align: ["l", "l", "r", "r", "l", "l"] });
  const order =
    ["agreed", "mismatch", "posted-only", "asserted-only", "inactive"];
  const summaryLine = order.map((v) => `${v}: ${report.summary[v]}`).join(", ");
  return `${table}\n\n${summaryLine}`;
}

// ════════════════════════════════════════════════════════════════════════════════════
// print — render parsed entries back to journal text (beancount / hledger)
// ════════════════════════════════════════════════════════════════════════════════════
// Amounts print at their display precision (via the `../../money` edge), so for
// terminating values parse → print → parse is a fixed point. Default format is
// beancount; hledger differs only in the header line.

const pa = (amt) =>
  amt ? `${gradedToDecimalString(amt)} ${gradeOf(amt)}` : "";

const postingExpr = (p) => {
  if (p.amount === null) return "";
  let s = pa(p.amount);
  if (p.cost) {
    const parts = [
      p.cost.amount ? pa(p.cost.amount) : "",
      (p.cost).date ?? "",
      (p.cost).label ? `"${(p.cost).label}"` : "",
    ]
      .filter(Boolean)
      .join(", ");
    s += p.cost.kind === "total" ? ` {{${parts}}}` : ` {${parts}}`;
  }
  if (p.price) s += ` ${p.price.kind} ${pa(p.price.amount)}`;
  if (p.balanceAssertion) s += ` ${p.balanceAssertion.sole ? "==" : "="} ${pa(p.balanceAssertion.amount)}`;
  return s;
};

const postingLine = (p) => {
  const virtual = (p.meta)?.["virtual"];
  const acct = virtual === "(" ? `(${p.account})` : virtual === "[" ? `[${p.account}]` : p.account;
  const expr = postingExpr(p);
  return expr ? `  ${acct}  ${expr}` : `  ${acct}`;
};

const txnHeaderBeancount = (t) => {
  const flag = t.flag ?? "*";
  const desc = t.payee != null ? `"${t.payee}" "${t.narration}"` : `"${t.narration}"`;
  const tags = (t.tags ?? []).map((x) => `#${x}`).join(" ");
  const links = (t.links ?? []).map((x) => `^${x}`).join(" ");
  return [`${t.date} ${flag} ${desc}`, tags, links].filter(Boolean).join(" ");
};

const txnHeaderHledger = (t) => {
  const date = (t.date ?? "").replace(/-/g, "/");
  const flag = t.flag ? `${t.flag} ` : "";
  const code = t.code ? `(${t.code}) ` : "";
  const desc = t.payee != null ? `${t.payee} | ${t.narration}` : t.narration;
  return `${date}${t.time ? ` ${t.time}` : ""} ${flag}${code}${desc}`.trim();
};

const directiveLine = (d) => {
  switch (d.directive) {
    case "open":
      return `${d.date} open ${d.account}${d.commodities.length ? "  " + d.commodities.join(",") : ""}`;
    case "close":
      return `${d.date} close ${d.account}`;
    case "commodity":
      return `${d.date ?? ""} commodity ${d.symbol}`;
    case "price":
      return `${d.date} price ${d.commodity} ${pa(d.amount)}`;
    case "pad":
      return `${d.date} pad ${d.account} ${d.padAccount}`;
    case "balance":
      return `${d.date} balance ${d.account}  ${d.tolerance ? `${gradedToDecimalString(d.amount)} ~ ${d.tolerance} ${gradeOf(d.amount)}` : pa(d.amount)}`;
    case "option":
      return `option "${d.key}" "${d.value}"`;
    case "include":
      return `include "${d.path}"`;
    case "note":
      return `${d.date} note ${d.account} ${JSON.stringify(d.comment)}`;
    case "event":
      return `${d.date} event ${JSON.stringify(d.type)} ${JSON.stringify(d.description)}`;
    default:
      return null;
  }
};

const directiveMetadata = (d) => {
  const meta = "meta" in d ? d.meta : null;
  return meta ? Object.entries(meta).map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`) : [];
};

export function printEntries(
  entries,
  { format: fmtKind = "beancount" } = {},
) {
  const out = [];
  for (const e of entries) {
    if (isTransaction(e)) {
      const header = fmtKind === "hledger" ? txnHeaderHledger(e) : txnHeaderBeancount(e);
      out.push(header);
      if (fmtKind === "beancount") for (const [key, value] of Object.entries(e.meta)) out.push(`  ${key}: ${JSON.stringify(value)}`);
      for (const p of e.postings) out.push(postingLine(p));
      out.push("");
    } else if (isMalformed(e)) {
      out.push(`; MALFORMED (${e.reason}): ${e.raw}`);
    } else if (isDirective(e)) {
    const line = directiveLine(e);
    if (line) out.push(line, ...directiveMetadata(e));
    }
  }
  return out.join("\n").replace(/\n+$/, "\n");
}

export function printReport(entries, opts) {
  return { text: printEntries(entries, opts) };
}

export function renderPrint(report) {
  return report.text;
}

export default balanceReport;
