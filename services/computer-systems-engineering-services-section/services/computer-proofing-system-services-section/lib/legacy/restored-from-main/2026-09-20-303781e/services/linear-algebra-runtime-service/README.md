# Linear Algebra Runtime Service

This service realizes finite exact matrix calculations: Smith normal forms,
rank, nullity, determinants, and characteristic-polynomial receipts over
the shared exact-number runtime. The abstract linear-algebra proofs remain
in Science.

## Holdings

- `src/linear-algebra.mts` — the executable shadow of the relational LinearAlgebra spine (finite integer matrix receipts; the abstract field/vector-space proof stays in Lean).

## Founding (2026-09-11)

Cannibalized from `@red-cup-engineering/feltos`'s `src/lib/math/rational/{linear-algebra, index}.mts` per the Founder's ruling that FeltOS carries no functionality beyond what it needs as a MUD server.

`math/rational/internal-real.mts` was deliberately **not** moved here: it imports feltos's own `math/tilings/chromatic-lorentzian.mts` (a causal-chain settling module), contradicting its own package doc-comment's claim that `rational` "must not import ... tiling".
It remains in feltos pending the sheaf/predication/topology/causal cluster's own migration -- moving it here would either duplicate `chromatic-lorentzian.mts` or leave a relative import back into the feltos app.
