"""foam — a 2D cellular foam/community coarsening simulation, and its settling port.

**Extension, honestly labeled — not a restated corpus theorem.** Nothing here is
transcribed from a Lean file. What *is* reused, and load-bearing, is the corpus's
own proven bilattice machinery: the knowledge join ``∨_k`` (:meth:`Bilattice.join_k`,
proven commutative/associative/idempotent) and the conflict measure
(:meth:`Bilattice.conflict_degree`), the same two operations :mod:`pymetrologic.fusion`
uses to settle a :class:`~pymetrologic.fusion.BeliefBoard`. This module applies them
per *foam boundary* instead of per *claim*: each edge's two cells posit evidence
about that boundary, the corpus join fuses the two posits, and the fused
``conflict_degree`` — real disagreement under a proven, idempotent merge, not a
tuned heuristic — drives the settling variant's dynamics. The posit rule itself
(:func:`_posit`), the flux law built on top of it, and the whole cellular/topological
foam model (triangulated cell-adjacency graph, T1 diagonal flips, T2 removal of
3-sided cells) are product surface: physically motivated, but not corpus theorems.

## The model

A dry 2D foam is represented as a **triangulated planar graph** (torus-periodic
here, so it closes without a boundary): cells are graph vertices, a shared
boundary is an edge, and — because every physical foam vertex is 3-valent
(Plateau's law: stable 4-fold vertices do not occur, see the companion note
``2026-08-21-note-on-what-the-foam-knows.md``, Claim 2) — the cell-adjacency
graph's faces are always triangles. That single fact is what makes a **T1
transition** well-defined purely combinatorially: an edge ``(i, j)`` borders
exactly two triangles ``(i, j, a)`` and ``(i, j, b)``, and a T1 event is the
diagonal flip ``i–j ↦ a–b`` (see :func:`try_t1_flip`). A **T2 event** — a cell
vanishing — only ever happens to a 3-sided cell (:func:`try_t2_removal`); a
starving cell with more sides is nudged toward ``n = 3`` first
(:func:`_shrink_one_side`), matching how a real foam cell must lose sides
before it can disappear.

Two area laws are implemented over the same topology engine:

* :func:`run_von_neumann` — the reference law ``dA_i/dt = k(n_i − 6)``, an exact
  theorem of 2D dry-foam coarsening (von Neumann 1952 / Mullins 1956). Each
  cell's own side-count alone sets its rate.
* :func:`run_settling` — the SETTLING variant: no cell consults its own
  ``n`` directly. Instead each boundary carries a bilattice charge, settled by
  the corpus's own knowledge join, and area flows edge-by-edge in proportion
  to that boundary's settled conflict (see :func:`edge_charge`,
  :func:`settling_area_step`). Whether the *aggregate*, emergent behavior of
  this edge-local settling process reproduces the von Neumann law is an
  empirical question this module is built to answer, not an assumption —
  see the companion results note for the measured verdict.

Both variants share one topology engine (:func:`try_t1_flip`,
:func:`try_t2_removal`) but differ in *when* a T1 fires: the reference variant
uses a geometric length proxy (:func:`_geometric_t1_candidates`, ``length ≈
√(A/n)``, standard for a topological network model with no explicit vertex
positions); the settling variant fires where the settled boundary conflict
exceeds a threshold (:func:`_settling_t1_candidates`) — tension, not geometry,
triggers the topology change.
"""

from __future__ import annotations

import math
import random
from collections.abc import Callable, Iterator, Sequence
from dataclasses import dataclass, field

from .bilattice import BL, Bilattice, unit_interval

__all__ = [
    "AboavWeaireFit",
    "Foam",
    "SimulationResult",
    "T1Event",
    "T2Event",
    "VonNeumannFit",
    "aboav_weaire_fit",
    "common_neighbors",
    "edge_charge",
    "run_settling",
    "run_von_neumann",
    "scramble_topology",
    "t1_avalanche_sizes",
    "triangular_torus",
    "try_t1_flip",
    "try_t2_removal",
    "von_neumann_law_fit",
]

CellId = int

_AXIAL_OFFSETS: tuple[tuple[int, int], ...] = ((1, 0), (-1, 0), (0, 1), (0, -1), (1, -1), (-1, 1))


