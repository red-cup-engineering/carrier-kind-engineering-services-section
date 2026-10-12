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
# # The nuclear quartet, sonified
#
# **Renders:** a short WAV — a chord progression driven by a real corner walk
# over the same trace-tree site `80-gallery-bilattice-flow.py` builds. One
# chord per cell, in canonical (breadth-first) order; the corner at each cell
# selects a harmonic function, and `pymetrologic.Bilattice.conflict_degree`
# sets the note's hold length — real settling data, not a hand-tuned rhythm
# track.
#
# **Instantiates:** the same `Obsmetrologia.Articulation.Articulating.FourCorner`
# read-off as the `flow`/`void_crystal` piece (`pymetrologic.quartet.Corner`,
# `pymetrologic.quartet.charge_of_corner`, `pymetrologic.bilattice.Bilattice.conflict_degree`).
#
# **Legacy ancestor (read-only, not modified):** under
# `lib/emsenn/services/561-group/lib/legacy/2026-04-30-mypc-relationality-repo/`
# `relationality-repo/operations/science/toys/music/quartet.py`
# — "VoidKernel: The Nuclear Quartet in C (Polyphonic)." The legacy toy is a
# fully hand-composed four-voice score (specific pitches, voice-leading,
# rhythm) that happens to be organized around the same four zone glyphs; that
# composition is *content*, not algebra, so this notebook does not reproduce
# it. What it keeps is the toy's own **zone-stability-governs-note-length**
# idea and its `wave`-module WAV writer (`write_wav`), and drives both from
# real `pymetrologic` corner/conflict data instead of hand-picked durations.
#
# ## Zone → corner translation
#
# The legacy toy's own zone-to-glyph table
# (`toys/_index.md`: "**++ Done** (doubly stable), **+- Possible**
# (transfer-stable), **-+ Necessary** (saturation-stable), **-- Absurd**
# (neither)") is, unlike `flow.py`'s 4-bit membership vector, already a
# **single glyph per state** — so it maps cleanly and unambiguously onto
# `Corner` by reading each glyph as `(token, claim)` with `+`=`True`,
# `-`=`False`:
#
# | glyph | legacy name | `corner_of_status(token, claim)` |
# |---|---|---|
# | `--` | Absurd (neither) | **absurd** — told none |
# | `+-` | Possible (transfer-stable) | **potential** — told true |
# | `-+` | Necessary (saturation-stable) | **active** — told false |
# | `++` | Done (doubly stable) | **stable** — told both |
#
# The harmonic-function assignment itself (`tonic`/`pre-dominant`/`dominant`/
# `diminished`) is **not** pinned by anything upstream — this notebook's own
# deliberate choice, stated rather than left implicit: `absurd` (told-none,
# the initial cell) is **tonic**, the harmonic "home" a phrase starts from
# and resolves to; `potential` (told-true) is **pre-dominant**, motion away
# from home; `active` (told-false) is **dominant**, tension wanting
# resolution; and `stable` (told-both, the `<=_k`-absorbing point) is
# **diminished** — not "resolved" at all, but the single most harmonically
# *loaded* of the four classical functions, matching `stable` being the most
# evidentially loaded corner.

# %%
import itertools
import math
import wave
from collections import deque
from pathlib import Path

import numpy as np

from pymetrologic import four
from pymetrologic.quartet import Corner, charge_of_corner, corner_of_status
from pymetrologic.site import Site

OUT = Path(__file__).parent / "gallery-output"
OUT.mkdir(parents=True, exist_ok=True)

SR = 44100
bl = four()

# %% [markdown]
# ## Rebuilding the trace-tree corner walk
#
# Same site as `80-gallery-bilattice-flow.py` (kept self-contained rather
# than imported, since notebooks are standalone scripts here); same
# `(asc, desc) = (A, B)` pair; walked breadth-first from `void` along the
# site's own face relation.

# %%
MOMENTS = (0, 1, 2)
NAMES = {0: "A", 1: "B", 2: "C"}
MAX_DEPTH = 2
VOID: tuple[int, ...] = ()


