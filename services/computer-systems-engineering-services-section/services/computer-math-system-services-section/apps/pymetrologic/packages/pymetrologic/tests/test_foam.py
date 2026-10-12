"""foam: triangulation invariants, T1/T2 mechanics, the reference law, and the settling port."""

from __future__ import annotations

import random

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic.bilattice import Bilattice, unit_interval
from pymetrologic.foam import (
    Foam,
    T1Event,
    aboav_weaire_fit,
    edge_charge,
    run_settling,
    run_von_neumann,
    scramble_topology,
    settling_area_step,
    t1_avalanche_sizes,
    triangular_torus,
    try_t1_flip,
    try_t2_removal,
    von_neumann_law_fit,
)

# --------------------------------------------------------------------------- #
# Construction: the triangular torus is a genuine 6-regular triangulation
# --------------------------------------------------------------------------- #


def test_triangular_torus_is_uniformly_six_sided() -> None:
    foam = triangular_torus(8, 8)
    assert all(foam.n(i) == 6 for i in foam.cells())


def test_triangular_torus_satisfies_the_handshake_lemma() -> None:
    foam = triangular_torus(8, 8)
    assert foam.handshake_ok()


def test_triangular_torus_has_zero_euler_defect() -> None:
    # Sigma n_i = 6|V| exactly for any triangulation of the torus (chi = 0).
    foam = triangular_torus(8, 8)
    assert foam.euler_defect() == 0


def test_triangular_torus_rejects_too_small_a_grid() -> None:
    import pytest

    with pytest.raises(ValueError):
        triangular_torus(3, 3)


# --------------------------------------------------------------------------- #
# T1 diagonal flip
# --------------------------------------------------------------------------- #


def test_t1_flip_moves_a_side_from_each_original_cell_to_each_common_neighbour() -> None:
    foam = triangular_torus(8, 8)
    i, j = next(iter(foam.edges()))
    common = foam.neighbors[i] & foam.neighbors[j]
    assert len(common) == 2
    a, b = tuple(common)

    result = try_t1_flip(foam, i, j)

    assert result == (a, b) or result == (b, a)
    assert j not in foam.neighbors[i]
    assert i not in foam.neighbors[j]
    assert b in foam.neighbors[a]
    assert a in foam.neighbors[b]
    assert foam.n(i) == 5
    assert foam.n(j) == 5
    assert foam.n(a) == 7
    assert foam.n(b) == 7


def test_t1_flip_preserves_the_handshake_lemma_and_euler_defect() -> None:
    foam = triangular_torus(8, 8)
    i, j = next(iter(foam.edges()))
    try_t1_flip(foam, i, j)
    assert foam.handshake_ok()
    assert foam.euler_defect() == 0


def test_t1_flip_on_a_nonexistent_edge_is_a_no_op() -> None:
    foam = triangular_torus(8, 8)
    cells = foam.cells()
    non_edges = [(a, b) for a in cells for b in cells if a != b and b not in foam.neighbors[a]]
    assert non_edges  # sanity: a 6-regular graph on 64 vertices has non-edges
    a, b = non_edges[0]
    before = {i: set(foam.neighbors[i]) for i in foam.cells()}
    assert try_t1_flip(foam, a, b) is None
    assert {i: set(foam.neighbors[i]) for i in foam.cells()} == before


def test_t1_flip_refuses_to_drop_a_cell_below_three_sides() -> None:
    foam = triangular_torus(8, 8)
    edges = list(foam.edges())
    # Flip every edge touching one cell down toward degree 3, then check the
    # guard actually engages once more flips would cross below min_n.
    i = foam.cells()[0]
    flips_done = 0
    for a, b in edges:
        if i not in (a, b):
            continue
        if foam.n(i) <= 3:
            assert try_t1_flip(foam, a, b) is None
            continue
        if try_t1_flip(foam, a, b) is not None:
            flips_done += 1
    assert foam.n(i) >= 3


# --------------------------------------------------------------------------- #
# T2 removal
# --------------------------------------------------------------------------- #


def test_t2_removal_only_fires_on_three_sided_cells() -> None:
    foam = triangular_torus(8, 8)  # every cell is 6-sided
    removed = list(try_t2_removal(foam))
    assert removed == []
    assert len(foam.cells()) == 64


