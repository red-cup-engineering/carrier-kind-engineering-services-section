# farolfi ⇄ EAVT encoding contract

The term scheme and datom encoding that `lib/eavt.mjs` (`toDatoms`/`fromDatoms`) and the EAVT
reader (`lib/parse/eavt.mjs`) must both obey. `toDatoms` and `fromDatoms` must be exact inverses
(modulo BigInt↔string, handled by the Amount codec). The journal is the repo's EAVT log via
`@561/development.active.typed-term-memory-system` (`#ttms-write` / `#ttms-read`); a datom is
`{e, a, v, t}` JSON, one per line, addressed by term.

## How TTMS folds (load-bearing — do not assume otherwise)

TTMS `read` folds an address's datoms by the **full `(e, a, v)` triple** (the posix-holography
eavt settle groups on `[subject, predicate, object]`), knowledge-joining matching triples. So:

- The **same** `(e,a,v)` re-affirmed by N datoms → one cell, value `t`, evidence accumulating all N
  witnesses (provenance). Lossless re-affirmation.
- **Different** values for one `(e,a)` (e.g. two feeds logging a different balance for one account)
  → **two distinct `t` cells**, NOT an automatic ⊤.

Therefore the **cross-source reconciliation ⊤ is farolfi's claim layer's job**, not TTMS's:
`lib/claims.mjs` reads the multiple affirmed values for one accounting subject and overlays opposed
charges on one `(subject, balance-check)` cell so `lib/bridge.mjs` settles it to ⊤ (see
`docs/dev/notes` / the plan §"paraconsistent mechanism"). The datom `t` (provenance) names which
feed asserted which value, and rides into the ⊤ cell's evidence.

## Entities (the `e` / term)

Stable, content-derived ids so re-ingest is idempotent at the cell level:

| Kind | term / `e` |
|---|---|
| Transaction | `txn:<date>:<ordinal>` (ordinal = 0-based index among that date's txns in source order) |
| Posting | `<txn-id>:p<i>` (i = posting index within the txn) |
| open / close | `open:<account>:<date>` / `close:<account>:<date>` |
| commodity | `commodity:<symbol>:<date>` |
| price | `price:<commodity>:<date>` |
| pad | `pad:<account>:<date>` |
| balance (assertion) | `balance:<account>:<date>` |

## Attributes (`a`) and values (`v`)

`v` is JSON-serializable. **Amounts are exact rationals, encoded as three datoms** — `*-num` and
`*-den` (base-10 **strings** of the reduced `BigInt` numerator/denominator, since BigInt has no JSON
form; `den > 0`, `gcd(num,den) = 1`), and `*-commodity` (string) — so `fromDatoms` reconstructs
`{ num: BigInt(n), den: BigInt(d), commodity }` exactly, with no decimal ever materialized (the
saturation point is display, never storage). There is no `*-precision` datom: precision is a
display hint recomputed at the edge, not part of the stored quantity.

- **Transaction** `txn:DATE:n`: `date`, `flag` (`"*"`/`"!"`), `payee`, `narration`, `tag`
  (repeatable), `link` (repeatable), `meta:<key>` (one per metadata key), `posting` (repeatable,
  `v` = a posting id), `source` (the input file/feed id).
- **Posting** `txn:DATE:n:pI`: `account`, `amount-num`, `amount-den`, `amount-commodity`;
  optional `cost-num`/`cost-den`/`cost-commodity`/`cost-kind`/`cost-date`/`cost-label`;
  optional `price-num`/`price-den`/`price-commodity`/`price-kind` (`"@"`/`"@@"`);
  optional `assert-num`/`assert-den`/`assert-commodity`/`assert-sole`; `meta:<key>`.
- **open** `open:ACCT:DATE`: `account`, `commodity` (repeatable, allowed-currency constraint),
  `booking` (`STRICT`/`FIFO`/`LIFO`/`NONE`).
- **close** `close:ACCT:DATE`: `account`.
- **commodity** `commodity:SYM:DATE`: `symbol`, `meta:<key>`.
- **price** `price:CCY:DATE`: `commodity`, `amount-num`, `amount-den`, `amount-commodity`.
- **pad** `pad:ACCT:DATE`: `account`, `pad-account`.
- **balance** `balance:ACCT:DATE`: `account`, `amount-num`, `amount-den`, `amount-commodity`.

## Provenance (`t`)

`t = { source, timestamp }` — `source` is the feed/file id (e.g. `"feed:coinbase"`,
`"beancount:main.beancount"`), `timestamp` the ingest time (ISO string). `source` is the
reconciliation hook: divergent values for one accounting subject are grouped and surfaced by feed.

## Round-trip target

`fromDatoms(toDatoms(entry))` deep-equals `entry` for every Transaction and directive (amounts via
the units/commodity/precision triple). `prove-eavt.mjs` asserts this, plus that two feeds writing
divergent balances for one account read back as two `t` cells which the claim layer turns into a ⊤.
