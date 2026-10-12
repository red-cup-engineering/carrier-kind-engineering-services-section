#!/usr/bin/env python3
"""
RECURSIVE MEANING COMPRESSION — RO^n vs STATISTICS
====================================================

Each RO level peels algebraic redundancy at a different scale.
No combination with standard codecs. Pure algebraic vs pure statistical.

Level 0: Raw data (events + all intermediate states)
Level 1: Drop settled states (bypass-recoverable). Keep skeleton + free states.
Level 2: Canonicalize skeleton via transport equivalence (Mazurkiewicz traces).
         Commuting-adjacent events get sorted into normal form.
Level 3: Block compression — identical canonical commuting-blocks stored once.
Level 4: Structural deduplication — repeated patterns in the block sequence.

Statistical codecs see bytes. RO sees derivability.
The question: at what depth does algebraic compression beat statistical?
"""

import zlib
import bz2
import lzma
import json
import struct
import random
import io
from collections import Counter, defaultdict

try:
    import zstandard as zstd
    HAS_ZSTD = True
except:
    HAS_ZSTD = False

try:
    import lz4.frame
    HAS_LZ4 = True
except:
    HAS_LZ4 = False

try:
    import brotli
    HAS_BROTLI = True
except:
    HAS_BROTLI = False


# ══════════════════════════════════════════════════════════════════════════
# BINARY SERIALIZATION — fair to both sides
# ══════════════════════════════════════════════════════════════════════════

def encode_varint(n):
    """Variable-length integer encoding."""
    out = bytearray()
    n = abs(n) * 2 + (1 if n < 0 else 0)  # zigzag for signed
    while n >= 0x80:
        out.append((n & 0x7F) | 0x80)
        n >>= 7
    out.append(n & 0x7F)
    return bytes(out)


def encode_state(state, event_map):
    """Pack a state into bytes. Handles tuples, dicts, strings."""
    if isinstance(state, (tuple, list)):
        buf = encode_varint(len(state))
        for item in state:
            buf += encode_state(item, event_map)
        return buf
    elif isinstance(state, dict):
        items = sorted(state.items())
        buf = encode_varint(len(items))
        for k, v in items:
            kb = str(k).encode('utf-8')
            buf += encode_varint(len(kb)) + kb
            buf += encode_state(v, event_map)
        return buf
    elif isinstance(state, (int, float)):
        return struct.pack('<d', float(state))
    elif isinstance(state, str):
        sb = state.encode('utf-8')
        return encode_varint(len(sb)) + sb
    elif isinstance(state, frozenset):
        items = sorted(str(x) for x in state)
        buf = encode_varint(len(items))
        for item in items:
            ib = item.encode('utf-8')
            buf += encode_varint(len(ib)) + ib
        return buf
    else:
        sb = str(state).encode('utf-8')
        return encode_varint(len(sb)) + sb


def encode_events(events, event_map):
    """Pack event sequence: each event as a mapped byte."""
    buf = encode_varint(len(events))
    for ev in events:
        buf += encode_varint(event_map[ev])
    return buf


def build_event_map(events):
    """Assign compact IDs to unique event types."""
    unique = sorted(set(events))
    return {ev: i for i, ev in enumerate(unique)}


# ══════════════════════════════════════════════════════════════════════════
# COMMUTATION RELATION
# ══════════════════════════════════════════════════════════════════════════

class CommutationRelation:
    def __init__(self, events, commuting_pairs):
        self.events = set(events)
        self.commuting = set()
        for a, b in commuting_pairs:
            self.commuting.add((a, b))
            self.commuting.add((b, a))
        for e in events:
            self.commuting.add((e, e))

    def commutes(self, a, b):
        return (a, b) in self.commuting

    def all_commute(self, event_list):
        """Check if all events in list mutually commute."""
        for i in range(len(event_list)):
            for j in range(i + 1, len(event_list)):
                if not self.commutes(event_list[i], event_list[j]):
                    return False
        return True


# ══════════════════════════════════════════════════════════════════════════
# RECURSIVE RO CODEC
# ══════════════════════════════════════════════════════════════════════════