# --------------------------------------------------------------------------- #
# The foam: cells, neighbor graph, areas
# --------------------------------------------------------------------------- #
@dataclass
class Foam:
    """A dry 2D cellular foam: cells with a neighbor graph and per-cell area.

    ``neighbors`` is a symmetric adjacency (``j in neighbors[i]`` iff ``i in
    neighbors[j]``) whose faces are triangles — see the module docstring. This
    is a *community* model too: read "cell" as "community," "shared boundary"
    as "contested border," and everything below ports unchanged (the port this
    module exists to test is exactly that reading, applied to belief dynamics
    rather than geometry).
    """

    neighbors: dict[CellId, set[CellId]]
    area: dict[CellId, float]

    def n(self, i: CellId) -> int:
        """The number of sides (neighbors) of cell ``i``."""
        return len(self.neighbors[i])

    def cells(self) -> tuple[CellId, ...]:
        return tuple(self.neighbors)

    def edges(self) -> Iterator[tuple[CellId, CellId]]:
        """Every undirected edge once, as ``(min(i, j), max(i, j))``."""
        seen: set[tuple[CellId, CellId]] = set()
        for i, nbrs in self.neighbors.items():
            for j in nbrs:
                key = (i, j) if i < j else (j, i)
                if key not in seen:
                    seen.add(key)
                    yield key

    def edge_count(self) -> int:
        return sum(1 for _ in self.edges())

    def total_area(self) -> float:
        return sum(self.area.values())

    def handshake_ok(self) -> bool:
        """The handshake lemma (see :mod:`pymetrologic.graph`), reused as a
        structural invariant: ``Σ n_i = 2|E|``, true of any finite graph and
        checked here after every mutation as a consistency guard."""
        return sum(self.n(i) for i in self.neighbors) == 2 * self.edge_count()

    def euler_defect(self) -> int:
        """``Σ (n_i − 6)`` — exactly ``0`` for any triangulation of the torus
        (Euler characteristic ``χ = 0``: ``V − E + F = 0`` with ``F = 2E/3``
        forces ``E = 3V``, hence ``Σ n_i = 2E = 6V``). T1 flips and T2 removals
        both preserve it exactly; this is the topological reason the
        aggregate von Neumann rate ``Σ k(n_i − 6)`` is identically zero at
        every step of :func:`run_von_neumann`, not merely on average."""
        return sum(self.n(i) - 6 for i in self.neighbors)

    def copy(self) -> Foam:
        return Foam(neighbors={i: set(s) for i, s in self.neighbors.items()}, area=dict(self.area))


def common_neighbors(foam: Foam, i: CellId, j: CellId) -> set[CellId]:
    return foam.neighbors[i] & foam.neighbors[j]


# --------------------------------------------------------------------------- #
# Construction
# --------------------------------------------------------------------------- #
def triangular_torus(rows: int, cols: int, *, area: float = 1.0) -> Foam:
    """A perfectly regular foam: the triangular lattice on an ``rows × cols``
    torus, every cell six-sided. This is the von Neumann law's fixed point
    (every ``n_i = 6``, so ``dA_i/dt = 0`` identically) — the natural quiescent
    starting point before :func:`scramble_topology` introduces the topological
    disorder any real foam has.
    """
    if rows < 6 or cols < 6:
        raise ValueError("rows and cols must each be >= 6 to avoid wraparound self/multi-edges")

    def cid(r: int, c: int) -> CellId:
        return (r % rows) * cols + (c % cols)

    neighbors: dict[CellId, set[CellId]] = {}
    for r in range(rows):
        for c in range(cols):
            i = cid(r, c)
            neighbors[i] = {cid(r + dr, c + dc) for dr, dc in _AXIAL_OFFSETS}
    return Foam(neighbors=neighbors, area={i: area for i in neighbors})


def scramble_topology(foam: Foam, *, flips: int, rng: random.Random, min_n: int = 3) -> Foam:
    """Apply ``flips`` random valid T1 diagonal flips to seed topological
    disorder (a realistic spread of side-counts around 6) before measurement
    begins. Each flip conserves :meth:`Foam.euler_defect` exactly (``−1, −1,
    +1, +1``), so the disordered foam still satisfies ``Σ n_i = 6·|cells|``.
    """
    f = foam.copy()
    done = 0
    attempts = 0
    max_attempts = max(flips * 50, 200)
    cells = f.cells()
    while done < flips and attempts < max_attempts:
        attempts += 1
        i = rng.choice(cells)
        nbrs = f.neighbors[i]
        if not nbrs:
            continue
        j = rng.choice(tuple(nbrs))
        if try_t1_flip(f, i, j, min_n=min_n) is not None:
            done += 1
    return f


