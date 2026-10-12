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
# # The Obsmetrologia gallery — bilattice as image
#
# **Renders:** a small "trace tree" site (root plus two levels of a 3-symbol
# branching structure) laid out radially, colored, glowed, and arced entirely
# from `pymetrologic`'s own `Corner`/`Bilattice`/`K4` API — no borrowed palette,
# no numpy-only decoration. Every color, glow radius, and curved "bypass" arc
# below is a direct read of a `pymetrologic` value.
#
# **Instantiates:** `Obsmetrologia.Articulation.Articulating.FourCorner`
# (`pymetrologic.quartet.Corner`/`corner_of_status`) for the per-cell corner
# read-off, and `Obsmetrologia.Language.Positing.Four`
# (`pymetrologic.klein.K4`) for the "bypass" symmetry — the Klein four-group
# gauge `{id, neg, conflate, negConf}` acting on the bilattice.
#
# **Legacy ancestor (read-only, not modified):** under
# `lib/emsenn/services/561-group/lib/legacy/2026-04-30-mypc-relationality-repo/`
# `relationality-repo/operations/science/toys/`, files `art/flow.py`
# and `art/void_crystal.py` — "Void charge algebra as particle flow on
# the trace tree" / "The Void Kernel rendered as an animated GIF". Those toys
# render an MP4/GIF (`av`, `PIL`) of 4000 particles random-walking a depth-3
# trace tree under a hand-built transition matrix, colored by a **4-bit zone
# signature** (`Possible`/`Necessary`/`Absurd`/`Done`, glyphs `+-`/`-+`/`--`/`++`)
# for a rotating pair of "moments" `(asc, desc)`. This notebook keeps the trace
# tree, the radial layout, the glow-and-arc visual language, the rotating
# pair, and (below) an animated render with discharge flashes — but recasts
# the *coloring itself* onto the ruled corner algebra, and trades the legacy
# `av`/`PIL` pipeline for matplotlib + `imageio` (the `gallery` extra), which
# needs no system `ffmpeg`.
#
# ## Zone → corner translation
#
# The legacy toys' four zone predicates are **not mutually exclusive** — a
# trace can satisfy several zone predicates at once (`zone_sig` is a 4-bit
# *membership* vector, realized values `0b0000` … `0b1111`). The ruled corner
# convention (`docs/history/corner-naming-convention.md`, 2026-08-05) is a
# strict 4-way **partition** — every cell is in exactly one of
# `{absurd, potential, active, stable}`. These are not the same kind of
# object, so there is no lossless 1:1 map from `zone_sig` to `Corner`. What
# *is* a clean, non-ambiguous correspondence — and the one this notebook
# uses — is between the legacy toys' two **status bits** that generate every
# zone predicate and the ruled corner's own two status bits:
#
# | legacy toy | `(token, claim)` | ruled corner |
# |---|---|---|
# | `t == VOID` (both bits off downstream) | `(False, False)` | **absurd** — told none, initial |
# | "Possible": `t[0] == asc` | `(True, False)` | **potential** — told true |
# | "Necessary": strip leading `asc`, rest starts `desc` | `(False, True)` | **active** — false |
# | both at once (`asc`-excited *and* `desc`-peeling) | `(True, True)` | **stable** — told both |
#
# This reproduces the legacy toy's own `Possible`/`Necessary` boolean tests
# exactly (same `(token, claim)` reading the toys already use informally), but
# feeds them through `pymetrologic.quartet.corner_of_status` instead of a
# hand-rolled 4-bit signature — so what comes out is a real `Corner`, not a toy
# zone. One deliberate, load-bearing **inversion** falls out of the ruled
# naming: the legacy toys render `t == VOID` — their `Absurd` zone — as the
# *brightest* node (glyph `VD`, full pulsing white, since Void trivially
# satisfies all four zone bits at once). Under the ruled convention `absurd`
# is told-*none* — the emptiest state, correctly rendered here as the
# *darkest* node — while the brightest, most-conflicted glow belongs to
# **stable** (told-both, the corner the corner-naming ruling explicitly
# reserves for the `≤ₖ`-absorbing "both" point). That flip is exactly the
# drift the 2026-08-05 ruling closed; see
# `docs/history/corner-naming-convention.md` in the live Obsmetrologia tree.
#
# **Ambiguity noted, not guessed:** the legacy toys' `Absurd` predicate
# (`zone_absurd(t) = (t == VOID)`) has no direct analogue for non-root cells —
# it is a special case of *this* trace monoid (only the identity trace can be
# "everything at once"), not a general fact about corners. This notebook's
# `absurd` corner is realized wherever `corner_of_status` returns it (i.e.
# `token=claim=False`), which *includes* but is not limited to the root — a
# strictly more general reading than the legacy toy's Void-only Absurd. No
# guess was needed to resolve this; the ruled `Corner` partition is simply a
# different, better-defined object than the legacy zone signature.

