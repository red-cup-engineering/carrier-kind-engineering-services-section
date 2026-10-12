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
# # Causal-set sprinkling — settling made visible
#
# **Renders:** events sprinkled uniformly in 1+1 Minkowski space, their light
# cones, the Hasse-cover seed relation, and the transitive closure settling to
# the full causal order — first as a static scatter, then animated **edge by
# edge**, so the closure ordinal `kappa` is literally the frame count.
#
# **Instantiates:** `Obsmetrologia.CausalSets.Support.Causal`
# (`pymetrologic.causal.causal_step`/`causal_closure` — the Boolean
# transitive-closure settling `T_caus`) and
# `Obsmetrologia.CausalSets.Dimension.OrderingFraction`
# (`pymetrologic.causet.ordering_fraction`/`apex_count`/`euler_characteristic`
# — the Myrheim–Meyer estimator's raw inputs), plus
# `pymetrologic.lightcones.causally_precedes_event` for the Minkowski
# precedence test itself.
#
# **Legacy ancestor (read-only, not modified):** under
# `services/engineering-services-section/lib/legacy/2026-06-17-archive-emsenn-net/`
# `src/lib/code/2026/03/11/topical/science/mathematics/predication-categories/`
# `bucket-3-tools/lorentzian-causal-set/sprinkle.py`
# — "Lorentzian causal-set settling: sprinkled events in 1+1 Minkowski." That
# script computes exactly this (seed precedence, transitive closure, closure
# ordinal `kappa`, apex/spacelike counts) but **prints text only**. This is
# the gallery's one genuinely new piece: the same computation, rebuilt on
# `pymetrologic`'s own causal/causet/lightcones modules, with the rendering
# the original never had.
#
# No zone/corner translation applies here either — causal precedence is a
# plain Boolean relation (Lean core has no reals; `LightConeEvent`'s fields
# are typed `int`, a genuine **API gap** this notebook works around, noted at
# the point it matters below), not a bilattice-valued one.

# %%
import math
import random
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from pymetrologic.causal import causal_step
from pymetrologic.causet import apex_count, euler_characteristic, nsc_count, ordering_fraction
from pymetrologic.lightcones import LightConeEvent, causally_precedes_event

OUT = Path(__file__).parent / "gallery-output"
OUT.mkdir(parents=True, exist_ok=True)

Event = tuple[float, float]  # (time, position)

# %% [markdown]
# ## API gap noted, not patched
#
# `pymetrologic.lightcones.LightConeEvent` types `time`/`position` as `int` —
# the module's own docstring says it is "deliberately finite and
# combinatorial," an integer-lattice model. A sprinkling needs continuous
# coordinates. At runtime a plain Python `dataclass` does not enforce its type
# hints, and `causally_precedes_event`'s arithmetic (`dt*dt >= dx*dx`) is
# valid for floats exactly as it is for ints, so passing floats here works —
# but it is outside the module's typed contract. A continuous-coordinate
# variant (or a `Generic[T: int | float]` field) would close this gap
# properly; this notebook does not attempt that in `src/`, per the standing
# instruction to note gaps rather than patch around them.


# %%
def sprinkle(n: int, t_max: float, x_max: float, seed: int) -> list[Event]:
    rng = random.Random(seed)
    return [(rng.uniform(0, t_max), rng.uniform(-x_max, x_max)) for _ in range(n)]


def is_causal(a: Event, b: Event) -> bool:
    return causally_precedes_event(LightConeEvent(*a), LightConeEvent(*b))  # type: ignore[arg-type]


N, T_MAX, X_MAX = 14, 4.0, 2.0
events = sprinkle(N, T_MAX, X_MAX, seed=7)

# %% [markdown]
# ## Hasse-cover seed
#
# No `pymetrologic` function computes a Hasse cover of an arbitrary relation
# (another gap, noted rather than patched) — this elementary "no intermediate
# event" test is written locally, exactly as the legacy `sprinkle.py` does.
# Settling itself, from this seed, is real `pymetrologic.causal.causal_step`.


