#!/usr/bin/env python3
"""
engine.py — Relational geometry from spec/ frontmatter.

Carrier  = frozenset[Event]          Each spec file IS a position.
Empty    = frozenset()               No frontmatter.
Extend(e, h) = h | {e}              Add one event.
Order(h, k)  = h ⊆ k               Subset inclusion.
EventCommutation(a,b) = a.key==b.key  Same frontmatter key.

At each carrier position (spec file), for every (asc, desc) event pair
present in the corpus, read the four charges. Map to the four corners:

  H* — doubly quiescent: both σ-stable and Δ-stable
  S  — σ-stable only    (primed + dual_primed)
  T  — Δ-stable only    (forward_primed + backward_primed)
  F  — free shadow       (pure inquiry, neither stable)

The distribution across corners IS the geometry.
"""

from __future__ import annotations
import re, sys
from pathlib import Path
from collections import defaultdict


# ── Event ─────────────────────────────────────────────────────────────────────

class Event:
    __slots__ = ('key', 'value', '_s')
    def __init__(self, key: str, value: str):
        self.key   = key
        self.value = value
        self._s    = f'{key}\x00{value}'
    def __eq__(self, other):
        return isinstance(other, Event) and self._s == other._s
    def __hash__(self):
        return hash(self._s)
    def __repr__(self):
        return f'[{self.key}]={self.value!r}'


# ── Carrier ───────────────────────────────────────────────────────────────────
# A position h is a frozenset[Event]. Empty = frozenset().
# Order(h, k) = h <= k = h.issubset(k).
# Extend(event, h) = h | {event}.
# EventCommutation(a, b) = a.key == b.key.


# ── Reach ─────────────────────────────────────────────────────────────────────

def descent_reach(desc: Event, h: frozenset) -> bool:
    """
    Smallest set containing {positions <= Empty} = {frozenset()},
    closed under: if h | {desc} in set then h in set.
    = h is a sub-run of desc: h ⊆ {desc}, i.e. h == {} or h == {desc}.
    """
    return h <= frozenset({desc})


def ascent_reach(desc: Event, h: frozenset) -> bool:
    """
    Smallest set containing {frozenset()} where ALL h | {desc} are members.
    = h == {} OR desc in h.
    """
    return len(h) == 0 or desc in h


# ── Zones ─────────────────────────────────────────────────────────────────────

def assembled(asc: Event, desc: Event, h: frozenset) -> bool:
    """
    EmptyAssembled (+- zone):
    Smallest set containing {h: descent_reach(desc, h)},
    where ALL h | {asc} are members.
    = descent_reach(desc, h) OR asc in h.
    """
    return descent_reach(desc, h) or asc in h


def dual_assembled(asc: Event, desc: Event, h: frozenset) -> bool:
    """
    EmptyDualAssembled (-+ zone):
    Smallest set containing {h: ascent_reach(desc, h)},
    closed under: if h | {asc} in set then h in set.
    Strip asc from h (h' = h - {asc}), check ascent_reach(desc, h').
    = h - {asc} == {} OR desc in h - {asc}.
    """
    remainder = h - {asc}
    return ascent_reach(desc, remainder)


def coascent_nucleus(asc: Event, desc: Event, h: frozenset) -> bool:
    """
    EmptyCoascentNucleus (++ zone):
    Smallest set containing {h: ascent_reach(desc, h)},
    where ALL h | {asc} are members.
    = ascent_reach(desc, h) OR asc in h.
    = h=={} OR desc in h OR asc in h.
    """
    return ascent_reach(desc, h) or asc in h


def codescent_nucleus(asc: Event, desc: Event, h: frozenset) -> bool:
    """
    EmptyCodescentNucleus (-- zone):
    Smallest set containing {h: descent_reach(desc, h)},
    closed under: if h | {asc} in set then h in set.
    Strip asc, check descent_reach(desc, remainder).
    = h - {asc} ⊆ {desc}.
    """
    return (h - {asc}) <= frozenset({desc})


