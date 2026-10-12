"""Synonymy and antonymy shadows for aperiodic settlings.

Lean's ``Aperiodic.SynonymyAntonymy`` formalizes synonymy as the
cohomological reading of MLD: equal classifying invariants.  Antonymy is the
strong-MLD relation against the negation-twisted settling, where the twist is
invisible to ordinary ``cl_inv`` but flips the firing-orbit type.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .classification import AperiodicSettling, classifying_equivalent


class FiringType(Enum):
    """The firing-orbit type ``tau^D``: truth-only, falsity-only, or both."""

    truth_only = "truthOnly"
    falsity_only = "falsityOnly"
    both = "both"


@dataclass(frozen=True)
class StrongSettling:
    """A settling refined by its firing-orbit type."""

    base: AperiodicSettling
    tau: FiringType


__all__ = [
    "FIRING_TYPES",
    "FiringType",
    "StrongSettling",
    "antonymy",
    "antonymy_symmetric_laws",
    "firing_flip",
    "firing_flip_is_involution",
    "firing_flip_nontrivial",
    "neg_twist",
    "negation_invisible_to_synonymy",
    "strong_mld",
    "strong_mld_equivalence_laws",
    "strong_mld_respects_neg_twist",
    "synonymy",
    "synonymy_equivalence_laws",
]

FIRING_TYPES = (FiringType.truth_only, FiringType.falsity_only, FiringType.both)


def synonymy(left: AperiodicSettling, right: AperiodicSettling) -> bool:
    """Return cohomological synonymy: equality of classifying invariants."""

    return classifying_equivalent(left, right)


def synonymy_equivalence_laws(
    first: AperiodicSettling,
    second: AperiodicSettling,
    third: AperiodicSettling,
) -> tuple[bool, bool, bool]:
    """Check reflexive, symmetric, and transitive laws on a sampled triple."""

    reflexive = synonymy(first, first)
    symmetric = not synonymy(first, second) or synonymy(second, first)
    transitive = not (synonymy(first, second) and synonymy(second, third)) or synonymy(
        first,
        third,
    )
    return reflexive, symmetric, transitive


def firing_flip(tau: FiringType) -> FiringType:
    """The evidence flip induced by bilattice negation on firing types."""

    if tau is FiringType.truth_only:
        return FiringType.falsity_only
    if tau is FiringType.falsity_only:
        return FiringType.truth_only
    return FiringType.both


def firing_flip_is_involution() -> bool:
    """Return whether the evidence flip squares to the identity."""

    return all(firing_flip(firing_flip(tau)) is tau for tau in FIRING_TYPES)


def firing_flip_nontrivial() -> bool:
    """Return whether the evidence flip moves the classical truth/falsity strata."""

    return (
        firing_flip(FiringType.truth_only) is FiringType.falsity_only
        and firing_flip(FiringType.falsity_only) is FiringType.truth_only
        and firing_flip(FiringType.both) is FiringType.both
    )


def neg_twist(settling: StrongSettling) -> StrongSettling:
    """Negation-twist a strong settling: keep ``cl_inv`` and flip ``tau``."""

    return StrongSettling(settling.base, firing_flip(settling.tau))


def negation_invisible_to_synonymy(settling: StrongSettling) -> bool:
    """Return whether negation leaves the ordinary synonymy class fixed."""

    return synonymy(neg_twist(settling).base, settling.base)


def strong_mld(left: StrongSettling, right: StrongSettling) -> bool:
    """Return strong-MLD: synonymy plus equal firing-orbit type."""

    return synonymy(left.base, right.base) and left.tau is right.tau


def strong_mld_equivalence_laws(
    first: StrongSettling,
    second: StrongSettling,
    third: StrongSettling,
) -> tuple[bool, bool, bool]:
    """Check reflexive, symmetric, and transitive strong-MLD laws on samples."""

    reflexive = strong_mld(first, first)
    symmetric = not strong_mld(first, second) or strong_mld(second, first)
    transitive = not (strong_mld(first, second) and strong_mld(second, third)) or strong_mld(
        first,
        third,
    )
    return reflexive, symmetric, transitive


def strong_mld_respects_neg_twist(left: StrongSettling, right: StrongSettling) -> bool:
    """Return whether strong-MLD is preserved by applying negation twist to both sides."""

    return strong_mld(left, right) == strong_mld(neg_twist(left), neg_twist(right))


def antonymy(left: StrongSettling, right: StrongSettling) -> bool:
    """Return antonymy: ``left`` is strong-MLD to the negation twist of ``right``."""

    return strong_mld(left, neg_twist(right))


def antonymy_symmetric_laws(left: StrongSettling, right: StrongSettling) -> tuple[bool, bool, bool]:
    """Check antonymy symmetry, twist involution, and nontrivial classical flip."""

    symmetric = not antonymy(left, right) or antonymy(right, left)
    involutive = neg_twist(neg_twist(left)) == left and neg_twist(neg_twist(right)) == right
    nontrivial = (
        firing_flip_nontrivial()
        and neg_twist(StrongSettling(left.base, FiringType.truth_only)).tau
        is not FiringType.truth_only
    )
    return symmetric, involutive, nontrivial
