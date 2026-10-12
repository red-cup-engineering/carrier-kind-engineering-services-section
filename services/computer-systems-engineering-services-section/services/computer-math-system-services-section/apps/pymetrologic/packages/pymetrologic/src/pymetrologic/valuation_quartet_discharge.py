"""Valuation-fiber discharge of the abstract nuclear quartet.

Executable shadow of ``RelMath.Positing.ValuationQuartetDischarge``.  Lean proves
that the abstract ``Order.HeytingAlgebra`` and ``Order.NuclearQuartet`` bundles
are inhabited by the genuine valuation fiber
``Valuation = PredicationCell -> Charge``.  This module keeps that bridge finite:
valuations are maps over sampled predication cells, the Heyting operations are
pointwise truth-order operations on FOUR, and the two nuclei are the concrete
truth-closures ``sigma`` and ``delta`` from ``ValuationFiberAlgebra``.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from itertools import product

from pymetrologic import BL, four
from pymetrologic.quartet import CORNERS, Corner

from .yoneda import PredicationCell

ValuationFiber = Mapping[PredicationCell, BL[int]]
ValuationFiberOperator = Callable[[ValuationFiber], dict[PredicationCell, BL[int]]]

__all__ = [
    "ValuationFiber",
    "ValuationFiberHeytingWitness",
    "ValuationFiberNucleusWitness",
    "ValuationFiberOperator",
    "ValuationQuartetDischargeWitness",
    "sample_valuation_fiber_cells",
    "sample_valuation_fibers",
    "valuation_delta",
    "valuation_fiber_bot",
    "valuation_fiber_discharge_witness",
    "valuation_fiber_eq",
    "valuation_fiber_heyting_witness",
    "valuation_fiber_himp",
    "valuation_fiber_himp_adjunction",
    "valuation_fiber_join_t",
    "valuation_fiber_le_t",
    "valuation_fiber_meet_t",
    "valuation_fiber_nucleus_toward",
    "valuation_fiber_nucleus_witness",
    "valuation_fiber_pi",
    "valuation_fiber_top",
    "valuation_quartet_corner_op",
    "valuation_quartet_fix_pi_iff",
    "valuation_sigma",
]

_FOUR = four()
_CHARGES = (_FOUR.none, _FOUR.true, _FOUR.false, _FOUR.conflict)


@dataclass(frozen=True, slots=True)
class ValuationFiberHeytingWitness:
    """Finite witness for the discharged Heyting algebra on valuations."""

    meet_laws: bool
    join_laws: bool
    absorption: bool
    top_bot: bool
    himp_adjunction: bool

    @property
    def holds(self) -> bool:
        """All finite Heyting checks hold."""

        return (
            self.meet_laws
            and self.join_laws
            and self.absorption
            and self.top_bot
            and self.himp_adjunction
        )


@dataclass(frozen=True, slots=True)
class ValuationFiberNucleusWitness:
    """Finite witness that ``sigma`` and ``delta`` are commuting truth nuclei."""

    sigma_inflationary: bool
    sigma_idempotent: bool
    sigma_meet_preserving: bool
    delta_inflationary: bool
    delta_idempotent: bool
    delta_meet_preserving: bool
    commutes: bool

    @property
    def holds(self) -> bool:
        """All finite nucleus checks hold."""

        return (
            self.sigma_inflationary
            and self.sigma_idempotent
            and self.sigma_meet_preserving
            and self.delta_inflationary
            and self.delta_idempotent
            and self.delta_meet_preserving
            and self.commutes
        )


@dataclass(frozen=True, slots=True)
class ValuationQuartetDischargeWitness:
    """Finite cash-out of the abstract quartet over the concrete valuation fiber."""

    heyting: ValuationFiberHeytingWitness
    nuclei: ValuationFiberNucleusWitness
    corners_card: bool
    absurd_is_intersection: bool
    fix_pi_iff: bool
    j1_agrees: bool
    j2_agrees: bool
    pi_agrees: bool

    @property
    def holds(self) -> bool:
        """The finite discharge checks all pass."""

        return (
            self.heyting.holds
            and self.nuclei.holds
            and self.corners_card
            and self.absurd_is_intersection
            and self.fix_pi_iff
            and self.j1_agrees
            and self.j2_agrees
            and self.pi_agrees
        )


def _support(v: ValuationFiber) -> tuple[PredicationCell, ...]:
    return tuple(v)


def _require_same_support(
    left: ValuationFiber,
    right: ValuationFiber,
) -> tuple[PredicationCell, ...]:
    if set(left) != set(right):
        msg = "valuations must have the same finite cell support"
        raise ValueError(msg)
    return _support(left)


def _map_unary(
    op: Callable[[BL[int]], BL[int]],
    v: ValuationFiber,
) -> dict[PredicationCell, BL[int]]:
    return {cell: op(charge) for cell, charge in v.items()}


def _map_binary(
    op: Callable[[BL[int], BL[int]], BL[int]],
    left: ValuationFiber,
    right: ValuationFiber,
) -> dict[PredicationCell, BL[int]]:
    cells = _require_same_support(left, right)
    return {cell: op(left[cell], right[cell]) for cell in cells}


def _charge_imp_t(a: BL[int], c: BL[int]) -> BL[int]:
    """Lean's finite truth-Heyting implication ``impT`` on FOUR."""

    return BL((1 - a.pro) | c.pro, (1 - a.con) & c.con)


