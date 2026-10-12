"""Golden-value regression tests ported from the Lean conformance suite.

Source: ``lib/obsmetrologia/conformance/ConformanceVectors.lean`` (the live,
fully-proven Obsmetrologia library — one ``sorry`` total, in unrelated Collatz
territory; zero ``axiom``/``opaque`` declarations; the sheaf/consistency/
cohomology surface this package mirrors is fully proven ground truth).

**Naming convention in force throughout — the evidence reading, ruled
2026-08-05** (``lib/obsmetrologia/docs/history/corner-naming-convention.md``):
``absurd`` = ⊥ₖ = told none (the initial cell); ``potential`` = t = told true
(``(yes, no)``); ``active`` = f = told false (``(no, yes)``); ``stable`` = ⊤ₖ =
told both (``(yes, yes)``, the ≤ₖ-*absorbing* point — contradiction is
*stable*, not absurd). This is the opposite rotation from the old RelMath
ancestor (``potential`` = initial, ``absurd`` = both-told); pymetrologic's own
``quartet.py``/``bilattice.py``/``positing.py`` were audited against this
ruling and already implement the evidence reading correctly (see the
``predicating.py`` fix in the same change that added this file, which *was*
carrying the drift: its domain guard checked ``Corner.ABSURD`` where the ruling
requires ``Corner.POTENTIAL``).

Each vector below is named for the Lean fact it locks down (cited in its
docstring) and states, in one line, what would break if it stopped holding —
the same discipline as the Lean original: a concrete value pins the exact
constant, not just the shape of a universally-quantified theorem, which is
exactly the kind of regression the corner-naming-convention drift shows can
happen silently.

**What is ported.** Every Lean vector that has a direct, already-existing
Python analogue:

* the ``Charge`` table's load-bearing corners — ``kBot`` as the ``joinK`` unit,
  ``kTop`` as the ``joinK``-absorbing top, ``negate`` fixing the knowledge poles
  and swapping the truth poles (``pymetrologic.positing.charge_join_k`` /
  ``charge_negate`` operate on ``Corner`` directly, since ``Charge := Corner``
  in both the Lean and the Python);
* the ``Corner`` ↔ status round-trip (``pymetrologic.quartet.corner_of_status`` /
  ``status_of_corner``);
* ``ArticulationMeasure.measure`` at all four cell shapes, plus the freshly-
  initial cell measuring to ``kBot`` (``pymetrologic.articulating_primitives``'
  ``ArticulationCell.corner`` property and ``initial_articulation_cell``).

**What is not yet realized — no Python-side analogue exists, so nothing is
ported rather than inventing API to carry it:**

* ``Valuation.posit`` / ``positList`` algebra (point-mass update reading back at
  a claim, non-leakage to other claims, same-claim join to ``⊤ₖ``,
  ``positList`` permutation invariance) — pymetrologic has no ``posit`` /
  ``positList`` function; ``positing.py`` only has whole-valuation
  ``valuation_join_k``, not a single-claim point-mass update.
* ``Valuation.contesting`` / ``Valuation.phase`` (reading a speech-act name back
  as a corner) — no ``contesting``/``phase`` functions exist.
* ``Predicating.Guarded`` (``Cell.predicatingOf``) and ``Predicating.SiblingSeed``
  (``PredicationCell.composeSeeds``, on- and off-diagonal) — pymetrologic's
  ``predicating.py`` has the unguarded ``predicating``/``seed`` but no
  ``composeSeeds`` or corner-guarded constructor.

If any of the above gain a Python realization, port their vectors here rather
than leaving this list to silently go stale.
"""

from __future__ import annotations

from pymetrologic.articulating_primitives import (
    ArticulationCell,
    Mark,
    Utterance,
    initial_articulation_cell,
)
from pymetrologic.positing import Charge, charge_join_k, charge_negate
from pymetrologic.quartet import Corner, corner_of_status, status_of_corner

# --------------------------------------------------------------------------- #
# Charge table — the load-bearing corners.
# Lean: ConformanceVectors.lean lines 62-102 ("Charge table — the load-bearing
# corners"). Charge := Corner in both the Lean and here, so charge_join_k /
# charge_negate operate directly on Corner values.
# --------------------------------------------------------------------------- #


def test_kbot_is_joink_left_identity_at_potential() -> None:
    """``Charge.joinK kBot tTop = tTop`` — guards ``Charge.joinK_kBot`` (and,
    transitively, "abstaining is a no-op") at ``potential``, concretely."""
    assert charge_join_k(Corner.ABSURD, Corner.POTENTIAL) is Corner.POTENTIAL


def test_kbot_is_joink_left_identity_at_active() -> None:
    """The other truth-pole: the unit law pinned on both sides of the truth axis."""
    assert charge_join_k(Corner.ABSURD, Corner.ACTIVE) is Corner.ACTIVE