# %%
import itertools
import math
from collections import Counter
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from pymetrologic import BL, K4, four
from pymetrologic.klein import act
from pymetrologic.quartet import CORNERS, Corner, charge_of_corner, corner_of_status
from pymetrologic.site import Site

OUT = Path(__file__).parent / "gallery-output"
OUT.mkdir(parents=True, exist_ok=True)

MOMENTS = (0, 1, 2)
NAMES = {0: "A", 1: "B", 2: "C"}
MAX_DEPTH = 2
VOID: tuple[int, ...] = ()

# %% [markdown]
# ## The trace-tree site
#
# Cells are tuples over `{A, B, C}` of length `<= MAX_DEPTH`; a face
# `(child[1:], child)` mirrors the legacy toy's `Excite(m, t) = (m,) + t`
# prepend and its `Gradient` relation (`a` is a suffix of `b`). This *is* a
# real `pymetrologic.site.Site` — the same object the calculus layer settles
# sheaves over.


# %%
def all_traces(max_depth: int) -> list[tuple[int, ...]]:
    result: list[tuple[int, ...]] = [VOID]
    for d in range(1, max_depth + 1):
        result.extend(itertools.product(MOMENTS, repeat=d))
    return result


traces = all_traces(MAX_DEPTH)
faces = tuple((t[1:], t) for t in traces if t != VOID)
cell_names = {t: ("void" if t == VOID else "".join(NAMES[m] for m in t)) for t in traces}
site = Site(
    cells=tuple(cell_names.values()), faces=tuple((cell_names[a], cell_names[b]) for a, b in faces)
)
print(f"site: {len(site.cells)} cells, {len(site.faces)} faces")

# %% [markdown]
# ## Corner read-off per (asc, desc) pair
#
# For each of the three rotating pairs the legacy toy schedules
# (`A->B`, `B->C`, `C->A`), every cell gets a real `Corner` via
# `corner_of_status`, and a real `BL` charge via `charge_of_corner` — the
# glow below reads `bl.conflict_degree`, not a hand-tuned brightness curve.

# %%
bl = four()


def status_bits(asc: int, desc: int, t: tuple[int, ...]) -> tuple[bool, bool]:
    """The legacy toys' own (token, claim) reading, feeding `corner_of_status`."""
    token = t == VOID or t[0] == asc
    i = 0
    while i < len(t) and t[i] == asc:
        i += 1
    rest = t[i:]
    claim = rest == VOID or rest[0] == desc
    return token, claim


def corner_field(asc: int, desc: int) -> dict[tuple[int, ...], Corner]:
    return {t: corner_of_status(*status_bits(asc, desc, t)) for t in traces}


PAIR_SCHEDULE = [(0, 1), (1, 2), (2, 0)]
fields = {pair: corner_field(*pair) for pair in PAIR_SCHEDULE}

for pair, field in fields.items():
    counts = Counter(field.values())
    label = f"{NAMES[pair[0]]}→{NAMES[pair[1]]}"
    print(f"  {label}: " + "  ".join(f"{c.value}={counts.get(c, 0)}" for c in CORNERS))

# %% [markdown]
# ## Radial render, one pair
#
# Position: depth = radius, angular slot = index within its depth layer (same
# radial-tree layout the legacy toys used). Color: `Corner`. Glow radius:
# `bl.conflict_degree(charge_of_corner(bl, corner))` — `stable` (told-both)
# glows brightest; `absurd` (told-none) is darkest. Curved "bypass" arcs
# connect cells whose charge is related by the Klein four-group gauge
# (`K4.NEG`/`K4.CONF`) — the real algebraic analogue of the legacy toys'
# hand-picked "site-equivalent pairs".

# %%
CORNER_RGB: dict[Corner, tuple[float, float, float]] = {
    Corner.ABSURD: (0.07, 0.07, 0.20),  # darkest — told none
    Corner.POTENTIAL: (0.04, 0.85, 0.43),  # told true
    Corner.ACTIVE: (0.86, 0.72, 0.04),  # told false
    Corner.STABLE: (1.00, 1.00, 1.00),  # brightest — told both, the absorbing point
}


