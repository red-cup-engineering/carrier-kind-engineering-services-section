# ---
# jupyter:
#   jupytext:
#     formats: ipynb,py:percent
#     text_representation:
#       extension: .py
#       format_name: percent
#       format_version: '1.3'
#       jupytext_version: 1.19.4
#   kernelspec:
#     display_name: Python 3
#     language: python
#     name: python3
# ---

# %% [markdown]
# # Wilderness Experiments
#
# This notebook is the quarantine for playful code that has not yet been earned
# from `lean/RelMath`. Keep experiments local to notebook cells until a real
# Lean theorem, definition, or frontier lemma justifies a `pymetrologic` module.

# %%
from dataclasses import dataclass
from math import sin


@dataclass(frozen=True, slots=True)
class ExperimentReport:
    name: str
    values: tuple[float, ...]

    @property
    def spread(self) -> float:
        return max(self.values) - min(self.values)


def sine_field(width: int, height: int, *, frequency: float = 0.37) -> ExperimentReport:
    if width < 1 or height < 1:
        raise ValueError("width and height must be positive")
    values = tuple(
        sin((x + 1) * frequency) + sin((y + 1) * frequency * 1.7)
        for y in range(height)
        for x in range(width)
    )
    return ExperimentReport(name="sine-field", values=values)


report = sine_field(12, 8)
(report.name, len(report.values), round(report.spread, 6))
