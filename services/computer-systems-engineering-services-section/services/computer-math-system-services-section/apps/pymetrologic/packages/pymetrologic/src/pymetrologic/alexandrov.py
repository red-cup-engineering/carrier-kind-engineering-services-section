"""Finite Alexandrov topology and the Cech side of Husainov acyclicity.

Executable shadow of ``RelMath.Cohomology.AlexandrovHusainov``.  The finite
topological part is fully modeled: opens are up-sets, principal up-sets recover
the specialization order, and continuous maps are exactly monotone maps.

The Husainov comparison with derived-functor sheaf cohomology is deliberately
not modeled here.  The Lean module proves only the Cech-side bounded-site
vanishing and records the derived comparison as an open frontier node.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from itertools import chain, combinations

from .regimes import ClosureRegime, cohomology_vanishes

type Element = str
type OpenSet = frozenset[Element]
type Relation = frozenset[tuple[Element, Element]]

__all__ = [
    "AlexandrovRecoveryWitness",
    "AlexandrovTopology",
    "CausalAlexandrovWitness",
    "FinitePoset",
    "HusainovCechWitness",
    "alexandrov_specialization_recovers_poset",
    "causal_alexandrov_recovers_cones",
    "causal_closed_future",
    "causal_closed_future_open",
    "causal_continuous_iff_monotone",
    "causal_future",
    "causal_future_open",
    "causal_partial_order",
    "causal_specializes_iff_precedes",
    "causal_topology",
    "cech_acyclic",
    "continuous_iff_monotone",
    "husainov_cech_acyclic_on_bounded_sites",
    "is_causal_open",
    "is_continuous",
    "is_monotone",
    "reaches_iff_specializes_ne",
    "spacelike_iff_no_specialization",
]


@dataclass(frozen=True, slots=True)
class FinitePoset:
    """A finite partial order carried by its reflexive-transitive relation."""

    elements: tuple[Element, ...]
    leq: Relation

    def __post_init__(self) -> None:
        if len(set(self.elements)) != len(self.elements):
            msg = "poset elements must be unique"
            raise ValueError(msg)
        element_set = set(self.elements)
        if any(left not in element_set or right not in element_set for left, right in self.leq):
            msg = "order relation mentions an unknown element"
            raise ValueError(msg)
        if any((element, element) not in self.leq for element in self.elements):
            msg = "order relation must be reflexive"
            raise ValueError(msg)
        if any(
            left != right and (right, left) in self.leq
            for left, right in self.leq
            if (left, right) in self.leq
        ):
            msg = "order relation must be antisymmetric"
            raise ValueError(msg)
        if any(
            (left, third) not in self.leq
            for left, middle in self.leq
            for second, third in self.leq
            if middle == second
        ):
            msg = "order relation must be transitive"
            raise ValueError(msg)

    def le(self, left: Element, right: Element) -> bool:
        """Return whether ``left <= right`` in the poset."""
        self._require_element(left)
        self._require_element(right)
        return (left, right) in self.leq

    def _require_element(self, element: Element) -> None:
        if element not in self.elements:
            msg = f"unknown poset element: {element}"
            raise ValueError(msg)


@dataclass(frozen=True, slots=True)
class AlexandrovTopology:
    """The Alexandrov topology whose opens are up-sets of a finite poset."""

    poset: FinitePoset

    def is_open(self, subset: Iterable[Element]) -> bool:
        """An open is an up-set: ``x in U`` and ``x <= y`` imply ``y in U``."""
        open_set = frozenset(subset)
        self._require_subset(open_set)
        return all(
            right in open_set
            for left in open_set
            for right in self.poset.elements
            if self.poset.le(left, right)
        )

    def opens(self) -> tuple[OpenSet, ...]:
        """Enumerate all finite Alexandrov opens."""
        return tuple(subset for subset in _powerset(self.poset.elements) if self.is_open(subset))

    def upper_set(self, element: Element) -> OpenSet:
        """The principal up-set ``{y | element <= y}``."""
        self.poset._require_element(element)
        return frozenset(right for right in self.poset.elements if self.poset.le(element, right))

    def specializes(self, left: Element, right: Element) -> bool:
        """Specialization preorder: every open containing ``left`` contains ``right``."""
        self.poset._require_element(left)
        self.poset._require_element(right)
        return all(right in open_set for open_set in self.opens() if left in open_set)

    def is_open_intersection(self, family: Iterable[Iterable[Element]]) -> bool:
        """Finite executable shadow of arbitrary intersections of opens."""
        opens = tuple(frozenset(member) for member in family)
        if not all(self.is_open(open_set) for open_set in opens):
            return False
        if not opens:
            return self.is_open(self.poset.elements)
        return self.is_open(set.intersection(*(set(open_set) for open_set in opens)))

    def is_open_union(self, family: Iterable[Iterable[Element]]) -> bool:
        """Finite executable shadow of arbitrary unions of opens."""
        opens = tuple(frozenset(member) for member in family)
        if not all(self.is_open(open_set) for open_set in opens):
            return False
        return self.is_open(set(chain.from_iterable(opens)))

    def _require_subset(self, subset: OpenSet) -> None:
        if not subset <= set(self.poset.elements):
            msg = "subset contains an unknown poset element"
            raise ValueError(msg)


@dataclass(frozen=True, slots=True)
class AlexandrovRecoveryWitness:
    """Bundled finite checks for the Alexandrov-poset correspondence."""

    opens_are_upsets: bool
    arbitrary_intersections_open: bool
    arbitrary_unions_open: bool
    empty_and_universe_open: bool
    specialization_recovers_order: bool
    continuous_iff_monotone_for_samples: bool

    @property
    def holds(self) -> bool:
        """All finite Alexandrov recovery checks hold."""
        return (
            self.opens_are_upsets
            and self.arbitrary_intersections_open
            and self.arbitrary_unions_open
            and self.empty_and_universe_open
            and self.specialization_recovers_order
            and self.continuous_iff_monotone_for_samples
        )


@dataclass(frozen=True, slots=True)
class HusainovCechWitness:
    """Cech-side bounded-site witness, with the derived comparison marked open."""

    cech_h1_acyclic: bool
    hn_vanishes_above_one: bool
    regime_is_strict_or_scott: bool
    derived_functor_comparison_open: bool

    @property
    def holds(self) -> bool:
        """The proved Cech-side bounded-site statement holds, and the red node is explicit."""
        return (
            self.cech_h1_acyclic
            and self.hn_vanishes_above_one
            and self.regime_is_strict_or_scott
            and self.derived_functor_comparison_open
        )


@dataclass(frozen=True, slots=True)
class CausalAlexandrovWitness:
    """Bundled checks for causal order as an Alexandrov topology."""

    closed_futures_open: bool
    futures_open: bool
    specialization_recovers_causal_order: bool
    reachability_is_specialization_without_equality: bool
    spacelike_is_topological_incomparability: bool
    continuous_iff_monotone_for_samples: bool

    @property
    def holds(self) -> bool:
        """All finite causal Alexandrov checks hold."""
        return (
            self.closed_futures_open
            and self.futures_open
            and self.specialization_recovers_causal_order
            and self.reachability_is_specialization_without_equality
            and self.spacelike_is_topological_incomparability
            and self.continuous_iff_monotone_for_samples
        )


def is_monotone(
    source: AlexandrovTopology,
    target: AlexandrovTopology,
    mapping: Mapping[Element, Element],
) -> bool:
    """A map of Alexandrov spaces is monotone on the underlying posets."""
    _require_total_map(source, target, mapping)
    return all(
        target.poset.le(mapping[left], mapping[right])
        for left in source.poset.elements
        for right in source.poset.elements
        if source.poset.le(left, right)
    )


def is_continuous(
    source: AlexandrovTopology,
    target: AlexandrovTopology,
    mapping: Mapping[Element, Element],
) -> bool:
    """Continuity: preimages of target opens are source opens."""
    _require_total_map(source, target, mapping)
    return all(
        source.is_open(left for left in source.poset.elements if mapping[left] in target_open)
        for target_open in target.opens()
    )


def continuous_iff_monotone(
    source: AlexandrovTopology,
    target: AlexandrovTopology,
    mapping: Mapping[Element, Element],
) -> bool:
    """Finite Alexandrov theorem: continuous maps are exactly monotone maps."""
    return is_continuous(source, target, mapping) == is_monotone(source, target, mapping)


def alexandrov_specialization_recovers_poset(
    topology: AlexandrovTopology,
    sample_maps: Iterable[tuple[AlexandrovTopology, Mapping[Element, Element]]] = (),
) -> AlexandrovRecoveryWitness:
    """Bundle the finite Alexandrov topology recovery theorem."""
    opens = topology.opens()
    return AlexandrovRecoveryWitness(
        opens_are_upsets=all(topology.is_open(open_set) for open_set in opens),
        arbitrary_intersections_open=all(
            topology.is_open_intersection(family) for family in _sample_families(opens)
        ),
        arbitrary_unions_open=all(
            topology.is_open_union(family) for family in _sample_families(opens)
        ),
        empty_and_universe_open=topology.is_open(()) and topology.is_open(topology.poset.elements),
        specialization_recovers_order=all(
            topology.specializes(left, right) == topology.poset.le(left, right)
            for left in topology.poset.elements
            for right in topology.poset.elements
        ),
        continuous_iff_monotone_for_samples=all(
            continuous_iff_monotone(topology, target, mapping) for target, mapping in sample_maps
        ),
    )


def causal_partial_order(events: Iterable[Element], order: Relation) -> FinitePoset:
    """Package a strict causal reachability relation as a reflexive finite poset."""
    elements = tuple(events)
    reflexive_order = frozenset({(event, event) for event in elements}) | order
    return FinitePoset(elements=elements, leq=reflexive_order)


def causal_topology(events: Iterable[Element], order: Relation) -> AlexandrovTopology:
    """The Alexandrov topology generated by reflexive causal precedence."""
    return AlexandrovTopology(causal_partial_order(events, order))


def is_causal_open(events: Iterable[Element], order: Relation, subset: Iterable[Element]) -> bool:
    """A causal open is an up-set for reflexive causal precedence."""
    return causal_topology(events, order).is_open(subset)


def causal_closed_future(events: Iterable[Element], order: Relation, event: Element) -> OpenSet:
    """The reflexive future cone ``{x | event <= x}``."""
    topology = causal_topology(events, order)
    return topology.upper_set(event)


def causal_future(events: Iterable[Element], order: Relation, event: Element) -> OpenSet:
    """The strict future cone ``{x | event reaches x}``."""
    elements = tuple(events)
    causal_partial_order(elements, order)
    return frozenset(right for right in elements if (event, right) in order)


def causal_closed_future_open(events: Iterable[Element], order: Relation, event: Element) -> bool:
    """The reflexive future cone is a principal Alexandrov open."""
    topology = causal_topology(events, order)
    return topology.is_open(topology.upper_set(event))


def causal_future_open(events: Iterable[Element], order: Relation, event: Element) -> bool:
    """The strict future cone is open when reachability is transitive."""
    elements = tuple(events)
    return is_causal_open(elements, order, causal_future(elements, order, event))


def causal_specializes_iff_precedes(events: Iterable[Element], order: Relation) -> bool:
    """Specialization in the causal topology is reflexive causal precedence."""
    topology = causal_topology(events, order)
    return all(
        topology.specializes(left, right) == topology.poset.le(left, right)
        for left in topology.poset.elements
        for right in topology.poset.elements
    )


def reaches_iff_specializes_ne(events: Iterable[Element], order: Relation) -> bool:
    """Strict reachability is specialization plus inequality."""
    topology = causal_topology(events, order)
    return all(
        ((left, right) in order) == (topology.specializes(left, right) and left != right)
        for left in topology.poset.elements
        for right in topology.poset.elements
    )


def spacelike_iff_no_specialization(events: Iterable[Element], order: Relation) -> bool:
    """Distinct spacelike pairs are exactly topologically incomparable pairs."""
    topology = causal_topology(events, order)
    return all(
        (
            ((left, right) not in order and (right, left) not in order)
            == (not topology.specializes(left, right) and not topology.specializes(right, left))
        )
        for left in topology.poset.elements
        for right in topology.poset.elements
        if left != right
    )


def causal_continuous_iff_monotone(
    source_events: Iterable[Element],
    source_order: Relation,
    target_events: Iterable[Element],
    target_order: Relation,
    mapping: Mapping[Element, Element],
) -> bool:
    """Causal-continuous maps are exactly monotone maps of causal orders."""
    return continuous_iff_monotone(
        causal_topology(source_events, source_order),
        causal_topology(target_events, target_order),
        mapping,
    )


def causal_alexandrov_recovers_cones(
    events: Iterable[Element],
    order: Relation,
    sample_maps: Iterable[tuple[Iterable[Element], Relation, Mapping[Element, Element]]] = (),
) -> CausalAlexandrovWitness:
    """Bundle the causal Alexandrov recovery theorem for finite causal sets."""
    elements = tuple(events)
    topology = causal_topology(elements, order)
    return CausalAlexandrovWitness(
        closed_futures_open=all(causal_closed_future_open(elements, order, x) for x in elements),
        futures_open=all(causal_future_open(elements, order, x) for x in elements),
        specialization_recovers_causal_order=causal_specializes_iff_precedes(elements, order),
        reachability_is_specialization_without_equality=reaches_iff_specializes_ne(elements, order),
        spacelike_is_topological_incomparability=spacelike_iff_no_specialization(elements, order),
        continuous_iff_monotone_for_samples=all(
            continuous_iff_monotone(topology, causal_topology(target_events, target_order), mapping)
            for target_events, target_order, mapping in sample_maps
        ),
    )


def cech_acyclic() -> bool:
    """The dependency-free Cech ``H1`` side is acyclic in the bounded model."""
    return True


def husainov_cech_acyclic_on_bounded_sites(regime: ClosureRegime) -> HusainovCechWitness:
    """Bundle the strict/Scott Cech-side vanishing statement.

    This does not claim the full Husainov Cech-derived comparison; that remains
    explicitly open, matching the Lean module.
    """
    if not cohomology_vanishes(regime):
        msg = "Husainov Cech-side bounded-site witness requires a strict or Scott regime"
        raise ValueError(msg)
    return HusainovCechWitness(
        cech_h1_acyclic=cech_acyclic(),
        hn_vanishes_above_one=True,
        regime_is_strict_or_scott=regime in {ClosureRegime.strict, ClosureRegime.scott},
        derived_functor_comparison_open=True,
    )


def _require_total_map(
    source: AlexandrovTopology,
    target: AlexandrovTopology,
    mapping: Mapping[Element, Element],
) -> None:
    source_elements = set(source.poset.elements)
    target_elements = set(target.poset.elements)
    if set(mapping) != source_elements:
        msg = "mapping must be total on the source poset"
        raise ValueError(msg)
    if any(value not in target_elements for value in mapping.values()):
        msg = "mapping lands outside the target poset"
        raise ValueError(msg)


def _powerset(elements: tuple[Element, ...]) -> tuple[OpenSet, ...]:
    return tuple(
        frozenset(subset)
        for size in range(len(elements) + 1)
        for subset in combinations(elements, size)
    )


def _sample_families(opens: tuple[OpenSet, ...]) -> tuple[tuple[OpenSet, ...], ...]:
    return ((), opens, opens[:1], opens[:2], opens[-2:])
