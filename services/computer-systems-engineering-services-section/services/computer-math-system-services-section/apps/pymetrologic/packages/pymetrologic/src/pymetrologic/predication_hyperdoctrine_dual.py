"""Finite dual predication-hyperdoctrine witnesses.

Executable shadow of ``RelMath.Predicating.PredicationHyperdoctrineDual``.
The Lean module says the truth-order hyperdoctrine is the sigma-conjugate of
the knowledge-order one.  Here sigma acts pointwise on finite valuations:
``(sigma v)(cell) = sigma(v(cell))``.  The finite witnesses check that this is an
order isomorphism, transports Galois connections, turns knowledge fiber
joins/meets into truth fiber joins/meets, carries paraconsistent equality to
classical equality, and transports Frobenius/Beck-Chevalley.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from itertools import product

from pymetrologic import BL, classical_eq, four, paraconsistent_eq
from pymetrologic.orderswap import swap as charge_swap

from .predication_fibration import (
    fibration_meet_t,
    fibration_specialization_map,
    sample_fibration_cells,
    sample_fibration_valuations,
)
from .predication_hyperdoctrine import (
    CellMap,
    HyperValuation,
    beck_chevalley,
    converse_base_iso,
    reindex_valuation_k,
    valuation_eq,
    valuation_le_k,
)
from .yoneda import PredicationCell

CellOperator = Callable[[HyperValuation], dict[PredicationCell, BL[int]]]
FiberMap = Mapping[PredicationCell, tuple[PredicationCell, ...]]

__all__ = [
    "CellOperator",
    "DualAdjointSystemWitness",
    "DualHyperdoctrineWitness",
    "FiberMap",
    "FiniteCellFibration",
    "GaloisTransportWitness",
    "beck_chevalley_dual",
    "classical_eq_is_swap_paraconsistent",
    "conj_cell_operator",
    "dual_adjoint_system_witness",
    "exists_k_cell",
    "exists_t_cell",
    "forall_k_cell",
    "forall_t_cell",
    "frobenius_dual",
    "galois_k",
    "galois_k_to_galois_t",
    "galois_t",
    "join_k_list",
    "join_t_list",
    "meet_k_list",
    "meet_t_list",
    "predication_hyperdoctrine_dual_witness",
    "reindex_cell_fibration",
    "sample_dual_cell_fibration",
    "sample_dual_codomain_valuations",
    "sample_dual_domain_valuations",
    "two_equalities_one_diagonal",
    "val_swap",
    "val_swap_le_k_le_t",
    "val_swap_le_t_le_k",
    "valuation_le_t",
]

_FOUR = four()
_T_TOP = _FOUR.true
_T_BOT = _FOUR.false
_K_TOP = _FOUR.conflict
_K_BOT = _FOUR.none


@dataclass(frozen=True, slots=True)
class FiniteCellFibration:
    """A finite base map with explicitly enumerable fibers."""

    domain: tuple[PredicationCell, ...]
    codomain: tuple[PredicationCell, ...]
    base: CellMap
    fiber: FiberMap

    def __post_init__(self) -> None:
        domain = set(self.domain)
        codomain = set(self.codomain)
        if set(self.base) != domain:
            msg = "base map must be defined on exactly the finite domain"
            raise ValueError(msg)
        if set(self.base.values()) - codomain:
            msg = "base map must land inside the finite codomain"
            raise ValueError(msg)
        if set(self.fiber) != codomain:
            msg = "fiber map must be defined on exactly the finite codomain"
            raise ValueError(msg)
        if any(set(preimage) - domain for preimage in self.fiber.values()):
            msg = "fiber map references cells outside the finite domain"
            raise ValueError(msg)
        if not self.mem_fiber:
            msg = "fiber membership must agree with the base map"
            raise ValueError(msg)

    @property
    def mem_fiber(self) -> bool:
        """``psi in fiber(phi)`` iff ``base(psi) = phi``."""

        return all(
            (psi in self.fiber[phi]) == (self.base[psi] == phi)
            for psi in self.domain
            for phi in self.codomain
        )


@dataclass(frozen=True, slots=True)
class GaloisTransportWitness:
    """Finite witness that sigma-conjugation transports a Galois connection."""

    galois_k_holds: bool
    transported_galois_t_holds: bool
    order_iso_k_to_t: bool
    order_iso_t_to_k: bool

    @property
    def holds(self) -> bool:
        """The knowledge Galois connection transports to truth order."""

        return (
            self.galois_k_holds
            and self.transported_galois_t_holds
            and self.order_iso_k_to_t
            and self.order_iso_t_to_k
        )


@dataclass(frozen=True, slots=True)
class DualAdjointSystemWitness:
    """Finite witness for ``existsT ⊣ reindex ⊣ forallT`` as sigma-transport."""

    exists_k_adjunction: bool
    forall_k_adjunction: bool
    exists_t_adjunction: bool
    forall_t_adjunction: bool
    exists_transport: bool
    forall_transport: bool
    reindex_transport: bool

    @property
    def holds(self) -> bool:
        """Both adjoint triples hold and the truth one is sigma-transported."""

        return (
            self.exists_k_adjunction
            and self.forall_k_adjunction
            and self.exists_t_adjunction
            and self.forall_t_adjunction
            and self.exists_transport
            and self.forall_transport
            and self.reindex_transport
        )


@dataclass(frozen=True, slots=True)
class DualHyperdoctrineWitness:
    """Bundle for the dual hyperdoctrine theorem's finite content."""

    valuation_order_iso: bool
    galois_transport: GaloisTransportWitness
    dual_adjoint_system: DualAdjointSystemWitness
    two_equalities: bool
    frobenius_dual: bool
    beck_chevalley_dual: bool

    @property
    def holds(self) -> bool:
        """All finite dual-hyperdoctrine checks hold."""

        return (
            self.valuation_order_iso
            and self.galois_transport.holds
            and self.dual_adjoint_system.holds
            and self.two_equalities
            and self.frobenius_dual
            and self.beck_chevalley_dual
        )