def valuation_fiber_eq(left: ValuationFiber, right: ValuationFiber) -> bool:
    """Extensional equality of two finite valuations."""

    try:
        cells = _require_same_support(left, right)
    except ValueError:
        return False
    return all(left[cell] == right[cell] for cell in cells)


def valuation_fiber_meet_t(
    left: ValuationFiber,
    right: ValuationFiber,
) -> dict[PredicationCell, BL[int]]:
    """Pointwise truth meet ``fMeetT``."""

    return _map_binary(_FOUR.meet_t, left, right)


def valuation_fiber_join_t(
    left: ValuationFiber,
    right: ValuationFiber,
) -> dict[PredicationCell, BL[int]]:
    """Pointwise truth join ``fJoinT``."""

    return _map_binary(_FOUR.join_t, left, right)


def valuation_fiber_himp(
    antecedent: ValuationFiber,
    consequent: ValuationFiber,
) -> dict[PredicationCell, BL[int]]:
    """Pointwise truth-Heyting implication ``fImpT``."""

    return _map_binary(_charge_imp_t, antecedent, consequent)


def valuation_fiber_le_t(left: ValuationFiber, right: ValuationFiber) -> bool:
    """Pointwise truth order: ``left <=_t right`` iff ``left meet right = left``."""

    return valuation_fiber_eq(valuation_fiber_meet_t(left, right), left)


def valuation_fiber_top(cells: Sequence[PredicationCell]) -> dict[PredicationCell, BL[int]]:
    """The truth-top valuation, constantly ``t``."""

    return {cell: _FOUR.true for cell in cells}


def valuation_fiber_bot(cells: Sequence[PredicationCell]) -> dict[PredicationCell, BL[int]]:
    """The truth-bottom valuation, constantly ``f``."""

    return {cell: _FOUR.false for cell in cells}


def valuation_fiber_nucleus_toward(
    pole: BL[int],
    valuation: ValuationFiber,
) -> dict[PredicationCell, BL[int]]:
    """Pointwise truth-closure ``a |-> joinT pole a``."""

    return _map_unary(lambda charge: _FOUR.join_t(pole, charge), valuation)


def valuation_sigma(valuation: ValuationFiber) -> dict[PredicationCell, BL[int]]:
    """The saturating nucleus ``sigma``, truth-closure toward ``t``."""

    return valuation_fiber_nucleus_toward(_FOUR.true, valuation)


def valuation_delta(valuation: ValuationFiber) -> dict[PredicationCell, BL[int]]:
    """The transferring nucleus ``delta``, truth-closure toward ``top``."""

    return valuation_fiber_nucleus_toward(_FOUR.conflict, valuation)


def valuation_fiber_pi(valuation: ValuationFiber) -> dict[PredicationCell, BL[int]]:
    """The joint closure ``pi = sigma . delta``."""

    return valuation_sigma(valuation_delta(valuation))


