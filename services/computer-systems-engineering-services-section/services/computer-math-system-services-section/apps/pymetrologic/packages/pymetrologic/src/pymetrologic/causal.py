"""Lorentzian causal settling (RelMath.Lorentzian.Causal).

A causal structure is a settling over the Boolean value category: cells are pairs
of events, and the closure step is the **Boolean transitive closure**

    ``T_caus(v)(e₁,e₃) = v(e₁,e₃) ∨ ∃ e₂. v(e₁,e₂) ∧ v(e₂,e₃)``.

Iterated to its fixed point it yields the full causal order ``J⁺`` — the
transitive closure of the seed adjacency ``≺₀``. A settled (``t``) pair is
**causally** related (timelike: in each other's light cone); an unsettled pair is
**spacelike** separated. The future/past cones and the **Alexandrov interval**
(causal diamond) read off ``J⁺``.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from itertools import combinations

from .bilattice import BL, four
from .regimes import ClosureRegime, cohomology_vanishes, is_curved_regime, is_flat_regime

Charge = BL[int]
ConeReport = Mapping[tuple[str, str], Charge]
Relation = frozenset[tuple[str, str]]
Section = frozenset[str]

__all__ = [
    "CausalLaplacianWitness",
    "CausalMicrosupportWitness",
    "CausalNetWitness",
    "Charge",
    "ConeReport",
    "LightObservationWitness",
    "MicrolocalSupportWitness",
    "ParaconsistentConeReportsWitness",
    "alexandrov_interval",
    "boolean_cone_report",
    "boolean_cone_report_consistent",
    "boolean_cone_report_reachable_iff",
    "causal_closure",
    "causal_closure_idempotent",
    "causal_closure_inflationary",
    "causal_closure_least_harmonic",
    "causal_closure_monotone",
    "causal_diffusion_gap_one",
    "causal_laplacian",
    "causal_laplacian_theory",
    "causal_microsupport",
    "causal_microsupport_unifies",
    "causal_net_region_theory",
    "causal_propagation_is_closure",
    "causal_section_closure",
    "causal_step",
    "causally_precedes",
    "charged_future",
    "closed_diamond_mono",
    "confined_to",
    "diamond_region",
    "full_light_observation_reconstructs_causal_order",
    "full_observers",
    "future",
    "future_closed_region",
    "future_closed_section",
    "future_signature",
    "future_signature_antimono",
    "h1_classifies_singularity_regime",
    "harmonic_iff_future_closed",
    "is_future_closed_section",
    "is_harmonic_section",
    "merge_reports",
    "merge_reports_comm",
    "merge_reports_infl_left",
    "microlocal_support_shadow",
    "microsupport_eq_union_cones",
    "microsupport_excludes_spacelike",
    "microsupport_excludes_spacelike_region",
    "microsupport_idempotent",
    "microsupport_point",
    "microsupport_upward_closed",
    "observer_family_separating",
    "paraconsistent_cone_reports",
    "past",
    "past_signature",
    "past_signature_mono",
    "region_le",
    "region_le_refl",
    "region_le_trans",
    "reports_inconsistent",
    "reports_reachable",
    "reports_unknown",
    "same_observation_signature",
    "singular_at",
    "singular_support",
    "smooth_flow",
    "spacelike_microsupport_independent",
    "spacelike_regions",
    "spacelike_regions_disjoint",
    "spacelike_regions_symmetric",
]


@dataclass(frozen=True, slots=True)
class CausalLaplacianWitness:
    """Bundled finite checks for causal future-closure as a Laplacian."""

    inflationary: bool
    monotone: bool
    idempotent: bool
    harmonic_iff_future_closed: bool

    @property
    def holds(self) -> bool:
        """All causal Laplacian closure laws hold."""
        return (
            self.inflationary
            and self.monotone
            and self.idempotent
            and self.harmonic_iff_future_closed
        )


@dataclass(frozen=True, slots=True)
class LightObservationWitness:
    """Bundled finite checks for full light-cone observation."""

    full_observers_separate: bool
    past_signatures_recover_order: bool
    future_signatures_recover_order: bool
    past_signatures_monotone: bool
    future_signatures_antimonotone: bool

    @property
    def holds(self) -> bool:
        """All finite light-observation reconstruction checks hold."""
        return (
            self.full_observers_separate
            and self.past_signatures_recover_order
            and self.future_signatures_recover_order
            and self.past_signatures_monotone
            and self.future_signatures_antimonotone
        )


@dataclass(frozen=True, slots=True)
class CausalNetWitness:
    """Bundled finite checks for causal regions and spacelike independence."""

    region_inclusion_preorder: bool
    spacelike_regions_symmetric: bool
    spacelike_regions_disjoint: bool
    closed_diamonds_monotone: bool

    @property
    def holds(self) -> bool:
        """All finite causal-net region checks hold."""
        return (
            self.region_inclusion_preorder
            and self.spacelike_regions_symmetric
            and self.spacelike_regions_disjoint
            and self.closed_diamonds_monotone
        )


@dataclass(frozen=True, slots=True)
class ParaconsistentConeReportsWitness:
    """Bundled finite checks for FOUR-valued causal report semantics."""

    boolean_reports_consistent: bool
    merge_accumulates_left: bool
    merge_commutative: bool
    reachable_iff_boolean_relation: bool

    @property
    def holds(self) -> bool:
        """All finite paraconsistent cone-report laws hold."""
        return (
            self.boolean_reports_consistent
            and self.merge_accumulates_left
            and self.merge_commutative
            and self.reachable_iff_boolean_relation
        )


@dataclass(frozen=True, slots=True)
class MicrolocalSupportWitness:
    """Bundled shadow of causal propagation and NSC singular support."""

    empty_singular_support: bool
    propagation_closure: CausalLaplacianWitness
    h1_vanishing_classifies_flat: bool
    h1_nonvanishing_classifies_curved: bool

    @property
    def holds(self) -> bool:
        """The finite microlocal-support shadow holds."""

        return (
            self.empty_singular_support
            and self.propagation_closure.holds
            and self.h1_vanishing_classifies_flat
            and self.h1_nonvanishing_classifies_curved
        )


@dataclass(frozen=True, slots=True)
class CausalMicrosupportWitness:
    """Bundled finite checks for cone-confined causal microsupport."""

    point_sources_are_closed_future: bool
    microsupports_are_upward_closed: bool
    spacelike_points_are_independent: bool
    microsupports_are_idempotent: bool

    @property
    def holds(self) -> bool:
        """The causal microsupport propagation/locality laws hold."""

        return (
            self.point_sources_are_closed_future
            and self.microsupports_are_upward_closed
            and self.spacelike_points_are_independent
            and self.microsupports_are_idempotent
        )


def singular_at(nsc_firing: bool) -> bool:
    """A closure-flow singularity is an NSC firing."""

    return nsc_firing


def singular_support(nsc_firings: Iterable[bool]) -> frozenset[int]:
    """Return the limit indices where the sampled closure flow has NSC firings."""

    return frozenset(index for index, firing in enumerate(nsc_firings) if singular_at(firing))


def smooth_flow(nsc_firings: Iterable[bool]) -> bool:
    """A sampled flow is smooth when its NSC singular support is empty."""

    return not singular_support(nsc_firings)


def causal_propagation_is_closure(
    events: Sequence[str],
    order: Relation,
) -> CausalLaplacianWitness:
    """Causal forward propagation is the future-closure operator."""

    return causal_laplacian_theory(events, order)


def h1_classifies_singularity_regime(regime: ClosureRegime) -> tuple[bool, bool]:
    """H1 vanishing means flat; H1 nonvanishing means curved."""

    vanishes = cohomology_vanishes(regime)
    return vanishes == is_flat_regime(regime), (not vanishes) == is_curved_regime(regime)


def microlocal_support_shadow(
    events: Sequence[str],
    order: Relation,
    regime: ClosureRegime,
    nsc_firings: Iterable[bool] = (),
) -> MicrolocalSupportWitness:
    """Bundle the executable ``MicrolocalSupport`` theorem surface."""

    h1_flat, h1_curved = h1_classifies_singularity_regime(regime)
    return MicrolocalSupportWitness(
        empty_singular_support=smooth_flow(nsc_firings),
        propagation_closure=causal_propagation_is_closure(events, order),
        h1_vanishing_classifies_flat=h1_flat,
        h1_nonvanishing_classifies_curved=h1_curved,
    )


def causal_microsupport(
    events: Sequence[str],
    order: Relation,
    section: Iterable[str],
) -> Section:
    """The causal microsupport of a section: its causal future closure."""

    return causal_section_closure(events, order, section)


def microsupport_eq_union_cones(
    events: Sequence[str],
    order: Relation,
    section: Iterable[str],
) -> bool:
    """Microsupport equals the union of closed future cones of support events."""

    event_set = frozenset(events)
    support = frozenset(section)
    _require_subset(event_set, support)
    _require_relation_on(event_set, order)
    union = frozenset(
        target
        for source in support
        for target in event_set
        if source == target or (source, target) in order
    )
    return causal_microsupport(events, order, support) == union


def microsupport_upward_closed(
    events: Sequence[str],
    order: Relation,
    section: Iterable[str],
) -> bool:
    """Causal microsupport is conic: an up-set for reflexive causal precedence."""

    support = causal_microsupport(events, order, section)
    return all(
        target in support
        for source in support
        for target in events
        if source == target or (source, target) in order
    )


def microsupport_idempotent(
    events: Sequence[str],
    order: Relation,
    section: Iterable[str],
) -> bool:
    """Propagating the microsupport again adds no new events."""

    support = causal_microsupport(events, order, section)
    return causal_microsupport(events, order, support) == support


def confined_to(
    events: Sequence[str],
    order: Relation,
    section: Iterable[str],
    region: Iterable[str],
) -> bool:
    """A section's microsupport lies inside ``region``."""

    event_set = frozenset(events)
    target = frozenset(region)
    _require_subset(event_set, target)
    return causal_microsupport(events, order, section) <= target