def layout(traces: list[tuple[int, ...]]) -> dict[tuple[int, ...], tuple[float, float]]:
    pos = {VOID: (0.0, 0.0)}
    for d in range(1, MAX_DEPTH + 1):
        layer = [t for t in traces if len(t) == d]
        for i, t in enumerate(layer):
            angle = 2 * math.pi * i / len(layer) - math.pi / 2
            r = d / MAX_DEPTH
            pos[t] = (r * math.cos(angle), r * math.sin(angle))
    return pos


pos = layout(traces)


def bypass_pairs(
    field: dict[tuple[int, ...], Corner],
) -> list[tuple[tuple[int, ...], tuple[int, ...]]]:
    """Cells whose charge is a K4 gauge-image of another cell's charge."""
    charge = {t: charge_of_corner(bl, c) for t, c in field.items()}
    by_value: dict[BL[int], list[tuple[int, ...]]] = {}
    for t, v in charge.items():
        by_value.setdefault(v, []).append(t)
    pairs: list[tuple[tuple[int, ...], tuple[int, ...]]] = []
    seen: set[frozenset[tuple[int, ...]]] = set()
    for t, v in charge.items():
        for gate in (K4.NEG, K4.CONF):
            target = act(gate, bl, v)
            for u in by_value.get(target, ()):
                if u == t:
                    continue
                key = frozenset((t, u))
                if key not in seen:
                    seen.add(key)
                    pairs.append((t, u))
    return pairs


def render_panel(ax: plt.Axes, asc: int, desc: int) -> None:
    field = fields[(asc, desc)]
    for parent, child in faces:
        (x1, y1), (x2, y2) = pos[parent], pos[child]
        ax.plot([x1, x2], [y1, y2], color="#334", linewidth=0.6, zorder=1)

    for t, u in bypass_pairs(field):
        (x1, y1), (x2, y2) = pos[t], pos[u]
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        nx, ny = -(y2 - y1), (x2 - x1)
        cx, cy = mx + 0.12 * nx, my + 0.12 * ny
        curve = np.linspace(0, 1, 24)
        bx = (1 - curve) ** 2 * x1 + 2 * (1 - curve) * curve * cx + curve**2 * x2
        by = (1 - curve) ** 2 * y1 + 2 * (1 - curve) * curve * cy + curve**2 * y2
        ax.plot(bx, by, color="#a020c8", linewidth=0.8, alpha=0.65, zorder=2)

    for t in traces:
        corner = field[t]
        x, y = pos[t]
        glow = bl.conflict_degree(charge_of_corner(bl, corner)) / bl.L.top
        color = CORNER_RGB[corner]
        size = 90 + 260 * glow
        ax.scatter(
            [x],
            [y],
            s=size,
            color=color,
            edgecolors="#111",
            linewidths=0.5,
            zorder=3,
            alpha=0.55 + 0.45 * glow,
        )
        if len(t) <= 1:
            ax.annotate(
                cell_names[t], (x, y), fontsize=7, color="#ccd", ha="center", va="center", zorder=4
            )

    ax.set_title(f"{NAMES[asc]}→{NAMES[desc]}", color="#ccd")
    ax.set_facecolor("#0a0a16")
    ax.set_xlim(-1.3, 1.3)
    ax.set_ylim(-1.3, 1.3)
    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])


fig, axes = plt.subplots(1, 3, figsize=(13, 4.5), facecolor="#05050c")
for ax, pair in zip(axes, PAIR_SCHEDULE, strict=True):
    render_panel(ax, *pair)
fig.suptitle(
    "trace-tree site — corner colored, K4-bypassed, per rotating (asc, desc) pair", color="#ccd"
)
fig.tight_layout()
fig.savefig(OUT / "80-bilattice-flow-panels.png", dpi=130, facecolor=fig.get_facecolor())
plt.show()

# %% [markdown]
# ## Corner population as the pair rotates
#
# The legacy toy's particle-count animation, honestly reduced to a static
# stand-in: how many of the 13 cells sit in each corner, for each of the
# three scheduled pairs.

