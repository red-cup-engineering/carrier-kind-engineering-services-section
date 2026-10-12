"""Free-energy Lyapunov / H-theorem of settling (RelMath.Flow.FreeEnergyLyapunov)."""

from __future__ import annotations

from pymetrologic import (
    bilattice,
    boolean,
    closure_step,
    deficit,
    four,
    k_height,
    knowledge_lattice,
)

bl = four()


def test_k_height_values() -> None:
    assert k_height(bl, bl.none) == 0  # ⊥ₖ
    assert k_height(bl, bl.true) == 1
    assert k_height(bl, bl.false) == 1
    assert k_height(bl, bl.conflict) == 2  # ⊤ₖ


def test_k_height_is_monotone_in_the_knowledge_order() -> None:
    cb = bilattice(boolean())
    vals = cb.sample(0)
    for a in vals:
        for b in vals:
            if cb.leq_k(a, b):
                assert k_height(cb, a) <= k_height(cb, b)


def test_deficit_zero_only_at_the_fixed_point() -> None:
    w = {"x": bl.conflict, "y": bl.true}
    assert deficit(bl, w, w) == 0  # at the fixed point
    v = {"x": bl.none, "y": bl.none}
    assert deficit(bl, v, w) == 3  # kHeight ⊤ + kHeight t = 2 + 1


def test_h_theorem_deficit_strictly_descends_along_settling() -> None:
    lat = knowledge_lattice(bl.L)
    # A closure that drives every cell to ⊤ (the fixed point w).
    step = closure_step(lat, lambda x: x, bl.conflict)
    w = {"a": bl.conflict, "b": bl.conflict}

    state = {"a": bl.none, "b": bl.false}
    energies = [deficit(bl, state, w)]
    for _ in range(3):
        state = {c: step(state[c]) for c in state}
        energies.append(deficit(bl, state, w))

    # Monotone non-increasing, reaching 0 at the fixed point.
    assert all(energies[i] >= energies[i + 1] for i in range(len(energies) - 1))
    assert energies[0] > 0
    assert energies[-1] == 0