def microsupport_point(events: Sequence[str], order: Relation, event: str) -> Section:
    """The microsupport of a point source is its closed future cone."""

    event_set = frozenset(events)
    _require_subset(event_set, frozenset({event}))
    _require_relation_on(event_set, order)
    return causal_microsupport(events, order, {event})


def microsupport_excludes_spacelike(
    events: Sequence[str],
    order: Relation,
    source: str,
    target: str,
) -> bool:
    """A point source never reaches a distinct spacelike-separated target."""

    event_set = frozenset(events)
    _require_subset(event_set, frozenset({source, target}))
    _require_relation_on(event_set, order)
    if source == target or (source, target) in order or (target, source) in order:
        msg = "source and target must be distinct and spacelike separated"
        raise ValueError(msg)
    return target not in causal_microsupport(events, order, {source})


def microsupport_excludes_spacelike_region(
    events: Sequence[str],
    order: Relation,
    section: Iterable[str],
    target: str,
) -> bool:
    """A region support does not reach a point spacelike from every support event."""

    support = frozenset(section)
    event_set = frozenset(events)
    _require_subset(event_set, support | frozenset({target}))
    if target in support:
        msg = "target must be outside the source section"
        raise ValueError(msg)
    if not spacelike_regions(events, order, support, {target}):
        msg = "target must be spacelike from every support event"
        raise ValueError(msg)
    return target not in causal_microsupport(events, order, support)


