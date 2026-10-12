"""Finite theory-relative ideals from ``Predicating.TheoryRelativeIdeal``.

Lean defines the ideal of a resource ``R`` inside a host theory ``T`` as the
host's settled valuation restricted along a type embedding ``iota``:
``v_R(T,infty) = iota*(v_T,infty)``.  This module keeps that statement
executable over finite predication cells and FOUR-valued valuations.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass

from pymetrologic import BL, four

from .yoneda import PredicationCell

RelativeIdealValuation = Mapping[PredicationCell, BL[int]]
CellEmbedding = Mapping[PredicationCell, PredicationCell]
ClosureOperator = Callable[[RelativeIdealValuation], RelativeIdealValuation]

__all__ = [
    "CellEmbedding",
    "ClosureOperator",
    "IdealSettledWitness",
    "IsReindexIdealWitness",
    "RelativeIdealValuation",
    "compose_embeddings",
    "identity_embedding",
    "relative_ideal",
    "relative_ideal_bounded_by_host_top",
    "relative_ideal_fixed_cellwise",
    "relative_ideal_mono",
    "relative_ideal_reindex_closure",
    "relative_ideal_valuation_leq",
    "sample_relative_ideal_witness",
    "theory_relative_ideal_is_reindex",
]

_FOUR = four()


@dataclass(frozen=True, slots=True)
class IsReindexIdealWitness:
    """Witness that a relative ideal is exactly a reindexed host valuation."""

    is_reindex: bool
    cellwise: bool
    ideal_id: bool
    ideal_comp: bool

    @property
    def holds(self) -> bool:
        """All reindex/functoriality checks hold."""

        return self.is_reindex and self.cellwise and self.ideal_id and self.ideal_comp


@dataclass(frozen=True, slots=True)
class IdealSettledWitness:
    """Finite witness that the relative ideal inherits settled host structure."""

    monotone: bool
    bounded: bool
    fixed_cellwise: bool
    reindex_closure: bool

    @property
    def holds(self) -> bool:
        """All finite settled-ideal checks hold."""

        return self.monotone and self.bounded and self.fixed_cellwise and self.reindex_closure


def _validate_embedding(embedding: CellEmbedding, host: RelativeIdealValuation) -> None:
    missing = [cell for cell in embedding.values() if cell not in host]
    if missing:
        msg = f"embedding targets missing from host valuation: {missing!r}"
        raise ValueError(msg)


def relative_ideal(
    embedding: CellEmbedding,
    host: RelativeIdealValuation,
) -> dict[PredicationCell, BL[int]]:
    """Restrict the host settled valuation along the resource embedding."""

    _validate_embedding(embedding, host)
    return {resource_cell: host[host_cell] for resource_cell, host_cell in embedding.items()}


def identity_embedding(
    cells: tuple[PredicationCell, ...],
) -> dict[PredicationCell, PredicationCell]:
    """The trivial type embedding."""

    return {cell: cell for cell in cells}


def compose_embeddings(
    inner: CellEmbedding,
    outer: CellEmbedding,
) -> dict[PredicationCell, PredicationCell]:
    """Compose ``resource -> middle`` and ``middle -> host`` embeddings."""

    missing = [cell for cell in inner.values() if cell not in outer]
    if missing:
        msg = f"outer embedding missing intermediate cells: {missing!r}"
        raise ValueError(msg)
    return {resource_cell: outer[middle_cell] for resource_cell, middle_cell in inner.items()}


def relative_ideal_valuation_leq(
    left: RelativeIdealValuation,
    right: RelativeIdealValuation,
    cells: tuple[PredicationCell, ...] | None = None,
) -> bool:
    """Pointwise FOUR knowledge order on finite valuations."""

    if cells is None:
        if set(left) != set(right):
            msg = "valuations must have the same finite cell support"
            raise ValueError(msg)
        cells = tuple(left)
    return all(_FOUR.leq_k(left[cell], right[cell]) for cell in cells)


def relative_ideal_mono(
    embedding: CellEmbedding,
    host_left: RelativeIdealValuation,
    host_right: RelativeIdealValuation,
) -> bool:
    """Reindexing preserves the pointwise knowledge order."""

    _validate_embedding(embedding, host_left)
    _validate_embedding(embedding, host_right)
    embedded_cells = tuple(dict.fromkeys(embedding.values()))
    if not relative_ideal_valuation_leq(host_left, host_right, embedded_cells):
        return True
    return relative_ideal_valuation_leq(
        relative_ideal(embedding, host_left),
        relative_ideal(embedding, host_right),
    )


def relative_ideal_bounded_by_host_top(
    embedding: CellEmbedding,
    host: RelativeIdealValuation,
) -> bool:
    """Every ideal value is bounded by knowledge-top ``conflict``."""

    ideal = relative_ideal(embedding, host)
    return all(_FOUR.leq_k(value, _FOUR.conflict) for value in ideal.values())


def relative_ideal_fixed_cellwise(
    closure: ClosureOperator,
    embedding: CellEmbedding,
    host: RelativeIdealValuation,
) -> bool:
    """If the host is closed, ideal values equal host closure values cellwise."""

    closed_host = closure(host)
    if dict(closed_host) != dict(host):
        return False
    _validate_embedding(embedding, closed_host)
    return all(host[host_cell] == closed_host[host_cell] for host_cell in embedding.values())


def relative_ideal_reindex_closure(
    closure: ClosureOperator,
    embedding: CellEmbedding,
    host: RelativeIdealValuation,
) -> bool:
    """The ideal of a closed host equals the ideal of its host closure."""

    closed_host = closure(host)
    if dict(closed_host) != dict(host):
        return False
    return relative_ideal(embedding, host) == relative_ideal(embedding, closed_host)


def theory_relative_ideal_is_reindex(
    embedding: CellEmbedding,
    host: RelativeIdealValuation,
    outer_embedding: CellEmbedding | None = None,
) -> IsReindexIdealWitness:
    """Bundle Lean's reindex, cellwise, identity, and composition laws."""

    identity_host = relative_ideal(identity_embedding(tuple(host)), host)
    if outer_embedding is None:
        ideal = relative_ideal(embedding, host)
        resource_cells = tuple(embedding)
        middle_host = {cell: host[host_cell] for cell, host_cell in embedding.items()}
        outer_embedding = embedding
        nested_left = relative_ideal(identity_embedding(resource_cells), middle_host)
        nested_right = relative_ideal(embedding, host)
        cell_embedding = embedding
    else:
        cell_embedding = compose_embeddings(embedding, outer_embedding)
        ideal = relative_ideal(cell_embedding, host)
        resource_cells = tuple(cell_embedding)
        middle_host = relative_ideal(outer_embedding, host)
        nested_left = relative_ideal(embedding, middle_host)
        nested_right = ideal

    return IsReindexIdealWitness(
        is_reindex=ideal == {cell: host[cell_embedding[cell]] for cell in resource_cells},
        cellwise=all(ideal[cell] == host[cell_embedding[cell]] for cell in resource_cells),
        ideal_id=identity_host == dict(host),
        ideal_comp=nested_left == nested_right,
    )


def sample_relative_ideal_witness() -> tuple[IsReindexIdealWitness, IdealSettledWitness]:
    """Sample the theory-relative ideal facts over a tiny resource/host scope."""

    host_a = PredicationCell("theory", "licenses", "resource")
    host_b = PredicationCell("theory", "contradicts", "resource")
    resource_a = PredicationCell("resource", "licensed", "itself")
    resource_b = PredicationCell("resource", "blocked", "itself")
    embedding = {resource_a: host_a, resource_b: host_b}
    host = {host_a: _FOUR.true, host_b: _FOUR.conflict}

    def closure(valuation: RelativeIdealValuation) -> RelativeIdealValuation:
        return dict(valuation)

    upper_host = {host_a: _FOUR.conflict, host_b: _FOUR.conflict}
    reindex_witness = theory_relative_ideal_is_reindex(embedding, host)
    settled_witness = IdealSettledWitness(
        monotone=relative_ideal_mono(embedding, host, upper_host),
        bounded=relative_ideal_bounded_by_host_top(embedding, host),
        fixed_cellwise=relative_ideal_fixed_cellwise(closure, embedding, host),
        reindex_closure=relative_ideal_reindex_closure(closure, embedding, host),
    )
    return reindex_witness, settled_witness