# ── Charges ───────────────────────────────────────────────────────────────────
# charge(asc, desc, h) = zone(asc,desc,h) → h <= Empty = h == {}
# = h=={} OR NOT zone(asc,desc,h)

def primed(asc: Event, desc: Event, h: frozenset) -> bool:
    return len(h) == 0 or not assembled(asc, desc, h)

def dual_primed(asc: Event, desc: Event, h: frozenset) -> bool:
    return len(h) == 0 or not dual_assembled(asc, desc, h)

def forward_primed(asc: Event, desc: Event, h: frozenset) -> bool:
    return len(h) == 0 or not coascent_nucleus(asc, desc, h)

def backward_primed(asc: Event, desc: Event, h: frozenset) -> bool:
    return len(h) == 0 or not codescent_nucleus(asc, desc, h)


# ── Four corners ─────────────────────────────────────────────────────────────

def corner(asc: Event, desc: Event, h: frozenset) -> str:
    p  = primed(asc, desc, h)
    dp = dual_primed(asc, desc, h)
    fp = forward_primed(asc, desc, h)
    bp = backward_primed(asc, desc, h)
    s  = p  and dp   # σ-stable: backward axis settled
    t  = fp and bp   # Δ-stable: forward axis settled
    if s and t: return 'H*'
    if s:       return 'S'
    if t:       return 'T'
    return 'F'


# ── Spec reader ───────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parents[3]
SPEC_DIR  = REPO_ROOT / 'spec'

try:
    import yaml
    def parse_frontmatter(text):
        if not text.startswith('---'): return {}
        try: end = text.index('---', 3)
        except ValueError: return {}
        try:
            r = yaml.safe_load(text[3:end].strip())
            return r if isinstance(r, dict) else {}
        except: return {}
except ImportError:
    def parse_frontmatter(text):
        if not text.startswith('---'): return {}
        try: end = text.index('---', 3)
        except ValueError: return {}
        block = text[3:end]; result = {}; key = None; lines = []
        def flush():
            if key is None: return
            raw = ' '.join(lines).strip()
            if (raw.startswith('"') and raw.endswith('"')) or \
               (raw.startswith("'") and raw.endswith("'")): raw = raw[1:-1]
            result[key] = raw
        for line in block.splitlines():
            if line.startswith(('  ','\t')): lines.append(line.strip()); continue
            m = re.match(r'^([A-Za-z0-9_-]+)\s*:(.*)', line)
            if m: flush(); key = m.group(1); lines = [m.group(2).strip()]
            else: lines.append(line.strip())
        flush(); return result

def flatten(v):
    if isinstance(v, str):  return v
    if isinstance(v, list): return ' '.join(flatten(x) for x in v)
    if isinstance(v, dict): return ' '.join(f'{k} {flatten(vv)}' for k,vv in v.items())
    return str(v)


# ── Main ──────────────────────────────────────────────────────────────────────

# ── Analytical fast-path ──────────────────────────────────────────────────────
# Theorem (provable from zone definitions):
#   For frozenset Carrier, S = T = 0 always.
#   Proof sketch:
#     forward_primed(asc,desc,h)=True  ⟹  asc∉h AND desc∉h
#     (because coascent_nucleus = desc∈h OR asc∈h; its negation forces both out)
#     asc∉h AND desc∉h  ⟹  assembled=False AND dual_assembled=False
#     ⟹  primed=True AND dual_primed=True  ⟹  σ-stable
#   So Δ-stable ⟹ σ-stable, hence no T.  By symmetric argument, no S.
#
# Therefore the four-corner distribution collapses:
#   H* = (N − k)²        k = |h|, N = total unique events
#   F  = k(2N − k)       = N² − (N−k)²
#   S  = 0
#   T  = 0

def analytical_corners(k: int, N: int) -> dict[str, int]:
    hstar = (N - k) ** 2
    return {'H*': hstar, 'S': 0, 'T': 0, 'F': N * N - hstar}


