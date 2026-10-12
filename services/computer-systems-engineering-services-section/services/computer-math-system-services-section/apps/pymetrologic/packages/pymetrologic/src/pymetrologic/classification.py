"""Aperiodic classifying-invariant shadows.

Lean's ``Aperiodic.Classification`` models a settling by its closure regime and
its cohomological classifying invariant ``cl-inv``.  Strict and Scott regimes
force ``cl-inv = 0``; the aperiodic regime admits nonzero witnesses.  This module
keeps that finite, executable classification model for the lab.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

from .regimes import ClosureRegime


@dataclass(frozen=True)
class H1Class:
    """A coordinate for the ``H^1`` classifying invariant."""

    coord: int = 0

    @property
    def is_zero(self) -> bool:
        """Return whether this is the zero cohomology class."""

        return self.coord == 0


@dataclass(frozen=True)
class AperiodicSettling:
    """A settling with a closure regime and a classifying invariant."""

    regime: ClosureRegime
    cl_inv: H1Class = H1Class()

    def __post_init__(self) -> None:
        if self.regime in FLAT_REGIMES and not self.cl_inv.is_zero:
            msg = "strict and Scott regimes force cl_inv = 0"
            raise ValueError(msg)


@dataclass(frozen=True)
class CohomologicalSettling:
    """The full cohomological invariant carrier: ``(H0, cl-inv, regime)``."""

    base: AperiodicSettling
    h0: int = 0

    def __post_init__(self) -> None:
        if self.h0 < 0:
            msg = "h0 must be a natural count"
            raise ValueError(msg)


@dataclass(frozen=True)
class LocalDerivability:
    """A finite local-derivability relation equipped with Lean's Step-3 law."""

    name: str
    mld: Callable[[AperiodicSettling, AperiodicSettling], bool]


@dataclass(frozen=True)
class ClassificationReductionWitness:
    """Witness for the ``ClassificationReduction`` completeness reduction."""

    classification_iff_complete: bool
    complete_structure_exists: bool


@dataclass(frozen=True)
class BaseSettling:
    """A common-base settling, recorded by its firing-ordinal pattern."""

    firings: tuple[int, ...]

    def __post_init__(self) -> None:
        object.__setattr__(self, "firings", tuple(self.firings))
        if any(stage < 0 for stage in self.firings):
            msg = "firing stages must be natural numbers"
            raise ValueError(msg)


@dataclass(frozen=True)
class Derivation:
    """A base-preserving local derivation between common-base firing patterns."""

    source: BaseSettling
    target: BaseSettling

    def __post_init__(self) -> None:
        if self.source.firings != self.target.firings:
            msg = "common-base derivation requires equal firing patterns"
            raise ValueError(msg)


@dataclass(frozen=True)
class CommonBaseClassificationWitness:
    """Finite witness for the common-base MLD classification laws."""

    reflexive: bool
    symmetric: bool
    transitive: bool
    mld_iff_clinv: bool


FLAT_REGIMES = frozenset({ClosureRegime.strict, ClosureRegime.scott})

__all__ = [
    "FLAT_REGIMES",
    "AperiodicSettling",
    "BaseSettling",
    "ClassificationReductionWitness",
    "CohomologicalSettling",
    "CommonBaseClassificationWitness",
    "Derivation",
    "H1Class",
    "LocalDerivability",
    "aperiodic_mld_classification_reduction",
    "aperiodic_not_trivial",
    "aperiodic_witness",
    "base_cl_inv",
    "base_clinv_of_base_mld",
    "base_mld",
    "base_mld_derivation",
    "base_mld_of_clinv_eq",
    "classification_equivalence_holds",
    "classification_iff_complete",
    "classifying_equivalent",
    "clinv_dichotomy",
    "coh_equiv_local_derivability",
    "cohomological_invariant",
    "cohomologically_equivalent",
    "common_base_classification",
    "equality_local_derivability",
    "exists_complete_local_derivability",
    "flat_clinv_zero",
    "flat_settlings_collapse",
    "local_derivability_complete",
    "local_derivability_refines_classifying",
    "mld_refines_classifying_equivalence",
    "trivial_settling",
]


