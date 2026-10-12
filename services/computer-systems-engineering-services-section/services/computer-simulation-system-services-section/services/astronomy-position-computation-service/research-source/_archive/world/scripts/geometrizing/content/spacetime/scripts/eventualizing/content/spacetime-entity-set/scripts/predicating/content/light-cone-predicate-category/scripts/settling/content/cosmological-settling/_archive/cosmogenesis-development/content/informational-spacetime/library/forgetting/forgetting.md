---
name: forgetting
kind: morphism
is: transfer
role: predication-monad-unit
domain: bit
codomain: bit
---

**Forgetting reopens the object-slot of a bit**, driving it from active back to potential and discarding the realized token — the predication-monad unit (η).
It **is** the kernel's `transfer` (`active/voidmath-kernel/articulating/library/category/transferring/scripts/transfer.mjs`):

$$ \mathrm{transfer}([\,\text{carrier},[\,\text{tokenSlot},\text{claimSlot}\,]\,]) \;=\; [\,\text{carrier},[\,[\,],\text{claimSlot}\,]\,]. $$

## Forgetting is non-injective, and that is information loss

A distinct active bit and a bare potential bit both map to the same reopened gap: `transfer` cannot be undone, because the token it threw away leaves no trace in the result.
The map is many-to-one.

Non-injectivity *is* information loss — there is no weaker statement of it.
Forgetting is the lossy map: coarse-graining, marginalization, erasure.
After it, you know the bit is open again but not which value it held.
This is where equivocation lives, and it is where an arrow first enters the field: a step that cannot be reversed, before any geometry exists to carry time.

## The adjunction

Realizing and forgetting are adjoint, μ ⊣ η, with identity counit:

$$ \mathrm{saturate}\circ\mathrm{transfer} \;=\; \mathrm{id} $$

(proved in the kernel's `proof-aperiodic-monad-coherence`).
Realizing immediately after forgetting restores an active bit — you can re-deliver the signal — but the particular history forgetting erased does not return.
So the pair gives the bit a dynamics that is *reversible in form* (the counit is identity) yet *lossy in fact* (η is non-injective).
The reversible local law and the irreversible global fact already coexist here, in the bare two-fold, before they reappear far down the descent as the reversible worldline and the irreversible arrow of thermal time.

What that lost bit *costs* — once the descent has thermalized far enough to have a temperature — is [landauer-bound](library/landauer-bound/landauer-bound.md): forgetting's non-injectivity is free in every regime above the thermal floor, but at thermal-spacetime the second law charges it as $k_B T \ln 2$ of heat per bit.
The proof (`landauer-bound/scripts/proof.mjs`) runs on the stable `@561-group/math` morphisms.