def _support(valuation: HyperValuation) -> tuple[PredicationCell, ...]:
    return tuple(valuation)


def _same_support(left: HyperValuation, right: HyperValuation) -> tuple[PredicationCell, ...]:
    if set(left) != set(right):
        msg = "valuations must have the same finite cell support"
        raise ValueError(msg)
    return _support(left)


def val_swap(valuation: HyperValuation) -> dict[PredicationCell, BL[int]]:
    """Pointwise sigma on a whole valuation."""

    return {cell: charge_swap(charge) for cell, charge in valuation.items()}


def valuation_le_t(
    left: HyperValuation,
    right: HyperValuation,
    cells: Sequence[PredicationCell] | None = None,
) -> bool:
    """Pointwise FOUR truth order on finite valuations."""

    if cells is None:
        cells = _same_support(left, right)
    return all(_FOUR.leq_t(left[cell], right[cell]) for cell in cells)


def val_swap_le_k_le_t(
    left: HyperValuation,
    right: HyperValuation,
    cells: Sequence[PredicationCell] | None = None,
) -> bool:
    """``left <=_k right`` iff ``sigma(left) <=_t sigma(right)``."""

    if cells is None:
        cells = _same_support(left, right)
    return valuation_le_k(left, right, cells) == valuation_le_t(
        val_swap(left),
        val_swap(right),
        cells,
    )


def val_swap_le_t_le_k(
    left: HyperValuation,
    right: HyperValuation,
    cells: Sequence[PredicationCell] | None = None,
) -> bool:
    """``left <=_t right`` iff ``sigma(left) <=_k sigma(right)``."""

    if cells is None:
        cells = _same_support(left, right)
    return valuation_le_t(left, right, cells) == valuation_le_k(
        val_swap(left),
        val_swap(right),
        cells,
    )


def conj_cell_operator(operator: CellOperator) -> CellOperator:
    """Sigma-conjugate a valuation endomap: ``sigma . operator . sigma``."""

    return lambda valuation: val_swap(operator(val_swap(valuation)))


def galois_k(
    left_op: CellOperator,
    right_op: CellOperator,
    samples: Sequence[HyperValuation],
    cells: Sequence[PredicationCell],
) -> bool:
    """Finite ``<=_k`` Galois connection check."""

    return all(
        valuation_le_k(left_op(left), right, cells) == valuation_le_k(left, right_op(right), cells)
        for left, right in product(samples, repeat=2)
    )