def classifying_equivalent(left: AperiodicSettling, right: AperiodicSettling) -> bool:
    """Return Lean's ``CohEquiv`` on the classifying component: equal ``cl-inv``."""

    return left.cl_inv == right.cl_inv


def cohomological_invariant(
    settling: CohomologicalSettling,
) -> tuple[int, H1Class, ClosureRegime]:
    """Return the full framework invariant ``(H0, cl-inv, regime)``."""

    return (settling.h0, settling.base.cl_inv, settling.base.regime)


def cohomologically_equivalent(
    left: CohomologicalSettling,
    right: CohomologicalSettling,
) -> bool:
    """Return equality of the full cohomological invariant."""

    return cohomological_invariant(left) == cohomological_invariant(right)


def flat_clinv_zero(settling: AperiodicSettling) -> bool:
    """Check the flat-regime collapse: strict/Scott settlings carry the zero class."""

    if settling.regime not in FLAT_REGIMES:
        msg = "flat_clinv_zero applies only to strict or Scott regimes"
        raise ValueError(msg)
    return settling.cl_inv.is_zero


def flat_settlings_collapse(left: AperiodicSettling, right: AperiodicSettling) -> bool:
    """Return whether two flat settlings collapse to the same classifying invariant."""

    return flat_clinv_zero(left) and flat_clinv_zero(right) and classifying_equivalent(left, right)


def trivial_settling() -> CohomologicalSettling:
    """Return the canonical flat representative with zero ``H0`` and zero ``cl-inv``."""

    return CohomologicalSettling(AperiodicSettling(ClosureRegime.strict, H1Class(0)), h0=0)


def aperiodic_witness() -> CohomologicalSettling:
    """Return Lean's nonzero aperiodic witness: ``regime = aperiodic`` and ``cl-inv = 1``."""

    return CohomologicalSettling(AperiodicSettling(ClosureRegime.aperiodic, H1Class(1)), h0=0)


def aperiodic_not_trivial() -> bool:
    """Return whether the aperiodic witness is separated from the trivial flat class."""

    return not classifying_equivalent(aperiodic_witness().base, trivial_settling().base)


def clinv_dichotomy() -> tuple[bool, bool]:
    """Return the two Lean dichotomy witnesses: flat vanishing and aperiodic nonvanishing."""

    flat_vanishes = all(
        flat_clinv_zero(AperiodicSettling(regime, H1Class(0))) for regime in FLAT_REGIMES
    )
    return flat_vanishes, aperiodic_not_trivial()


def mld_refines_classifying_equivalence(
    left: AperiodicSettling,
    right: AperiodicSettling,
    *,
    mld: bool,
) -> bool:
    """Executable Step 3: when an MLD witness is asserted, it must preserve ``cl-inv``."""

    if not mld:
        return True
    return classifying_equivalent(left, right)


def equality_local_derivability() -> LocalDerivability:
    """Return Lean's equality-only local-derivability structure."""

    return LocalDerivability("equality", lambda left, right: left == right)


def coh_equiv_local_derivability() -> LocalDerivability:
    """Return the complete coarsest structure whose MLD is ``CohEquiv`` itself."""

    return LocalDerivability("cohomological-equivalence", classifying_equivalent)


def local_derivability_refines_classifying(
    derivability: LocalDerivability,
    samples: Sequence[tuple[AperiodicSettling, AperiodicSettling]],
) -> bool:
    """Check Lean's Step-3 field on a finite sample: ``MLD -> CohEquiv``."""

    return all(
        mld_refines_classifying_equivalence(left, right, mld=derivability.mld(left, right))
        for left, right in samples
    )


def _require_refines_classifying(
    derivability: LocalDerivability,
    samples: Sequence[tuple[AperiodicSettling, AperiodicSettling]],
) -> None:
    if not local_derivability_refines_classifying(derivability, samples):
        msg = "LocalDerivability must preserve cl_inv on asserted MLD pairs"
        raise ValueError(msg)