class RecursiveROCodec:
    """
    Multi-level algebraic compression.

    Each level applies the bypass theorem at a different scale.
    The depth tower collapses: Primed^n at Settled → P.
    """

    def __init__(self, events, states, commutation, event_base_fn=None):
        self.events = events
        self.states = states
        self.comm = commutation
        self.event_base = event_base_fn or (lambda x: x)
        self.event_map = build_event_map(events)

    # ── Level 0: Raw binary serialization ──────────────────────────────

    def level0_encode(self):
        """Full data: all events + all states, binary packed."""
        buf = encode_events(self.events, self.event_map)
        buf += encode_varint(len(self.states))
        for state in self.states:
            s = encode_state(state, self.event_map)
            buf += encode_varint(len(s)) + s
        return buf

    # ── Level 1: Drop settled states ───────────────────────────────────

    def level1_encode(self):
        """
        Bypass theorem: every non-ε position is Settled in its outer event.
        Drop all intermediate states. Keep skeleton + ε state.

        This is the first RO pass. The bypass IS the decompressor.
        """
        # The skeleton (event sequence)
        buf = encode_events(self.events, self.event_map)

        # Free states only — typically just ε (index 0)
        # A chain with no non-commuting pairs has NO free positions
        has_defect = any(
            not self.comm.commutes(
                self.event_base(self.events[i]),
                self.event_base(self.events[i + 1]))
            for i in range(len(self.events) - 1)
        ) if len(self.events) > 1 else False

        if has_defect:
            free_state = encode_state(self.states[0], self.event_map)
            buf += encode_varint(1)  # 1 free state
            buf += encode_varint(len(free_state)) + free_state
        else:
            # Fully flat chain — even ε is derivable from structure
            buf += encode_varint(0)

        return buf

    # ── Level 2: Mazurkiewicz trace normal form ────────────────────────

    def _find_commuting_blocks(self):
        """
        Partition the event sequence into maximal blocks of mutually
        commuting events. Within each block, all orderings are
        transport-equivalent. Between blocks, the boundary is a
        non-commuting junction = genuine defect.

        This is the Transport theorem applied recursively to the skeleton.
        """
        if not self.events:
            return []

        blocks = []
        current_block = [self.events[0]]

        for i in range(1, len(self.events)):
            ev = self.events[i]
            # Check if ev commutes with ALL events in current block
            can_extend = all(
                self.comm.commutes(self.event_base(ev), self.event_base(existing))
                for existing in current_block
            )
            if can_extend:
                current_block.append(ev)
            else:
                blocks.append(current_block)
                current_block = [ev]

        blocks.append(current_block)
        return blocks

    def _canonicalize_block(self, block):
        """
        Sort a commuting block into canonical order.
        Since all events commute, any ordering is transport-equivalent.
        Canonical form = sorted. This is lossless by the Transport theorem.
        """
        return tuple(sorted(block))

    def level2_encode(self):
        """
        Canonicalize skeleton via Mazurkiewicz trace normal form.

        Two skeletons that differ only by commuting swaps → same encoding.
        This captures transport equivalence that statistics CANNOT see.

        Encoding: number of blocks, then for each block: length + canonical events.
        Plus free states from Level 1.
        """
        blocks = self._find_commuting_blocks()
        canonical_blocks = [self._canonicalize_block(b) for b in blocks]

        buf = encode_varint(len(canonical_blocks))
        for block in canonical_blocks:
            buf += encode_varint(len(block))
            for ev in block:
                buf += encode_varint(self.event_map[ev])

        # Free states (same as level 1)
        has_defect = len(canonical_blocks) > 1  # multiple blocks ⟹ non-commuting junctions exist
        if has_defect:
            free_state = encode_state(self.states[0], self.event_map)
            buf += encode_varint(1)
            buf += encode_varint(len(free_state)) + free_state
        else:
            buf += encode_varint(0)

        return buf

    # ── Level 3: Block deduplication ───────────────────────────────────

    def level3_encode(self):
        """
        Identical canonical blocks stored once in a dictionary.
        References by index. Multiset representation within blocks.

        This is the algebraic analog of dictionary compression —
        but the "words" are commuting-equivalence classes, not byte strings.
        """
        blocks = self._find_commuting_blocks()
        canonical_blocks = [self._canonicalize_block(b) for b in blocks]

        # Build block dictionary — unique canonical blocks
        block_dict = {}
        block_ids = []
        for block in canonical_blocks:
            key = block  # tuple, hashable
            if key not in block_dict:
                block_dict[key] = len(block_dict)
            block_ids.append(block_dict[key])

        unique_blocks = sorted(block_dict.items(), key=lambda x: x[1])

        # Encode dictionary
        buf = encode_varint(len(unique_blocks))
        for block, _ in unique_blocks:
            buf += encode_varint(len(block))
            for ev in block:
                buf += encode_varint(self.event_map[ev])

        # Encode sequence of block references
        buf += encode_varint(len(block_ids))
        for bid in block_ids:
            buf += encode_varint(bid)

        # Free states
        has_defect = len(canonical_blocks) > 1
        if has_defect:
            free_state = encode_state(self.states[0], self.event_map)
            buf += encode_varint(1)
            buf += encode_varint(len(free_state)) + free_state
        else:
            buf += encode_varint(0)

        return buf

    # ── Level 4: Multiset + run-length encoding ───────────────────────

    def level4_encode(self):
        """
        Within each canonical block, store as multiset (event: count).
        Since all events commute, the ordering is irrelevant —
        only the COUNTS matter.

        Then run-length encode the block reference sequence.

        This is the deepest algebraic compression: events reduced to
        pure multiplicity, blocks reduced to repetition counts.
        """
        blocks = self._find_commuting_blocks()
        canonical_blocks = [self._canonicalize_block(b) for b in blocks]

        # Convert blocks to multisets
        multisets = []
        for block in canonical_blocks:
            ms = Counter(block)
            multisets.append(tuple(sorted(ms.items())))

        # Build multiset dictionary
        ms_dict = {}
        ms_ids = []
        for ms in multisets:
            if ms not in ms_dict:
                ms_dict[ms] = len(ms_dict)
            ms_ids.append(ms_dict[ms])

        unique_ms = sorted(ms_dict.items(), key=lambda x: x[1])

        # Encode multiset dictionary
        buf = encode_varint(len(unique_ms))
        for ms, _ in unique_ms:
            buf += encode_varint(len(ms))
            for ev, count in ms:
                buf += encode_varint(self.event_map[ev])
                buf += encode_varint(count)

        # Run-length encode the multiset reference sequence
        rle = []
        if ms_ids:
            current = ms_ids[0]
            run_len = 1
            for i in range(1, len(ms_ids)):
                if ms_ids[i] == current:
                    run_len += 1
                else:
                    rle.append((current, run_len))
                    current = ms_ids[i]
                    run_len = 1
            rle.append((current, run_len))

        buf += encode_varint(len(rle))
        for ref, count in rle:
            buf += encode_varint(ref)
            buf += encode_varint(count)

        # Free states
        has_defect = len(canonical_blocks) > 1
        if has_defect:
            free_state = encode_state(self.states[0], self.event_map)
            buf += encode_varint(1)
            buf += encode_varint(len(free_state)) + free_state
        else:
            buf += encode_varint(0)

        return buf

    # ── Level 5: Pure defect encoding ──────────────────────────────────

    def level5_encode(self):
        """
        The irreducible core.

        Everything that ISN'T transport-equivalent or settled is
        a genuine non-commuting junction. Encode ONLY:
          - The set of unique event types used (alphabet)
          - The number of each event type (total multiset)
          - The positions of non-commuting junctions (defect map)
          - The ε state

        The defect map IS the meaning. Everything else is derivable.
        This is the bottom of the tower — Primed^∞ at ε.
        """
        blocks = self._find_commuting_blocks()

        # Total event multiset (alphabet + counts)
        total_ms = Counter(self.events)

        buf = encode_varint(len(total_ms))
        for ev, count in sorted(total_ms.items()):
            buf += encode_varint(self.event_map[ev])
            buf += encode_varint(count)

        # Defect map: positions where blocks change (non-commuting junctions)
        # These are the only positions where ordering matters
        defect_positions = []
        pos = 0
        for block in blocks:
            pos += len(block)
            defect_positions.append(pos)
        defect_positions = defect_positions[:-1]  # last boundary is end-of-chain, not defect

        buf += encode_varint(len(defect_positions))
        prev = 0
        for dp in defect_positions:
            buf += encode_varint(dp - prev)  # delta encoding
            prev = dp

        # What event types are on each side of each defect junction
        # (This encodes WHICH non-commuting pair creates the defect)
        for i, block in enumerate(blocks[:-1]):
            # Last event of this block, first event of next block
            buf += encode_varint(self.event_map[block[-1]])
            buf += encode_varint(self.event_map[blocks[i + 1][0]])

        # Free state (ε)
        if defect_positions:
            free_state = encode_state(self.states[0], self.event_map)
            buf += encode_varint(len(free_state)) + free_state
        else:
            buf += encode_varint(0)

        # For reconstruction: within each block, need the multiset
        for block in blocks:
            ms = Counter(block)
            buf += encode_varint(len(ms))
            for ev, count in sorted(ms.items()):
                buf += encode_varint(self.event_map[ev])
                buf += encode_varint(count)

        return buf


