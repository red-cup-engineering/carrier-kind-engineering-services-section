"""Strict-regime KZ-coherent sheaves over finite route data.

Executable shadow of ``RelMath.Cohomology.KZCoherentSheaf``.  In the strict
and Scott regimes the temporal KZ 2-cell collapses to equality of parallel
1-cells, so every finite sheaf is KZ-coherent; post-composition preserves that
coherence because equal section values remain equal after any value map.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import Generic, TypeVar

from .bitopological_site import SiteObj

V = TypeVar("V")
W = TypeVar("W")

__all__ = [
    "FiniteKZSheaf",
    "KZCoherentDescentWitness",
    "KZParallelWitness",
    "OneCell",
    "every_sheaf_kzcoherent_strict",
    "id_cell",
    "kz2cell",
    "kz2cell_forces_eq",
    "kz2cell_id",
    "kz2cell_inv",
    "kz_coherent_descent",
    "kz_coherent_identifies_parallel",
    "onecell_comp",
    "postcomp",
]


@dataclass(frozen=True, slots=True)
class OneCell:
    """A finite temporal-site 1-cell from ``src`` to ``dst``."""

    src: SiteObj
    dst: SiteObj
    predicate_leg: str


@dataclass(frozen=True, slots=True)
class FiniteKZSheaf(Generic[V]):
    """A finite sheaf assigning section values to route cells."""

    routes: tuple[OneCell, ...]
    sections: Mapping[OneCell, V]
    rest_ids: Mapping[SiteObj, V]
    rest_comp: Callable[[V, V], V]

    def sec(self, route: OneCell) -> V:
        """The section value assigned to a 1-cell."""
        return self.sections[route]

    def rest_id(self, obj: SiteObj) -> V:
        """The section value assigned to the identity at an object."""
        return self.rest_ids[obj]

    @property
    def objects(self) -> tuple[SiteObj, ...]:
        """Objects touched by the finite route table."""
        seen: dict[SiteObj, None] = {}
        for route in self.routes:
            seen[route.src] = None
            seen[route.dst] = None
        return tuple(seen)

    @property
    def compat_id(self) -> bool:
        """Restriction along identities matches ``rest_id`` when identities are present."""
        return all(
            route not in self.sections or self.sec(route) == self.rest_id(obj)
            for obj in self.objects
            for route in (id_cell(obj),)
            if obj in self.rest_ids
        )

    @property
    def compat_comp(self) -> bool:
        """Composition values agree with ``rest_comp`` when all three routes are present."""
        route_set = set(self.routes)
        return all(
            onecell_comp(outer, inner) not in route_set
            or self.sec(onecell_comp(outer, inner))
            == self.rest_comp(self.sec(outer), self.sec(inner))
            for outer in self.routes
            for inner in self.routes
            if inner.dst == outer.src
        )

    @property
    def functorial(self) -> bool:
        """The finite identity and composition laws hold on the supplied table."""
        return self.compat_id and self.compat_comp


@dataclass(frozen=True, slots=True)
class KZParallelWitness:
    """Witness that KZ-connected parallel routes have equal section values."""

    coherent_condition: bool
    strict_universality: bool

    @property
    def holds(self) -> bool:
        """Both the definitional and strict-regime checks hold."""
        return self.coherent_condition and self.strict_universality


@dataclass(frozen=True, slots=True)
class KZCoherentDescentWitness:
    """Witness for the KZ-coherent descent theorem."""

    characterizes_subcategory: bool
    postcomp_closed: bool
    strict_universality: bool
    canonical_predcat_instance: bool

    @property
    def holds(self) -> bool:
        """All KZ-descent checks hold."""
        return (
            self.characterizes_subcategory
            and self.postcomp_closed
            and self.strict_universality
            and self.canonical_predcat_instance
        )


def id_cell(obj: SiteObj) -> OneCell:
    """Identity 1-cell at ``obj``."""
    return OneCell(obj, obj, "id")


def onecell_comp(outer: OneCell, inner: OneCell) -> OneCell:
    """Compose 1-cells as ``outer after inner``."""
    if inner.dst != outer.src:
        msg = "onecell composition requires inner.dst == outer.src"
        raise ValueError(msg)
    return OneCell(
        src=inner.src,
        dst=outer.dst,
        predicate_leg=f"{outer.predicate_leg} after {inner.predicate_leg}",
    )


def kz2cell(left: OneCell, right: OneCell) -> bool:
    """Strict-regime KZ 2-cell: equality of parallel route data."""
    return left == right


def kz2cell_id(route: OneCell) -> bool:
    """Every route is KZ-connected to itself."""
    return kz2cell(route, route)


def kz2cell_inv(left: OneCell, right: OneCell) -> bool:
    """KZ 2-cells are invertible in the strict equality collapse."""
    return kz2cell(left, right) == kz2cell(right, left)


def kz2cell_forces_eq(left: OneCell, right: OneCell) -> bool:
    """A strict-regime KZ 2-cell forces route equality."""
    return not kz2cell(left, right) or left == right


def _all_route_pairs(routes: Sequence[OneCell]) -> tuple[tuple[OneCell, OneCell], ...]:
    return tuple((left, right) for left in routes for right in routes)


def every_sheaf_kzcoherent_strict(sheaf: FiniteKZSheaf[V]) -> bool:
    """In the strict/Scott collapse, every finite sheaf is KZ-coherent."""
    return all(
        not kz2cell(left, right) or sheaf.sec(left) == sheaf.sec(right)
        for left, right in _all_route_pairs(sheaf.routes)
    )


def kz_coherent_identifies_parallel(sheaf: FiniteKZSheaf[V]) -> KZParallelWitness:
    """KZ-coherent sheaves identify KZ-connected parallel section maps."""
    coherent = every_sheaf_kzcoherent_strict(sheaf)
    return KZParallelWitness(
        coherent_condition=all(
            not kz2cell(left, right) or sheaf.sec(left) == sheaf.sec(right)
            for left, right in _all_route_pairs(sheaf.routes)
        ),
        strict_universality=coherent,
    )


def postcomp(
    sheaf: FiniteKZSheaf[V],
    transform: Callable[[V], W],
    rest_comp: Callable[[W, W], W],
) -> FiniteKZSheaf[W]:
    """Post-compose a sheaf's section values with a value transformation."""
    return FiniteKZSheaf(
        routes=sheaf.routes,
        sections={route: transform(sheaf.sec(route)) for route in sheaf.routes},
        rest_ids={obj: transform(value) for obj, value in sheaf.rest_ids.items()},
        rest_comp=rest_comp,
    )


def kz_coherent_descent(
    sheaf: FiniteKZSheaf[V],
    transform: Callable[[V], W],
    rest_comp: Callable[[W, W], W],
) -> KZCoherentDescentWitness:
    """Check characterization, postcomposition closure, and strict universality."""
    transformed = postcomp(sheaf, transform, rest_comp)
    coherent = every_sheaf_kzcoherent_strict(sheaf)
    transformed_coherent = every_sheaf_kzcoherent_strict(transformed)
    return KZCoherentDescentWitness(
        characterizes_subcategory=coherent == kz_coherent_identifies_parallel(sheaf).holds,
        postcomp_closed=(not coherent) or transformed_coherent,
        strict_universality=coherent,
        canonical_predcat_instance=coherent,
    )
