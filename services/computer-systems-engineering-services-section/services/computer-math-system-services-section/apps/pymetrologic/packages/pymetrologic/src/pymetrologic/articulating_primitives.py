"""Primitive articulating carriers from ``RelMath.Mark`` and ``RelMath.Articulating``."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from pymetrologic.quartet import CORNERS, Corner, corner_of_status, status_of_corner

__all__ = [
    "ARTICULATION_CORNERS",
    "KINDS",
    "ArticulationCell",
    "ArticulationPrimitiveWitness",
    "Kind",
    "Mark",
    "Utterance",
    "articulating_primitive_witness",
    "articulation_phase_is_charge",
    "corner_card_eq_four",
    "corner_of_articulation_status",
    "corner_status_roundtrip",
    "initial_articulation_cell",
    "kind_token_ne_claim",
    "kind_two_kinds",
    "mark_at",
    "realize_corner",
]


class Kind(StrEnum):
    """The two positional kinds of mark."""

    token = "token"
    claim = "claim"


KINDS: tuple[Kind, Kind] = (Kind.token, Kind.claim)
ARTICULATION_CORNERS: tuple[Corner, ...] = CORNERS


@dataclass(frozen=True, slots=True)
class Mark:
    """A finite surface presentation of an atomic mark."""

    surface: str


@dataclass(frozen=True, slots=True)
class Utterance:
    """The ordered pair of a token-side mark and a claim-side mark."""

    token: Mark
    claim: Mark


@dataclass(frozen=True, slots=True)
class ArticulationCell:
    """An utterance plus articulation status for its two sides."""

    utterance: Utterance
    token_articulated: bool
    claim_articulated: bool

    @property
    def corner(self) -> Corner:
        """Read the articulation status as a four-corner phase."""

        return corner_of_articulation_status(self.token_articulated, self.claim_articulated)

    @property
    def four_corner(self) -> tuple[bool, bool]:
        """The canonical ``Bool x Bool`` four-corner object."""

        return self.token_articulated, self.claim_articulated


@dataclass(frozen=True, slots=True)
class ArticulationPrimitiveWitness:
    """Finite witness for the primitive articulating carrier laws."""

    two_kinds: bool
    token_ne_claim: bool
    corner_cardinality: int
    corner_roundtrip: bool
    initial_is_absurd: bool
    all_corners_realized: bool
    phase_is_charge: bool

    @property
    def holds(self) -> bool:
        """All primitive articulating checks hold."""

        return (
            self.two_kinds
            and self.token_ne_claim
            and self.corner_cardinality == 4
            and self.corner_roundtrip
            and self.initial_is_absurd
            and self.all_corners_realized
            and self.phase_is_charge
        )


def kind_two_kinds(kind: Kind) -> bool:
    """Check Lean's ``Kind.two_kinds`` for a concrete kind."""

    return kind in KINDS


def kind_token_ne_claim() -> bool:
    """Check that token and claim are distinct positions."""

    return len({Kind.token, Kind.claim}) == 2


def mark_at(utterance: Utterance, kind: Kind) -> Mark:
    """Read the mark sitting at the selected positional kind."""

    match kind:
        case Kind.token:
            return utterance.token
        case Kind.claim:
            return utterance.claim


def corner_of_articulation_status(token_articulated: bool, claim_articulated: bool) -> Corner:
    """Classify a token/claim articulation status pair as a corner."""

    return corner_of_status(token_articulated, claim_articulated)


def corner_status_roundtrip() -> bool:
    """Check both corner/status round-trips."""

    statuses = ((False, False), (True, False), (False, True), (True, True))
    corners_roundtrip = all(
        corner_of_articulation_status(*status_of_corner(corner)) is corner for corner in CORNERS
    )
    statuses_roundtrip = all(
        status_of_corner(corner_of_articulation_status(*status)) == status for status in statuses
    )
    return corners_roundtrip and statuses_roundtrip


def corner_card_eq_four() -> bool:
    """Check that the articulation corner partition has exactly four points."""

    return len(CORNERS) == 4 and len(set(CORNERS)) == 4


def initial_articulation_cell(utterance: Utterance) -> ArticulationCell:
    """The initial untold/absurd cell over an utterance."""

    return ArticulationCell(utterance, token_articulated=False, claim_articulated=False)


def realize_corner(utterance: Utterance, corner: Corner) -> ArticulationCell:
    """Construct a cell over ``utterance`` that realizes ``corner``."""

    token_articulated, claim_articulated = status_of_corner(corner)
    return ArticulationCell(
        utterance,
        token_articulated=token_articulated,
        claim_articulated=claim_articulated,
    )


def articulation_phase_is_charge(cell: ArticulationCell) -> bool:
    """Lean's conflation theorem: the phase four-corner is the cell's charge corner."""

    return corner_of_status(*cell.four_corner) is cell.corner


def articulating_primitive_witness() -> ArticulationPrimitiveWitness:
    """Bundle executable checks for ``Mark`` and the articulating carrier layer."""

    utterance = Utterance(Mark("token:demo"), Mark("claim:demo"))
    initial = initial_articulation_cell(utterance)
    realized = tuple(realize_corner(utterance, corner) for corner in CORNERS)
    return ArticulationPrimitiveWitness(
        two_kinds=all(kind_two_kinds(kind) for kind in KINDS) and len(KINDS) == 2,
        token_ne_claim=kind_token_ne_claim(),
        corner_cardinality=len(CORNERS),
        corner_roundtrip=corner_status_roundtrip(),
        initial_is_absurd=initial.corner is Corner.ABSURD,
        all_corners_realized=all(
            cell.corner is corner for cell, corner in zip(realized, CORNERS, strict=True)
        ),
        phase_is_charge=all(articulation_phase_is_charge(cell) for cell in realized),
    )
