"""KZ-coherent finite sheaves (RelMath.Cohomology.KZCoherentSheaf)."""

from __future__ import annotations

import pytest

from pymetrologic.bitopological_site import (
    SiteObj,
)
from pymetrologic.kz_coherent import (
    FiniteKZSheaf,
    OneCell,
    every_sheaf_kzcoherent_strict,
    id_cell,
    kz2cell,
    kz2cell_forces_eq,
    kz2cell_id,
    kz2cell_inv,
    kz_coherent_descent,
    kz_coherent_identifies_parallel,
    onecell_comp,
    postcomp,
)
from pymetrologic.pairwise_stone import (
    CLOPEN_BOT,
    CLOPEN_PLUS,
    CLOPEN_TOP,
)


def sample_sheaf() -> tuple[FiniteKZSheaf[int], OneCell, OneCell, OneCell]:
    x = SiteObj("q", 0, CLOPEN_BOT)
    y = SiteObj("q", 0, CLOPEN_PLUS)
    z = SiteObj("q", 0, CLOPEN_TOP)
    f = OneCell(x, y, "f")
    g = OneCell(y, z, "g")
    gf = onecell_comp(g, f)
    idx = id_cell(x)
    idy = id_cell(y)
    idz = id_cell(z)
    sheaf = FiniteKZSheaf(
        routes=(idx, idy, idz, f, g, gf),
        sections={idx: 0, idy: 0, idz: 0, f: 2, g: 3, gf: 5},
        rest_ids={x: 0, y: 0, z: 0},
        rest_comp=lambda outer, inner: outer + inner,
    )
    return sheaf, f, g, gf


def test_finite_sheaf_identity_and_composition_compatibility() -> None:
    sheaf, f, g, gf = sample_sheaf()

    assert sheaf.compat_id
    assert sheaf.compat_comp
    assert sheaf.functorial
    assert gf.src == f.src
    assert gf.dst == g.dst
    assert gf.predicate_leg == "g after f"

    with pytest.raises(ValueError, match=r"inner\.dst"):
        onecell_comp(f, g)


def test_strict_kz_2_cells_collapse_to_route_equality() -> None:
    _sheaf, f, _g, _gf = sample_sheaf()
    f_prime = OneCell(f.src, f.dst, "f-prime")

    assert kz2cell_id(f)
    assert kz2cell(f, f)
    assert not kz2cell(f, f_prime)
    assert kz2cell_inv(f, f)
    assert kz2cell_inv(f, f_prime)
    assert kz2cell_forces_eq(f, f)
    assert kz2cell_forces_eq(f, f_prime)


def test_kz_coherence_identifies_connected_parallel_sections() -> None:
    sheaf, _f, _g, _gf = sample_sheaf()
    witness = kz_coherent_identifies_parallel(sheaf)

    assert every_sheaf_kzcoherent_strict(sheaf)
    assert witness.coherent_condition
    assert witness.strict_universality
    assert witness.holds


def test_postcomposition_preserves_strict_kz_coherence() -> None:
    sheaf, f, _g, _gf = sample_sheaf()
    post = postcomp(sheaf, lambda value: f"v{value}", lambda outer, inner: f"{outer}|{inner}")

    assert post.sec(f) == "v2"
    assert post.rest_id(f.src) == "v0"
    assert every_sheaf_kzcoherent_strict(post)


def test_kz_coherent_descent_witnesses_postcomposition_closure() -> None:
    sheaf, _f, _g, _gf = sample_sheaf()
    witness = kz_coherent_descent(
        sheaf,
        lambda value: value % 2,
        lambda outer, inner: (outer + inner) % 2,
    )

    assert witness.characterizes_subcategory
    assert witness.postcomp_closed
    assert witness.strict_universality
    assert witness.canonical_predcat_instance
    assert witness.holds