# ══════════════════════════════════════════════════════════════════════════
# TEST DOMAINS
# ══════════════════════════════════════════════════════════════════════════

def make_register_machine(length, seed=42):
    rng = random.Random(seed)
    ops = [
        ('ADD_R0', {0}), ('SUB_R0', {0}), ('MUL_R0', {0}),
        ('ADD_R1', {1}), ('SUB_R1', {1}), ('MUL_R1', {1}),
        ('ADD_R2', {2}), ('SET_R2', {2}),
        ('ADD_R3', {3}), ('LOAD_R3', {3}),
        ('SWAP_01', {0, 1}),
    ]
    event_names = [o[0] for o in ops]
    touches = {o[0]: o[1] for o in ops}
    commuting = [(a, b) for a in event_names for b in event_names
                 if a < b and touches[a].isdisjoint(touches[b])]
    comm = CommutationRelation(event_names, commuting)
    events = [rng.choice(event_names) for _ in range(length)]

    regs = [0, 0, 0, 0]
    states = [tuple(regs)]
    for ev in events:
        regs = list(regs)
        if ev == 'ADD_R0': regs[0] += 1
        elif ev == 'SUB_R0': regs[0] -= 1
        elif ev == 'MUL_R0': regs[0] *= 2
        elif ev == 'ADD_R1': regs[1] += 1
        elif ev == 'SUB_R1': regs[1] -= 1
        elif ev == 'MUL_R1': regs[1] *= 2
        elif ev == 'ADD_R2': regs[2] += 1
        elif ev == 'SET_R2': regs[2] = 42
        elif ev == 'ADD_R3': regs[3] += 1
        elif ev == 'LOAD_R3': regs[3] = 100
        elif ev == 'SWAP_01': regs[0], regs[1] = regs[1], regs[0]
        states.append(tuple(regs))
    return events, states, comm


