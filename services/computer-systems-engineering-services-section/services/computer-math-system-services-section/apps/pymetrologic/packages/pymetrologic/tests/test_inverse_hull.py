from __future__ import annotations

import pytest

from pymetrologic.classification import (
    H1Class,
)
from pymetrologic.inverse_hull import (
    APHullThread,
    APInverseSystem,
    ap_hull_has_distinct_threads,
    ap_hull_system,
    const_thread,
    hull_pairs_clinv,
    hull_separated_by_stages,
    inverse_hull_laws,
    projection_coherence,
    seam_map,
    seam_map_surjective,
)


def test_constant_hull_threads_are_projection_coherent() -> None:
    system = ap_hull_system()
    thread = const_thread(H1Class(4), (0, 2, 5))

    assert thread.stages == (0, 2, 5)
    assert thread.at(2) == H1Class(4)
    assert projection_coherence(system, thread)
    assert seam_map(thread) == H1Class(4)


def test_inverse_hull_laws_hold_on_sampled_constant_threads() -> None:
    system = ap_hull_system()
    threads = [
        const_thread(H1Class(0), (0, 1, 2)),
        const_thread(H1Class(1), (0, 1, 2)),
    ]

    assert inverse_hull_laws(system, threads)
    assert hull_separated_by_stages(threads[0], const_thread(H1Class(0), (0, 1, 2)))
    assert not hull_separated_by_stages(threads[0], threads[1])


def test_nonconstant_projection_can_still_define_coherent_threads() -> None:
    system = APInverseSystem(
        project_stage=lambda earlier, later, value: H1Class(value.coord - (later - earlier))
    )
    thread = APHullThread({0: H1Class(2), 1: H1Class(3), 4: H1Class(6)})

    assert projection_coherence(system, thread)
    assert system.project(1, 4, H1Class(6)) == H1Class(3)


def test_seam_surjective_and_hull_pairs_nonzero_clinv() -> None:
    stages = (0, 3, 8)
    witness, nonzero = hull_pairs_clinv(stages)

    assert seam_map_surjective(H1Class(-7), stages)
    assert seam_map(witness) == H1Class(1)
    assert nonzero
    assert ap_hull_has_distinct_threads(stages)


def test_inverse_hull_validation() -> None:
    with pytest.raises(ValueError, match="at least one"):
        APHullThread({})

    with pytest.raises(ValueError, match="natural"):
        APHullThread({-1: H1Class()})

    with pytest.raises(ValueError, match="greater"):
        ap_hull_system().project(3, 2, H1Class())

    with pytest.raises(ValueError, match="same sampled"):
        hull_separated_by_stages(
            const_thread(H1Class(), (0, 1)),
            const_thread(H1Class(), (0, 2)),
        )
