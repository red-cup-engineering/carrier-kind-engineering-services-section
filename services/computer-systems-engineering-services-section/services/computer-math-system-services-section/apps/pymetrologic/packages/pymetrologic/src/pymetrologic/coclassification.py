"""Strict-Boolean co-classifying invariant shadows.

Lean's ``Aperiodic.CoClassifying`` records the cosheaf-homology side of the
aperiodic classifying invariant.  In the strict Boolean d-frame setting, spatial
Verdier duality is modeled as the coordinate-preserving bijection from the
sheaf-cohomology class ``H1Class`` to the cosheaf-homology class
``H1Homology``.
"""

from __future__ import annotations

from dataclasses import dataclass

from pymetrologic.dframe import consistency, totality

from .classification import (
    AperiodicSettling,
    H1Class,
    aperiodic_witness,
    classifying_equivalent,
)


@dataclass(frozen=True)
class H1Homology:
    """A coordinate for the cosheaf-homology dual class."""

    dual_coord: int = 0

    @property
    def is_zero(self) -> bool:
        """Return whether this is the zero homology class."""

        return self.dual_coord == 0


@dataclass(frozen=True)
class DualCosheaf:
    """The finite Boolean d-frame carrier of a dual cosheaf."""

    points: frozenset[str]
    homology_class: H1Homology


__all__ = [
    "DualCosheaf",
    "H1Homology",
    "co_cl_inv",
    "co_classifying_equivalent",
    "co_classifying_model_holds",
    "co_clinv_aperiodic_witness_nonzero",
    "d_spatial",
    "d_spatial_inv",
    "d_spatial_isomorphism",
    "d_spatial_zero",
    "dual_cosheaf",
    "dual_cosheaf_boolean_dframe",
    "mld_refines_coclassifying_equivalence",
]


def d_spatial(x: H1Class) -> H1Homology:
    """Spatial Verdier duality ``D_sp : H1 -> H_1`` in the strict Boolean case."""

    return H1Homology(x.coord)


def d_spatial_inv(y: H1Homology) -> H1Class:
    """The inverse strict Boolean spatial Verdier duality."""

    return H1Class(y.dual_coord)


def d_spatial_isomorphism(x: H1Class, y: H1Homology) -> tuple[bool, bool]:
    """Return the two inverse laws for ``d_spatial`` and ``d_spatial_inv``."""

    return d_spatial_inv(d_spatial(x)) == x, d_spatial(d_spatial_inv(y)) == y


def d_spatial_zero() -> bool:
    """Return whether Verdier duality sends the zero class to the zero homology class."""

    return d_spatial(H1Class()) == H1Homology()


def dual_cosheaf(points: frozenset[str], settling: AperiodicSettling) -> DualCosheaf:
    """Return the strict Boolean dual cosheaf carrying ``D_sp(cl_inv)``."""

    return DualCosheaf(points=frozenset(points), homology_class=d_spatial(settling.cl_inv))


def dual_cosheaf_boolean_dframe(
    universe: frozenset[str],
    u: frozenset[str],
    v: frozenset[str],
) -> tuple[bool, bool]:
    """Read the Boolean d-frame relations: ``(con(U,V), tot(U,V))``."""

    return consistency(u, v), totality(universe, u, v)


def co_cl_inv(settling: AperiodicSettling) -> H1Homology:
    """The co-classifying invariant ``co-cl-inv(v) = D_sp(cl-inv(v))``."""

    return d_spatial(settling.cl_inv)


def co_classifying_equivalent(left: AperiodicSettling, right: AperiodicSettling) -> bool:
    """Return equality of the co-classifying invariant."""

    return co_cl_inv(left) == co_cl_inv(right)


def co_clinv_aperiodic_witness_nonzero() -> bool:
    """Return whether the aperiodic witness has nonzero co-classifying invariant."""

    return not co_cl_inv(aperiodic_witness().base).is_zero


def mld_refines_coclassifying_equivalence(
    left: AperiodicSettling,
    right: AperiodicSettling,
    *,
    mld: bool,
) -> bool:
    """Executable Step 3: an asserted MLD witness preserves ``co-cl-inv``."""

    if not mld:
        return True
    return co_classifying_equivalent(left, right)


def co_classifying_model_holds(left: AperiodicSettling, right: AperiodicSettling) -> bool:
    """Return whether co-classifying equality matches classifying equality."""

    return co_classifying_equivalent(left, right) == classifying_equivalent(left, right)
