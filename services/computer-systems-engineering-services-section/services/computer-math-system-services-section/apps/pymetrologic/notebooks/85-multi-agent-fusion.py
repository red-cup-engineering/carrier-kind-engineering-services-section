# ---
# jupyter:
#   jupytext:
#     formats: ipynb,py:percent
#     text_representation:
#       extension: .py
#       format_name: percent
#   kernelspec:
#     display_name: lab
#     language: python
#     name: python3
# ---

# %% [markdown]
# # Three inspectors, one warehouse — multi-agent belief fusion
#
# **Renders:** three field agents each report what they saw about a small
# shared warehouse (five yes/no claims); the fused board state, exactly which
# agents disagree about what (the attribution `pymetrologic.fusion` adds), a
# genuine severity gradient from a fourth, continuously-graded claim, and a
# repair — one agent retracts a mistaken report — that measurably shrinks the
# conflict set.
#
# **Instantiates:** `pymetrologic.readouts` (the bilingual naming layer over
# `pymetrologic.quartet`/`pymetrologic.calculus`/`pymetrologic.coordination`)
# and `pymetrologic.fusion.BeliefBoard` (the multi-agent extension built on
# top of it). Both are wrappers/extensions over already-proven corpus
# machinery, not new theorems — see each module's own docstring for exactly
# which claims are proven and which are product surface.
#
# This notebook assumes no prior familiarity with the corpus. If you have
# never seen a "corner" or a "knowledge join" before, this is the ten-minute
# tour.

# %%
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from pymetrologic.calculus.examples import sensor_fusion_sheaf
from pymetrologic.fusion import BeliefBoard
from pymetrologic.quartet import CORNERS, Corner
from pymetrologic.readouts import (
    coordination_cost_from_edges,
    describe,
    settle,
    severity_filtration,
    told_both,
    told_false,
    told_true,
)

OUT = Path(__file__).parent / "gallery-output"
OUT.mkdir(parents=True, exist_ok=True)

# %% [markdown]
# ## The four-valued vocabulary, in one table
#
# Every claim below is one of four things: **told-none** (nobody has said
# anything), **told-true** (evidence for, none against), **told-false**
# (evidence against, none for), or **told-both** (evidence for *and* against
# — a genuine, stable contradiction; it does not "explode," it is simply the
# most evidentially loaded of the four states). `pymetrologic.readouts.describe`
# reads these back in plain language:

# %%
for corner in CORNERS:
    print(f"  {corner.value:>9} -> {describe(corner)}")

# %% [markdown]
# ## The scene
#
# Three inspectors independently walk through the same warehouse and each
# report on the same five claims. Nobody sees everything; where an inspector
# says nothing about a claim, that claim simply stays told-none for them —
# it is not a fourth kind of "unknown" value, just the ordinary starting
# point every claim is born at.

# %%
CLAIMS = (
    "front_door_unlocked",
    "power_on",
    "loading_bay_open",
    "alarm_armed",
    "movement_detected",
)
AGENTS = ("riley", "sam", "jae")

board = BeliefBoard(regime="four")

# A plain, notebook-local record of what each agent posited, kept alongside
# the board purely for the before/after rendering below -- BeliefBoard itself
# is the thing under test, not this bookkeeping.
posits: dict[str, dict[str, Corner]] = {agent: {} for agent in AGENTS}


def report(agent: str, claim: str, value: Corner) -> None:
    board.posit(agent, claim, value)
    posits[agent][claim] = value


def take_back(agent: str, claim: str) -> None:
    board.retract(agent, claim)
    posits[agent].pop(claim, None)


# riley did the first walkthrough at 9am.
report("riley", "front_door_unlocked", told_true())
report("riley", "power_on", told_true())
report("riley", "alarm_armed", told_false())
report("riley", "movement_detected", told_false())

# sam did a second pass at 11am -- and disagrees with riley twice.
report("sam", "front_door_unlocked", told_false())  # riley says true
report("sam", "power_on", told_true())  # agrees with riley
report("sam", "loading_bay_open", told_true())
report("sam", "movement_detected", told_true())  # riley says false

# jae is in the control room, reading the alarm panel and the camera log.
report("jae", "alarm_armed", told_true())  # riley says false
report("jae", "loading_bay_open", told_true())  # agrees with sam
# the motion sensor fired *and* the camera log shows nothing for that
# window -- jae's own two sources already disagree with each other, so jae
# posits the honest told-both rather than picking a side.
report("jae", "movement_detected", told_both())

