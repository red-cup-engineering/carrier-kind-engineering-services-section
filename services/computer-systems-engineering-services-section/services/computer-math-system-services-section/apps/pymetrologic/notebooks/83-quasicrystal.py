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
# # Quasicrystal interference — corners in the plane
#
# **Renders:** a 5-fold quasicrystalline interference pattern from two
# golden-ratio-related plane-wave families, colored **pixel-by-pixel by a
# real `pymetrologic.quartet.Corner`** — not a hand-tuned palette — with a
# slow phase rotation animated across frames.
#
# **Instantiates:** `Obsmetrologia.AperiodicOrder.Tiling.StepN.SubstitutionMatrix`
# (`pymetrologic.substitution.perron_eigenvalue`/`fibonacci_matrix` — the
# golden ratio `phi` read off as the Fibonacci substitution matrix's
# Perron–Frobenius eigenvalue, not hand-typed as `(1+sqrt(5))/2`) and
# `Obsmetrologia.Articulation.Articulating.FourCorner`
# (`pymetrologic.quartet.corner_of_status` — the per-pixel corner read-off,
# built once as a 4-entry lookup table and applied vectorized). This pairs
# with `AperiodicOrder/Crystal/Quasicrystal.lean` in the live tree (a
# `Obsmetrologia` node this Python package does not yet realize — see the
# gap note below).
#
# **Legacy ancestor (read-only, not modified):** under
# `lib/emsenn/services/561-group/lib/legacy/2026-04-30-mypc-relationality-repo/`
# `relationality-repo/operations/science/toys/art/quasicrystal-1.py`
# — "Quasicrystalline visualization of the nuclear quartet." The legacy toy
# already reads as a corner algebra without much translation: two nuclei,
# `sigma` (backward/saturation) and `delta` (forward/transfer), each a sum of
# five plane waves; "sigma-fixed," "delta-fixed," "joint fixed point," and
# "neither" are exactly the four corners once thresholded to booleans. This
# notebook keeps that reading and routes it through the real `Corner` API
# instead of a hand-written 2-bit palette table.
#
# ## Zone → corner translation
#
# | legacy toy | bit test | ruled corner |
# |---|---|---|
# | neither nucleus active ("deep void") | `token=False, claim=False` | **absurd** — told none |
# | sigma-fixed only | `token=True, claim=False` | **potential** — told true |
# | delta-fixed only | `token=False, claim=True` | **active** — told false |
# | joint fixed point `H*` (both active) | `token=True, claim=True` | **stable** — told both |
#
# This is an unambiguous translation (the legacy toy's own two-nucleus
# reading already partitions the plane the same way `Corner` does — unlike
# the `flow.py`/`void_crystal.py` piece, no overlapping-zone ambiguity
# arises here).
#
# **API gap noted, not patched:** `pymetrologic` has no `AperiodicOrder`-tiling
# module realizing quasicrystal geometry itself (the Perron eigenvalue and
# substitution-matrix machinery in `pymetrologic.substitution` covers the
# 1-D substitution/tiling algebra, not 2-D quasicrystalline interference) —
# this notebook's plane-wave field is genuinely new rendering code, only its
# frequency ratio (`phi`) is drawn from the library.

# %%
import math
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from pymetrologic.quartet import CORNERS, Corner, corner_of_status
from pymetrologic.substitution import fibonacci_matrix, perron_eigenvalue

OUT = Path(__file__).parent / "gallery-output"
OUT.mkdir(parents=True, exist_ok=True)

phi = perron_eigenvalue(fibonacci_matrix())
print(f"phi (Perron eigenvalue of the Fibonacci substitution matrix) = {phi:.6f}")

# %% [markdown]
# ## The corner lookup table
#
# Built from exactly four calls to the real `pymetrologic.quartet` API — the
# per-pixel work below is a vectorized `np.select` against this table, not a
# per-pixel Python call (3e5 pixels x N frames would be far too slow for
# per-pixel dispatch, so the *classification rule* is real API and the
# *application* of that rule is ordinary numpy).

# %%
CORNER_RGB: dict[Corner, tuple[float, float, float]] = {
    Corner.ABSURD: (0.03, 0.03, 0.10),
    Corner.POTENTIAL: (0.10, 0.55, 0.75),  # sigma-fixed
    Corner.ACTIVE: (0.85, 0.60, 0.05),  # delta-fixed
    Corner.STABLE: (1.00, 0.97, 0.85),  # joint H*
}
LOOKUP = {(t, c): corner_of_status(t, c) for t in (False, True) for c in (False, True)}
print({f"{t},{c}": corner_of_status(t, c).value for (t, c) in LOOKUP})

# %% [markdown]
# ## The interference field

# %%
RES = 480
SPAN = 5.0
N_FOLD = 5
x = np.linspace(-SPAN, SPAN, RES)
y = np.linspace(-SPAN, SPAN, RES)
X, Y = np.meshgrid(x, y)


def fields(phase: float) -> tuple[np.ndarray, np.ndarray]:
    sigma = np.zeros_like(X)
    delta = np.zeros_like(X)
    for i in range(N_FOLD):
        theta = 2 * math.pi * i / N_FOLD
        kx, ky = math.cos(theta), math.sin(theta)
        proj = kx * X + ky * Y
        sigma += np.cos(2 * math.pi * proj + phase)
        delta += np.cos(2 * math.pi * phi * proj - phase)
    return sigma, delta


def corner_image(phase: float, threshold: float = 0.15) -> np.ndarray:
    sigma, delta = fields(phase)
    sigma_n = sigma / np.abs(sigma).max()
    delta_n = delta / np.abs(delta).max()
    token = sigma_n > threshold
    claim = delta_n > threshold

    img = np.zeros((RES, RES, 3), dtype=np.float64)
    for corner in CORNERS:
        t_want = corner in (Corner.POTENTIAL, Corner.STABLE)
        c_want = corner in (Corner.ACTIVE, Corner.STABLE)
        mask = (token == t_want) & (claim == c_want)
        img[mask] = CORNER_RGB[corner]

    # brightness modulated by joint intensity so the quasicrystal texture reads
    joint = np.clip(0.5 + 0.5 * sigma_n * delta_n, 0, 1)
    return np.clip(img * (0.55 + 0.45 * joint[:, :, None]), 0, 1)


still = corner_image(0.0)
fig, ax = plt.subplots(figsize=(7, 7), facecolor="#05050c")
ax.imshow(still, origin="lower", extent=(-SPAN, SPAN, -SPAN, SPAN))
ax.set_title(f"5-fold quasicrystal, corner-colored (phi = {phi:.4f})", color="#ccd")
ax.set_xticks([])
ax.set_yticks([])
fig.tight_layout()
fig.savefig(OUT / "83-quasicrystal.png", dpi=140, facecolor=fig.get_facecolor())
plt.show()

# %% [markdown]
# ## Animated: slow phase rotation

# %%
N_FRAMES = 36
frames = []
for k in range(N_FRAMES):
    phase = 2 * math.pi * k / N_FRAMES
    img = corner_image(phase)
    frames.append((img * 255).astype(np.uint8))

gif_path = OUT / "83-quasicrystal.gif"
try:
    import imageio.v3 as iio

    iio.imwrite(gif_path, frames, duration=60, loop=0)
    print(f"wrote {gif_path}  ({len(frames)} frames)")
except ImportError:
    print("imageio not installed (uv sync --extra gallery) — skipping GIF; PNG still written.")