def spacelike_microsupport_independent(
    events: Sequence[str],
    order: Relation,
    left: str,
    right: str,
) -> bool:
    """Distinct spacelike point sources do not reach one another."""

    return microsupport_excludes_spacelike(
        events, order, left, right
    ) and microsupport_excludes_spacelike(events, order, right, left)


def causal_microsupport_unifies(
    events: Sequence[str], order: Relation
) -> CausalMicrosupportWitness:
    """Bundle cone propagation, spacelike locality, and closure idempotence."""

    event_set = tuple(events)
    sections = _powerset(event_set)
    spacelike_pairs = tuple(
        (left, right)
        for left in event_set
        for right in event_set
        if left != right and (left, right) not in order and (right, left) not in order
    )
    return CausalMicrosupportWitness(
        point_sources_are_closed_future=all(
            microsupport_point(events, order, event)
            == frozenset(
                target for target in event_set if event == target or (event, target) in order
            )
            for event in event_set
        ),
        microsupports_are_upward_closed=all(
            microsupport_eq_union_cones(events, order, section)
            and microsupport_upward_closed(events, order, section)
            for section in sections
        ),
        spacelike_points_are_independent=all(
            spacelike_microsupport_independent(events, order, left, right)
            for left, right in spacelike_pairs
        ),
        microsupports_are_idempotent=all(
            microsupport_idempotent(events, order, section) for section in sections
        ),
    )


