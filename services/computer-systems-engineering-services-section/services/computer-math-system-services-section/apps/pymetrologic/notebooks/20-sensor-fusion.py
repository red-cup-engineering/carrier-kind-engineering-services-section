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
# # Continuous sensor fusion — the graded beat
#
# PySheaf's consistency radius is a single scalar over a metric. Our fiber is a
# **continuous bilattice** `[0,1]^⋈`, so disagreement comes back *graded* and
# *located*: how hard does each pair of sensors contradict, and where?
#
# Each sensor reports one-sided evidence — `(q, 0)` = "yes, confidence q",
# `(0, q)` = "no, confidence q" — so a lone sensor is never self-conflicted and
# every conflict that appears is genuine *disagreement*. Edges demand agreement;
# settling merges by `∨_k` and the conflict degree `pro ∧ con` on each edge is
# the graded contradiction.

# %%
from pymetrologic.calculus import graded_conflicts, sensor_fusion_sheaf

readings = {
    "n": (0.9, 0.0),  # yes, confident
    "e": (0.85, 0.0),  # yes
    "s": (0.0, 0.9),  # NO — the dissenter
    "w": (0.8, 0.0),  # yes
}
edges = [("n", "e"), ("e", "s"), ("s", "w"), ("w", "n")]

sheaf, assignment = sensor_fusion_sheaf(readings, edges)
conflicts = graded_conflicts(sheaf, assignment)
for edge, degree in sorted(conflicts.items(), key=lambda kv: -kv[1]):
    print(f"edge {edge}: graded conflict {degree:.2f}")

# %% [markdown]
# The two edges touching the dissenting sensor `s` carry heavy conflict; the
# `n-e` and `w-n` edges (all "yes") stay at zero. A scalar radius would only
# tell you "inconsistent"; we tell you *who* and *how much*.

# %% [markdown]
# ## See it
#
# Edge thickness and redness scale with the graded conflict. (Needs the
# `notebooks` extra: `uv sync --extra notebooks`.)

# %%
import matplotlib.pyplot as plt

from pymetrologic.calculus.viz import draw_sensor_fusion

draw_sensor_fusion(readings, edges)
plt.show()

# %% [markdown]
# ## Weaken the dissent and watch conflict fall
#
# As `s`'s "no" loses confidence, every edge's graded conflict decreases
# smoothly — there is no discrete cliff, unlike a 0/1 consistency verdict.

# %%
for con_s in (0.9, 0.6, 0.3, 0.1):
    r = dict(readings, s=(0.0, con_s))
    sheaf, assignment = sensor_fusion_sheaf(r, edges)
    peak = max(graded_conflicts(sheaf, assignment).values(), default=0.0)
    print(f"s = ⟨0, {con_s:.1f}⟩ (no·{con_s:.1f})   peak conflict = {peak:.2f}")