def make_database_tx(length, seed=42):
    rng = random.Random(seed)
    tables = ['users', 'orders', 'products', 'logs', 'sessions', 'payments']
    ops = []
    for t in tables:
        for op in ['INSERT', 'UPDATE', 'DELETE']:
            ops.append(f'{op}_{t}')
    commuting = [(a, b) for a in ops for b in ops
                 if a < b and a.split('_', 1)[1] != b.split('_', 1)[1]]
    comm = CommutationRelation(ops, commuting)
    events = [rng.choice(ops) for _ in range(length)]

    counts = {t: 0 for t in tables}
    states = [dict(counts)]
    for ev in events:
        counts = dict(counts)
        table = ev.split('_', 1)[1]
        if ev.startswith('INSERT'): counts[table] += 1
        elif ev.startswith('DELETE'): counts[table] = max(0, counts[table] - 1)
        states.append(dict(counts))
    return events, states, comm


def make_music(length, seed=42):
    rng = random.Random(seed)
    event_names = [
        'P+', 'P-', 'R*2', 'R/2', 'D+', 'D-',
        'STACC', 'LEG', 'TRANS', 'SUST', 'VIB', 'BEND',
    ]
    groups = {
        'P+': 'pitch', 'P-': 'pitch', 'TRANS': 'pitch', 'BEND': 'pitch',
        'R*2': 'rhythm', 'R/2': 'rhythm', 'SUST': 'rhythm',
        'D+': 'dyn', 'D-': 'dyn',
        'STACC': 'art', 'LEG': 'art', 'VIB': 'art',
    }
    commuting = [(a, b) for a in event_names for b in event_names
                 if a < b and groups[a] != groups[b]]
    comm = CommutationRelation(event_names, commuting)
    events = [rng.choice(event_names) for _ in range(length)]

    pitch, rhythm, dyn, art = 60, 1.0, 80, 0
    states = [(pitch, rhythm, dyn, art)]
    for ev in events:
        if ev == 'P+': pitch += 1
        elif ev == 'P-': pitch -= 1
        elif ev == 'TRANS': pitch += 12
        elif ev == 'BEND': pitch += 0.5
        elif ev == 'R*2': rhythm *= 2
        elif ev == 'R/2': rhythm *= 0.5
        elif ev == 'SUST': rhythm *= 1.5
        elif ev == 'D+': dyn = min(127, dyn + 10)
        elif ev == 'D-': dyn = max(0, dyn - 10)
        elif ev == 'STACC': art = 1
        elif ev == 'LEG': art = 2
        elif ev == 'VIB': art = 3
        states.append((pitch, rhythm, dyn, art))
    return events, states, comm