def reports_reachable(report: ConeReport, left: str, right: str) -> bool:
    """A causal report affirms reachability when the positive slot is present."""
    return _report_at(report, left, right).pro == four().L.top


def reports_inconsistent(report: ConeReport, left: str, right: str) -> bool:
    """A causal report is inconsistent at a pair when it reports FOUR top."""
    return _report_at(report, left, right) == four().conflict


def reports_unknown(report: ConeReport, left: str, right: str) -> bool:
    """A causal report is unknown at a pair when it reports FOUR bottom."""
    return _report_at(report, left, right) == four().none


def charged_future(events: Sequence[str], report: ConeReport, left: str) -> dict[str, Charge]:
    """The charged future cone of ``left`` as reported FOUR values."""
    event_set = frozenset(events)
    _require_subset(event_set, frozenset({left}))
    return {right: _report_at(report, left, right) for right in events}


def merge_reports(
    events: Sequence[str],
    left: ConeReport,
    right: ConeReport,
) -> dict[tuple[str, str], Charge]:
    """Merge two causal reports cellwise under the FOUR knowledge join."""
    bl = four()
    return {
        (source, target): bl.join_k(
            _report_at(left, source, target),
            _report_at(right, source, target),
        )
        for source in events
        for target in events
    }


def merge_reports_comm(events: Sequence[str], left: ConeReport, right: ConeReport) -> bool:
    """Report merge is commutative over the finite event carrier."""
    return merge_reports(events, left, right) == merge_reports(events, right, left)


def merge_reports_infl_left(events: Sequence[str], left: ConeReport, right: ConeReport) -> bool:
    """Merging accumulates knowledge: every left cell is below its merge."""
    bl = four()
    merged = merge_reports(events, left, right)
    return all(
        bl.leq_k(_report_at(left, source, target), merged[(source, target)])
        for source in events
        for target in events
    )


def boolean_cone_report(
    events: Sequence[str],
    prec: Relation | Callable[[str, str], bool],
) -> dict[tuple[str, str], Charge]:
    """Embed a Boolean causal relation as a consistent FOUR-valued report."""
    bl = four()
    return {
        (source, target): bl.true if _prec_holds(prec, source, target) else bl.none
        for source in events
        for target in events
    }


def boolean_cone_report_consistent(
    events: Sequence[str],
    prec: Relation | Callable[[str, str], bool],
) -> bool:
    """A Boolean cone report never produces the inconsistent FOUR value."""
    report = boolean_cone_report(events, prec)
    return all(
        not reports_inconsistent(report, source, target) for source in events for target in events
    )


def boolean_cone_report_reachable_iff(
    events: Sequence[str],
    prec: Relation | Callable[[str, str], bool],
) -> bool:
    """A Boolean report's reachability verdict is exactly the input relation."""
    report = boolean_cone_report(events, prec)
    return all(
        reports_reachable(report, source, target) == _prec_holds(prec, source, target)
        for source in events
        for target in events
    )