# --------------------------------------------------------------------------- #
# Topology changes: T1 (diagonal flip) and T2 (3-sided cell vanishes)
# --------------------------------------------------------------------------- #
def try_t1_flip(
    foam: Foam, i: CellId, j: CellId, *, min_n: int = 3
) -> tuple[CellId, CellId] | None:
    """Attempt the T1 diagonal flip on edge ``(i, j)``.

    If ``(i, j)`` borders exactly two triangles ``(i, j, a)`` and ``(i, j,
    b)`` — i.e. ``i`` and ``j`` have exactly two common neighbors — replace
    edge ``i–j`` with edge ``a–b``: ``i`` and ``j`` each lose a side, ``a`` and
    ``b`` each gain one. Returns ``(a, b)`` on success; ``None`` if the edge
    does not exist, is not a clean two-triangle edge (0, 1, or ≥3 common
    neighbors — the flip is only combinatorially well-defined for exactly
    two), the flip would already-duplicate edge ``a–b``, or it would drop
    ``i`` or ``j`` below ``min_n`` sides (a cell can vanish, per Plateau's
    law, only once it is a triangle — see :func:`try_t2_removal` — never by a
    T1 flip cutting it below three sides).
    """
    if i not in foam.neighbors or j not in foam.neighbors.get(i, ()):
        return None
    common = common_neighbors(foam, i, j)
    if len(common) != 2:
        return None
    a, b = tuple(common)
    if b in foam.neighbors[a]:
        return None
    if foam.n(i) - 1 < min_n or foam.n(j) - 1 < min_n:
        return None
    foam.neighbors[i].discard(j)
    foam.neighbors[j].discard(i)
    foam.neighbors[a].add(b)
    foam.neighbors[b].add(a)
    return (a, b)


def try_t2_removal(foam: Foam) -> Iterator[CellId]:
    """Yield-as-it-happens: remove every current 3-sided cell.

    A 3-sided cell's three neighbors already form a triangle among
    themselves (the two triangular faces flanking each of the cell's three
    edges force it), so removing the cell needs no re-triangulation: delete
    its vertex and its three edges, and the neighbor triangle becomes one new
    face. The vanished cell's (necessarily tiny, since T2 only fires at the
    area floor) leftover area is redistributed equally to its former
    neighbors, conserving total foam area through the event.
    """
    for i in tuple(foam.cells()):
        if foam.n(i) != 3:
            continue
        nbrs = tuple(foam.neighbors[i])
        leftover = foam.area.pop(i)
        del foam.neighbors[i]
        for x in nbrs:
            foam.neighbors[x].discard(i)
        if nbrs:
            share = leftover / len(nbrs)
            for x in nbrs:
                foam.area[x] = foam.area.get(x, 0.0) + share
        yield i


def _shrink_one_side(foam: Foam, i: CellId) -> bool:
    """A cell starving (at the area floor) with more than three sides must
    lose one before it can vanish (see the module docstring); try each of its
    edges for a valid T1 flip that reduces ``i``'s own side count, stopping
    at the first that works. Returns whether one was found."""
    return any(try_t1_flip(foam, i, j) is not None for j in tuple(foam.neighbors.get(i, ())))


# --------------------------------------------------------------------------- #
# Reference dynamics: the von Neumann-Mullins law
# --------------------------------------------------------------------------- #
def von_neumann_area_step(foam: Foam, *, k: float, dt: float) -> dict[CellId, float]:
    """``dA_i/dt = k(n_i − 6)``, explicit Euler."""
    return {i: foam.area[i] + k * (foam.n(i) - 6) * dt for i in foam.cells()}


def _geometric_t1_candidates(foam: Foam, *, ell_min: float) -> list[tuple[CellId, CellId]]:
    """Reference-variant T1 trigger: a crude edge-length proxy ``length_i ≈
    √(A_i/n_i)`` (a cell's area divided among its sides, standard for a
    topological network model with no tracked vertex positions). An edge
    whose two sides' proxy lengths average below ``ell_min`` is offered as a
    T1 candidate — the honest stand-in, here, for "this boundary has
    shrunk to nothing."""
    out: list[tuple[CellId, CellId]] = []
    for i, j in foam.edges():
        li = math.sqrt(max(foam.area[i], 1e-9) / foam.n(i))
        lj = math.sqrt(max(foam.area[j], 1e-9) / foam.n(j))
        if (li + lj) / 2.0 < ell_min:
            out.append((i, j))
    return out