def make_random_walk(length, seed=42):
    rng = random.Random(seed)
    event_names = ['X+', 'X-', 'Y+', 'Y-', 'Z+', 'Z-', 'SX', 'SY', 'SZ', 'ROT']
    axis_map = {
        'X+': 'x', 'X-': 'x', 'SX': 'x',
        'Y+': 'y', 'Y-': 'y', 'SY': 'y',
        'Z+': 'z', 'Z-': 'z', 'SZ': 'z',
        'ROT': 'rot',
    }
    commuting = [(a, b) for a in event_names for b in event_names
                 if a < b and axis_map[a] != axis_map[b]]
    comm = CommutationRelation(event_names, commuting)
    events = [rng.choice(event_names) for _ in range(length)]

    x, y, z, sx, sy, sz, angle = 0, 0, 0, 1.0, 1.0, 1.0, 0
    states = [(x, y, z, sx, sy, sz, angle)]
    for ev in events:
        if ev == 'X+': x += sx
        elif ev == 'X-': x -= sx
        elif ev == 'Y+': y += sy
        elif ev == 'Y-': y -= sy
        elif ev == 'Z+': z += sz
        elif ev == 'Z-': z -= sz
        elif ev == 'SX': sx *= 1.5
        elif ev == 'SY': sy *= 1.5
        elif ev == 'SZ': sz *= 1.5
        elif ev == 'ROT': angle += 15
        states.append((x, y, z, sx, sy, sz, angle))
    return events, states, comm


def make_concurrent_log(length, seed=42):
    """
    Simulates a concurrent system with many independent threads.
    HIGH commutation ratio — most events commute because threads are independent.
    This is where recursive RO should dominate hardest.
    """
    rng = random.Random(seed)
    n_threads = 8
    ops = []
    for t in range(n_threads):
        ops.extend([f'T{t}_READ', f'T{t}_WRITE', f'T{t}_LOCK', f'T{t}_UNLOCK'])
    commuting = [(a, b) for a in ops for b in ops
                 if a < b and a[:2] != b[:2]]
    comm = CommutationRelation(ops, commuting)
    events = [rng.choice(ops) for _ in range(length)]

    thread_state = {t: (0, 'idle') for t in range(n_threads)}
    states = [dict(thread_state)]
    for ev in events:
        thread_state = dict(thread_state)
        tid = int(ev[1])
        op = ev[3:]
        count, status = thread_state[tid]
        if op == 'READ': count += 1
        elif op == 'WRITE': count += 10
        elif op == 'LOCK': status = 'locked'
        elif op == 'UNLOCK': status = 'idle'
        thread_state[tid] = (count, status)
        states.append(dict(thread_state))
    return events, states, comm


# ══════════════════════════════════════════════════════════════════════════
# STANDARD CODECS
# ══════════════════════════════════════════════════════════════════════════