def paraconsistent_cone_reports(
    events: Sequence[str],
    prec: Relation | Callable[[str, str], bool],
    reports: Sequence[ConeReport] | None = None,
) -> ParaconsistentConeReportsWitness:
    """Bundle the finite paraconsistent cone-report theorem."""
    boolean_report = boolean_cone_report(events, prec)
    sample_reports = tuple(reports) if reports is not None else (boolean_report,)
    report_pairs = tuple((left, right) for left in sample_reports for right in sample_reports)
    return ParaconsistentConeReportsWitness(
        boolean_reports_consistent=boolean_cone_report_consistent(events, prec),
        merge_accumulates_left=all(
            merge_reports_infl_left(events, left, right) for left, right in report_pairs
        ),
        merge_commutative=all(
            merge_reports_comm(events, left, right) for left, right in report_pairs
        ),
        reachable_iff_boolean_relation=boolean_cone_report_reachable_iff(events, prec),
    )


def causal_step(events: Sequence[str], rel: Relation) -> Relation:
    """One Boolean transitive-closure step ``T_caus``."""
    new = set(rel)
    for e1 in events:
        for e3 in events:
            if (e1, e3) not in new and any((e1, e2) in rel and (e2, e3) in rel for e2 in events):
                new.add((e1, e3))
    return frozenset(new)


def causal_closure(events: Sequence[str], seed: Relation) -> Relation:
    """Settle ``T_caus`` to its fixed point: the full causal order ``J⁺`` (transitive closure)."""
    rel = seed
    while True:
        nxt = causal_step(events, rel)
        if nxt == rel:
            return rel
        rel = nxt


def causal_section_closure(
    events: Sequence[str],
    order: Relation,
    section: Iterable[str],
) -> Section:
    """Future-close an event support using reflexive causal precedence."""
    event_set = frozenset(events)
    support = frozenset(section)
    _require_subset(event_set, support)
    _require_relation_on(event_set, order)
    return frozenset(y for x in support for y in event_set if x == y or (x, y) in order)


def causal_laplacian(events: Sequence[str], order: Relation, section: Iterable[str]) -> Section:
    """The causal Lawvere/Tarski Laplacian: one future-closure step."""
    return causal_section_closure(events, order, section)


def is_future_closed_section(
    events: Sequence[str],
    order: Relation,
    section: Iterable[str],
) -> bool:
    """A section is future-closed under reflexive causal precedence."""
    event_set = frozenset(events)
    support = frozenset(section)
    _require_subset(event_set, support)
    _require_relation_on(event_set, order)
    return all(y in support for x in support for y in event_set if x == y or (x, y) in order)


def is_harmonic_section(events: Sequence[str], order: Relation, section: Iterable[str]) -> bool:
    """A harmonic section is fixed by causal future-closure."""
    support = frozenset(section)
    return causal_laplacian(events, order, support) == support


def future_closed_section(events: Sequence[str], order: Relation, section: Iterable[str]) -> bool:
    """Alias matching the Lean predicate name ``FutureClosed``."""
    return is_future_closed_section(events, order, section)


def causal_closure_inflationary(
    events: Sequence[str],
    order: Relation,
    section: Iterable[str],
) -> bool:
    """Every seed support is contained in its causal closure."""
    support = frozenset(section)
    return support <= causal_section_closure(events, order, support)


def causal_closure_monotone(
    events: Sequence[str],
    order: Relation,
    lower: Iterable[str],
    upper: Iterable[str],
) -> bool:
    """Causal closure is monotone with respect to section inclusion."""
    lower_support = frozenset(lower)
    upper_support = frozenset(upper)
    if not lower_support <= upper_support:
        msg = "lower section must be contained in upper section"
        raise ValueError(msg)
    return causal_section_closure(events, order, lower_support) <= causal_section_closure(
        events, order, upper_support
    )


def causal_closure_idempotent(
    events: Sequence[str],
    order: Relation,
    section: Iterable[str],
) -> bool:
    """Causal closure is idempotent once the causal order is transitively closed."""
    once = causal_section_closure(events, order, section)
    return causal_section_closure(events, order, once) == once


