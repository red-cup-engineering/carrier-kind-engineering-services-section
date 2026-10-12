# farolfi parser grammar — the load-bearing decisions

How `lib/parse/` turns journal text into model entries, and the specific disambiguations that make
the two text formats (and their real-world messiness) parse the same way. The governing rule is the
package thesis: **no input throws.** Anything unparseable becomes a `malformed` record (raw text +
reason, held) and parsing continues.

## Pipeline

`lineReader` → `blockify` → per-format header/body interpretation → model entries.

- **`lines.mjs`** splits text into `{ n, raw, indent, content, comment }` records. Comment char is
  `;` for both formats (stripped inline). It NEVER cuts on `#`/`*`/`%` — those collide with a flag
  (`2020/04/01 * Gift`) or an org heading, so whole-line comments in those characters are handled by
  the format parser at the header, not by the line reader.
- **`blocks.mjs`** groups records into `{ header, body }`: an unindented non-empty line opens a
  block; the indented lines beneath it are its body; a blank line ends it. Orphan indented lines (no
  header above) become their own block so they can be held as malformed, not dropped.

## The 2-space split (the highest-leverage rule)

A posting separates its account from its amount on the **first run of 2+ spaces, or a tab** — and
nothing else. This single rule resolves the two worst ambiguities at once:

- **`@` inside an account name.** `Assets:NCSECU:checking@emsenn    -$25` splits at the 4-space gap,
  so `checking@emsenn` stays in the account and the `@` is never mistaken for a price marker. The
  price scan runs only on the amount expression, *after* the split.
- **spaces inside an account name.** `Equity:Opening balance          $100.00` and
  `Expenses:Web performance       -$9.22` keep their single internal spaces, because only a 2+-space
  run splits.

## Amount expressions (`amount.mjs`)

One expression may carry a face amount, a cost, and a price. Extraction order: cost braces first
(`{{ }}` total before `{ }` per-unit), then the price suffix (`@@` total before `@` per-unit, found
by the LAST `@`-run so an `@` already removed with a cost can't confuse it), then the remaining text
is the face. Numbers are parsed to **exact rationals** (`parseDecimal`, never a float); the commodity
is whatever non-numeric token abuts the number, taken **literally** (`$`, `USD`, `AMC`, `snowPeas` —
we do NOT map `$`→`USD`). A leading sign glued to a symbol-first commodity (`-$25`) is repaired.

## Weight vs holding (beancount/hledger parity)

A cost or price **reduces** a leg for the **balance check** (precedence cost > price > face): `15 AMC
@ 14.74 USD` weighs `221.10 USD`, so an elided cash leg becomes `-221.10 USD` — as both tools do. But
the **account holds the FACE** (`15 AMC`); weight drives balancing, holding drives balances/reports.
This split lives in `balance.mjs` (`postingWeight` vs `postingHolding`), not the parser, but the
grammar carries `cost.kind`/`price.kind` so it is available.

## Headers

- **beancount transaction:** `DATE [FLAG] ["payee"] "narration" [#tag ^link]`. `FLAG` ∈ `* ! txn …`;
  a bare `"narration"` after the date also opens a transaction.
- **beancount directive:** `DATE KEYWORD …` for `open`/`close`/`commodity`/`pad`/`balance`/`price`;
  `option`/`include`/`plugin` are dateless. A dated **unknown** keyword, or a recognized-but-
  unsupported one (`note`/`document`/`event`/`query`/`custom`), is **held** (visible), not crashed.
- **hledger transaction:** `DATE[=secondary] [TIME] [*|!] [(code)] [payee |] narration`. Dates may be
  `-`, `/`, or `.` separated and are normalized to ISO dashes; a time after the date is captured.
- **hledger directive:** dateless `account` / `commodity` / `P` (price) / `include`. Any other
  dateless non-comment line — prose, an unknown directive — is **held** as malformed (this is what
  turns a pure-prose `.ledger` file into a stack of malformed records rather than an error).

## Includes & detection

- **`include.mjs`** is pure and injectable (no fs): it splices an included file's entries in place,
  resolving paths relative to the including file, with a cycle guard. A cycle or unreadable include
  leaves the directive in place with an `error` set — held, never thrown. `index.mjs` wires it to the
  filesystem.
- **`detect.mjs`** chooses a format: extension first (`.beancount` / `.ledger`·`.journal`·`.hledger`
  / `.jsonl`), then a content sniff (`option "…`, ISO-date+keyword → beancount; `{"e":` → eavt;
  slash/dot dates or a dateless directive → hledger). Default is hledger (the most permissive).

## Malformed policy (summary)

Held as `malformed`, parsing continues, for: org-outline headings, prose, unknown/unsupported dated
keywords, an unreadable/cyclic include, and an orphan indented line. A bad amount inside an otherwise
valid posting keeps the posting with a `meta.amountError` (the line is not lost). The downstream
`check` report lists every held line; nothing in the parse path raises on data.
