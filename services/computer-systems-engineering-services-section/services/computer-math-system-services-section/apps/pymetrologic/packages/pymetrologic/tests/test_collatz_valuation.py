from __future__ import annotations

import pytest
from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import syracuse_step, v2
from pymetrologic.collatz_valuation import (
    CollatzShortcutWitness,
    TwoAdicFactor,
    collatz_saturating_shadow_run,
    shortcut_odd_part,
    two_adic_factor,
    two_adic_valuation_witness,
)


@given(value=st.integers(1, 100_000))
def test_two_adic_factor_reconstructs_positive_integers(value: int) -> None:
    factor = two_adic_factor(value)

    assert isinstance(factor, TwoAdicFactor)
    assert factor.holds
    assert factor.exponent == v2(value)
    assert factor.value == 2**factor.exponent * factor.odd_part
    assert factor.odd_part % 2 == 1


@given(seed=st.integers(1, 50_000).filter(lambda n: n % 2 == 1))
def test_shortcut_odd_part_is_nonempty_saturating_halving_run(seed: int) -> None:
    witness = shortcut_odd_part(seed)

    assert isinstance(witness, CollatzShortcutWitness)
    assert witness.holds
    assert witness.expanded == 3 * seed + 1
    assert witness.factor.exponent >= 1
    assert witness.shortcut_successor == syracuse_step(seed)
    assert witness.shortcut_successor == witness.factor.odd_part
    assert witness.halving_run[0] == witness.expanded
    assert witness.halving_run[-1] % 2 == 1
    assert len(witness.halving_run) == witness.factor.exponent + 1


def test_known_saturating_shadow_runs() -> None:
    assert collatz_saturating_shadow_run(1) == (4, 2, 1)
    assert collatz_saturating_shadow_run(3) == (10, 5)
    assert collatz_saturating_shadow_run(5) == (16, 8, 4, 2, 1)
    assert shortcut_odd_part(7).halving_run == (22, 11)
    assert two_adic_valuation_witness(11).shortcut_successor == 17


def test_collatz_valuation_rejects_values_outside_the_theorem_domain() -> None:
    with pytest.raises(ValueError, match="positive"):
        two_adic_factor(0)
    with pytest.raises(ValueError, match="positive odd"):
        shortcut_odd_part(4)
    with pytest.raises(ValueError, match="positive odd"):
        collatz_saturating_shadow_run(-3)