# %%
fig2, ax2 = plt.subplots(figsize=(7, 4))
width = 0.2
xs = np.arange(len(PAIR_SCHEDULE))
for i, corner in enumerate(CORNERS):
    heights = [Counter(fields[pair].values()).get(corner, 0) for pair in PAIR_SCHEDULE]
    ax2.bar(
        xs + (i - 1.5) * width,
        heights,
        width,
        label=corner.value,
        color=CORNER_RGB[corner],
        edgecolor="#111",
    )
ax2.set_xticks(xs)
ax2.set_xticklabels([f"{NAMES[a]}→{NAMES[d]}" for a, d in PAIR_SCHEDULE])
ax2.set_ylabel("cells")
ax2.set_title("corner population per (asc, desc) pair")
ax2.legend(frameon=False)
fig2.tight_layout()
fig2.savefig(OUT / "80-bilattice-flow-population.png", dpi=130)
plt.show()

# %% [markdown]
# ## Animated: discharge flashes as the pair rotates
#
# The legacy toy's "NuclearDischarge" is a bright streak fired when a
# particle at an absorbed, `Possible`-zone trace jumps toward the descending
# moment. The direct ruled-corner analogue: a **discharge is a cell reaching
# `stable`** (told-both — the `≤ₖ`-absorbing point no further posit can move,
# per the corner-naming ruling) — so this animation flashes every `stable`
# cell each time the `(asc, desc)` pair holds, then crossfades to the next
# pair's coloring. One matplotlib figure is drawn once per pair (3 base
# frames) and reused for the pulse/crossfade math in plain numpy, mirroring
# the legacy toys' own float-RGBA-buffer glow technique.

# %%
from matplotlib.backends.backend_agg import FigureCanvasAgg


def rasterize(asc: int, desc: int) -> np.ndarray:
    fig_r, ax_r = plt.subplots(figsize=(5, 5), facecolor="#05050c", dpi=110)
    render_panel(ax_r, asc, desc)
    canvas = FigureCanvasAgg(fig_r)
    canvas.draw()
    frame = np.asarray(canvas.buffer_rgba())[:, :, :3].copy()
    plt.close(fig_r)
    return frame


base_frames = {pair: rasterize(*pair) for pair in PAIR_SCHEDULE}
stable_positions = {
    pair: [pos[t] for t in traces if fields[pair][t] is Corner.STABLE] for pair in PAIR_SCHEDULE
}

HOLD = 14  # frames each pair is held, pulsing
CROSSFADE = 8  # frames blending into the next pair


def flash_overlay(
    shape: tuple[int, ...], positions: list[tuple[float, float]], strength: float
) -> np.ndarray:
    """A small radial-glow overlay in image space, centered on data-space positions."""
    h, w = shape[0], shape[1]
    overlay = np.zeros((h, w), dtype=np.float64)
    if strength <= 0 or not positions:
        return overlay
    # data range is [-1.3, 1.3] both axes in `render_panel`; map to pixel coords.
    for x, y in positions:
        px = (x + 1.3) / 2.6 * w
        py = (1 - (y + 1.3) / 2.6) * h
        ys_, xs_ = np.ogrid[:h, :w]
        overlay += strength * np.exp(-((xs_ - px) ** 2 + (ys_ - py) ** 2) / (2 * (w * 0.035) ** 2))
    return np.clip(overlay, 0, 1)


anim_frames: list[np.ndarray] = []
n_pairs = len(PAIR_SCHEDULE)
for i, pair in enumerate(PAIR_SCHEDULE):
    base = base_frames[pair].astype(np.float64)
    positions = stable_positions[pair]
    for f in range(HOLD):
        pulse = 0.5 + 0.5 * math.sin(2 * math.pi * f / HOLD * 2)
        glow = flash_overlay(base.shape, positions, pulse)[:, :, None]
        frame = base + glow * np.array([255, 250, 210])
        anim_frames.append(np.clip(frame, 0, 255).astype(np.uint8))
    nxt = base_frames[PAIR_SCHEDULE[(i + 1) % n_pairs]].astype(np.float64)
    for f in range(CROSSFADE):
        a = f / CROSSFADE
        anim_frames.append(np.clip((1 - a) * base + a * nxt, 0, 255).astype(np.uint8))

gif_path = OUT / "80-bilattice-flow.gif"
try:
    import imageio.v3 as iio

    iio.imwrite(gif_path, anim_frames, duration=45, loop=0)
    print(f"wrote {gif_path}  ({len(anim_frames)} frames)")
except ImportError:
    print("imageio not installed (uv sync --extra gallery) — skipping GIF; PNGs still written.")