def harmonic_iff_future_closed(
    events: Sequence[str],
    order: Relation,
    section: Iterable[str],
) -> bool:
    """Harmonic sections are exactly future-closed sections."""
    support = frozenset(section)
    return is_harmonic_section(events, order, support) == is_future_closed_section(
        events, order, support
    )


def causal_closure_least_harmonic(
    events: Sequence[str],
    order: Relation,
    section: Iterable[str],
    harmonic: Iterable[str],
) -> bool:
    """The causal closure is the least harmonic section containing the seed."""
    support = frozenset(section)
    target = frozenset(harmonic)
    if not support <= target:
        msg = "harmonic target must contain the seed section"
        raise ValueError(msg)
    if not is_harmonic_section(events, order, target):
        msg = "target section must be harmonic"
        raise ValueError(msg)
    return causal_section_closure(events, order, support) <= target


def causal_diffusion_gap_one(
    events: Sequence[str],
    order: Relation,
    section: Iterable[str],
) -> bool:
    """Diffusion reaches the harmonic kernel after one closure step."""
    return causal_closure_idempotent(events, order, section)


def causal_laplacian_theory(events: Sequence[str], order: Relation) -> CausalLaplacianWitness:
    """Bundle the finite causal Laplacian closure theorem."""
    sections = _powerset(tuple(events))
    comparable = tuple((lower, upper) for lower in sections for upper in sections if lower <= upper)
    return CausalLaplacianWitness(
        inflationary=all(
            causal_closure_inflationary(events, order, section) for section in sections
        ),
        monotone=all(
            causal_closure_monotone(events, order, lower, upper) for lower, upper in comparable
        ),
        idempotent=all(causal_closure_idempotent(events, order, section) for section in sections),
        harmonic_iff_future_closed=all(
            harmonic_iff_future_closed(events, order, section) for section in sections
        ),
    )


def full_observers(events: Sequence[str]) -> Section:
    """The observer family containing every event."""
    return frozenset(events)


def past_signature(
    events: Sequence[str],
    order: Relation,
    observers: Iterable[str],
    event: str,
) -> Section:
    """Observers in the reflexive causal past of ``event``."""
    event_set = frozenset(events)
    observer_set = frozenset(observers)
    _require_subset(event_set, observer_set)
    _require_subset(event_set, frozenset({event}))
    _require_relation_on(event_set, order)
    return frozenset(
        observer for observer in observer_set if observer == event or (observer, event) in order
    )


def future_signature(
    events: Sequence[str],
    order: Relation,
    observers: Iterable[str],
    event: str,
) -> Section:
    """Observers in the reflexive causal future of ``event``."""
    event_set = frozenset(events)
    observer_set = frozenset(observers)
    _require_subset(event_set, observer_set)
    _require_subset(event_set, frozenset({event}))
    _require_relation_on(event_set, order)
    return frozenset(
        observer for observer in observer_set if observer == event or (event, observer) in order
    )


def same_observation_signature(
    events: Sequence[str],
    order: Relation,
    observers: Iterable[str],
    left: str,
    right: str,
) -> bool:
    """Two events have the same observed past and future signatures."""
    return past_signature(events, order, observers, left) == past_signature(
        events, order, observers, right
    ) and future_signature(events, order, observers, left) == future_signature(
        events, order, observers, right
    )


def observer_family_separating(
    events: Sequence[str],
    order: Relation,
    observers: Iterable[str],
) -> bool:
    """An observer family separates events when equal signatures force equality."""
    return all(
        left == right
        for left in events
        for right in events
        if same_observation_signature(events, order, observers, left, right)
    )


def past_signature_mono(
    events: Sequence[str],
    order: Relation,
    observers: Iterable[str],
    left: str,
    right: str,
) -> bool:
    """Past signatures grow along reflexive causal precedence."""
    if not (left == right or (left, right) in order):
        msg = "left must causally precede right"
        raise ValueError(msg)
    return past_signature(events, order, observers, left) <= past_signature(
        events, order, observers, right
    )


