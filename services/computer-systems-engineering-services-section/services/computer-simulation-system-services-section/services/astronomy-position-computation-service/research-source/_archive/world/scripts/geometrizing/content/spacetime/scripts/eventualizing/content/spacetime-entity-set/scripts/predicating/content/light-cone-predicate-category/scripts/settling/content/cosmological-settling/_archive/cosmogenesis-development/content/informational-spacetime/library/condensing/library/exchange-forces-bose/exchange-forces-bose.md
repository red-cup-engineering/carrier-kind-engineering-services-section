---
name: exchange-forces-bose
kind: theorem
generated-by: condensing
status: hacking
---

**Exchangeability forces Bose statistics.** [Condensing](../../../../../../../../../../../../../../../../../../../../../informational-spacetime/scripts/condensing/condensing.md) emits the cell-set $\Phi = E \times \Pi \times E$ and the entity dimension $E$ enters as a *set* — the cells are invariant under permuting the entities.
That is de Finetti's exchangeability, and from it the occupation counting of the quantum rung is forced to be **Bose**: $N$ indistinguishable quanta over $M$ modes have $\binom{N+M-1}{M-1}$ states, strictly fewer than the distinguishable $M^N$, and the single-mode condensate is allowed.
This is a **slice-independent** fact — true of *any* spacetime's quantum rung, not a feature of our cosmos — which is why it belongs to the general theory and not to the hunt for our particular slice.

The chain is a runnable proof: **`node scripts/proof.mjs`** — 13 assertions, exit 0; the exchangeability step is grounded in the stable `@561-group/math` `posit` morphism, the counting in explicit enumeration.

## The derivation (each step is a passing assertion)

1. **Exchangeability is real, not asserted.** Built over the stable morphism: `posit` (collapsing) ranges the cells over the [entity](../quantum-spacetime/library/quantum/quantum.md)-set as a *set*, so `cellSet(entities, modes)` is identical for every ordering of the entities.
  Condensing keeps the shared predicate ([mode](../quantum-spacetime/library/mode/mode.md), $\Pi$) and discards *which* [bit](../../../marking/library/bit/bit.md) carried it — the entities are interchangeable.
2. **Indistinguishability is the Sym(N) quotient.** If you cannot tell which quantum is which, two labeled assignments that differ only by relabeling the quanta are the *same* state.
  The invariant of an assignment under relabeling is its **occupation vector** (how many quanta in each mode), so the states are the orbits of the $M^N$ labeled assignments under $\mathrm{Sym}(N)$.
3. **The orbit count is exactly the Bose count.** By explicit enumeration for a range of $(N,M)$: the number of distinct occupation vectors equals $\binom{N+M-1}{M-1}$ (stars and bars) — Bose.
  The quotient *is* Bose counting; nothing extra is assumed.
4. **It strictly collapses the labeled count.** $\binom{N+M-1}{M-1} < M^N$ for $N,M>1$ (e.g. $M^N=27$, Bose $=10$ at $N=M=3$): exchangeability removes the which-quantum-is-which information — the de Finetti reduction, visible as fewer states.
5. **The same quotient with exclusion gives Fermi; without it, the condensate.** Restricting the orbits to $\le 1$ per mode reproduces $\binom{M}{N}$ (Fermi–Dirac).
  Without that restriction, the all-$N$-in-one-mode occupation is a perfectly good Bose state — the **condensate** — which Fermi forbids.
  The three statistics are three treatments of identity; condensing, by discarding entity identity *without* exclusion, lands on Bose.

## Why this is condensing's headline, proved

[condensing](../../../../../../../../../../../../../../../../../../../../../informational-spacetime/scripts/condensing/condensing.md) claims "indistinguishability is forced, and it is Bose statistics," and [quantum-spacetime](../quantum-spacetime/quantum-spacetime.md) claims the value-free fibration *is* quantum mechanics rather than a picture of it.
This cell discharges the first claim mechanically: the permutation-invariance of $\Phi$'s entity dimension (a property of the real morphism) is exactly the hypothesis of de Finetti exchangeability, and the Bose count is its forced consequence.
No appeal to physics is made — the statistics drop out of "the entities enter unordered."

The result holds in every regime that has a quantum rung, regardless of which classical slice it later collapses to.
It is structure of the descent, not data about our cosmos.