def test_kbot_is_joink_left_identity_at_stable() -> None:
    """The unit law holds even at the top of the knowledge order."""
    assert charge_join_k(Corner.ABSURD, Corner.STABLE) is Corner.STABLE


def test_ktop_absorbs_joink_from_potential() -> None:
    """``Charge.joinK kTop tTop = kTop`` — guards ``Charge.leK_kTop``'s partner
    fact (``⊤ₖ`` is ``joinK``-absorbing) at a concrete pair."""
    assert charge_join_k(Corner.STABLE, Corner.POTENTIAL) is Corner.STABLE


def test_ktop_absorbs_joink_from_active() -> None:
    """The other truth-pole."""
    assert charge_join_k(Corner.STABLE, Corner.ACTIVE) is Corner.STABLE


def test_ktop_absorbs_joink_from_absurd() -> None:
    """The seed itself cannot escape absorption once joined against ``⊤ₖ``."""
    assert charge_join_k(Corner.STABLE, Corner.ABSURD) is Corner.STABLE


def test_negate_fixes_absurd() -> None:
    """``Charge.negate kBot = kBot`` — the initial corner is not on the truth
    axis ``negate`` swaps."""
    assert charge_negate(Corner.ABSURD) is Corner.ABSURD


def test_negate_fixes_stable() -> None:
    """The held-contradiction corner is likewise off the truth axis."""
    assert charge_negate(Corner.STABLE) is Corner.STABLE


def test_negate_swaps_potential_to_active() -> None:
    """``Charge.negate tTop = tBot`` — told-true and told-false trade places
    under negation, the FOUR-object's Klein symmetry."""
    assert charge_negate(Corner.POTENTIAL) is Corner.ACTIVE


def test_negate_swaps_active_to_potential() -> None:
    """The other direction of the same swap."""
    assert charge_negate(Corner.ACTIVE) is Corner.POTENTIAL


# --------------------------------------------------------------------------- #
# Corner <-> status round-trip.
# Lean: ConformanceVectors.lean lines 104-118. Guards the evidence-reading
# table itself at the value level: a silent rotation back toward RelMath's old
# convention would fail these first.
# --------------------------------------------------------------------------- #


def test_of_status_false_false_is_absurd() -> None:
    assert corner_of_status(False, False) is Corner.ABSURD


def test_of_status_true_false_is_potential() -> None:
    assert corner_of_status(True, False) is Corner.POTENTIAL


def test_of_status_false_true_is_active() -> None:
    assert corner_of_status(False, True) is Corner.ACTIVE


def test_of_status_true_true_is_stable() -> None:
    assert corner_of_status(True, True) is Corner.STABLE


def test_absurd_to_status_is_false_false() -> None:
    assert status_of_corner(Corner.ABSURD) == (False, False)


def test_potential_to_status_is_true_false() -> None:
    assert status_of_corner(Corner.POTENTIAL) == (True, False)


def test_active_to_status_is_false_true() -> None:
    assert status_of_corner(Corner.ACTIVE) == (False, True)


def test_stable_to_status_is_true_true() -> None:
    assert status_of_corner(Corner.STABLE) == (True, True)


# --------------------------------------------------------------------------- #
# ArticulationMeasure.measure at all four cell shapes.
# Lean: ConformanceVectors.lean lines 120-139. Guards that "measure" reads the
# corner off a cell's own two Bools the same way Corner.ofStatus does, at one
# fixed utterance.
# --------------------------------------------------------------------------- #

_MEASURE_UTTERANCE = Utterance(Mark("measure-token"), Mark("measure-claim"))


def test_measure_absurd() -> None:
    cell = ArticulationCell(_MEASURE_UTTERANCE, token_articulated=False, claim_articulated=False)
    assert cell.corner is Corner.ABSURD


def test_measure_potential() -> None:
    cell = ArticulationCell(_MEASURE_UTTERANCE, token_articulated=True, claim_articulated=False)
    assert cell.corner is Corner.POTENTIAL


def test_measure_active() -> None:
    cell = ArticulationCell(_MEASURE_UTTERANCE, token_articulated=False, claim_articulated=True)
    assert cell.corner is Corner.ACTIVE


def test_measure_stable() -> None:
    cell = ArticulationCell(_MEASURE_UTTERANCE, token_articulated=True, claim_articulated=True)
    assert cell.corner is Corner.STABLE


def test_freshly_initial_cell_measures_to_kbot() -> None:
    """``(Cell.initial u).meme.charge = Charge.kBot`` — guards that "born
    absurd" and "measures to ⊥ₖ" agree, at a concrete cell rather than only
    the ``∀ u`` theorem."""
    cell = initial_articulation_cell(_MEASURE_UTTERANCE)
    assert cell.corner is Corner.ABSURD


def test_charge_is_corner() -> None:
    """``Charge := Corner`` (``abbrev``) — pymetrologic mirrors it as a plain
    type alias; guard that the alias has not drifted into a distinct type."""
    assert Charge is Corner