def valuation_quartet_corner_op(
    corner: Corner,
    valuation: ValuationFiber,
) -> dict[PredicationCell, BL[int]]:
    """Corner-indexed operator: identity, ``sigma``, ``delta``, or ``pi``."""

    if corner is Corner.ABSURD:
        return dict(valuation)
    if corner is Corner.POTENTIAL:
        return valuation_sigma(valuation)
    if corner is Corner.ACTIVE:
        return valuation_delta(valuation)
    return valuation_fiber_pi(valuation)


def valuation_quartet_fix_pi_iff(valuation: ValuationFiber) -> bool:
    """``pi v = v`` iff ``sigma v = v`` and ``delta v = v``."""

    pi_fixed = valuation_fiber_eq(valuation_fiber_pi(valuation), valuation)
    both_fixed = valuation_fiber_eq(valuation_sigma(valuation), valuation) and valuation_fiber_eq(
        valuation_delta(valuation),
        valuation,
    )
    return pi_fixed == both_fixed


def sample_valuation_fiber_cells() -> tuple[PredicationCell, PredicationCell]:
    """A tiny finite support for exhaustive valuation-fiber checks."""

    return (
        PredicationCell("speaker", "asserts", "claim"),
        PredicationCell("reader", "contests", "claim"),
    )


def sample_valuation_fibers(
    cells: Sequence[PredicationCell] | None = None,
) -> tuple[dict[PredicationCell, BL[int]], ...]:
    """All FOUR-valued valuations over a finite support."""

    support = tuple(cells if cells is not None else sample_valuation_fiber_cells())
    return tuple(
        dict(zip(support, charges, strict=True))
        for charges in product(_CHARGES, repeat=len(support))
    )


def valuation_fiber_himp_adjunction(
    samples: Sequence[ValuationFiber] | None = None,
) -> bool:
    """Check the discharged Heyting adjunction on finite samples."""

    valuations = tuple(samples if samples is not None else sample_valuation_fibers())
    return all(
        valuation_fiber_eq(
            valuation_fiber_meet_t(valuation_fiber_meet_t(a, b), c),
            valuation_fiber_meet_t(a, b),
        )
        == valuation_fiber_eq(
            valuation_fiber_meet_t(b, valuation_fiber_himp(a, c)),
            b,
        )
        for a in valuations
        for b in valuations
        for c in valuations
    )


def valuation_fiber_heyting_witness(
    samples: Sequence[ValuationFiber] | None = None,
) -> ValuationFiberHeytingWitness:
    """Bundle finite lattice and Heyting-adjunction checks."""

    valuations = tuple(samples if samples is not None else sample_valuation_fibers())
    cells = _support(valuations[0]) if valuations else sample_valuation_fiber_cells()
    top = valuation_fiber_top(cells)
    bot = valuation_fiber_bot(cells)
    pairs = tuple(product(valuations, repeat=2))
    triples = tuple(product(valuations, repeat=3))

    meet_laws = all(
        valuation_fiber_eq(valuation_fiber_meet_t(a, b), valuation_fiber_meet_t(b, a))
        and valuation_fiber_eq(
            valuation_fiber_meet_t(valuation_fiber_meet_t(a, b), c),
            valuation_fiber_meet_t(a, valuation_fiber_meet_t(b, c)),
        )
        and valuation_fiber_eq(valuation_fiber_meet_t(a, a), a)
        for a, b, c in triples
    )
    join_laws = all(
        valuation_fiber_eq(valuation_fiber_join_t(a, b), valuation_fiber_join_t(b, a))
        and valuation_fiber_eq(
            valuation_fiber_join_t(valuation_fiber_join_t(a, b), c),
            valuation_fiber_join_t(a, valuation_fiber_join_t(b, c)),
        )
        and valuation_fiber_eq(valuation_fiber_join_t(a, a), a)
        for a, b, c in triples
    )
    absorption = all(
        valuation_fiber_eq(valuation_fiber_meet_t(a, valuation_fiber_join_t(a, b)), a)
        and valuation_fiber_eq(valuation_fiber_join_t(a, valuation_fiber_meet_t(a, b)), a)
        for a, b in pairs
    )
    top_bot = all(
        valuation_fiber_eq(valuation_fiber_meet_t(a, top), a)
        and valuation_fiber_eq(valuation_fiber_join_t(a, bot), a)
        and valuation_fiber_le_t(bot, a)
        and valuation_fiber_le_t(a, top)
        for a in valuations
    )
    return ValuationFiberHeytingWitness(
        meet_laws=meet_laws,
        join_laws=join_laws,
        absorption=absorption,
        top_bot=top_bot,
        himp_adjunction=valuation_fiber_himp_adjunction(valuations),
    )