def main():
    file_positions: dict[str, frozenset] = {}
    for path in sorted(SPEC_DIR.rglob('*.md')):
        rel = str(path.relative_to(REPO_ROOT))
        fm  = parse_frontmatter(path.read_text(encoding='utf-8', errors='replace'))
        events = frozenset(Event(k, flatten(v)) for k, v in fm.items())
        if events:
            file_positions[rel] = events

    all_events: list[Event] = sorted(
        {e for pos in file_positions.values() for e in pos},
        key=lambda e: e._s
    )

    N = len(all_events)
    print(f'files={len(file_positions)}  unique-events={N}  event-pairs={N*N}')

    # Analytical four-corner distribution (S=T=0 by theorem; see analytical_corners above)
    totals = {'H*': 0, 'S': 0, 'T': 0, 'F': 0}
    file_corners: dict[str, dict[str, int]] = {}

    for rel, h in file_positions.items():
        k = len(h)
        counts = analytical_corners(k, N)
        for c, n in counts.items():
            totals[c] += n
        file_corners[rel] = counts

    total = sum(totals.values())
    print()
    print('Corner distribution (all files × all event-pairs):')
    for c, n in totals.items():
        print(f'  {c:3s}  {n:12d}  ({100*n/total:.4f}%)')
    print()
    print('Theorem: S=T=0 -- stability under sigma iff stability under Delta in frozenset Carrier.')
    print('  Every (asc,desc) pair is either doubly quiescent (H*) or free shadow (F).')
    print()

    print('Top 10 by F  (most relational presence -- highest event count):')
    for rel, counts in sorted(file_corners.items(), key=lambda x: -x[1]['F'])[:10]:
        k = len(file_positions[rel])
        frac = 100 * counts['F'] / (N * N)
        print(f'  F={counts["F"]:10d}  H*={counts["H*"]:10d}  k={k:3d}  F%={frac:.4f}  {rel}')

    print()
    print('Top 10 by H* (most quiescent -- fewest events):')
    for rel, counts in sorted(file_corners.items(), key=lambda x: -x[1]['H*'])[:10]:
        k = len(file_positions[rel])
        frac = 100 * counts['H*'] / (N * N)
        print(f'  H*={counts["H*"]:10d}  F={counts["F"]:10d}  k={k:3d}  H*%={frac:.4f}  {rel}')

    # Sample verification: spot-check one file against the brute-force corner()
    print()
    print('Sample verification (one file, 100 random event-pairs):')
    import random
    sample_rel, sample_h = next(iter(file_positions.items()))
    ev_list = list(all_events)
    mismatches = 0
    for _ in range(100):
        a = random.choice(ev_list)
        d = random.choice(ev_list)
        expected = analytical_corners(len(sample_h), N)
        actual_c = corner(a, d, sample_h)
        # Check the theorem holds: actual must be H* or F
        if actual_c not in ('H*', 'F'):
            print(f'  THEOREM VIOLATED: {actual_c} at ({a}, {d})')
            mismatches += 1
    if mismatches == 0:
        print(f'  OK  100 samples from {sample_rel!r}: all H* or F, theorem holds.')


# ── Second-order geometry ─────────────────────────────────────────────────────
#
# First order: evaluate corner(asc, desc, h) at h alone → H* or F (S=T=0).
# Second order: each charge is a PROPOSITION in the fiber H_h. Its corner in H_h
#   is determined by its truth at h AND across all extensions h∪{e}.
#
#   σ-stable in fiber: charge is True at h  (settled fact)
#   Δ-stable in fiber: AND(charge at h∪{e} for all e∉h) == charge at h
#                       (consistent with extensions — "no surprise ahead")
#
#   fiber_corner: H* | S | T | F (standard nuclear quartet semantics)
#
# Second-order position corner:
#   σ₂-stable: primed AND dual_primed are both H*-or-S in fiber
#   Δ₂-stable: forward_primed AND backward_primed are both H*-or-T in fiber
#
# Analytically (proved from charge definitions):
#   neither asc nor desc in h  →  S   (all primed charges S-fiber, backward H*-fiber)
#   asc xor desc in h          →  T   (some charges T-fiber, backward H*-fiber)
#   both in h, h≠{asc,desc}    →  T
#   h == {asc,desc}             →  F   (backward_primed F-fiber — the only F case for k>1)
#
# At second order: H*=0, S≈(N-k)²/N², T≈k(2N-k)/N², F rare (k=2 files only).

