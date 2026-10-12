"""Settling local constancy (RelMath.Cohomology.SettlingLocalConstancy)."""

from __future__ import annotations

import pytest

from pymetrologic.bitopological_site import (
    SiteObj,
)
from pymetrologic.kz_coherent import (
    FiniteKZSheaf,
    OneCell,
    id_cell,
    onecell_comp,
)
from pymetrologic.local_constancy import (
    assoc_sheaf_predicate_locally_constant_iff,
    constant_sheaf,
    constant_sheaf_locally_constant,
    every_sheaf_settling_locally_constant,
    iso,
    predicate_locally_constant,
    predicate_locally_constant_iff,
    predicate_uniform,
    settling_locally_constant,
    vanishing_regime_local_constancy_model,
)
from pymetrologic.pairwise_stone import (
    CLOPEN_BOT,
    CLOPEN_PLUS,
    CLOPEN_TOP,
)
from pymetrologic.regimes import (
    ClosureRegime,
)


def sample_sheaf() -> tuple[FiniteKZSheaf[int], tuple[OneCell, ...]]:
    x = SiteObj("q", 0, CLOPEN_BOT)
    y = SiteObj("q", 0, CLOPEN_PLUS)
    z = SiteObj("q", 0, CLOPEN_TOP)
    f = OneCell(x, y, "f")
    g = OneCell(y, z, "g")
    gf = onecell_comp(g, f)
    routes = (id_cell(x), id_cell(y), id_cell(z), f, g, gf)
    sheaf = FiniteKZSheaf(
        routes=routes,
        sections={routes[0]: 0, routes[1]: 0, routes[2]: 0, f: 2, g: 3, gf: 5},
        rest_ids={x: 0, y: 0, z: 0},
        rest_comp=lambda outer, inner: outer + inner,
    )
    return sheaf, routes


def test_iso_is_equality_shadow_of_section_map_isomorphism() -> None:
    assert iso("a", "a")
    assert iso(3, 3)
    assert not iso("a", "b")


def test_predicate_local_constancy_is_kz_coherence_plus_identity_pinning() -> None:
    sheaf, routes = sample_sheaf()
    x = routes[0].src
    broken_identity = FiniteKZSheaf(
        routes=routes,
        sections={**sheaf.sections, routes[0]: 99},
        rest_ids={**sheaf.rest_ids, x: 0},
        rest_comp=sheaf.rest_comp,
    )

    assert predicate_uniform(sheaf)
    assert predicate_locally_constant(sheaf)
    assert predicate_locally_constant_iff(sheaf)
    assert assoc_sheaf_predicate_locally_constant_iff(sheaf)
    assert not predicate_uniform(broken_identity)
    assert not predicate_locally_constant(broken_identity)
    assert predicate_locally_constant_iff(broken_identity)


def test_settling_local_constancy_is_forced_in_the_strict_model() -> None:
    sheaf, _routes = sample_sheaf()

    assert settling_locally_constant(sheaf)
    assert every_sheaf_settling_locally_constant(sheaf)


def test_constant_sheaf_is_predicate_locally_constant() -> None:
    sheaf, routes = sample_sheaf()
    const = constant_sheaf(routes, "A")
    witness = constant_sheaf_locally_constant(routes, 0, sheaf)

    assert all(const.sec(route) == "A" for route in routes)
    assert predicate_locally_constant(const)
    assert witness.constant_sheaf_predicate_locally_constant
    assert witness.associated_sheaf_iff_predicate_uniform
    assert witness.holds


def test_vanishing_regime_local_constancy_model_is_strict_scott_only() -> None:
    sheaf, _routes = sample_sheaf()

    strict = vanishing_regime_local_constancy_model(ClosureRegime.strict, sheaf)
    scott = vanishing_regime_local_constancy_model(ClosureRegime.scott, sheaf)

    assert strict.holds
    assert scott.holds
    assert strict.h1_vanishes
    assert strict.predicate_constancy_forces_kz
    assert strict.settling_constancy_forced

    with pytest.raises(ValueError, match="strict or Scott"):
        vanishing_regime_local_constancy_model(ClosureRegime.aperiodic, sheaf)