board.settle()

# %% [markdown]
# ## The fused board state
#
# `BeliefBoard.state()` is the settled, fused belief for every claim — the
# knowledge join of everything every agent posited about it.

# %%
state_before = board.state()
posits_before = {agent: dict(claims) for agent, claims in posits.items()}
for claim in CLAIMS:
    print(f"  {claim:<22} {describe(state_before[claim])}")  # type: ignore[index]

# %% [markdown]
# ## Attribution — not just *that* there's a conflict, but *who*
#
# `pymetrologic.calculus.consistency.conflict_map` (which `BeliefBoard` uses
# under the hood) can already say a claim is contested. What it cannot say —
# because it only knows about sheaf *cells*, and every agent's posit here is
# folded into one shared board cell before that computation ever runs — is
# *which agents* are the parties to the disagreement. Keeping each agent's
# raw posit alongside the settle is exactly what buys that back.

# %%
conflicts_before = board.conflicts()
print(f"{len(conflicts_before)} contested claim(s):\n")
for conflict in conflicts_before:
    print(f"  '{conflict.claim}' -- parties: {', '.join(conflict.parties)}")
    for agent in conflict.parties:
        print(f"      {agent:<8} said {describe(conflict.positions[agent])}")  # type: ignore[arg-type]

# %% [markdown]
# Three claims are contested: a two-way split on `front_door_unlocked`
# (riley vs. sam), a two-way split on `alarm_armed` (riley vs. jae), and a
# genuine three-way disagreement on `movement_detected` where jae's own
# told-both reading sits alongside riley's told-false and sam's told-true.
# `power_on` and `loading_bay_open` never appear — every agent who spoke on
# them agreed.

# %% [markdown]
# ## A repair: one agent retracts a mistaken report
#
# Sam re-checks the door log and realizes the `front_door_unlocked` report
# was written against the wrong door entirely — not a weaker belief to
# join in, a mistake to take back. `BeliefBoard.retract` removes it outright
# (a knowledge join can only climb, never descend, so "I take that back" has
# to be a real removal).

# %%
take_back("sam", "front_door_unlocked")
board.settle()

state_after = board.state()
conflicts_after = board.conflicts()
print(f"conflicts before repair: {len(conflicts_before)}")
print(f"conflicts after repair:  {len(conflicts_after)}")
assert len(conflicts_after) == len(conflicts_before) - 1
print("\nremaining contested claims:", [c.claim for c in conflicts_after])

# %% [markdown]
# ## Rendering the before/after board

# %%
CORNER_COLOURS = {
    Corner.ABSURD: "#33334a",
    Corner.POTENTIAL: "#39c979",
    Corner.ACTIVE: "#e24b4b",
    Corner.STABLE: "#f2c14e",
}
CORNER_INDEX = {c: i for i, c in enumerate(CORNERS)}
CMAP = plt.matplotlib.colors.ListedColormap([CORNER_COLOURS[c] for c in CORNERS])

ROWS = (*AGENTS, "FUSED")


def _grid(state: dict[str, Corner], agent_posits: dict[str, dict[str, Corner]]) -> np.ndarray:
    grid = np.zeros((len(ROWS), len(CLAIMS)), dtype=int)
    for i, row in enumerate(ROWS):
        for j, claim in enumerate(CLAIMS):
            value = state[claim] if row == "FUSED" else agent_posits[row].get(claim, Corner.ABSURD)
            grid[i, j] = CORNER_INDEX[value]
    return grid


fig, axes = plt.subplots(1, 2, figsize=(11, 4.2), facecolor="#05050c")
for ax, state, agent_posits, title in zip(
    axes,
    (state_before, state_after),
    (posits_before, posits),
    ("before repair", "after repair"),
    strict=True,
):
    grid = _grid(state, agent_posits)  # type: ignore[arg-type]
    ax.imshow(grid, cmap=CMAP, vmin=0, vmax=3, aspect="auto")
    ax.set_xticks(range(len(CLAIMS)))
    ax.set_xticklabels([c.replace("_", "\n") for c in CLAIMS], fontsize=7, color="#ccd")
    ax.set_yticks(range(len(ROWS)))
    ax.set_yticklabels(ROWS, color="#ccd")
    ax.set_title(title, color="#ccd")
    ax.set_facecolor("#0a0a16")
    for spine in ax.spines.values():
        spine.set_color("#334")