SIGMA_STABLE = frozenset({'H*', 'S'})
DELTA_STABLE = frozenset({'H*', 'T'})

def fiber_corner_of(charge_fn, asc, desc, h, all_events_set):
    """
    Treat charge_fn as a proposition in H_h.
    Evaluate at h and all one-step extensions h|{e} for e in all_events_set not in h.
    Returns H*, S, T, or F.
    """
    val_h = charge_fn(asc, desc, h)
    # delta_value = AND of charge at all extensions
    delta_val = True
    for e in all_events_set:
        if e not in h:
            if not charge_fn(asc, desc, h | {e}):
                delta_val = False
                break
    sigma_s = val_h
    delta_s = (delta_val == val_h)
    if sigma_s and delta_s: return 'H*'
    if sigma_s:              return 'S'
    if delta_s:              return 'T'
    return 'F'


def second_order_corner(asc, desc, h, all_events_set):
    fc_p  = fiber_corner_of(primed,        asc, desc, h, all_events_set)
    fc_dp = fiber_corner_of(dual_primed,   asc, desc, h, all_events_set)
    fc_fp = fiber_corner_of(forward_primed, asc, desc, h, all_events_set)
    fc_bp = fiber_corner_of(backward_primed, asc, desc, h, all_events_set)
    s2 = fc_p in SIGMA_STABLE and fc_dp in SIGMA_STABLE
    t2 = fc_fp in DELTA_STABLE and fc_bp in DELTA_STABLE
    if s2 and t2: return 'H*'
    if s2:        return 'S'
    if t2:        return 'T'
    return 'F'


def second_order_main():
    file_positions: dict[str, frozenset] = {}
    for path in sorted(SPEC_DIR.rglob('*.md')):
        rel = str(path.relative_to(REPO_ROOT))
        fm  = parse_frontmatter(path.read_text(encoding='utf-8', errors='replace'))
        events = frozenset(Event(k, flatten(v)) for k, v in fm.items())
        if events:
            file_positions[rel] = events

    all_events = frozenset(e for pos in file_positions.values() for e in pos)
    N = len(all_events)
    print(f'files={len(file_positions)}  unique-events={N}')
    print()

    totals2 = {'H*': 0, 'S': 0, 'T': 0, 'F': 0}
    file_corners2: dict[str, dict[str, int]] = {}

    for rel, h in file_positions.items():
        k = len(h)
        counts2 = {'H*': 0, 'S': 0, 'T': 0, 'F': 0}

        # Pairs where neither asc nor desc in h: analytically second-order S
        counts2['S'] += (N - k) * (N - k)

        # Interesting pairs: at least one event in h
        h_list = list(h)
        not_h = all_events - h

        # asc in h, desc not in h: second-order T (analytically) — verify a sample
        counts2['T'] += k * (N - k)

        # desc in h, asc not in h: second-order T (analytically)
        counts2['T'] += (N - k) * k

        # both in h: compute individually (F possible when h=={asc,desc})
        for asc in h_list:
            for desc in h_list:
                c2 = second_order_corner(asc, desc, h, all_events)
                counts2[c2] += 1

        file_corners2[rel] = counts2
        for c, n in counts2.items():
            totals2[c] += n

    total2 = sum(totals2.values())
    print('Second-order corner distribution (charges as fiber propositions):')
    for c, n in totals2.items():
        print(f'  {c:3s}  {n:12d}  ({100*n/total2:.4f}%)')

    print()
    print('Files with second-order F (whole history == one event-pair):')
    f_files = [(rel, c['F']) for rel, c in file_corners2.items() if c['F'] > 0]
    for rel, nf in sorted(f_files, key=lambda x: -x[1])[:15]:
        k = len(file_positions[rel])
        print(f'  F={nf:4d}  k={k}  {rel}')
    if not f_files:
        print('  (none)')


if __name__ == '__main__':
    second_order_main()