def future_signature_antimono(
    events: Sequence[str],
    order: Relation,
    observers: Iterable[str],
    left: str,
    right: str,
) -> bool:
    """Future signatures shrink along reflexive causal precedence."""
    if not (left == right or (left, right) in order):
        msg = "left must causally precede right"
        raise ValueError(msg)
    return future_signature(events, order, observers, right) <= future_signature(
        events, order, observers, left
    )


def full_light_observation_reconstructs_causal_order(
    events: Sequence[str],
    order: Relation,
) -> LightObservationWitness:
    """Bundle the full-observer causal-order reconstruction theorem."""
    observers = full_observers(events)
    reflexive_pairs = tuple(
        (left, right)
        for left in events
        for right in events
        if left == right or (left, right) in order
    )
    return LightObservationWitness(
        full_observers_separate=observer_family_separating(events, order, observers),
        past_signatures_recover_order=all(
            (left in past_signature(events, order, observers, right))
            == (left == right or (left, right) in order)
            for left in events
            for right in events
        ),
        future_signatures_recover_order=all(
            (right in future_signature(events, order, observers, left))
            == (left == right or (left, right) in order)
            for left in events
            for right in events
        ),
        past_signatures_monotone=all(
            past_signature_mono(events, order, observers, left, right)
            for left, right in reflexive_pairs
        ),
        future_signatures_antimonotone=all(
            future_signature_antimono(events, order, observers, left, right)
            for left, right in reflexive_pairs
        ),
    )


def region_le(events: Sequence[str], lower: Iterable[str], upper: Iterable[str]) -> bool:
    """Region inclusion as subset inclusion over the event carrier."""
    event_set = frozenset(events)
    lower_region = frozenset(lower)
    upper_region = frozenset(upper)
    _require_subset(event_set, lower_region)
    _require_subset(event_set, upper_region)
    return lower_region <= upper_region


def region_le_refl(events: Sequence[str], region: Iterable[str]) -> bool:
    """Region inclusion is reflexive."""
    return region_le(events, region, region)


def region_le_trans(
    events: Sequence[str],
    lower: Iterable[str],
    middle: Iterable[str],
    upper: Iterable[str],
) -> bool:
    """Region inclusion is transitive."""
    if not region_le(events, lower, middle):
        msg = "lower region must be included in middle region"
        raise ValueError(msg)
    if not region_le(events, middle, upper):
        msg = "middle region must be included in upper region"
        raise ValueError(msg)
    return region_le(events, lower, upper)


def future_closed_region(events: Sequence[str], order: Relation, region: Iterable[str]) -> bool:
    """A region is future-closed when it is closed under causal precedence."""
    return is_future_closed_section(events, order, region)


def diamond_region(events: Sequence[str], order: Relation, lower: str, upper: str) -> Section:
    """The closed causal diamond ``{x | lower <= x <= upper}``."""
    return alexandrov_interval(events, order, lower, upper)


def spacelike_regions(
    events: Sequence[str],
    order: Relation,
    left: Iterable[str],
    right: Iterable[str],
) -> bool:
    """Two regions are pairwise spacelike."""
    event_set = frozenset(events)
    left_region = frozenset(left)
    right_region = frozenset(right)
    _require_subset(event_set, left_region)
    _require_subset(event_set, right_region)
    _require_relation_on(event_set, order)
    return all(
        not (x == y or (x, y) in order) and not (x == y or (y, x) in order)
        for x in left_region
        for y in right_region
    )


def spacelike_regions_symmetric(
    events: Sequence[str],
    order: Relation,
    left: Iterable[str],
    right: Iterable[str],
) -> bool:
    """Spacelike region separation is symmetric."""
    if not spacelike_regions(events, order, left, right):
        msg = "regions must be spacelike separated"
        raise ValueError(msg)
    return spacelike_regions(events, order, right, left)


def spacelike_regions_disjoint(
    events: Sequence[str],
    order: Relation,
    left: Iterable[str],
    right: Iterable[str],
) -> bool:
    """Spacelike regions are disjoint because causal precedence is reflexive."""
    if not spacelike_regions(events, order, left, right):
        msg = "regions must be spacelike separated"
        raise ValueError(msg)
    return frozenset(left).isdisjoint(frozenset(right))