fig.suptitle("agent x claim, coloured by told-none/true/false/both", color="#ccd")
fig.tight_layout()
fig.savefig(OUT / "85-multi-agent-fusion-board.png", dpi=130, facecolor=fig.get_facecolor())
plt.show()

# %% [markdown]
# ## A genuine severity gradient — the graded fiber
#
# `"four"` regime conflict is binary: a claim is contested or it isn't. To
# see *how badly* two sources disagree, not just *whether*, the corpus's
# continuous `[0, 1]` fiber is needed — the same one
# `pymetrologic.calculus.examples.sensor_fusion_sheaf` uses. Two of our three
# inspectors also logged a continuous confidence reading on the warehouse's
# ambient temperature sensor (`"reads high"`), and here they disagree hard:

# %%
temp_sheaf, temp_assignment = sensor_fusion_sheaf(
    {"riley": (0.85, 0.0), "sam": (0.05, 0.9)}, [("riley", "sam")]
)
temp_settled = settle(temp_sheaf, temp_assignment)
print(temp_settled.verdict("the ambient-temperature reading"))

sweep = severity_filtration(temp_sheaf, temp_settled)
print("\nconsistent-enough cells admitted, by rising tolerance grade:")
for grade, cells in sweep.items():
    print(f"  grade <= {grade:.2f}: {sorted(cells)}")

# %% [markdown]
# At the strictest grade only the two vertex cells (each internally
# consistent on its own) are admitted; the shared edge cell — where riley's
# and sam's readings actually meet — only joins the "consistent enough" set
# once the tolerance rises to cover their real disagreement. That nested
# sweep is `severity_filtration`, i.e. `pymetrologic.calculus.consistency.filtration`
# under its outsider-legible name.

# %%
fig2, ax2 = plt.subplots(figsize=(6, 3.6), facecolor="#05050c")
grades = list(sweep)
counts = [len(cells) for cells in sweep.values()]
ax2.plot(grades, counts, marker="o", color="#f2c14e")
ax2.set_xlabel("tolerance grade", color="#ccd")
ax2.set_ylabel('cells admitted as "consistent enough"', color="#ccd")
ax2.set_title("severity filtration on the temperature disagreement", color="#ccd")
ax2.set_facecolor("#0a0a16")
ax2.tick_params(colors="#ccd")
for spine in ax2.spines.values():
    spine.set_color("#334")
fig2.tight_layout()
fig2.savefig(OUT / "85-multi-agent-fusion-severity.png", dpi=130, facecolor=fig2.get_facecolor())
plt.show()

# %% [markdown]
# ## The wedge: coordination cost of the reporting network itself
#
# One more question this corpus can answer that plain conflict-counting
# cannot: *given who overlaps with whom*, how much independent coordination
# does reconciling this network need? Build a source-stance graph where an
# edge joins two agents who reported on at least one shared claim — all
# three pairs here share a claim, so the graph is a triangle — and read its
# `pymetrologic.readouts.coordination_cost`.

# %%
overlap_edges = frozenset(
    {frozenset({"riley", "sam"}), frozenset({"sam", "jae"}), frozenset({"riley", "jae"})}
)
cost = coordination_cost_from_edges(AGENTS, overlap_edges)
print(f"cycle_rank = {cost.cycle_rank}  (is_forest = {cost.is_forest})")
print(
    "a nonzero cycle rank means the three agents' overlaps form a genuine loop, not a tree --"
    " reconciling all three pairwise overlaps needs one imposed order/authority, not zero."
)

# %% [markdown]
# ## Honesty notes, gathered
#
# * `describe`/`settle`/`conflicts`/`coordination_cost` never expose a bare
#   "h1" name — the corpus has four differently-scoped H1 theories (see
#   `pymetrologic.readouts`'s own module docstring).
# * `temp_settled.verdict(...)` above says "an obstruction was located,"
#   never "provably coordination-free" — the general settling path this
#   notebook exercises carries the corpus's coarse degree-1 obstruction
#   shadow, not a full derived H1.
# * `BeliefBoard`'s attribution (naming *which* agents disagree) is product
#   surface built on the corpus's proven knowledge join, not a restated Lean
#   theorem — see `pymetrologic.fusion`'s module docstring.