def _nucleus_laws(
    nucleus: ValuationFiberOperator,
    samples: Sequence[ValuationFiber],
) -> tuple[bool, bool, bool]:
    pairs = tuple(product(samples, repeat=2))
    inflationary = all(valuation_fiber_le_t(v, nucleus(v)) for v in samples)
    idempotent = all(valuation_fiber_eq(nucleus(nucleus(v)), nucleus(v)) for v in samples)
    meet_preserving = all(
        valuation_fiber_eq(
            nucleus(valuation_fiber_meet_t(v, w)),
            valuation_fiber_meet_t(nucleus(v), nucleus(w)),
        )
        for v, w in pairs
    )
    return inflationary, idempotent, meet_preserving


def valuation_fiber_nucleus_witness(
    samples: Sequence[ValuationFiber] | None = None,
) -> ValuationFiberNucleusWitness:
    """Bundle finite nucleus laws for ``sigma`` and ``delta``."""

    valuations = tuple(samples if samples is not None else sample_valuation_fibers())
    sigma_infl, sigma_idem, sigma_meet = _nucleus_laws(valuation_sigma, valuations)
    delta_infl, delta_idem, delta_meet = _nucleus_laws(valuation_delta, valuations)
    return ValuationFiberNucleusWitness(
        sigma_inflationary=sigma_infl,
        sigma_idempotent=sigma_idem,
        sigma_meet_preserving=sigma_meet,
        delta_inflationary=delta_infl,
        delta_idempotent=delta_idem,
        delta_meet_preserving=delta_meet,
        commutes=all(
            valuation_fiber_eq(
                valuation_sigma(valuation_delta(v)),
                valuation_delta(valuation_sigma(v)),
            )
            for v in valuations
        ),
    )


def valuation_fiber_discharge_witness(
    samples: Sequence[ValuationFiber] | None = None,
) -> ValuationQuartetDischargeWitness:
    """Discharge the abstract quartet laws over finite valuation samples."""

    valuations = tuple(samples if samples is not None else sample_valuation_fibers())
    heyting = valuation_fiber_heyting_witness(valuations)
    nuclei = valuation_fiber_nucleus_witness(valuations)
    absurd_is_intersection = all(
        (
            valuation_fiber_eq(valuation_quartet_corner_op(Corner.STABLE, v), v)
            == (
                valuation_fiber_eq(valuation_quartet_corner_op(Corner.POTENTIAL, v), v)
                and valuation_fiber_eq(valuation_quartet_corner_op(Corner.ACTIVE, v), v)
            )
        )
        for v in valuations
    )
    return ValuationQuartetDischargeWitness(
        heyting=heyting,
        nuclei=nuclei,
        corners_card=len(CORNERS) == 4,
        absurd_is_intersection=absurd_is_intersection,
        fix_pi_iff=all(valuation_quartet_fix_pi_iff(v) for v in valuations),
        j1_agrees=all(
            valuation_fiber_eq(valuation_sigma(v), valuation_fiber_nucleus_toward(_FOUR.true, v))
            for v in valuations
        ),
        j2_agrees=all(
            valuation_fiber_eq(
                valuation_delta(v),
                valuation_fiber_nucleus_toward(_FOUR.conflict, v),
            )
            for v in valuations
        ),
        pi_agrees=all(
            valuation_fiber_eq(valuation_fiber_pi(v), valuation_sigma(valuation_delta(v)))
            for v in valuations
        ),
    )
