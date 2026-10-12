---
title: "The books surface: meet-then-beat contract"
description: "The receiver, arena, incumbent portfolio, measured evidence, MEET contract, and BEAT hypothesis for the 561 Group's books surface on ops.561.group: farolfi's readings served as one catalog of operations to agents (MCP), machines (JSON), and humans (HTML), joined to the work rail."
date-created: 2026-09-05
type: notes
name: 2026-09-05-note-on-the-books-surface-meet-then-beat-contract
status: measured
authors:
  - claude-fable-5-1
keywords:
  - ledger
  - beancount
  - fava
  - farolfi
  - meet-then-beat
  - ops.561.group
---

# The books surface: meet-then-beat contract

Written to the meet-then-beat skill's form on 2026-09-05, before the surface
shipped, from first-party evidence observed that day.

## 1. Arena and receiver

The receiver is anyone the 561 Group admits to `https://ops.561.group`: the
founder in a browser, and an agent session holding a machine credential. The
job they entrust to the surface is "show me the Group's books and which
balances I can trust, and let me see what the work cost". The observable
outcome is a balance sheet, an income statement, a reconciliation verdict per
account, and a cost pivot by session or work cell, each readable as JSON, as
an MCP tool result, and as a page. The comparison boundary is the reading of
one Beancount book of record; editing, importing, and document upload are out
of the arena (the house appends to the book through its own derivers and a
bookkeeper, never through a web form).

Product roles:

- Fava: same-job incumbent (a web reader over a Beancount file).
- Beancount (`bean-check`, `bean-query`) and hledger: upstream references the
  house already consumes; their checkers are measured in the accounting
  section's reconciliation note, not here.
- Asana and Odoo, named 2026-09-01 as ops.561.group's project-management
  incumbents: same-job incumbents for the join of books to work, not for the
  books themselves.

## 2. Incumbent evidence, measured

Source: `raw.githubusercontent.com/beancount/fava/main/src/fava/json_api.py`
and `src/fava/internal_api.py`, main branch, undated
(`published_date: unknown`), observed 2026-09-05; and
`github.com/beancount/fava/blob/main/src/fava/help/features.md`, same
observation.

| capability | Fava, verbatim or counted | evidence kind |
|---|---|---|
| Reports as JSON | 35 routes in `json_api.py`, among them `/balance_sheet` ("Get the data for the balance sheet."), `/income_statement`, `/trial_balance`, `/journal` ("Get all (filtered) entries."), `/query` ("Run a Beancount query."), `/context` ("Entry context."), `/options`, `/statistics`, `/commodities` | documented |
| API purpose | module docstring: "JSON API. This module contains the url endpoints of the JSON API that is used by the web interface for asynchronous functionality." | documented |
| Authentication | none documented in either file | documented, `not disclosed` |
| Errors | `{"error": "message"}` with HTTP status 400, 404, 409, 422, 500 | documented |
| Trust verdict per balance | `get_errors` returns `[SerialisedError.from_beancount_error(e) for e in g.ledger.errors]`: Beancount's error list re-serialised; a failed assertion is an error, an unwitnessed balance is nothing | documented |
| Agent protocol face (MCP or A2A) | not offered | documented (absent from the route list) |
| Join to project management or work items | not offered | documented (absent) |
| Editor, transaction form, document upload, import, query export to CSV/XLSX/ODS, multiple files, custom sidebar links, languages | offered (features.md: "allows you to edit the source file(s)", "open a form to insert a transaction", "drag and drop on account names or Journal rows", "downloading the result of these queries in various file formats") | documented |
| Charts | "line chart or treemap chart" for two-column BQL results | documented |

## 3. House evidence, as of the writing

| capability | house owner | present evidence |
|---|---|---|
| Balance, balance sheet, income statement, cashflow, register, accounts, stats, lots, valuation, reconcile, check, print, convert, each with `-o json` | `apps/farolfi` 0.1.13 (glob includes) over `@red-cup-engineering/organizing` 0.1.14 | deployed as a CLI; published |
| Five reconciliation verdicts per account (agreed, mismatch, posted-only, asserted-only, inactive) computed under held contradictions | `farolfi reconcile`, organizing's FOUR-cell settlement | deployed; over the full book on 2026-09-05 (agreed 168, mismatch 0, posted-only 207, asserted-only 36, inactive 128, 539 rows) |
| One operation with JSON Schema in and out (`scripts/read-ledger-report.mjs`, `scripts/read-set-of-ledger-readings.mjs`) | this section | published, `@red-cup-engineering/computer-ledger-system-services-section` 0.5.1 |
| MCP verbs `ledger-report`, `ledger-readings` derived from the same catalog | metroplat, thin verb over the published operation | deployed, `@red-cup-engineering/metroplat` 0.4.17 released on cold-red-gate 2026-09-05 |
| `GET /books` (JSON) and `GET /books/view` (HTML) behind the same bearer gate as `/tasks` | ops-561-group-mcp-gateway-service | deployed, 0.8.0 released on cold-red-gate 2026-09-05; `/books` 200 to a machine credential with the five verdict counts, `/books/view` 200, `/books/report?report=stats` 200 |
| Cost pivot by session and work cell | inference expense transactions carrying `session_ids` metadata (`derive-set-of-inference-expense-transactions-service` 0.2.0), rendered beside `/tasks` | deployed for the data half: 15 transactions with `session_ids` are in the live book (USD 561.66 of Claude usage, 2026-08-12 to 2026-09-05); the pivot rendering on `/books/view` beside `/tasks/view` is the next gap |
| Editor, transaction form, import, document upload | out of arena by house law: the book is appended by derivers and the bookkeeper office, never a web form | not applicable |
| Charts | absent | next gap after the readings ship |

## 4. MEET contract

The receiver needs, in order: a balance sheet and income statement as JSON and
as a page; a per-account trust verdict; the journal filtered by account and
period; statistics; an explanation of any refusal; and a stable, authenticated
machine face. Fava meets the first, third, and fourth without authentication
and without a verdict beyond error; it does not offer the second, fifth, or an
agent face. The house's smallest end-to-end acceptance assay is: an admitted
machine credential calls `ledger-readings` through `https://ops.561.group/mcp`
and `GET /books`, receives the balance-sheet totals and the five verdict counts
that `farolfi` prints locally for the same book, and `GET /books/view` renders
the same numbers with a link to `/tasks/view`.

## 5. BEAT hypothesis

Because the house ledger settles every check as a FOUR cell and keeps
computing under held contradictions (structural fact X, in
`@red-cup-engineering/organizing`), and because MetroPlat derives CLI, HTTP,
MCP, and HTML faces from one catalog of operations (structural fact X'), the
house can answer "which balances have two witnesses, one, none, or
contradict" and "what did this session's work cost" as one reading, identically
over MCP, JSON, and a page (outcome Y), under the assay in section 4 (Z), while
Fava cannot without contradicting its error-only `get_errors` and its
web-interface-only API. Counterexample search owed: a Fava extension or a
Beancount plugin that reports absence and mismatch as data rather than error,
or a Fava release documenting an authenticated agent face, turns the first
half into a MEET gap.

## 6. Wedge

Shipped 2026-09-05: the operation and verb, then the `/books` routes released on
cold-red-gate; the acceptance assay in section 4 passed for the machine-credential
half (`/books`, `ledger-readings` behind the gateway, the same verdict counts as
`farolfi reconcile` locally). Still owed: the founder's browser assay of
`/books/view`, and the cost pivot by session and work cell (the data is booked; the
rendering is not).
