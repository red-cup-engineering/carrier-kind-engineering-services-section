"""Firing blowups and local data from ``Flow.FiringBlowup``."""

from __future__ import annotations

from collections.abc import Hashable, Mapping
from dataclasses import dataclass
from enum import StrEnum
from types import MappingProxyType

from .bilattice import BL, Bilattice, four

Cell = Hashable
Valuation = Mapping[Cell, BL[int]]

__all__ = [
    "BlowupFiringType",
    "Cell",
    "FiringBlowup",
    "LocalBlowupData",
    "Valuation",
    "blowup_classified",
    "blowup_is_identity",
    "blowup_local_data",
    "blowup_nontrivial",
    "blowup_trivial",
    "cell_failure",
    "cell_firing_type",
    "reconstruct_cell",
    "reconstruct_valuation",
]


class BlowupFiringType(StrEnum):
    """The local increment kind in the firing-blowup table."""

    truth_side = "truthSide"
    falsity_side = "falsitySide"
    top = "top"


@dataclass(frozen=True)
class LocalBlowupData:
    """The local firing data ``(pi_mu, tau_mu, gamma_mu)``."""

    incidence: frozenset[Cell]
    firing_types: Mapping[Cell, BlowupFiringType]
    consistency_failures: Mapping[Cell, BL[int]]


@dataclass(frozen=True)
class FiringBlowup:
    """The arrow-category object ``(predecessor -> actual)`` of a firing."""

    predecessor: Valuation
    actual: Valuation
    local_data: LocalBlowupData


def cell_firing_type(
    before: BL[int],
    after: BL[int],
    *,
    bl: Bilattice[int] | None = None,
) -> BlowupFiringType | None:
    """Read the cell-wise firing type from the Lean increment table."""

    carrier = bl or four()
    if before == after:
        return None
    if before == carrier.none and after == carrier.true:
        return BlowupFiringType.truth_side
    if before == carrier.none and after == carrier.false:
        return BlowupFiringType.falsity_side
    if after == carrier.conflict and before in {carrier.none, carrier.true, carrier.false}:
        return BlowupFiringType.top
    msg = f"not a firing-table increment: {before!r} -> {after!r}"
    raise ValueError(msg)


def reconstruct_cell(
    before: BL[int],
    firing_type: BlowupFiringType | None,
    *,
    bl: Bilattice[int] | None = None,
) -> BL[int]:
    """Reconstruct the after-value from a predecessor and firing type."""

    carrier = bl or four()
    if firing_type is None:
        return before
    if firing_type is BlowupFiringType.truth_side:
        return carrier.true
    if firing_type is BlowupFiringType.falsity_side:
        return carrier.false
    return carrier.conflict


def cell_failure(
    before: BL[int],
    after: BL[int],
    *,
    bl: Bilattice[int] | None = None,
) -> BL[int] | None:
    """Return the predecessor-side source of a top firing, if present."""

    return before if cell_firing_type(before, after, bl=bl) is BlowupFiringType.top else None


def _validate_same_cells(predecessor: Valuation, actual: Valuation) -> tuple[Cell, ...]:
    if predecessor.keys() != actual.keys():
        msg = "predecessor and actual valuations must have the same cells"
        raise ValueError(msg)
    return tuple(predecessor.keys())


def blowup_local_data(
    predecessor: Valuation,
    actual: Valuation,
    *,
    bl: Bilattice[int] | None = None,
) -> LocalBlowupData:
    """Extract incidence, firing types, and consistency-failure sources."""

    carrier = bl or four()
    firing_types: dict[Cell, BlowupFiringType] = {}
    consistency_failures: dict[Cell, BL[int]] = {}
    incidence: set[Cell] = set()
    for cell in _validate_same_cells(predecessor, actual):
        before = predecessor[cell]
        after = actual[cell]
        if not carrier.leq_k(before, after):
            msg = f"actual must sit above predecessor at {cell!r}"
            raise ValueError(msg)
        firing_type = cell_firing_type(before, after, bl=carrier)
        if firing_type is not None:
            incidence.add(cell)
            firing_types[cell] = firing_type
        failure = cell_failure(before, after, bl=carrier)
        if failure is not None:
            consistency_failures[cell] = failure
    return LocalBlowupData(
        incidence=frozenset(incidence),
        firing_types=MappingProxyType(firing_types),
        consistency_failures=MappingProxyType(consistency_failures),
    )


def reconstruct_valuation(
    predecessor: Valuation,
    local_data: LocalBlowupData,
    *,
    bl: Bilattice[int] | None = None,
) -> dict[Cell, BL[int]]:
    """Reconstruct the actual valuation from predecessor plus local data."""

    carrier = bl or four()
    return {
        cell: reconstruct_cell(before, local_data.firing_types.get(cell), bl=carrier)
        for cell, before in predecessor.items()
    }


def blowup_trivial(predecessor: Valuation, actual: Valuation) -> bool:
    """Return whether the blowup is diagonal: ``actual = predecessor``."""

    _validate_same_cells(predecessor, actual)
    return all(actual[cell] == predecessor[cell] for cell in predecessor)


def blowup_nontrivial(predecessor: Valuation, actual: Valuation) -> bool:
    """Return whether the blowup is a genuine local jump."""

    return not blowup_trivial(predecessor, actual)


def blowup_is_identity(blowup: FiringBlowup) -> bool:
    """Return whether a blowup arrow is the identity arrow."""

    return blowup_trivial(blowup.predecessor, blowup.actual)


def blowup_classified(
    predecessor: Valuation,
    actual: Valuation,
    *,
    bl: Bilattice[int] | None = None,
) -> FiringBlowup:
    """Build a blowup and verify that local data reconstructs the actual valuation."""

    carrier = bl or four()
    local_data = blowup_local_data(predecessor, actual, bl=carrier)
    reconstructed = reconstruct_valuation(predecessor, local_data, bl=carrier)
    if reconstructed != dict(actual):
        msg = "local blowup data did not reconstruct the actual valuation"
        raise ValueError(msg)
    return FiringBlowup(
        predecessor=MappingProxyType(dict(predecessor)),
        actual=MappingProxyType(dict(actual)),
        local_data=local_data,
    )