def standard_compress(data):
    """Compress with all available codecs, return {name: size}."""
    results = {}
    results['gzip-9'] = len(zlib.compress(data, 9))
    results['bzip2-9'] = len(bz2.compress(data, 9))
    results['lzma-9'] = len(lzma.compress(data, preset=9))
    if HAS_ZSTD:
        results['zstd-22'] = len(zstd.ZstdCompressor(level=22).compress(data))
    if HAS_LZ4:
        results['lz4-16'] = len(lz4.frame.compress(data, compression_level=16))
    if HAS_BROTLI:
        results['brotli-11'] = len(brotli.compress(data, quality=11))
    return results


# ══════════════════════════════════════════════════════════════════════════
# BENCHMARK
# ══════════════════════════════════════════════════════════════════════════

def run_full_benchmark():
    domains = [
        ("Register Machine", make_register_machine),
        ("Database Tx Log", make_database_tx),
        ("Musical Events", make_music),
        ("Random Walk 3D", make_random_walk),
        ("Concurrent Log (8 threads)", make_concurrent_log),
    ]

    lengths = [50, 200, 500, 1000, 2000]

    print("=" * 90)
    print("RECURSIVE MEANING COMPRESSION — RO^n vs STATISTICAL CODECS (STANDALONE)")
    print("=" * 90)
    print()

    all_results = []

    for domain_name, generator in domains:
        print(f"{'━' * 90}")
        print(f"  {domain_name}")
        print(f"{'━' * 90}")
        print()

        for length in lengths:
            events, states, comm = generator(length)
            codec = RecursiveROCodec(events, states, comm)

            # RO at each level
            l0 = codec.level0_encode()
            l1 = codec.level1_encode()
            l2 = codec.level2_encode()
            l3 = codec.level3_encode()
            l4 = codec.level4_encode()
            l5 = codec.level5_encode()

            ro_sizes = {
                'L0 (raw)': len(l0),
                'L1 (drop states)': len(l1),
                'L2 (trace normal)': len(l2),
                'L3 (block dedup)': len(l3),
                'L4 (multiset+RLE)': len(l4),
                'L5 (defect map)': len(l5),
            }

            # Standard codecs on the same L0 binary data
            stat_sizes = standard_compress(l0)

            # Find best of each
            best_ro_name = min(ro_sizes, key=ro_sizes.get)
            best_ro = ro_sizes[best_ro_name]
            best_stat_name = min(stat_sizes, key=stat_sizes.get)
            best_stat = stat_sizes[best_stat_name]

            # Commutation stats
            blocks = codec._find_commuting_blocks()
            n_blocks = len(blocks)
            n_defect = n_blocks - 1
            n_flat_pairs = sum(
                1 for i in range(len(events) - 1)
                if comm.commutes(events[i], events[i + 1])
            )
            flat_ratio = n_flat_pairs / max(1, len(events) - 1) * 100
            avg_block = len(events) / max(1, n_blocks)

            # Unique canonical blocks
            canonical = [codec._canonicalize_block(b) for b in blocks]
            unique_blocks = len(set(canonical))
            dedup_ratio = (1 - unique_blocks / max(1, n_blocks)) * 100 if n_blocks > 0 else 0

            # Print
            winner = "RO" if best_ro <= best_stat else "STAT"
            margin = abs(best_ro - best_stat) / max(best_ro, best_stat) * 100

            print(f"  n={length:>5}  |  blocks: {n_blocks:>4} ({avg_block:.1f} avg)  "
                  f"flat: {flat_ratio:.0f}%  dedup: {dedup_ratio:.0f}%  "
                  f"unique: {unique_blocks}/{n_blocks}")

            print(f"          |  ", end="")
            for name, size in ro_sizes.items():
                marker = "◆" if size == best_ro else " "
                print(f"{marker}{name}: {size:>6}", end="  ")
            print()

            print(f"          |  ", end="")
            for name, size in sorted(stat_sizes.items(), key=lambda x: x[1]):
                marker = "◆" if size == best_stat else " "
                print(f"{marker}{name}: {size:>6}", end="  ")
            print()

            if winner == "RO":
                print(f"          |  ⟹  RO WINS: {best_ro_name} = {best_ro} bytes "
                      f"vs {best_stat_name} = {best_stat} bytes "
                      f"({margin:.1f}% smaller)")
            else:
                print(f"          |  ⟹  STAT WINS: {best_stat_name} = {best_stat} bytes "
                      f"vs {best_ro_name} = {best_ro} bytes "
                      f"({margin:.1f}% smaller)")
            print()

            all_results.append({
                'domain': domain_name,
                'length': length,
                'best_ro': best_ro,
                'best_ro_name': best_ro_name,
                'best_stat': best_stat,
                'best_stat_name': best_stat_name,
                'winner': winner,
                'margin': margin,
                'flat_ratio': flat_ratio,
                'dedup_ratio': dedup_ratio,
                'n_blocks': n_blocks,
                'all_ro': ro_sizes,
                'all_stat': stat_sizes,
            })

    # ── Summary ─────────────────────────────────────────────────────────
    print()
    print("=" * 90)
    print("SUMMARY")
    print("=" * 90)
    print()

    ro_wins = sum(1 for r in all_results if r['winner'] == 'RO')
    stat_wins = sum(1 for r in all_results if r['winner'] == 'STAT')
    total = len(all_results)

    print(f"  RO wins:   {ro_wins}/{total}")
    print(f"  STAT wins: {stat_wins}/{total}")
    print()

    # By domain
    print("  By domain:")
    for domain_name, _ in domains:
        domain_results = [r for r in all_results if r['domain'] == domain_name]
        dw = sum(1 for r in domain_results if r['winner'] == 'RO')
        print(f"    {domain_name:<35} RO wins {dw}/{len(domain_results)}")
    print()

    # By length
    print("  By chain length:")
    for length in lengths:
        length_results = [r for r in all_results if r['length'] == length]
        lw = sum(1 for r in length_results if r['winner'] == 'RO')
        print(f"    n={length:<6} RO wins {lw}/{len(length_results)}")
    print()

    # Crossover analysis
    print("  Crossover analysis (where RO starts winning):")
    for domain_name, _ in domains:
        domain_results = sorted(
            [r for r in all_results if r['domain'] == domain_name],
            key=lambda r: r['length']
        )
        first_win = None
        for r in domain_results:
            if r['winner'] == 'RO':
                first_win = r['length']
                break
        if first_win:
            print(f"    {domain_name:<35} RO starts winning at n={first_win}")
        else:
            print(f"    {domain_name:<35} STAT wins at all tested lengths")
    print()

    # Where RO wins biggest
    if ro_wins > 0:
        biggest_ro_win = max(
            (r for r in all_results if r['winner'] == 'RO'),
            key=lambda r: r['margin']
        )
        print(f"  Biggest RO win: {biggest_ro_win['domain']} n={biggest_ro_win['length']} "
              f"({biggest_ro_win['margin']:.1f}% margin, "
              f"{biggest_ro_win['best_ro_name']}={biggest_ro_win['best_ro']}B "
              f"vs {biggest_ro_win['best_stat_name']}={biggest_ro_win['best_stat']}B)")

    if stat_wins > 0:
        biggest_stat_win = max(
            (r for r in all_results if r['winner'] == 'STAT'),
            key=lambda r: r['margin']
        )
        print(f"  Biggest STAT win: {biggest_stat_win['domain']} n={biggest_stat_win['length']} "
              f"({biggest_stat_win['margin']:.1f}% margin, "
              f"{biggest_stat_win['best_stat_name']}={biggest_stat_win['best_stat']}B "
              f"vs {biggest_stat_win['best_ro_name']}={biggest_stat_win['best_ro']}B)")

    print()
    print("─" * 90)
    print("ANALYSIS")
    print("─" * 90)
    print()
    print("Statistical codecs find repeated byte patterns.")
    print("Recursive RO finds algebraic derivability at every scale:")
    print("  L1: Intermediate states are derivable from events (bypass theorem)")
    print("  L2: Commuting orderings are equivalent (transport theorem)")
    print("  L3: Identical commuting blocks stored once (algebraic dictionary)")
    print("  L4: Blocks reduced to multisets (ordering is meaningless)")
    print("  L5: Pure defect map (only non-commuting junctions + counts)")
    print()
    print("The key variable is COMMUTATION DENSITY. Domains with many independent")
    print("subsystems (concurrent log, multi-table DB, multi-axis movement) have")
    print("large commuting blocks — RO's advantage grows because it can collapse")
    print("entire blocks that statistical codecs see as different byte sequences.")
    print()

    return all_results


if __name__ == "__main__":
    results = run_full_benchmark()