def all_traces(max_depth: int) -> list[tuple[int, ...]]:
    result: list[tuple[int, ...]] = [VOID]
    for d in range(1, max_depth + 1):
        result.extend(itertools.product(MOMENTS, repeat=d))
    return result


traces = all_traces(MAX_DEPTH)
cell_names = {t: ("void" if t == VOID else "".join(NAMES[m] for m in t)) for t in traces}
faces = tuple((t[1:], t) for t in traces if t != VOID)
site = Site(
    cells=tuple(cell_names.values()), faces=tuple((cell_names[a], cell_names[b]) for a, b in faces)
)


def status_bits(asc: int, desc: int, t: tuple[int, ...]) -> tuple[bool, bool]:
    token = t == VOID or t[0] == asc
    i = 0
    while i < len(t) and t[i] == asc:
        i += 1
    rest = t[i:]
    claim = rest == VOID or rest[0] == desc
    return token, claim


ASC, DESC = 0, 1
corner_of: dict[tuple[int, ...], Corner] = {
    t: corner_of_status(*status_bits(ASC, DESC, t)) for t in traces
}

# breadth-first walk of the site from "void"
walk: list[str] = []
seen = {"void"}
queue = deque(["void"])
while queue:
    cell = queue.popleft()
    walk.append(cell)
    for child in site.cofaces(cell):
        if child not in seen:
            seen.add(child)
            queue.append(child)

name_to_trace = {v: k for k, v in cell_names.items()}
walk_corners = [corner_of[name_to_trace[name]] for name in walk]
print("walk:", " ".join(f"{n}:{c.value}" for n, c in zip(walk, walk_corners, strict=True)))

# %% [markdown]
# ## Harmonic function per corner
#
# Chord tones (MIDI note numbers) for four functions in C, voiced as simple
# triads/sevenths; `conflict_degree` (0 for every non-`stable` corner in
# `four()`, since `pro`/`con` are never both `1` there except at `stable`
# itself) sets the hold: a `stable` chord rings for longer.

# %%
FUNCTION_CHORDS: dict[Corner, list[int]] = {
    Corner.ABSURD: [48, 52, 55],  # C major — tonic, home
    Corner.POTENTIAL: [53, 57, 60],  # F major — pre-dominant (IV)
    Corner.ACTIVE: [55, 59, 62, 65],  # G7 — dominant
    Corner.STABLE: [59, 62, 65, 68],  # B diminished 7th — most loaded
}
BASE_DUR = 0.55


def adsr(n: int, attack_s: float = 0.01, release_s: float = 0.08) -> np.ndarray:
    env = np.ones(n)
    a = min(int(attack_s * SR), n)
    r = min(int(release_s * SR), n)
    env[:a] = np.linspace(0.0, 1.0, a)
    env[max(0, n - r) :] *= np.linspace(1.0, 0.0, min(r, n))
    return env


def synth_chord(midi_notes: list[int], duration_s: float, amp: float = 0.18) -> np.ndarray:
    n = max(int(duration_s * SR), 1)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for midi in midi_notes:
        f0 = 440.0 * 2.0 ** ((midi - 69) / 12.0)
        sig += amp * np.sin(2 * math.pi * f0 * t)
        sig += amp * 0.3 * np.sin(2 * math.pi * f0 * 2 * t)  # octave overtone
    sig *= adsr(n)
    return sig / max(1, len(midi_notes))


chords: list[np.ndarray] = []
for corner in walk_corners:
    charge = charge_of_corner(bl, corner)
    conflict = bl.conflict_degree(charge)  # 0 or 1 in the boolean base lattice
    duration = BASE_DUR * (1.0 + 1.4 * conflict)
    chords.append(synth_chord(FUNCTION_CHORDS[corner], duration))

audio = np.concatenate(chords)
peak = np.max(np.abs(audio))
if peak > 0:
    audio = audio / peak * 0.85

wav_path = OUT / "84-quartet-sonification.wav"
with wave.open(str(wav_path), "w") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes((audio * 32767).astype(np.int16).tobytes())

print(f"wrote {wav_path}  ({len(audio) / SR:.2f}s, {len(walk_corners)} chords)")