# --------------------------------------------------------------------------- #
# Settling dynamics: bilattice boundary charges, the corpus's own join
# --------------------------------------------------------------------------- #
def _posit(bl: Bilattice[float], n_i: int) -> BL[float]:
    """One cell's evidence about its own boundaries — not a corpus theorem, the
    physically-motivated posit rule the settling variant is built on. ``pro``
    is evidence this cell's boundaries are stable (``n`` close to six);
    ``con`` is evidence of curvature-driven tension (``n`` far from six).
    Mirrors how a real agent in :mod:`pymetrologic.fusion` posits evidence for
    a claim — here the "claim" is "this boundary is settled."
    """
    deviation = min(1.0, abs(n_i - 6) / 6.0)
    return BL(pro=1.0 - deviation, con=deviation)


def edge_charge(bl: Bilattice[float], foam: Foam, i: CellId, j: CellId) -> BL[float]:
    """The settled charge for boundary ``(i, j)``: each side's :func:`_posit`,
    fused by the corpus's proven knowledge join ``∨_k``
    (:meth:`Bilattice.join_k`) — the identical operation
    :meth:`pymetrologic.fusion.BeliefBoard.settle` runs per claim, applied here
    directly per edge (skipping the full site/sheaf machinery, which is
    unneeded for a two-party join and would be run once per edge per step —
    same proven join, cheaper path).
    """
    return bl.join_k(_posit(bl, foam.n(i)), _posit(bl, foam.n(j)))


def settling_area_step(
    foam: Foam, bl: Bilattice[float], *, k: float, dt: float
) -> dict[CellId, float]:
    """The SETTLING variant's area law.

    No cell consults its own ``n`` to set its rate. Instead, for every edge
    ``(i, j)``, the settled boundary charge's ``conflict_degree`` (``pro ∧
    con`` — how much that boundary's fused evidence disputes itself) sets a
    flux, directed toward whichever side currently has *more* sides (the
    reference law's own direction — many-sided cells grow, ``sign(n_i − n_j)``):

    ``dA_i/dt = k · Σ_j  conflict_degree(edge_charge(i, j)) · sign(n_i − n_j)``

    This is antisymmetric in ``(i, j)`` by construction, so summed over the
    whole foam one settling step conserves total area exactly — a stronger,
    edge-local invariant than the reference law's aggregate conservation
    (which holds only via :meth:`Foam.euler_defect`, a global count, not an
    edge-by-edge one). Whether this edge-local, conflict-weighted rule
    reproduces the *same* per-cell ``(n − 6)`` law in aggregate is exactly
    what :func:`run_settling` plus :func:`von_neumann_law_fit` measure.
    """
    delta: dict[CellId, float] = dict.fromkeys(foam.cells(), 0.0)
    for i, j in foam.edges():
        charge = edge_charge(bl, foam, i, j)
        tension = bl.conflict_degree(charge)
        ni, nj = foam.n(i), foam.n(j)
        if ni == nj or tension == 0.0:
            continue
        # i gains from j when i is the more-sided cell (sign(n_i - n_j)),
        # matching the reference law's direction (many-sided cells grow).
        sign = 1.0 if ni > nj else -1.0
        flux = k * tension * sign
        delta[i] += flux
        delta[j] -= flux
    return {i: foam.area[i] + delta[i] * dt for i in foam.cells()}


def _settling_t1_candidates(
    foam: Foam, bl: Bilattice[float], *, conflict_min: float
) -> list[tuple[CellId, CellId]]:
    """Settling-variant T1 trigger: fire where the settled boundary conflict
    exceeds ``conflict_min`` — tension born of the bilattice join, not
    geometry, decides which boundaries swap."""
    out: list[tuple[CellId, CellId]] = []
    for i, j in foam.edges():
        if bl.conflict_degree(edge_charge(bl, foam, i, j)) > conflict_min:
            out.append((i, j))
    return out


# --------------------------------------------------------------------------- #
# Running a simulation
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class T1Event:
    step: int
    edge: tuple[CellId, CellId]
    new_edge: tuple[CellId, CellId]


@dataclass(frozen=True)
class T2Event:
    step: int
    cell: CellId


