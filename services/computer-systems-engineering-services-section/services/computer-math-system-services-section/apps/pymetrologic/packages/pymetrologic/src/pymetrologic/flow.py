"""The Lawvere–Laplacian diffusion flow (RelMath.Flow.LawvereLaplacianSpectralGap).

The Tarski–Lawvere Laplacian ``Δ = □◇`` **is** a closure operator on valuations
(``lawvereLaplacian = closureOp``): inflationary, monotone, idempotent. Its fixed
points are the **harmonic** valuations (``IsHarmonic v ⟺ Δ v = v``), and the
**diffusion** ``Δⁿ(seed)`` climbs monotonically to the harmonic kernel — the least
harmonic above the seed (``settle_least_isHarmonic``). The harmonic kernel is the
degree-0 part, ``ker Δ ≅ H⁰`` (the Hodge isomorphism).

Because the Laplacian is a *closure* this is a thin, faithful skin over
:mod:`pymetrologic.closure`: the diffusion is the closure orbit, the harmonic is its
fixed point.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import TypeVar

from .closure import FiniteLattice, fixed_points, is_closure, iterate_to_fixpoint

E = TypeVar("E")

__all__ = [
    "H0KernelIsoWitness",
    "diffusion",
    "from_h0",
    "h0_object",
    "harmonic",
    "harmonic_kernel",
    "harmonic_kernel_h0_iso",
    "is_harmonic",
    "is_laplacian",
    "mem_h0_iff_harmonic",
    "to_h0",
]


@dataclass(frozen=True)
class H0KernelIsoWitness:
    """The two presentations of degree-0 cohomology coincide."""

    membership_equivalence: bool
    to_from_round_trip: bool
    from_to_round_trip: bool

    @property
    def holds(self) -> bool:
        """All finite Hodge-isomorphism checks hold."""
        return self.membership_equivalence and self.to_from_round_trip and self.from_to_round_trip


def is_laplacian(lat: FiniteLattice[E], lap: Callable[[E], E]) -> bool:
    """A Lawvere Laplacian is a closure operator ``Δ = □◇`` (``laplacian_is_closure``)."""
    return is_closure(lat, lap)


def is_harmonic(lat: FiniteLattice[E], lap: Callable[[E], E], v: E) -> bool:
    """``IsHarmonic v ⟺ Δ v = v`` — a harmonic valuation is a Laplacian fixed point."""
    return lat.eq(lap(v), v)


def diffusion(lat: FiniteLattice[E], lap: Callable[[E], E], seed: E, n: int) -> E:
    """The diffusion orbit ``Δⁿ(seed)`` (``diffusion = orbit``)."""
    v = seed
    for _ in range(n):
        v = lap(v)
    return v


def harmonic(lat: FiniteLattice[E], lap: Callable[[E], E], seed: E) -> E:
    """The harmonic the diffusion converges to: the least harmonic ``≥ seed``.

    For a closure Laplacian this is ``Δ(seed)`` and ``diffusion`` reaches it
    (``diffusion_converges_to_harmonic``, ``settle_least_isHarmonic``).
    """
    settled, _ = iterate_to_fixpoint(lat, lap, seed)
    return settled


def harmonic_kernel(lat: FiniteLattice[E], lap: Callable[[E], E]) -> tuple[E, ...]:
    """``ker Δ`` — the harmonic valuations (the degree-0 part, ``ker Δ ≅ H⁰``)."""
    return fixed_points(lat, lap)


def h0_object(lat: FiniteLattice[E], lap: Callable[[E], E]) -> tuple[E, ...]:
    """``H0`` as global sections: the image of the settling closure."""
    return _unique_by_lattice(lat, tuple(lap(seed) for seed in lat.elements))


def mem_h0_iff_harmonic(lat: FiniteLattice[E], lap: Callable[[E], E], value: E) -> bool:
    """A value is in the closure image iff it is harmonic."""
    in_h0 = any(lat.eq(value, section) for section in h0_object(lat, lap))
    return in_h0 == is_harmonic(lat, lap, value)


def to_h0(lat: FiniteLattice[E], lap: Callable[[E], E], harmonic_value: E) -> E:
    """Forward Hodge map: a harmonic value names its own global section."""
    if not is_harmonic(lat, lap, harmonic_value):
        msg = "to_h0 expects a harmonic value"
        raise ValueError(msg)
    return harmonic_value


def from_h0(lat: FiniteLattice[E], lap: Callable[[E], E], h0_value: E) -> E:
    """Backward Hodge map: a global section is closure-fixed by idempotence."""
    if not any(lat.eq(h0_value, section) for section in h0_object(lat, lap)):
        msg = "from_h0 expects a value in the closure image"
        raise ValueError(msg)
    harmonic_value = lap(h0_value)
    if not is_harmonic(lat, lap, harmonic_value):
        msg = "closure image value must be harmonic for a Laplacian closure"
        raise ValueError(msg)
    return harmonic_value


def harmonic_kernel_h0_iso(lat: FiniteLattice[E], lap: Callable[[E], E]) -> H0KernelIsoWitness:
    """Bundle the finite isomorphism between ``ker Δ`` and image-presented ``H0``."""
    kernel = harmonic_kernel(lat, lap)
    h0 = h0_object(lat, lap)
    return H0KernelIsoWitness(
        membership_equivalence=all(mem_h0_iff_harmonic(lat, lap, value) for value in lat.elements),
        to_from_round_trip=all(
            lat.eq(from_h0(lat, lap, to_h0(lat, lap, value)), value) for value in kernel
        ),
        from_to_round_trip=all(
            lat.eq(to_h0(lat, lap, from_h0(lat, lap, value)), value) for value in h0
        ),
    )


def _unique_by_lattice(lat: FiniteLattice[E], values: tuple[E, ...]) -> tuple[E, ...]:
    unique: list[E] = []
    for value in values:
        if not any(lat.eq(value, seen) for seen in unique):
            unique.append(value)
    return tuple(unique)