def local_derivability_complete(
    derivability: LocalDerivability,
    samples: Sequence[tuple[AperiodicSettling, AperiodicSettling]],
) -> bool:
    """Finite shadow of ``Complete``: equal ``cl-inv`` already yields ``MLD``."""

    _require_refines_classifying(derivability, samples)
    return all(
        not classifying_equivalent(left, right) or derivability.mld(left, right)
        for left, right in samples
    )


def classification_equivalence_holds(
    derivability: LocalDerivability,
    samples: Sequence[tuple[AperiodicSettling, AperiodicSettling]],
) -> bool:
    """Check whether ``MLD`` and ``CohEquiv`` coincide on a finite sample."""

    _require_refines_classifying(derivability, samples)
    return all(
        derivability.mld(left, right) == classifying_equivalent(left, right)
        for left, right in samples
    )


def classification_iff_complete(
    derivability: LocalDerivability,
    samples: Sequence[tuple[AperiodicSettling, AperiodicSettling]],
) -> bool:
    """Lean's reduction: classification coincidence holds iff the relation is complete."""

    return classification_equivalence_holds(derivability, samples) == local_derivability_complete(
        derivability,
        samples,
    )


def exists_complete_local_derivability(
    samples: Sequence[tuple[AperiodicSettling, AperiodicSettling]],
) -> bool:
    """Return whether the coarsest ``CohEquiv`` structure is complete on the sample."""

    return local_derivability_complete(coh_equiv_local_derivability(), samples)


def aperiodic_mld_classification_reduction(
    derivability: LocalDerivability,
    samples: Sequence[tuple[AperiodicSettling, AperiodicSettling]],
) -> ClassificationReductionWitness:
    """Bundle the classification-to-completeness reduction and realizability witness."""

    return ClassificationReductionWitness(
        classification_iff_complete=classification_iff_complete(derivability, samples),
        complete_structure_exists=exists_complete_local_derivability(samples),
    )


def base_cl_inv(settling: BaseSettling) -> tuple[int, ...]:
    """Return the common-base classifying invariant: the firing pattern itself."""

    return settling.firings


def base_mld(left: BaseSettling, right: BaseSettling) -> bool:
    """Return common-base MLD: a base-preserving derivation exists."""

    return base_cl_inv(left) == base_cl_inv(right)


def base_mld_derivation(left: BaseSettling, right: BaseSettling) -> Derivation:
    """Return the explicit common-base derivation when firing patterns coincide."""

    return Derivation(left, right)


def base_clinv_of_base_mld(left: BaseSettling, right: BaseSettling) -> bool:
    """Step 3 on a common base: derivability preserves the firing-pattern invariant."""

    if not base_mld(left, right):
        msg = "base_clinv_of_base_mld requires a common-base derivation"
        raise ValueError(msg)
    return base_cl_inv(left) == base_cl_inv(right)


def base_mld_of_clinv_eq(left: BaseSettling, right: BaseSettling) -> Derivation:
    """Common-base converse: equal classifying invariants give an explicit derivation."""

    if base_cl_inv(left) != base_cl_inv(right):
        msg = "base_mld_of_clinv_eq requires equal firing-pattern invariants"
        raise ValueError(msg)
    return Derivation(left, right)


def common_base_classification(
    samples: Sequence[BaseSettling],
) -> CommonBaseClassificationWitness:
    """Finite common-base classification: ``BaseMLD`` iff equal firing pattern."""

    pairs = [(left, right) for left in samples for right in samples]
    triples = [(left, mid, right) for left in samples for mid in samples for right in samples]
    return CommonBaseClassificationWitness(
        reflexive=all(base_mld(sample, sample) for sample in samples),
        symmetric=all(not base_mld(left, right) or base_mld(right, left) for left, right in pairs),
        transitive=all(
            not (base_mld(left, mid) and base_mld(mid, right)) or base_mld(left, right)
            for left, mid, right in triples
        ),
        mld_iff_clinv=all(
            base_mld(left, right) == (base_cl_inv(left) == base_cl_inv(right))
            for left, right in pairs
        ),
    )