def closed_diamond_mono(
    events: Sequence[str],
    order: Relation,
    lower: str,
    upper: str,
    wider_lower: str,
    wider_upper: str,
) -> bool:
    """Closed diamonds are monotone when the endpoints widen."""
    if not (wider_lower == lower or (wider_lower, lower) in order):
        msg = "wider lower endpoint must causally precede the lower endpoint"
        raise ValueError(msg)
    if not (upper == wider_upper or (upper, wider_upper) in order):
        msg = "upper endpoint must causally precede the wider upper endpoint"
        raise ValueError(msg)
    return diamond_region(events, order, lower, upper) <= diamond_region(
        events, order, wider_lower, wider_upper
    )


def causal_net_region_theory(events: Sequence[str], order: Relation) -> CausalNetWitness:
    """Bundle the finite causal-net region theorem."""
    regions = _powerset(tuple(events))
    comparable_triples = tuple(
        (lower, middle, upper)
        for lower in regions
        for middle in regions
        for upper in regions
        if lower <= middle <= upper
    )
    spacelike_pairs = tuple(
        (left, right)
        for left in regions
        for right in regions
        if spacelike_regions(events, order, left, right)
    )
    causal_pairs = tuple(
        (left, right)
        for left in events
        for right in events
        if left == right or (left, right) in order
    )
    return CausalNetWitness(
        region_inclusion_preorder=all(region_le_refl(events, region) for region in regions)
        and all(
            region_le_trans(events, lower, middle, upper)
            for lower, middle, upper in comparable_triples
        ),
        spacelike_regions_symmetric=all(
            spacelike_regions_symmetric(events, order, left, right)
            for left, right in spacelike_pairs
        ),
        spacelike_regions_disjoint=all(
            spacelike_regions_disjoint(events, order, left, right)
            for left, right in spacelike_pairs
        ),
        closed_diamonds_monotone=all(
            closed_diamond_mono(events, order, lower, upper, wider_lower, wider_upper)
            for wider_lower, lower in causal_pairs
            for upper, wider_upper in causal_pairs
        ),
    )


def causally_precedes(order: Relation, a: str, b: str) -> bool:
    """``a ≺ b`` in the (settled) causal order — ``b`` is in ``a``'s future cone."""
    return (a, b) in order


def future(events: Sequence[str], order: Relation, e: str) -> frozenset[str]:
    """The future light cone ``{x : e ≺ x}``."""
    return frozenset(x for x in events if (e, x) in order)


def past(events: Sequence[str], order: Relation, e: str) -> frozenset[str]:
    """The past light cone ``{x : x ≺ e}``."""
    return frozenset(x for x in events if (x, e) in order)


def alexandrov_interval(events: Sequence[str], order: Relation, p: str, q: str) -> frozenset[str]:
    """The Alexandrov interval (causal diamond) ``[p,q] = {x : p ≼ x ≼ q}`` (endpoints included)."""
    return frozenset(
        x for x in events if (x == p or (p, x) in order) and (x == q or (x, q) in order)
    )


def _report_at(report: ConeReport, left: str, right: str) -> Charge:
    return report.get((left, right), four().none)


def _prec_holds(prec: Relation | Callable[[str, str], bool], left: str, right: str) -> bool:
    return (left, right) in prec if isinstance(prec, frozenset) else prec(left, right)


def _require_subset(events: Section, section: Section) -> None:
    if not section <= events:
        msg = "section contains an unknown event"
        raise ValueError(msg)


def _require_relation_on(events: Section, order: Relation) -> None:
    if any(left not in events or right not in events for left, right in order):
        msg = "causal order mentions an unknown event"
        raise ValueError(msg)


def _powerset(events: tuple[str, ...]) -> tuple[Section, ...]:
    return tuple(
        frozenset(subset)
        for size in range(len(events) + 1)
        for subset in combinations(events, size)
    )
