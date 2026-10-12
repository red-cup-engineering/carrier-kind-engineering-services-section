"""Lawvere-harmonic cohomology bridge (RelMath.Cohomology.LawvereHarmonicCohomology).

The Lean theorem connects two independently-built faces of the library: the
Lawvere/Tarski Laplacian's harmonic fixed point, and the Cech-style settling
cohomology whose vanishing ``H^1`` says local sections glue. This executable
shadow carries the same flat-regime statement: a Lawvere-harmonic settled value
is paired with a conflict-free global section, zero classifying invariant, and
``H^0`` equal to the count of designated harmonic cells.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Mapping
from dataclasses import dataclass
from typing import Any, Generic, TypeVar

from pymetrologic.bilattice import BL
from pymetrologic.closure import FiniteLattice
from pymetrologic.flow import harmonic, is_harmonic
from pymetrologic.site import Cell

from .classification import H1Class
from .regimes import ClosureRegime, cohomology_vanishes

E = TypeVar("E")

__all__ = [
    "LawvereHarmonicCohomologyWitness",
    "designated_values",
    "lawvere_harmonic_section_classifying_invariant_zero",
]


@dataclass(frozen=True)
class LawvereHarmonicCohomologyWitness(Generic[E]):
    """Bundled vanishing-side bridge from harmonic sections to settling cohomology."""

    regime: ClosureRegime
    harmonic_value: E
    global_section: Any
    h0_extent: int
    classifying_invariant: H1Class
    harmonic: bool
    flat_regime: bool
    cocycle: bool
    coboundary: bool
    unique_global_section: bool
    designated_cells_are_harmonic: bool

    @property
    def holds(self) -> bool:
        """All legs of the Lawvere-harmonic cohomology bridge hold."""
        return (
            self.harmonic
            and self.flat_regime
            and self.classifying_invariant.is_zero
            and self.cocycle
            and self.coboundary
            and self.unique_global_section
            and self.designated_cells_are_harmonic
        )


def designated_values(
    sheaf: Any,
    settled: dict[Cell, dict[Hashable, BL[object]]],
) -> tuple[BL[object], ...]:
    """Return the settled values counted by ``H0``: exactly the designated ``true`` cells."""

    bl = sheaf.bl
    return tuple(
        value for section in settled.values() for value in section.values() if bl.eq(value, bl.true)
    )


def lawvere_harmonic_section_classifying_invariant_zero(
    lat: FiniteLattice[E],
    laplacian: Callable[[E], E],
    seed: E,
    sheaf: Any,
    assignment: Mapping[Cell, Mapping[Hashable, BL[object]]],
    regime: ClosureRegime,
) -> LawvereHarmonicCohomologyWitness[E]:
    """Bundle harmonicity, flat ``H1=0``, zero ``cl_inv``, and the ``H0`` extent.

    The theorem is intentionally restricted to flat regimes, matching Lean's
    hypothesis ``cohomologyVanishes r = true``. The independent sheaf cohomology
    calculation supplies ``H0`` and the gluing obstruction; the closure
    calculation supplies the Lawvere-harmonic value.
    """

    if not cohomology_vanishes(regime):
        msg = "Lawvere-harmonic zero-class theorem applies only to flat regimes"
        raise ValueError(msg)

    from pymetrologic.calculus.cohomology import h0, h0_designated_count, h1_vanishes

    harmonic_value = harmonic(lat, laplacian, seed)
    global_section = h0(sheaf, assignment)
    values = designated_values(sheaf, global_section.section)
    h0_extent = h0_designated_count(sheaf, global_section.section)
    h1_zero = h1_vanishes(sheaf, assignment)
    designated_are_harmonic = all(value == harmonic_value for value in values)
    return LawvereHarmonicCohomologyWitness(
        regime=regime,
        harmonic_value=harmonic_value,
        global_section=global_section,
        h0_extent=h0_extent,
        classifying_invariant=H1Class(0),
        harmonic=is_harmonic(lat, laplacian, harmonic_value),
        flat_regime=cohomology_vanishes(regime),
        cocycle=h1_zero,
        coboundary=h1_zero,
        unique_global_section=h1_zero,
        designated_cells_are_harmonic=designated_are_harmonic and len(values) == h0_extent,
    )
