"""Root predication carrier (``RelMath.Predicating``).

Predicating is the morphism out of a potential articulation cell.  It turns an
utterance into an oriented assertion-position ``(subject, predicate, object)``:
the subject/object positions are token-side marks, and the predicate position is
the claim-side mark.  The four root reindexings are the category-generating
motions used downstream by the fibration and hyperdoctrine modules.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from .articulating_primitives import ArticulationCell, Mark, Utterance
from .quartet import Corner

Entity = Mark
Predicate = Mark
PredicateMap = Callable[[Predicate], Predicate]

__all__ = [
    "Entity",
    "Predicate",
    "PredicateMap",
    "PredicatingRootWitness",
    "PredicationCell",
    "converse",
    "converse_converse_holds",
    "converse_seed_holds",
    "object_projection",
    "object_projection_idem_holds",
    "predicating",
    "predicating_root_witness",
    "seed",
    "specialize",
    "specialize_comp_holds",
    "specialize_id_holds",
    "subject_projection",
    "subject_projection_idem_holds",
]


@dataclass(frozen=True, slots=True)
class PredicationCell:
    """The oriented predication cell ``phi = (subject, predicate, object)``."""

    subject: Entity
    predicate: Predicate
    object: Entity


@dataclass(frozen=True, slots=True)
class PredicatingRootWitness:
    """Executable witness for the root predicating laws."""

    seed_reflexive: bool
    converse_involutive: bool
    converse_seed: bool
    projections_idempotent: bool
    specialize_identity: bool
    specialize_composes: bool
    orientation_real: bool

    @property
    def holds(self) -> bool:
        return (
            self.seed_reflexive
            and self.converse_involutive
            and self.converse_seed
            and self.projections_idempotent
            and self.specialize_identity
            and self.specialize_composes
            and self.orientation_real
        )


def seed(utterance: Utterance) -> PredicationCell:
    """The reflexive oriented triple produced from ``(token, claim)``."""
    return PredicationCell(utterance.token, utterance.claim, utterance.token)


def predicating(cell: ArticulationCell) -> PredicationCell:
    """Predicating proper, defined at the potential articulation cell.

    The domain is the **potential** corner ``(yes, no)`` — token articulated,
    claim not — per the ruled evidence reading
    (``docs/history/corner-naming-convention.md``): "Predicating seeds the
    reflexive triple ⟨token, claim, token⟩, which requires an articulated
    token. Its carrier ``PotentialCell`` is the told-true corner (yes, no) …
    not a contentless (no, no) cell." A cell with no evidence at all is
    ``absurd``, not the domain of this map.
    """
    if cell.corner is not Corner.POTENTIAL:
        msg = "predicating is defined from the potential articulation cell"
        raise ValueError(msg)
    return seed(cell.utterance)


def converse(cell: PredicationCell) -> PredicationCell:
    """Swap subject and object, preserving the predicate coordinate."""
    return PredicationCell(cell.object, cell.predicate, cell.subject)


def subject_projection(cell: PredicationCell) -> PredicationCell:
    """Collapse the object coordinate onto the subject coordinate."""
    return PredicationCell(cell.subject, cell.predicate, cell.subject)


def object_projection(cell: PredicationCell) -> PredicationCell:
    """Collapse the subject coordinate onto the object coordinate."""
    return PredicationCell(cell.object, cell.predicate, cell.object)


def specialize(f: PredicateMap, cell: PredicationCell) -> PredicationCell:
    """Specialize the typed middle coordinate by a predicate map."""
    return PredicationCell(cell.subject, f(cell.predicate), cell.object)


def converse_converse_holds(cell: PredicationCell) -> bool:
    """Lean's ``converse_converse`` law."""
    return converse(converse(cell)) == cell


def converse_seed_holds(utterance: Utterance) -> bool:
    """The seed is reflexive, hence equal to its converse."""
    seeded = seed(utterance)
    return converse(seeded) == seeded


def subject_projection_idem_holds(cell: PredicationCell) -> bool:
    """Subject projection is idempotent."""
    return subject_projection(subject_projection(cell)) == subject_projection(cell)


def object_projection_idem_holds(cell: PredicationCell) -> bool:
    """Object projection is idempotent."""
    return object_projection(object_projection(cell)) == object_projection(cell)


def specialize_id_holds(cell: PredicationCell) -> bool:
    """The identity predicate map specializes to the identity."""
    return specialize(lambda predicate: predicate, cell) == cell


def specialize_comp_holds(f: PredicateMap, g: PredicateMap, cell: PredicationCell) -> bool:
    """Specialization composes by composing predicate maps."""
    return specialize(f, specialize(g, cell)) == specialize(lambda p: f(g(p)), cell)


def predicating_root_witness() -> PredicatingRootWitness:
    """Bundle the finite root predicating checks."""
    token = Mark("entity:a")
    other = Mark("entity:b")
    claim = Mark("predicate:p")
    utterance = Utterance(token, claim)
    reflexive = seed(utterance)
    oriented = PredicationCell(token, claim, other)

    def f(predicate: Predicate) -> Predicate:
        return Mark(f"{predicate.surface}:f")

    def g(predicate: Predicate) -> Predicate:
        return Mark(f"{predicate.surface}:g")

    return PredicatingRootWitness(
        seed_reflexive=reflexive.subject == reflexive.object,
        converse_involutive=converse_converse_holds(oriented),
        converse_seed=converse_seed_holds(utterance),
        projections_idempotent=subject_projection_idem_holds(oriented)
        and object_projection_idem_holds(oriented),
        specialize_identity=specialize_id_holds(oriented),
        specialize_composes=specialize_comp_holds(f, g, oriented),
        orientation_real=oriented.subject != oriented.object and converse(oriented) != oriented,
    )