def test_t2_removal_deletes_the_cell_and_conserves_total_area() -> None:
    foam = triangular_torus(8, 8)
    i, j = next(iter(foam.edges()))
    try_t1_flip(foam, i, j)  # drops i and j to n=5, leaves nothing at n=3 yet
    # Manually construct a 3-sided cell: repeatedly flip edges at one cell.
    target = i
    rng = random.Random(0)
    for _ in range(200):
        if foam.n(target) == 3:
            break
        nbrs = list(foam.neighbors[target])
        rng.shuffle(nbrs)
        for other in nbrs:
            if try_t1_flip(foam, target, other) is not None:
                break
    assert foam.n(target) == 3

    total_before = foam.total_area()
    removed = list(try_t2_removal(foam))

    assert target in removed
    assert target not in foam.cells()
    assert foam.handshake_ok()
    assert abs(foam.total_area() - total_before) < 1e-9


# --------------------------------------------------------------------------- #
# scramble_topology: disorder without breaking the triangulation invariants
# --------------------------------------------------------------------------- #


@given(seed=st.integers(0, 10_000), flips=st.integers(0, 120))
def test_scramble_preserves_handshake_and_euler_defect(seed: int, flips: int) -> None:
    foam = triangular_torus(8, 8)
    scrambled = scramble_topology(foam, flips=flips, rng=random.Random(seed))
    assert scrambled.handshake_ok()
    assert scrambled.euler_defect() == 0


def test_scramble_actually_introduces_side_count_variety() -> None:
    foam = triangular_torus(10, 10)
    scrambled = scramble_topology(foam, flips=150, rng=random.Random(1))
    ns = {scrambled.n(i) for i in scrambled.cells()}
    assert len(ns) > 1  # no longer uniformly hexagonal


# --------------------------------------------------------------------------- #
# The reference von Neumann-Mullins law: exact, by construction
# --------------------------------------------------------------------------- #


def test_reference_law_gives_zero_rate_on_the_undisturbed_lattice() -> None:
    foam = triangular_torus(8, 8)
    result = run_von_neumann(foam, steps=5, k=0.05)
    assert all(rate == 0.0 for _n, rate in result.rate_samples)


def test_reference_law_fit_recovers_k_and_the_root_at_six() -> None:
    foam = triangular_torus(12, 12)
    scrambled = scramble_topology(foam, flips=180, rng=random.Random(3))
    result = run_von_neumann(scrambled, steps=30, k=0.02, area_min=0.05)
    fit = von_neumann_law_fit(result.rate_samples)
    # Exact by construction (dA/dt = k(n-6) is what run_von_neumann computes),
    # so the fit should recover it almost exactly.
    assert fit.r_squared > 0.999
    assert abs(fit.slope - 0.02) < 1e-6
    assert abs(fit.predicted_root - 6.0) < 1e-6


def test_reference_law_conserves_the_aggregate_rate_via_euler_defect() -> None:
    # Sum_i k(n_i - 6) = k * euler_defect = 0 identically for any triangulated
    # torus foam, at every step (T1/T2 both preserve euler_defect == 0).
    foam = triangular_torus(10, 10)
    scrambled = scramble_topology(foam, flips=100, rng=random.Random(4))
    result = run_von_neumann(scrambled, steps=20, k=0.03, area_min=0.05)
    assert result.foam.euler_defect() == 0


# --------------------------------------------------------------------------- #
# The settling variant: boundary charges via the corpus's own knowledge join
# --------------------------------------------------------------------------- #


def test_edge_charge_of_two_hexagonal_cells_is_fully_settled_with_no_conflict() -> None:
    bl = Bilattice(unit_interval())
    foam = triangular_torus(8, 8)
    i, j = next(iter(foam.edges()))
    charge = edge_charge(bl, foam, i, j)
    assert charge.pro == 1.0
    assert charge.con == 0.0
    assert bl.conflict_degree(charge) == 0.0


def test_edge_charge_is_maximally_conflicted_between_a_stable_and_an_extreme_cell() -> None:
    # The posit rule only sees |n - 6|, so two *equally* extreme neighbours
    # (both far from six) actually agree ("both unstable") and carry no
    # conflict -- conflict is maximal when one side posits "stable" (n == 6,
    # pro=1, con=0) and the other posits "unstable" (n far from 6, pro=0,
    # con=1): the knowledge join then lands on <1, 1>, full conflict.
    bl = Bilattice(unit_interval())
    from pymetrologic.foam import _posit

    stable = _posit(bl, 6)  # pro=1, con=0
    extreme = _posit(bl, 12)  # deviation clipped to 1.0: pro=0, con=1
    joined = bl.join_k(stable, extreme)
    assert joined.pro == 1.0
    assert joined.con == 1.0
    assert bl.conflict_degree(joined) == 1.0


