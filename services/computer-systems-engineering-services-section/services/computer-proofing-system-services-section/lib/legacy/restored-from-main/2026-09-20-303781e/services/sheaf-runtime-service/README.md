# Sheaf Runtime Service

This service realizes finite executable shadows of Obsmetrologia's
order-theoretic twist-product and d-frame-valued-sheaf theorems. It is
generic over a caller's four-valued charge or claim vocabulary, so a runtime
can check one implementation rather than copy and relabel it. The theorems
and mathematical research remain in Science.

## Holdings

- `src/four-valued-names.mts` — the one shape (`FourValuedNames<Name>`) a caller supplies to name its own four charge/claim strings.
- `src/order/four-twist-product.mts` — finite executable shadow of `RelMath.Order.TwistProductResiduation`: `fourTwistProduct(algebra)` checks that the Boolean twist product `Two^twist` is exactly a given four-valued charge algebra's lattice/linear-logic operations.
- `src/topology/d-frame.mts` — finite executable shadow of `Obsmetrologia.DFrame.dframe_valued_sheaf`: the finite powerset frame, the canonical bitopological d-frame, and `valuedSheafReceipt(names, valuation)`, the d-frame-valued settling sheaf laws over a caller-supplied valuation.

## Founding (2026-09-11)

`fourTwistProduct` and `valuedSheafReceipt` were hand-copied, verbatim except for relabeled charge names, between `@lenticule-science/articulating`'s own `predicating/positing/settling/analysis/{twist-product,d-frame}.mts` (semiotic charge vocabulary: absurd/potential/active/stable) and `@red-cup-engineering/ feltos`'s `src/lib/math/{topology/twist-product,order/d-frame}.mts` (federation claim vocabulary: unknown/held/denied/contested).
Per the Founder's ruling that date ("if it's about sheafs, then lenticule-science/sheaf-mathematics-services- section"), the pure math is canonicalized here, generic over the caller's own vocabulary; both prior copies are deleted and both consumers now compose this section with their own charge/claim algebra.

Feltos's own copy had drifted from its declared semantics: its `dK`/`dF` filtered the wrong two of the four charge names relative to its own `chargeOfBooleanPoint` mapping, and `valuedSheafReceipt`'s `topSharedByBothSides` / `bottomInNeitherSide` checks used the wrong charge names for top/bottom — a real latent bug reaching a real consumer (`negative-paraconsistent-sheaf.mts`'s `dF` import).
Canonicalizing here fixes it, rather than leaving three independently-drifting copies.

## Correctness

`test/four-twist-product.test.mjs` proves `fourTwistProduct` against articulating's own real, already-proven semiotic charge algebra (a devDependency, test-only) — the exact algebra its former hardcoded copy verified — and that a broken algebra produces an obstruction, never a false witness.
`test/d-frame.test.mjs` proves the d-frame functions over both a synthetic vocabulary and FeltOS's own real four claim names.
