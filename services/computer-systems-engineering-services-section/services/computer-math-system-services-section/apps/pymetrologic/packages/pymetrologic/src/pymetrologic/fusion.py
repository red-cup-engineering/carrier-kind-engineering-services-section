"""fusion — multi-agent belief fusion on the existing sheaf machinery.

**Realization-adjacent extension, honestly labeled.** This module composes
proven pieces of the corpus — the knowledge join ``vk`` is commutative,
associative, and idempotent (:mod:`pymetrologic.positing`'s ``charge_join_k``
and :mod:`pymetrologic.bilattice`'s ``Bilattice.join_k``, which is what makes
posit-order independence below a *proven* fact, not a hope), and settling a
``PredicationSheaf`` is the corpus's own least-fixed-point merge
(:mod:`pymetrologic.calculus.sections`). What is **not** a Lean theorem is the
:class:`BeliefBoard` abstraction itself: the star-shaped site (every agent a
face of one shared ``"__board__"`` coface), and — the actual value-add of this
module — keeping each agent's raw posit alongside the settle so that a
conflicted claim can be attributed to the specific agents behind it. No Lean
file proves *that* naming/attribution structure; it is product surface built
on proven joins, not a restated theorem.

## Shape

Agents posit claims: ``agent id x claim key x evidence``. :meth:`BeliefBoard.posit`
records one agent's evidence about one claim; :meth:`BeliefBoard.settle` fuses
every agent's posits into one shared state by the knowledge join, over a
:class:`~pymetrologic.calculus.sheaf.PredicationSheaf`; :meth:`BeliefBoard.state`
reads the fused belief for every claim; :meth:`BeliefBoard.conflicts` reports,
for each contested claim, exactly *which* agents are party to the
disagreement and what each of them posited — the attribution PySheaf-style
scalar consistency cannot give and the corpus's own ``conflict_map`` does not
carry agent identity for (it only knows *cells*, and here every agent's own
posit is folded into one shared board cell before ``conflict_map`` ever runs).

Two fibers are supported, both already in the corpus:

* ``"four"`` (default) — discrete Belnap FOUR (:func:`pymetrologic.bilattice.four`),
  posits are :data:`pymetrologic.readouts.FourValued` corners.
* ``"graded"`` — the continuous ``[0, 1]`` fiber
  (:func:`pymetrologic.bilattice.unit_interval`), posits are raw
  ``(confidence_for, confidence_against)`` pairs, mirroring
  :func:`pymetrologic.calculus.examples.sensor_fusion_sheaf`.
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping
from dataclasses import dataclass
from typing import Any, Literal

from .bilattice import BL, Bilattice, bilattice, four, unit_interval
from .calculus.sections import settle_assignment
from .calculus.sheaf import PredicationSheaf, Section
from .quartet import Corner, charge_of_corner, corner_of_charge
from .site import Cell, Site

__all__ = ["BeliefBoard", "Conflict", "Regime"]

Regime = Literal["four", "graded"]
_BOARD_CELL: Cell = "__board__"


@dataclass(frozen=True)
class Conflict:
    """One contested claim: which agents disagree, how badly, and what each said.

    ``parties`` names every agent with a non-bottom posit at ``claim`` in the
    settled state's conflict; ``positions`` is the readback of each of their
    raw posits (a :data:`~pymetrologic.readouts.FourValued` corner in the
    ``"four"`` regime, a raw ``(pro, con)`` :class:`~pymetrologic.bilattice.BL`
    pair in ``"graded"``) — the attribution this module adds on top of the
    corpus's own cell-only ``conflict_map``.
    """

    claim: Hashable
    parties: tuple[str, ...]
    degree: object
    positions: Mapping[str, object]


class BeliefBoard:
    """Multi-agent belief fusion: posit, settle, read attributed conflicts.

    See the module docstring for what is proven (the knowledge-join fusion)
    versus what is product surface (the board abstraction and attribution).
    """

    def __init__(self, *, regime: Regime = "four") -> None:
        self._regime: Regime = regime
        self._bl: Bilattice[Any] = four() if regime == "four" else bilattice(unit_interval())
        self._posits: dict[str, dict[Hashable, BL[Any]]] = {}
        self._settled: dict[Hashable, BL[Any]] | None = None

    # -- positing ------------------------------------------------------------ #
    def posit(self, agent: str, claim: Hashable, value: Corner | tuple[float, float]) -> None:
        """Record one agent's evidence about one claim.

        Positing again for the same ``(agent, claim)`` pair **joins** the new
        evidence with whatever that agent already posited there, by the
        proven knowledge join ``vk`` — it does not overwrite. That join is
        commutative and associative (``charge_join_k`` / ``Bilattice.join_k``),
        so the *final* per-agent-per-claim value does not depend on how many
        times, or in what order, one agent's own posits for one claim arrive
        — the same fact that makes the whole board's fused :meth:`state`
        independent of posit order across agents (tested in
        ``test_fusion.py``).
        """
        bl_value = self._as_bl(value)
        by_claim = self._posits.setdefault(agent, {})
        by_claim[claim] = self._bl.join_k(by_claim.get(claim, self._bl.none), bl_value)
        self._settled = None

    def retract(self, agent: str, claim: Hashable) -> None:
        """Withdraw one agent's posit on one claim entirely (back to told-none).

        The repair move: dropping a bad posit, not merely joining in a
        weaker one (join can only climb the knowledge order, never descend
        it — so "I take that back" has to be a real removal, not a posit).
        """
        by_claim = self._posits.get(agent)
        if by_claim is not None:
            by_claim.pop(claim, None)
        self._settled = None

    # -- fusion ---------------------------------------------------------------#
    def settle(self) -> BeliefBoard:
        """Fuse every agent's posits into the shared board state.

        Wraps :func:`pymetrologic.calculus.sections.settle_assignment` over a
        star-shaped site: each agent cell is a face of one shared
        ``"__board__"`` coface, with identity restriction, so the settled
        board state at each claim is exactly the knowledge join of every
        agent's posit at that claim — the corpus's own proven merge, run
        through the corpus's own settling engine. Returns ``self`` so calls
        can chain (``board.settle().state()``); also called lazily by
        :meth:`state` and :meth:`conflicts` if the board has posits since the
        last settle.
        """
        sheaf, assignment = self._sheaf_and_assignment()
        settled, _ = settle_assignment(sheaf, assignment)
        self._settled = settled[_BOARD_CELL]
        return self

    def _sheaf_and_assignment(
        self,
    ) -> tuple[PredicationSheaf, dict[Cell, dict[Hashable, BL[Any]]]]:
        agents = tuple(self._posits)
        claims = self._claims()
        site = Site(cells=(*agents, _BOARD_CELL), faces=tuple((a, _BOARD_CELL) for a in agents))
        stalk_index: dict[Cell, tuple[Hashable, ...]] = {a: claims for a in agents}
        stalk_index[_BOARD_CELL] = claims
        restriction: dict[tuple[Cell, Cell], Any] = {(a, _BOARD_CELL): _identity for a in agents}
        sheaf = PredicationSheaf(
            site=site, bl=self._bl, stalk_index=stalk_index, restriction=restriction
        )
        assignment: dict[Cell, dict[Hashable, BL[Any]]] = {
            a: {claim: self._posits[a].get(claim, self._bl.none) for claim in claims}
            for a in agents
        }
        return sheaf, assignment

    def _claims(self) -> tuple[Hashable, ...]:
        seen: dict[Hashable, None] = {}
        for by_claim in self._posits.values():
            for claim in by_claim:
                seen[claim] = None
        return tuple(seen)

    # -- readout --------------------------------------------------------------#
    def state(self) -> dict[Hashable, Corner] | dict[Hashable, BL[Any]]:
        """The fused, settled belief for every claim.

        In the ``"four"`` regime, each value is read back as a
        :data:`~pymetrologic.readouts.FourValued` corner; in ``"graded"``, the
        raw settled ``(pro, con)`` :class:`~pymetrologic.bilattice.BL` pair.
        """
        settled = self._ensure_settled()
        if self._regime == "four":
            return {claim: corner_of_charge(self._bl, value) for claim, value in settled.items()}
        return dict(settled)

    def conflicts(self) -> tuple[Conflict, ...]:
        """Which claims are contested, and — the attribution — by whom.

        For every claim where the settled board carries conflict
        (``Bilattice.conflict_degree`` nonzero), reports exactly which agents
        posited evidence there and what each of them posited. Not a Lean
        theorem: a direct readback of the per-agent posits kept alongside the
        settle, over the corpus's own proven conflict-degree measure. See the
        module docstring's honesty note.
        """
        settled = self._ensure_settled()
        out: list[Conflict] = []
        for claim, value in settled.items():
            degree = self._bl.conflict_degree(value)
            if degree == self._bl.L.bot:
                continue
            parties = tuple(
                agent
                for agent, by_claim in self._posits.items()
                if claim in by_claim and not self._bl.eq(by_claim[claim], self._bl.none)
            )
            positions: dict[str, object] = (
                {agent: corner_of_charge(self._bl, self._posits[agent][claim]) for agent in parties}
                if self._regime == "four"
                else {agent: self._posits[agent][claim] for agent in parties}
            )
            out.append(Conflict(claim=claim, parties=parties, degree=degree, positions=positions))
        return tuple(out)

    # -- helpers ----------------------------------------------------------- #
    def _ensure_settled(self) -> dict[Hashable, BL[Any]]:
        if self._settled is None:
            self.settle()
        assert self._settled is not None
        return self._settled

    def _as_bl(self, value: Corner | tuple[float, float]) -> BL[Any]:
        if isinstance(value, Corner):
            if self._regime != "four":
                raise TypeError("a FourValued (Corner) posit requires regime='four'")
            return charge_of_corner(self._bl, value)
        if self._regime != "graded":
            raise TypeError("a (pro, con) posit requires regime='graded'")
        pro, con = value
        return BL(pro, con)


def _identity(section: Section[Hashable, Any]) -> dict[Hashable, BL[Any]]:
    return dict(section)
