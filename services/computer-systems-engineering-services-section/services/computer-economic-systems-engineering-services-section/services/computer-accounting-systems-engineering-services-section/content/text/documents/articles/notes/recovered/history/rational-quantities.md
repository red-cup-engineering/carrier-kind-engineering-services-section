# Quantities are exact rationals — saturate only at the edge

farolfi represents every monetary quantity in the backend as an **exact rational** — a reduced
`{ num: BigInt, den: BigInt, commodity }` — and **never** as a decimal/float. A decimal is only ever
produced at the display boundary, by an explicit, single saturation step (`format`). This note
records why.

## The engineering reason

Fixed-point decimals (beancount/hledger's `Decimal`, and farolfi's first cut) are exact under
`+ − ×` but **lossy under `÷`**, and they force a *precision* to be declared per commodity. Exact
rationals are closed under `+ − × ÷`:

- **Allocations sum back exactly.** ⅓ of `100` is `100/3`; three of them sum to exactly `100/1`.
  With decimals, `33.33 × 3 = 99.99` and you carry a rounding penny forever.
- **Unit prices, cost basis, FX are exact** until rendered — no drift through reductions.
- **Precision becomes a *display* property, not a data property.** Nothing to declare or get wrong;
  the registry's precision survives only to choose how many places `format` shows.
- **`1.00` and `1` are the same number** (`1/1`) — normalization for free.

Cost: reduce by `gcd` after each op (keeps denominators bounded), and make one rounding decision
(mode + places) at `format` time. That `format` call is the **only** place a rational collapses to a
decimal.

## The reason that rhymes with the kernel

The kernel's own morphisms describe a *Fregean* discipline (their words, from the archived kernel):
`saturate` — "the concept-gap is never a target (filling it is the **concept-horse collapse**)";
`twistor` — "residue = the **unsaturated concept** … Always non-empty (that is **Fregean-ness**)."

Reading (ours, not the file's): **a fraction is an unsaturated quantity** — `p/q` is a ratio that
has not yet been collapsed into a value. **Division is saturation.** Writing `1/3` as `0.333…` is the
concept-horse collapse: once saturated into a decimal *object*, the concept can't be recovered
(`0.333` does not give back `1/3`). Frege's concept-qua-concept is *ungesättigt* — gappy,
predicative, not an object; a fraction-qua-fraction is the same shape. So the discipline is: **keep
quantities unsaturated all the way through the books; saturate only at the display edge.** The
undividable remainder (`1/3`'s tail) is exactly the *non-empty residue* the kernel insists always
exists — the thing the decimal layer was discarding.

Honest scope: the kernel does **no arithmetic** (money lives in the numeric layer; the bilattice
only judges the *truth* of claims). This is a philosophical/architectural resonance — "saturate only
at the edge" mirrors the kernel's "measure, never seed; the residue is always non-empty" — **not** the
kernel computing fractions.

## Why it strengthens the paraconsistent thesis

Paraconsistency here means *holding* a residual, never gating it away with tolerance. With fixed
decimals, tolerance was the one place a collapse crept back in (a near-zero residual fudged to
"balanced"). With exact rationals, **"balances" is a crisp exact-`0/1` test** — tolerance leaves the
truth path entirely. Rationals and paraconsistency are the same instinct: *don't collapse what you
can hold.* (`tolerance` may still be shown as a reporting hint, but it never flips a verdict.)

## Shape of the implementation

- `lib/rational.mjs` — `Amount = { num, den, commodity }` (reduced, `den > 0`); ops
  `amount/rational/parseDecimal/add/sub/neg/mul/div/isZero/cmp/eq`, all gcd-reduced. `parseDecimal`
  is exact (`"14.74" → 737/50`). `format(amount, { places, mode, decimalMark, grouping })` and
  `formatAmount` are the **only** saturation points; `toExactString` shows `num/den commodity` for
  audit.
- `lib/registry.mjs` — `precision` is display-only (default places for `format`).
- `lib/balance.mjs` — the balance verdict is exact `isZero`; no tolerance in the verdict path.
- claims/witnesses carry the **exact** quantity for audit and the rounded decimal for display; a held
  ⊤ can always show its exact residual fraction in `check`.
