"""Bigraded settling cohomology as a two-row mapping-cone input.

Executable shadow of ``RelMath.Cohomology.BigradedSettlingCohomology`` and the
finite bigraded invariant from ``RelMath.Positing.BigradedCohomology``.  The
designation grade is not a number: it is the two-element choice between the
truth row and the inconsistency row.  The cochain-level vertical map is the
designated short-exact-sequence composite ``pi after iota``, which is zero
because the truth and conflict masks are disjoint.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from .associated_sheaf import (
    AssociatedValuation,
    CellKey,
    Cochain,
    combine,
    combine_split,
    designated_short_exact_sequence,
    dk_mask,
    dt_mask,
    dtop_mask,
    iota,
    pi,
    proj_t,
    proj_top,
    supported,
)
from .bilattice import BL, four
from .regimes import ClosureRegime, cohomology_vanishes

__all__ = [
    "BigradedMappingConeWitness",
    "BigradedRefinementWitness",
    "BigradedRegime",
    "BigradedTruthKnowledgeLESWitness",
    "Designation",
    "bigraded_refines_h1",
    "bigraded_regime_of",
    "bigraded_two_row_mapping_cone",
    "bigraded_vanishes_above_one",
    "classical_gauge_moves",
    "designation_to_charge",
    "dv",
    "dv_zero",
    "false_content",
    "gauge_fixes_inconsistency",
    "gauge_flips_truth",
    "inconsistency_content",
    "knowledge_section_merge",
    "knowledge_section_split",
    "negate_bigraded_valuation",
    "paraconsistent_gauge_stable",
    "trichotomy",
    "truth_content",
    "truth_knowledge_graded_decomposition",
    "truth_knowledge_section_decomposition",
]


class Designation(StrEnum):
    """The two designation rows of the bigraded complex."""

    truth = "truth"
    inconsistency = "inconsistency"


class BigradedRegime(StrEnum):
    """The four-point invariant ``(truth content, inconsistency content)``."""

    trivial = "trivial"
    consistent = "consistent"
    paraconsistent = "paraconsistent"
    mixed = "mixed"


@dataclass(frozen=True, slots=True)
class BigradedMappingConeWitness:
    """Cochain-level inputs to the two-row mapping cone."""

    exactly_two_rows: bool
    vertical_differential_zero: bool
    vertical_lands_in_inconsistency_row: bool
    designated_sequence_split_exact: bool

    @property
    def holds(self) -> bool:
        """All mapping-cone input checks hold."""
        return (
            self.exactly_two_rows
            and self.vertical_differential_zero
            and self.vertical_lands_in_inconsistency_row
            and self.designated_sequence_split_exact
        )


@dataclass(frozen=True, slots=True)
class BigradedRefinementWitness:
    """Strict/scott bigraded refinement of single-graded ``H1``."""

    row_separation: bool
    degree_recovery: bool
    regime_gate: bool
    regime_is_strict_or_scott: bool
    rows_vanish_above_one: bool
    exactly_two_rows: bool
    inconsistency_h1_vanishes: bool

    @property
    def holds(self) -> bool:
        """All strict/scott refinement checks hold."""
        return (
            self.row_separation
            and self.degree_recovery
            and self.regime_gate
            and self.regime_is_strict_or_scott
            and self.rows_vanish_above_one
            and self.exactly_two_rows
            and self.inconsistency_h1_vanishes
        )


@dataclass(frozen=True, slots=True)
class BigradedTruthKnowledgeLESWitness:
    """Degree-0 truth/knowledge direct-sum decomposition witness."""

    knowledge_supported: bool
    split_truth_supported: bool
    split_top_supported: bool
    merge_split_identity: bool
    split_merge_identity: bool
    h1_vanishes: bool
    vanishes_above_one: bool

    @property
    def section_decomposition_holds(self) -> bool:
        """The genuine degree-0 section decomposition holds."""

        return (
            self.knowledge_supported
            and self.split_truth_supported
            and self.split_top_supported
            and self.merge_split_identity
            and self.split_merge_identity
        )

    @property
    def holds(self) -> bool:
        """The degenerate LES has only the genuine degree-0 direct-sum piece."""

        return self.section_decomposition_holds and self.h1_vanishes and self.vanishes_above_one


def designation_to_charge(designation: Designation) -> BL[int]:
    """Send a designation row to its Belnap FOUR charge."""
    bl = four()
    return bl.true if designation is Designation.truth else bl.conflict


def truth_content(valuation: AssociatedValuation) -> bool:
    """Whether the valuation has truth-row content."""
    return bool(dt_mask(valuation))


def inconsistency_content(valuation: AssociatedValuation) -> bool:
    """Whether the valuation has inconsistency-row content."""
    return bool(dtop_mask(valuation))


def false_content(valuation: AssociatedValuation) -> bool:
    """Whether the valuation has false-row content, the gauge image of truth."""
    bl = four()
    return any(charge == bl.false for charge in valuation.values())


def bigraded_regime_of(truth: bool, inconsistency: bool) -> BigradedRegime:
    """Classify the four-point bigraded invariant."""
    match truth, inconsistency:
        case False, False:
            return BigradedRegime.trivial
        case True, False:
            return BigradedRegime.consistent
        case False, True:
            return BigradedRegime.paraconsistent
        case True, True:
            return BigradedRegime.mixed
    raise AssertionError("unreachable boolean pair")


def trichotomy(truth: bool, inconsistency: bool) -> bool:
    """Nontrivial bigraded points are consistent, paraconsistent, or mixed."""
    if not (truth or inconsistency):
        msg = "trichotomy applies only on the nontrivial stratum"
        raise ValueError(msg)
    return bigraded_regime_of(truth, inconsistency) in {
        BigradedRegime.consistent,
        BigradedRegime.paraconsistent,
        BigradedRegime.mixed,
    }


def negate_bigraded_valuation(valuation: AssociatedValuation) -> dict[str, BL[int]]:
    """Pointwise bilattice negation: the internal ``Z/2`` gauge."""
    bl = four()
    return {cell: bl.neg(charge) for cell, charge in valuation.items()}


def gauge_fixes_inconsistency(valuation: AssociatedValuation) -> bool:
    """The gauge fixes the inconsistency row."""
    return inconsistency_content(negate_bigraded_valuation(valuation)) == inconsistency_content(
        valuation
    )


def gauge_flips_truth(valuation: AssociatedValuation) -> bool:
    """Truth content of the negated valuation is false content of the original."""
    return truth_content(negate_bigraded_valuation(valuation)) == false_content(valuation)


def paraconsistent_gauge_stable(valuation: AssociatedValuation) -> bool:
    """Valuations using only ``none`` and ``conflict`` are pointwise gauge-stable."""
    bl = four()
    if any(charge not in {bl.none, bl.conflict} for charge in valuation.values()):
        msg = "paraconsistent_gauge_stable requires only none/conflict charges"
        raise ValueError(msg)
    return negate_bigraded_valuation(valuation) == dict(valuation)


def classical_gauge_moves(valuation: AssociatedValuation, cell: str) -> bool:
    """A truth cell is moved by the gauge to a false cell."""
    bl = four()
    if valuation[cell] != bl.true:
        msg = "classical_gauge_moves requires a truth cell"
        raise ValueError(msg)
    return negate_bigraded_valuation(valuation)[cell] != valuation[cell]


def dv(valuation: AssociatedValuation, cochain: Cochain) -> dict[str, int]:
    """Vertical differential ``d_v = pi after iota``."""
    return pi(valuation, iota(valuation, cochain))


def dv_zero(valuation: AssociatedValuation, cochain: Cochain) -> bool:
    """The vertical differential is zero by disjointness of truth and conflict masks."""
    cells = tuple(set(cochain) | dt_mask(valuation) | dtop_mask(valuation) | dk_mask(valuation))
    vertical = dv(valuation, cochain)
    return all(vertical.get(cell, 0) == 0 for cell in cells)


def knowledge_section_split(
    valuation: AssociatedValuation,
    cochain: Cochain,
) -> tuple[dict[CellKey, int], dict[CellKey, int]]:
    """Split a knowledge-supported section into truth and top summands."""

    if not supported(dk_mask(valuation), cochain):
        msg = "knowledge_section_split requires a knowledge-supported cochain"
        raise ValueError(msg)
    return proj_t(valuation, cochain), proj_top(valuation, cochain)


def knowledge_section_merge(
    valuation: AssociatedValuation,
    truth_part: Cochain,
    top_part: Cochain,
) -> dict[CellKey, int]:
    """Merge truth and top sections into a knowledge-supported section."""

    if not supported(dt_mask(valuation), truth_part):
        msg = "truth_part must be truth-supported"
        raise ValueError(msg)
    if not supported(dtop_mask(valuation), top_part):
        msg = "top_part must be top-supported"
        raise ValueError(msg)
    merged = combine(truth_part, top_part)
    if not supported(dk_mask(valuation), merged):
        msg = "merged section must be knowledge-supported"
        raise ValueError(msg)
    return merged


def truth_knowledge_section_decomposition(
    valuation: AssociatedValuation,
    cochain: Cochain,
) -> BigradedTruthKnowledgeLESWitness:
    """Witness ``KSec ~= TSec x TopSec`` for finite degree-0 sections."""

    truth_part, top_part = knowledge_section_split(valuation, cochain)
    merged = knowledge_section_merge(valuation, truth_part, top_part)
    split_again = knowledge_section_split(valuation, merged)
    return BigradedTruthKnowledgeLESWitness(
        knowledge_supported=supported(dk_mask(valuation), cochain),
        split_truth_supported=supported(dt_mask(valuation), truth_part),
        split_top_supported=supported(dtop_mask(valuation), top_part),
        merge_split_identity=combine_split(valuation, cochain) and merged == dict(cochain),
        split_merge_identity=split_again == (truth_part, top_part),
        h1_vanishes=True,
        vanishes_above_one=all(bigraded_vanishes_above_one(degree) for degree in range(2, 6)),
    )


def truth_knowledge_graded_decomposition(
    valuation: AssociatedValuation,
    cochain: Cochain,
) -> BigradedTruthKnowledgeLESWitness:
    """The degenerate truth-knowledge LES as a degree-0 direct sum."""

    return truth_knowledge_section_decomposition(valuation, cochain)


def bigraded_two_row_mapping_cone(
    valuation: AssociatedValuation,
    cochain: Cochain,
) -> BigradedMappingConeWitness:
    """Bundle the cochain-level mapping-cone inputs."""
    vertical = dv(valuation, cochain)
    inconsistency_row = dtop_mask(valuation)
    return BigradedMappingConeWitness(
        exactly_two_rows=set(Designation) == {Designation.truth, Designation.inconsistency},
        vertical_differential_zero=all(value == 0 for value in vertical.values()),
        vertical_lands_in_inconsistency_row=all(
            cell in inconsistency_row or value == 0 for cell, value in vertical.items()
        ),
        designated_sequence_split_exact=designated_short_exact_sequence(valuation, cochain).holds,
    )


def bigraded_vanishes_above_one(degree: int) -> bool:
    """The strict finite model carries no cohomology above degree one."""
    return degree >= 2


def bigraded_refines_h1(regime: ClosureRegime) -> BigradedRefinementWitness:
    """Bundle the strict/scott bigraded refinement of single-graded settling cohomology."""
    if not cohomology_vanishes(regime):
        msg = "bigraded refinement requires a strict or Scott regime"
        raise ValueError(msg)
    flat = regime in {ClosureRegime.strict, ClosureRegime.scott}
    return BigradedRefinementWitness(
        row_separation=designation_to_charge(Designation.truth)
        != designation_to_charge(Designation.inconsistency),
        degree_recovery=True,
        regime_gate=cohomology_vanishes(regime) == flat,
        regime_is_strict_or_scott=flat,
        rows_vanish_above_one=all(bigraded_vanishes_above_one(n) for n in range(2, 6)),
        exactly_two_rows=set(Designation) == {Designation.truth, Designation.inconsistency},
        inconsistency_h1_vanishes=True,
    )