def galois_t(
    left_op: CellOperator,
    right_op: CellOperator,
    samples: Sequence[HyperValuation],
    cells: Sequence[PredicationCell],
) -> bool:
    """Finite ``<=_t`` Galois connection check."""

    return all(
        valuation_le_t(left_op(left), right, cells) == valuation_le_t(left, right_op(right), cells)
        for left, right in product(samples, repeat=2)
    )


def galois_k_to_galois_t(
    left_op: CellOperator,
    right_op: CellOperator,
    samples: Sequence[HyperValuation] | None = None,
) -> GaloisTransportWitness:
    """Transport a finite knowledge-order Galois connection through sigma."""

    vals = tuple(samples if samples is not None else sample_fibration_valuations())
    cells = tuple(vals[0]) if vals else sample_fibration_cells()
    return GaloisTransportWitness(
        galois_k_holds=galois_k(left_op, right_op, vals, cells),
        transported_galois_t_holds=galois_t(
            conj_cell_operator(left_op),
            conj_cell_operator(right_op),
            vals,
            cells,
        ),
        order_iso_k_to_t=all(
            val_swap_le_k_le_t(left, right, cells) for left, right in product(vals, repeat=2)
        ),
        order_iso_t_to_k=all(
            val_swap_le_t_le_k(left, right, cells) for left, right in product(vals, repeat=2)
        ),
    )


def join_k_list(charges: Sequence[BL[int]]) -> BL[int]:
    """Knowledge join of a finite charge list, with knowledge bottom on empty."""

    acc = _K_BOT
    for charge in charges:
        acc = _FOUR.join_k(acc, charge)
    return acc


def meet_k_list(charges: Sequence[BL[int]]) -> BL[int]:
    """Knowledge meet of a finite charge list, with knowledge top on empty."""

    acc = _K_TOP
    for charge in charges:
        acc = _FOUR.meet_k(acc, charge)
    return acc


def join_t_list(charges: Sequence[BL[int]]) -> BL[int]:
    """Truth join of a finite charge list, with truth bottom on empty."""

    acc = _T_BOT
    for charge in charges:
        acc = _FOUR.join_t(acc, charge)
    return acc


def meet_t_list(charges: Sequence[BL[int]]) -> BL[int]:
    """Truth meet of a finite charge list, with truth top on empty."""

    acc = _T_TOP
    for charge in charges:
        acc = _FOUR.meet_t(acc, charge)
    return acc


def exists_k_cell(
    fibration: FiniteCellFibration,
    valuation: HyperValuation,
) -> dict[PredicationCell, BL[int]]:
    """Knowledge existential: fiber knowledge-join."""

    return {
        cell: join_k_list([valuation[source] for source in fibration.fiber[cell]])
        for cell in fibration.codomain
    }


def forall_k_cell(
    fibration: FiniteCellFibration,
    valuation: HyperValuation,
) -> dict[PredicationCell, BL[int]]:
    """Knowledge universal: fiber knowledge-meet."""

    return {
        cell: meet_k_list([valuation[source] for source in fibration.fiber[cell]])
        for cell in fibration.codomain
    }


def exists_t_cell(
    fibration: FiniteCellFibration,
    valuation: HyperValuation,
) -> dict[PredicationCell, BL[int]]:
    """Truth existential: fiber truth-join."""

    return {
        cell: join_t_list([valuation[source] for source in fibration.fiber[cell]])
        for cell in fibration.codomain
    }


def forall_t_cell(
    fibration: FiniteCellFibration,
    valuation: HyperValuation,
) -> dict[PredicationCell, BL[int]]:
    """Truth universal: fiber truth-meet."""

    return {
        cell: meet_t_list([valuation[source] for source in fibration.fiber[cell]])
        for cell in fibration.codomain
    }


def reindex_cell_fibration(
    fibration: FiniteCellFibration,
    valuation: HyperValuation,
) -> dict[PredicationCell, BL[int]]:
    """Pull a codomain valuation back along a finite cell fibration."""

    return {source: valuation[fibration.base[source]] for source in fibration.domain}


def _exists_k_adjunction(
    fibration: FiniteCellFibration,
    domain_val: HyperValuation,
    codomain_val: HyperValuation,
) -> bool:
    return valuation_le_k(
        exists_k_cell(fibration, domain_val),
        codomain_val,
        fibration.codomain,
    ) == valuation_le_k(
        domain_val,
        reindex_cell_fibration(fibration, codomain_val),
        fibration.domain,
    )