# %%
def full_causal_pairs(events: list[Event]) -> set[tuple[int, int]]:
    n = len(events)
    return {
        (i, j) for i in range(n) for j in range(n) if i != j and is_causal(events[i], events[j])
    }


def hasse_cover(events: list[Event]) -> set[tuple[int, int]]:
    full = full_causal_pairs(events)
    n = len(events)
    links: set[tuple[int, int]] = set()
    for i, j in full:
        if not any(k != i and k != j and (i, k) in full and (k, j) in full for k in range(n)):
            links.add((i, j))
    return links


event_names = [str(i) for i in range(N)]
seed_pairs = hasse_cover(events)
seed_rel = frozenset((event_names[i], event_names[j]) for i, j in seed_pairs)

# %% [markdown]
# ## Settling, one `causal_step` at a time
#
# `causal_closure` itself does not report the number of iterations it took;
# this wrapper calls the same `causal_step` in a loop and records each
# intermediate relation, so the closure ordinal `kappa` is directly the
# number of frames the animation below takes to converge.

# %%
history: list[frozenset[tuple[str, str]]] = [seed_rel]
rel = seed_rel
while True:
    nxt = causal_step(event_names, rel)
    if nxt == rel:
        break
    history.append(nxt)
    rel = nxt

kappa = len(history) - 1
final_rel = rel
final_pairs = {(int(a), int(b)) for a, b in final_rel}

r = ordering_fraction(list(range(N)), lambda a, b: (a, b) in final_pairs)
apex = apex_count(list(range(N)), lambda a, b: (a, b) in final_pairs)
euler = euler_characteristic(list(range(N)), lambda a, b: (a, b) in final_pairs)
nsc = nsc_count(list(range(N)), lambda a, b: (a, b) in final_pairs)

print(f"N = {N} events, seed (Hasse-cover) precedences = {len(seed_pairs)}")
print(f"closure ordinal kappa = {kappa}")
print(f"apex (causal pairs) = {apex} of {N * (N - 1)} ordered pairs")
print(f"ordering fraction r = {r} ~= {float(r):.3f}")
strict_regime = nsc == 0
print(f"Euler characteristic (apex - nsc) = {euler}  (nsc = {nsc}, strict regime: {strict_regime})")

# %% [markdown]
# ## Static render — events, light cones, Hasse edges
#
# Two sample events get their light cones drawn (the standard 45-degree
# lines from `pymetrologic.lightcones.causally_precedes_event`'s own
# boundary, `dt = +-dx`); every Hasse-cover edge is drawn as a thin arrow.


# %%
def draw_lightcone(ax: plt.Axes, origin: Event, t_max: float, x_max: float, color: str) -> None:
    t0, x0 = origin
    dt = t_max - t0
    ax.fill(
        [x0, x0 - dt, x0 + dt],
        [t0, t0 + dt, t0 + dt],
        color=color,
        alpha=0.10,
        zorder=0,
    )
    ax.plot([x0, x0 - dt], [t0, t0 + dt], color=color, linewidth=0.8, alpha=0.5, zorder=1)
    ax.plot([x0, x0 + dt], [t0, t0 + dt], color=color, linewidth=0.8, alpha=0.5, zorder=1)


fig, ax = plt.subplots(figsize=(7, 7), facecolor="#05050c")
ax.set_facecolor("#0a0a16")

