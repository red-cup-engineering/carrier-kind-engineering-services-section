"""Bitopological settling site over the FOUR Stone fiber."""

from __future__ import annotations

import pytest

from pymetrologic.bitopological_site import (
    FiberHom,
    SiteObj,
    advances,
    all_cover_families,
    bitopological_site_grothendieck,
    clopen_boolean_algebra,
    clopen_join,
    clopen_meet,
    clopen_sub,
    covers,
    covers_pullback,
    covers_self,
    covers_singleton_iff,
    covers_trans,
    fiber_comp,
    fiber_id,
    join_list,
    no_temporal_covers,
    strict_site_finite_fiber,
)
from pymetrologic.pairwise_stone import (
    CLOPEN_BOT,
    CLOPEN_MINUS,
    CLOPEN_PLUS,
    CLOPEN_TOP,
    CLOPEN_UPS,
)
from pymetrologic.regimes import (
    ClosureRegime,
)


def test_clopens_form_the_four_element_boolean_algebra() -> None:
    witness = clopen_boolean_algebra()

    assert witness.holds
    assert clopen_meet(CLOPEN_PLUS, CLOPEN_MINUS) == CLOPEN_BOT
    assert clopen_join(CLOPEN_PLUS, CLOPEN_MINUS) == CLOPEN_TOP
    assert clopen_sub(CLOPEN_PLUS, CLOPEN_TOP)
    assert clopen_sub(CLOPEN_BOT, CLOPEN_MINUS)
    assert not clopen_sub(CLOPEN_PLUS, CLOPEN_MINUS)


def test_join_cover_relation_is_computed_inside_one_clopen_fiber() -> None:
    assert join_list((CLOPEN_PLUS, CLOPEN_MINUS)) == CLOPEN_TOP
    assert covers_self(CLOPEN_TOP)
    assert covers(CLOPEN_TOP, (CLOPEN_PLUS, CLOPEN_MINUS))
    assert covers(CLOPEN_PLUS, (CLOPEN_PLUS,))
    assert covers(CLOPEN_BOT, ())
    assert not covers(CLOPEN_PLUS, (CLOPEN_MINUS,))
    assert all_cover_families(CLOPEN_TOP)


def test_covers_pull_back_along_clopen_inclusion() -> None:
    pulled = covers_pullback(CLOPEN_TOP, CLOPEN_PLUS, (CLOPEN_PLUS, CLOPEN_MINUS))

    assert pulled == (CLOPEN_PLUS, CLOPEN_BOT)
    assert covers(CLOPEN_PLUS, pulled)

    with pytest.raises(ValueError, match="requires a cover and an inclusion"):
        covers_pullback(CLOPEN_PLUS, CLOPEN_TOP, (CLOPEN_PLUS,))


def test_covers_are_transitive_by_flattening_subcovers() -> None:
    flattened = covers_trans(
        CLOPEN_TOP,
        (CLOPEN_PLUS, CLOPEN_MINUS),
        lambda member: (member,),
    )

    assert flattened == (CLOPEN_PLUS, CLOPEN_MINUS)
    assert covers(CLOPEN_TOP, flattened)

    with pytest.raises(ValueError, match="requires each member subcover"):
        covers_trans(
            CLOPEN_TOP,
            (CLOPEN_PLUS, CLOPEN_MINUS),
            lambda _member: (CLOPEN_MINUS,),
        )


def test_fiber_morphisms_compose_at_fixed_predicate_and_stratum() -> None:
    top = SiteObj("q", 0, CLOPEN_TOP)
    plus = SiteObj("q", 0, CLOPEN_PLUS)
    bot = SiteObj("q", 0, CLOPEN_BOT)

    assert fiber_id(top).valid
    assert FiberHom(bot, plus).valid
    assert FiberHom(plus, top).valid
    assert fiber_comp(FiberHom(plus, top), FiberHom(bot, plus)) == FiberHom(bot, top)

    with pytest.raises(ValueError, match=r"inner\.dst"):
        fiber_comp(FiberHom(plus, top), FiberHom(bot, top))


def test_advancement_is_preorder_but_not_a_cover_axis() -> None:
    assert advances(0, 0)
    assert advances(0, 3)
    assert not advances(3, 0)
    assert covers_singleton_iff(CLOPEN_TOP, CLOPEN_TOP)
    assert covers_singleton_iff(CLOPEN_TOP, CLOPEN_PLUS)

    witness = no_temporal_covers()
    assert witness.holds
    assert witness.singleton_cover_iff_equal
    assert witness.covers_are_fiber_local
    assert witness.temporal_advancement_reduces_to_identity_cover


def test_bitopological_site_grothendieck_and_strict_finite_fiber() -> None:
    site = bitopological_site_grothendieck()
    regime, fiber = strict_site_finite_fiber()

    assert site.holds
    assert site.clopen_algebra.holds
    assert site.cover_basis.holds
    assert regime == ClosureRegime.strict
    assert fiber == CLOPEN_UPS
    assert len(fiber) == 4
