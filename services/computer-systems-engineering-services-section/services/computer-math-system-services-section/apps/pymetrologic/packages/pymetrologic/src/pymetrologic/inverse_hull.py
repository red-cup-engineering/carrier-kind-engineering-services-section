"""Anderson-Putnam inverse-hull shadows.

Lean's ``Aperiodic.InverseHull`` builds the geometric dual of the
Anderson-Putnam direct limit: an inverse system of finite stages and coherent
threads whose seam reads back to ``H1Class``.  This module keeps the executable
constant-hull skeleton: finite sampled threads, projection coherence, joint
stage separation, the seam map, and the nonzero aperiodic obstruction.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass

from .classification import H1Class, aperiodic_witness

HullProjection = Callable[[int, int, H1Class], H1Class]


@dataclass(frozen=True)
class APInverseSystem:
    """An inverse system of finite-stage ``H1Class`` data over ``Nat``."""

    project_stage: HullProjection

    def project(self, earlier: int, later: int, value: H1Class) -> H1Class:
        """Restrict a later-stage value down to an earlier stage."""

        if earlier < 0 or later < 0:
            msg = "stages must be natural numbers"
            raise ValueError(msg)
        if later < earlier:
            msg = "later stage must be greater than or equal to earlier stage"
            raise ValueError(msg)
        return self.project_stage(earlier, later, value)


@dataclass(frozen=True)
class APHullThread:
    """A finite sampled inverse-limit thread."""

    values: Mapping[int, H1Class]

    def __post_init__(self) -> None:
        if not self.values:
            msg = "thread must contain at least one sampled stage"
            raise ValueError(msg)
        if any(stage < 0 for stage in self.values):
            msg = "stages must be natural numbers"
            raise ValueError(msg)
        object.__setattr__(self, "values", dict(sorted(self.values.items())))

    def at(self, stage: int) -> H1Class:
        """Read this thread at a sampled stage."""

        return self.values[stage]

    @property
    def stages(self) -> tuple[int, ...]:
        """Return sampled stages in ascending order."""

        return tuple(self.values)


__all__ = [
    "APHullThread",
    "APInverseSystem",
    "ap_hull_has_distinct_threads",
    "ap_hull_system",
    "const_thread",
    "hull_pairs_clinv",
    "hull_separated_by_stages",
    "inverse_hull_laws",
    "projection_coherence",
    "seam_map",
    "seam_map_surjective",
]


def ap_hull_system() -> APInverseSystem:
    """Return the constant ``H1Class`` Anderson-Putnam inverse system."""

    return APInverseSystem(project_stage=lambda _earlier, _later, value: value)


def const_thread(value: H1Class, stages: Sequence[int]) -> APHullThread:
    """Return the constant hull thread at ``value`` over the sampled stages."""

    if not stages:
        msg = "stages must contain at least one stage"
        raise ValueError(msg)
    return APHullThread({stage: value for stage in stages})


def projection_coherence(system: APInverseSystem, thread: APHullThread) -> bool:
    """Return whether sampled thread values cohere under all available projections."""

    return all(
        system.project(earlier, later, thread.at(later)) == thread.at(earlier)
        for earlier in thread.stages
        for later in thread.stages
        if earlier <= later
    )


def hull_separated_by_stages(left: APHullThread, right: APHullThread) -> bool:
    """Return whether equality at every shared stage forces equal sampled threads."""

    if left.stages != right.stages:
        msg = "threads must use the same sampled stages"
        raise ValueError(msg)
    return all(left.at(stage) == right.at(stage) for stage in left.stages)


def seam_map(thread: APHullThread) -> H1Class:
    """Read a hull thread at its earliest sampled stage."""

    return thread.at(thread.stages[0])


def seam_map_surjective(value: H1Class, stages: Sequence[int]) -> bool:
    """Return whether ``value`` is realized as the seam of a constant thread."""

    return seam_map(const_thread(value, stages)) == value


def hull_pairs_clinv(stages: Sequence[int]) -> tuple[APHullThread, bool]:
    """Return the witness thread and whether its seam is nonzero."""

    witness = const_thread(aperiodic_witness().base.cl_inv, stages)
    return witness, not seam_map(witness).is_zero


def ap_hull_has_distinct_threads(stages: Sequence[int]) -> bool:
    """Return whether the constant hull has two distinct sampled threads."""

    zero = const_thread(H1Class(0), stages)
    one = const_thread(H1Class(1), stages)
    return seam_map(zero) != seam_map(one)


def inverse_hull_laws(system: APInverseSystem, threads: Sequence[APHullThread]) -> bool:
    """Bundle the sampled inverse-hull laws used by the executable shadow."""

    return all(projection_coherence(system, thread) for thread in threads) and all(
        hull_separated_by_stages(thread, thread) for thread in threads
    )