for origin, color in zip((events[0], events[N // 2]), ("#40a0ff", "#ff8040"), strict=True):
    draw_lightcone(ax, origin, T_MAX, X_MAX, color)

for i, j in seed_pairs:
    (t1, x1), (t2, x2) = events[i], events[j]
    ax.annotate(
        "",
        xy=(x2, t2),
        xytext=(x1, t1),
        arrowprops={"arrowstyle": "->", "color": "#c060ff", "alpha": 0.55, "linewidth": 0.9},
        zorder=2,
    )

ts = [e[0] for e in events]
xs = [e[1] for e in events]
ax.scatter(xs, ts, s=90, color="#e8e8ff", edgecolors="#111", zorder=3)
for i, (t, x) in enumerate(events):
    ax.annotate(str(i), (x, t), fontsize=8, color="#111", ha="center", va="center", zorder=4)

ax.set_xlabel("position x", color="#ccd")
ax.set_ylabel("time t", color="#ccd")
ax.set_title(f"N={N} sprinkled events — r={float(r):.3f}, kappa={kappa}, apex={apex}", color="#ccd")
ax.tick_params(colors="#ccd")
for spine in ax.spines.values():
    spine.set_color("#334")
fig.tight_layout()
fig.savefig(OUT / "82-causal-sprinkling.png", dpi=130, facecolor=fig.get_facecolor())
plt.show()

# %% [markdown]
# ## Animated: transitive closure, edge by edge
#
# Each `causal_step` firing round is one animation beat: newly-settled pairs
# flash in gold, then fade to the steady purple of "already closed." By the
# last frame every causally-related pair (timelike-or-null separated) is a
# steady edge, and every remaining unconnected pair is genuinely spacelike.

# %%
pos = {i: (events[i][1], events[i][0]) for i in range(N)}
FRAMES_PER_STEP = 8


def draw_frame(
    known_pairs: set[tuple[int, int]], fresh_pairs: set[tuple[int, int]], glow: float
) -> plt.Figure:
    fig_f, ax_f = plt.subplots(figsize=(6, 6), facecolor="#05050c", dpi=100)
    ax_f.set_facecolor("#0a0a16")
    for i, j in known_pairs - fresh_pairs:
        (t1, x1), (t2, x2) = events[i], events[j]
        ax_f.plot([x1, x2], [t1, t2], color="#7040a0", linewidth=0.7, alpha=0.55, zorder=1)
    for i, j in fresh_pairs:
        (t1, x1), (t2, x2) = events[i], events[j]
        ax_f.plot(
            [x1, x2],
            [t1, t2],
            color="#ffd060",
            linewidth=1.4 + glow,
            alpha=0.6 + 0.4 * glow,
            zorder=2,
        )
    ax_f.scatter(xs, ts, s=70, color="#e8e8ff", edgecolors="#111", zorder=3)
    ax_f.set_xlim(-X_MAX * 1.15, X_MAX * 1.15)
    ax_f.set_ylim(-0.1, T_MAX * 1.05)
    ax_f.set_title(f"|closed pairs| = {len(known_pairs)}", color="#ccd")
    ax_f.set_facecolor("#0a0a16")
    ax_f.tick_params(colors="#556")
    for spine in ax_f.spines.values():
        spine.set_color("#334")
    fig_f.tight_layout()
    return fig_f


anim_frames: list[np.ndarray] = []
known: set[tuple[int, int]] = set(seed_pairs)
for stage_rel in history:
    stage_pairs = {(int(a), int(b)) for a, b in stage_rel}
    fresh = stage_pairs - known
    for f in range(FRAMES_PER_STEP):
        glow = 1.0 - f / FRAMES_PER_STEP
        fig_f = draw_frame(stage_pairs, fresh if fresh else set(), glow)
        fig_f.canvas.draw()
        frame = np.asarray(fig_f.canvas.buffer_rgba())[:, :, :3].copy()
        anim_frames.append(frame)
        plt.close(fig_f)
    known = stage_pairs

gif_path = OUT / "82-causal-sprinkling.gif"
try:
    import imageio.v3 as iio

    iio.imwrite(gif_path, anim_frames, duration=60, loop=0)
    print(f"wrote {gif_path}  ({len(anim_frames)} frames over kappa={kappa} closure steps)")
except ImportError:
    print("imageio not installed (uv sync --extra gallery) — skipping GIF; PNG still written.")