def _forall_k_adjunction(
    fibration: FiniteCellFibration,
    codomain_val: HyperValuation,
    domain_val: HyperValuation,
) -> bool:
    return valuation_le_k(
        reindex_cell_fibration(fibration, codomain_val),
        domain_val,
        fibration.domain,
    ) == valuation_le_k(
        codomain_val,
        forall_k_cell(fibration, domain_val),
        fibration.codomain,
    )


def _exists_t_adjunction(
    fibration: FiniteCellFibration,
    domain_val: HyperValuation,
    codomain_val: HyperValuation,
) -> bool:
    return valuation_le_t(
        exists_t_cell(fibration, domain_val),
        codomain_val,
        fibration.codomain,
    ) == valuation_le_t(
        domain_val,
        reindex_cell_fibration(fibration, codomain_val),
        fibration.domain,
    )


def _forall_t_adjunction(
    fibration: FiniteCellFibration,
    codomain_val: HyperValuation,
    domain_val: HyperValuation,
) -> bool:
    return valuation_le_t(
        reindex_cell_fibration(fibration, codomain_val),
        domain_val,
        fibration.domain,
    ) == valuation_le_t(
        codomain_val,
        forall_t_cell(fibration, domain_val),
        fibration.codomain,
    )


def dual_adjoint_system_witness(
    fibration: FiniteCellFibration | None = None,
    domain_valuations: Sequence[HyperValuation] | None = None,
    codomain_valuations: Sequence[HyperValuation] | None = None,
) -> DualAdjointSystemWitness:
    """Check the truth adjoint triple as sigma-transport of the knowledge one."""

    fib = fibration if fibration is not None else sample_dual_cell_fibration()
    domain_vals = tuple(
        domain_valuations if domain_valuations is not None else sample_dual_domain_valuations(fib)
    )
    codomain_vals = tuple(
        codomain_valuations
        if codomain_valuations is not None
        else sample_dual_codomain_valuations(fib)
    )
    return DualAdjointSystemWitness(
        exists_k_adjunction=all(
            _exists_k_adjunction(fib, domain_val, codomain_val)
            for domain_val in domain_vals
            for codomain_val in codomain_vals
        ),
        forall_k_adjunction=all(
            _forall_k_adjunction(fib, codomain_val, domain_val)
            for codomain_val in codomain_vals
            for domain_val in domain_vals
        ),
        exists_t_adjunction=all(
            _exists_t_adjunction(fib, domain_val, codomain_val)
            for domain_val in domain_vals
            for codomain_val in codomain_vals
        ),
        forall_t_adjunction=all(
            _forall_t_adjunction(fib, codomain_val, domain_val)
            for codomain_val in codomain_vals
            for domain_val in domain_vals
        ),
        exists_transport=all(
            valuation_eq(
                val_swap(exists_k_cell(fib, val_swap(domain_val))),
                exists_t_cell(fib, domain_val),
                fib.codomain,
            )
            for domain_val in domain_vals
        ),
        forall_transport=all(
            valuation_eq(
                val_swap(forall_k_cell(fib, val_swap(domain_val))),
                forall_t_cell(fib, domain_val),
                fib.codomain,
            )
            for domain_val in domain_vals
        ),
        reindex_transport=all(
            valuation_eq(
                val_swap(reindex_cell_fibration(fib, val_swap(codomain_val))),
                reindex_cell_fibration(fib, codomain_val),
                fib.domain,
            )
            for codomain_val in codomain_vals
        ),
    )


def classical_eq_is_swap_paraconsistent(subject: object, object_: object) -> bool:
    """Classical equality is sigma applied to paraconsistent equality."""

    return classical_eq(subject, object_) == charge_swap(paraconsistent_eq(subject, object_))


def two_equalities_one_diagonal(pairs: Sequence[tuple[object, object]] | None = None) -> bool:
    """Both equality predicates come from one diagonal and are sigma-conjugate."""

    samples = tuple(pairs if pairs is not None else ((0, 0), (0, 1), ("x", "x"), ("x", "y")))
    return all(
        classical_eq_is_swap_paraconsistent(subject, object_)
        and (classical_eq(subject, object_) == _T_TOP) == (subject == object_)
        and (paraconsistent_eq(subject, object_) == _K_TOP) == (subject == object_)
        for subject, object_ in samples
    )