@dataclass
class SimulationResult:
    """Everything :func:`run_von_neumann`/:func:`run_settling` measured.

    ``rate_samples`` is every ``(n_i, observed dA_i/dt)`` pair from every
    step (feeds :func:`von_neumann_law_fit`); ``neighbor_samples`` is every
    ``(n_i, n_j)`` ordered pair read off the live edge set at each recorded
    step (feeds :func:`aboav_weaire_fit`); ``t1_events``/``t2_events`` are the
    full topology-change logs (feed :func:`t1_avalanche_sizes`).
    """

    foam: Foam
    rate_samples: list[tuple[int, float]] = field(default_factory=list)
    neighbor_samples: list[tuple[int, int]] = field(default_factory=list)
    t1_events: list[T1Event] = field(default_factory=list)
    t2_events: list[T2Event] = field(default_factory=list)
    steps_run: int = 0
    total_area_history: list[float] = field(default_factory=list)


def _run(
    foam0: Foam,
    step_fn: Callable[[Foam], dict[CellId, float]],
    trigger_fn: Callable[[Foam], Sequence[tuple[CellId, CellId]]],
    *,
    steps: int,
    dt: float,
    area_min: float,
    neighbor_sample_every: int,
) -> SimulationResult:
    foam = foam0.copy()
    result = SimulationResult(foam=foam)
    for step in range(steps):
        n_before = {i: foam.n(i) for i in foam.cells()}
        area_before = dict(foam.area)
        new_area = step_fn(foam)
        floor = area_min * 0.1
        for i in foam.cells():
            rate = (new_area[i] - area_before[i]) / dt
            result.rate_samples.append((n_before[i], rate))
            foam.area[i] = max(new_area[i], floor)

        for i in try_t2_removal(foam):
            result.t2_events.append(T2Event(step=step, cell=i))

        for i in tuple(foam.cells()):
            if foam.area.get(i, area_min + 1.0) <= area_min and foam.n(i) > 3:
                _shrink_one_side(foam, i)

        for i, j in trigger_fn(foam):
            new_edge = try_t1_flip(foam, i, j)
            if new_edge is not None:
                result.t1_events.append(T1Event(step=step, edge=(i, j), new_edge=new_edge))

        if step % neighbor_sample_every == 0:
            for i, j in foam.edges():
                result.neighbor_samples.append((foam.n(i), foam.n(j)))
                result.neighbor_samples.append((foam.n(j), foam.n(i)))

        result.total_area_history.append(foam.total_area())

    result.steps_run = steps
    return result


def run_von_neumann(
    foam0: Foam,
    *,
    steps: int,
    k: float = 0.05,
    dt: float = 1.0,
    ell_min: float = 0.35,
    area_min: float = 0.05,
    neighbor_sample_every: int = 5,
) -> SimulationResult:
    """Run the reference von Neumann-Mullins simulation for ``steps`` Euler
    steps: area evolves by :func:`von_neumann_area_step`, T1 events fire by
    the geometric proxy :func:`_geometric_t1_candidates`, T2 events remove
    3-sided cells at the area floor."""
    return _run(
        foam0,
        lambda f: von_neumann_area_step(f, k=k, dt=dt),
        lambda f: _geometric_t1_candidates(f, ell_min=ell_min),
        steps=steps,
        dt=dt,
        area_min=area_min,
        neighbor_sample_every=neighbor_sample_every,
    )


def run_settling(
    foam0: Foam,
    *,
    steps: int,
    k: float = 0.3,
    dt: float = 1.0,
    conflict_min: float = 0.5,
    area_min: float = 0.05,
    neighbor_sample_every: int = 5,
    bl: Bilattice[float] | None = None,
) -> SimulationResult:
    """Run the SETTLING variant for ``steps`` Euler steps: area evolves by
    :func:`settling_area_step` (bilattice-conflict-weighted edge flux), T1
    events fire where :func:`_settling_t1_candidates` finds settled boundary
    conflict above ``conflict_min``, T2 events remove 3-sided cells at the
    area floor exactly as in :func:`run_von_neumann`.
    """
    bilat = bl if bl is not None else Bilattice(unit_interval())
    return _run(
        foam0,
        lambda f: settling_area_step(f, bilat, k=k, dt=dt),
        lambda f: _settling_t1_candidates(f, bilat, conflict_min=conflict_min),
        steps=steps,
        dt=dt,
        area_min=area_min,
        neighbor_sample_every=neighbor_sample_every,
    )