def test_edge_charge_between_two_equally_extreme_cells_is_not_conflicted() -> None:
    # Both sides agree the boundary is unstable -- no *disagreement*, even
    # though neither side is settled toward "stable."
    bl = Bilattice(unit_interval())
    from pymetrologic.foam import _posit

    low = _posit(bl, 0)
    high = _posit(bl, 12)
    joined = bl.join_k(low, high)
    assert bl.conflict_degree(joined) == 0.0


def test_settling_area_step_conserves_total_area_on_a_static_topology() -> None:
    # settling_area_step's per-edge flux is antisymmetric by construction, so
    # one step on a fixed topology (no T1/T2 in between) must conserve area
    # exactly regardless of how the charges came out.
    bl = Bilattice(unit_interval())
    foam = triangular_torus(10, 10)
    scrambled = scramble_topology(foam, flips=120, rng=random.Random(5))
    before = scrambled.total_area()
    new_area = settling_area_step(scrambled, bl, k=0.1, dt=1.0)
    assert abs(sum(new_area.values()) - before) < 1e-9


def test_run_settling_smoke_produces_events_and_stays_structurally_valid() -> None:
    foam = triangular_torus(12, 12)
    scrambled = scramble_topology(foam, flips=180, rng=random.Random(6))
    result = run_settling(scrambled, steps=25, k=0.12, conflict_min=0.45, area_min=0.05)
    assert result.foam.handshake_ok()
    assert result.foam.euler_defect() == 0
    assert len(result.foam.cells()) < 144  # coarsening actually happened
    assert len(result.t1_events) > 0 or len(result.t2_events) > 0


# --------------------------------------------------------------------------- #
# Measurement helpers, tested against synthetic data with a known answer
# --------------------------------------------------------------------------- #


def test_von_neumann_law_fit_recovers_an_exact_synthetic_line() -> None:
    k = 0.07
    samples = [(n, k * (n - 6)) for n in range(3, 13) for _ in range(4)]
    fit = von_neumann_law_fit(samples)
    assert abs(fit.slope - k) < 1e-9
    assert abs(fit.intercept - (-6 * k)) < 1e-9
    assert fit.r_squared > 0.999999
    assert abs(fit.predicted_root - 6.0) < 1e-9


def test_aboav_weaire_fit_recovers_an_exact_synthetic_curve() -> None:
    # aboav_weaire_fit only ever averages its second column and fits against
    # 1/n, so feeding the exact (non-integer) m(n) = a + b/n directly checks
    # the fit's numerics without needing an integer-valued neighbour model.
    a, b = 5.0, 8.0
    samples = [(n, a + b / n) for n in range(3, 11) for _ in range(3)]
    fit = aboav_weaire_fit(samples)  # type: ignore[arg-type]
    assert abs(fit.a - a) < 1e-6
    assert abs(fit.b - b) < 1e-6
    assert fit.r_squared > 0.999999


def test_t1_avalanche_sizes_counts_events_per_step() -> None:
    events = [
        T1Event(step=0, edge=(1, 2), new_edge=(3, 4)),
        T1Event(step=0, edge=(5, 6), new_edge=(7, 8)),
        T1Event(step=2, edge=(1, 2), new_edge=(3, 4)),
    ]
    assert t1_avalanche_sizes(events) == [1, 2]


def test_t1_avalanche_sizes_of_no_events_is_empty() -> None:
    assert t1_avalanche_sizes([]) == []


# --------------------------------------------------------------------------- #
# Foam plumbing
# --------------------------------------------------------------------------- #


def test_foam_copy_is_independent_of_the_original() -> None:
    foam = triangular_torus(8, 8)
    clone = foam.copy()
    i, j = next(iter(foam.edges()))
    try_t1_flip(clone, i, j)
    assert foam.n(i) == 6
    assert clone.n(i) == 5


def test_foam_total_area_matches_the_sum_of_cell_areas() -> None:
    foam = Foam(neighbors={0: {1}, 1: {0}}, area={0: 2.5, 1: 1.5})
    assert foam.total_area() == 4.0