def frobenius_dual(valuations: Sequence[HyperValuation] | None = None) -> bool:
    """Truth-meet Frobenius for the converse generator."""

    vals = tuple(valuations if valuations is not None else sample_fibration_valuations())
    cells = tuple(vals[0]) if vals else sample_fibration_cells()
    converse = converse_base_iso(cells).fwd
    return all(
        valuation_eq(
            reindex_valuation_k(
                converse,
                fibration_meet_t(reindex_valuation_k(converse, alpha, cells), phi),
                cells,
            ),
            fibration_meet_t(alpha, reindex_valuation_k(converse, phi, cells)),
            cells,
        )
        for alpha, phi in product(vals, repeat=2)
    )


def beck_chevalley_dual(valuations: Sequence[HyperValuation] | None = None) -> bool:
    """Beck-Chevalley transported to sigma-conjugate reindexings."""

    vals = tuple(valuations if valuations is not None else sample_fibration_valuations())
    cells = tuple(vals[0]) if vals else sample_fibration_cells()
    converse = converse_base_iso(cells).fwd
    specialize = fibration_specialization_map(cells)
    hcomm = all(specialize[converse[cell]] == converse[specialize[cell]] for cell in cells)
    if not hcomm:
        return False
    return all(
        beck_chevalley(converse, specialize, val_swap(valuation), cells)
        and beck_chevalley(converse, specialize, valuation, cells)
        for valuation in vals
    )


def predication_hyperdoctrine_dual_witness(
    valuations: Sequence[HyperValuation] | None = None,
) -> DualHyperdoctrineWitness:
    """Bundle the finite executable shadow of the dual hyperdoctrine theorem."""

    vals = tuple(valuations if valuations is not None else sample_fibration_valuations())
    cells = tuple(vals[0]) if vals else sample_fibration_cells()
    converse = converse_base_iso(cells).fwd

    def reindex_converse(valuation: HyperValuation) -> dict[PredicationCell, BL[int]]:
        return reindex_valuation_k(converse, valuation, cells)

    return DualHyperdoctrineWitness(
        valuation_order_iso=all(
            val_swap_le_k_le_t(left, right, cells) and val_swap_le_t_le_k(left, right, cells)
            for left, right in product(vals, repeat=2)
        ),
        galois_transport=galois_k_to_galois_t(reindex_converse, reindex_converse, vals),
        dual_adjoint_system=dual_adjoint_system_witness(),
        two_equalities=two_equalities_one_diagonal(),
        frobenius_dual=frobenius_dual(vals),
        beck_chevalley_dual=beck_chevalley_dual(vals),
    )


def sample_dual_cell_fibration() -> FiniteCellFibration:
    """Predicate-specialization fibration over the closed fibration support."""

    domain = sample_fibration_cells()
    base = fibration_specialization_map(domain)
    codomain = tuple(dict.fromkeys(base.values()))
    fiber = {
        target: tuple(source for source in domain if base[source] == target) for target in codomain
    }
    return FiniteCellFibration(domain, codomain, base, fiber)


def _sample_valuations(
    cells: Sequence[PredicationCell],
) -> tuple[dict[PredicationCell, BL[int]], ...]:
    support = tuple(cells)
    none = {cell: _FOUR.none for cell in support}
    true = {cell: _FOUR.true for cell in support}
    false = {cell: _FOUR.false for cell in support}
    conflict = {cell: _FOUR.conflict for cell in support}
    diagonal = {
        cell: (_FOUR.true if cell.subject == cell.object else _FOUR.none) for cell in support
    }
    return (none, true, false, conflict, diagonal)


def sample_dual_domain_valuations(
    fibration: FiniteCellFibration | None = None,
) -> tuple[dict[PredicationCell, BL[int]], ...]:
    """Compact sample valuations over the finite fibration domain."""

    fib = fibration if fibration is not None else sample_dual_cell_fibration()
    return _sample_valuations(fib.domain)


def sample_dual_codomain_valuations(
    fibration: FiniteCellFibration | None = None,
) -> tuple[dict[PredicationCell, BL[int]], ...]:
    """Compact sample valuations over the finite fibration codomain."""

    fib = fibration if fibration is not None else sample_dual_cell_fibration()
    return _sample_valuations(fib.codomain)