# --------------------------------------------------------------------------- #
# Measurement
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class VonNeumannFit:
    """A linear fit of mean ``dA/dt`` against ``n``, tested against the
    theorem's exact values (slope ``k``, intercept ``−6k``)."""

    by_n: dict[int, float]
    slope: float
    intercept: float
    r_squared: float
    predicted_root: float  # where the fit crosses zero; theorem says exactly 6


def von_neumann_law_fit(samples: Sequence[tuple[int, float]]) -> VonNeumannFit:
    """Fit mean observed ``dA/dt`` per side-count ``n`` to a line.

    The exact theorem is ``dA/dt = k(n − 6)``: slope ``k``, intercept
    ``−6k``, and — the single most legible check — the fitted line's root
    should land at ``n = 6`` regardless of ``k``. Returns the per-``n``
    means along with the fit so both the raw and summarized shape of the
    data are available to report.
    """
    grouped: dict[int, list[float]] = {}
    for n, rate in samples:
        grouped.setdefault(n, []).append(rate)
    by_n = {n: sum(rates) / len(rates) for n, rates in grouped.items()}
    ns = sorted(by_n)
    xs = [float(n) for n in ns]
    ys = [by_n[n] for n in ns]
    slope, intercept = _linear_fit(xs, ys)
    r2 = _r_squared(xs, ys, slope, intercept)
    root = -intercept / slope if slope != 0.0 else math.nan
    return VonNeumannFit(
        by_n=by_n, slope=slope, intercept=intercept, r_squared=r2, predicted_root=root
    )


@dataclass(frozen=True)
class AboavWeaireFit:
    """A fit of ``m(n)`` (mean neighbor side-count) against ``A + B/n`` — the
    Aboav-Weaire law. ``B`` is expected negative-of-variance-shaped (many-sided
    cells border few-sided ones): the diagnostic is the *sign and fit quality*
    of ``B``, not a specific numeric target."""

    by_n: dict[int, float]
    a: float
    b: float
    r_squared: float


def aboav_weaire_fit(samples: Sequence[tuple[int, int]]) -> AboavWeaireFit:
    """Fit ``m(n) = A + B/n`` from ordered ``(n_i, n_j)`` neighbor-pair samples."""
    grouped: dict[int, list[int]] = {}
    for n, n_neighbor in samples:
        grouped.setdefault(n, []).append(n_neighbor)
    by_n = {n: sum(vals) / len(vals) for n, vals in grouped.items()}
    ns = sorted(by_n)
    xs = [1.0 / n for n in ns]
    ys = [by_n[n] for n in ns]
    b, a = _linear_fit(xs, ys)  # m = a + b*(1/n)
    r2 = _r_squared(xs, ys, b, a)
    return AboavWeaireFit(by_n=by_n, a=a, b=b, r_squared=r2)


def t1_avalanche_sizes(t1_events: Sequence[T1Event]) -> list[int]:
    """The number of T1 events firing in each step that had at least one —
    the avalanche-size sample this module can honestly report without a
    vertex-model's continuous time (a real foam's T1 "avalanche" is a burst
    of near-simultaneous flips; a discrete-step simulation's closest honest
    analogue is events-per-step, not an inter-arrival power law fitted to too
    few points)."""
    counts: dict[int, int] = {}
    for ev in t1_events:
        counts[ev.step] = counts.get(ev.step, 0) + 1
    return sorted(counts.values())


# --------------------------------------------------------------------------- #
# Small numerics (no scipy in this workspace; numpy.polyfit is heavier than
# needed for a 2-parameter least-squares line — plain closed-form OLS).
# --------------------------------------------------------------------------- #
def _linear_fit(xs: Sequence[float], ys: Sequence[float]) -> tuple[float, float]:
    """Ordinary least squares, ``y = slope*x + intercept``, closed form."""
    n = len(xs)
    if n < 2:
        return (0.0, ys[0] if ys else 0.0)
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    cov = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys, strict=True))
    var = sum((x - mean_x) ** 2 for x in xs)
    if var == 0.0:
        return (0.0, mean_y)
    slope = cov / var
    intercept = mean_y - slope * mean_x
    return (slope, intercept)


def _r_squared(xs: Sequence[float], ys: Sequence[float], slope: float, intercept: float) -> float:
    if len(ys) < 2:
        return 1.0
    mean_y = sum(ys) / len(ys)
    ss_tot = sum((y - mean_y) ** 2 for y in ys)
    if ss_tot == 0.0:
        return 1.0
    ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in zip(xs, ys, strict=True))
    return 1.0 - ss_res / ss_tot
