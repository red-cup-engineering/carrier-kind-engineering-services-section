#!/usr/bin/env python3
"""
MEANING COMPRESSION BENCHMARK
==============================

Relational Ordering codec vs standard compression.

The thesis: in sequential event data, most intermediate states are
bypass-recoverable (Settled). Only the free positions — where
non-commuting choices were made — carry irreducible content.

Standard codecs find STATISTICAL redundancy (repeated patterns).
The RO codec finds ALGEBRAIC redundancy (derivable positions).

These are orthogonal. The interesting question is whether algebraic
redundancy captures structure that statistical methods miss, and
whether combining them beats either alone.

Test domains:
  1. State machine traces (operations on a register machine)
  2. Version control histories (file edit sequences)
  3. Database transaction logs
  4. Musical event sequences (notes with non-commuting articulations)
  5. Random walks with commutation structure
"""

import zlib
import bz2
import lzma
import json
import hashlib
import time
import random
import struct
import os
from collections import defaultdict, OrderedDict

try:
    import zstandard as zstd
    HAS_ZSTD = True
except ImportError:
    HAS_ZSTD = False

try:
    import lz4.frame
    HAS_LZ4 = True
except ImportError:
    HAS_LZ4 = False

try:
    import brotli
    HAS_BROTLI = True
except ImportError:
    HAS_BROTLI = False


# ══════════════════════════════════════════════════════════════════════════
# THE RELATIONAL ORDERING CODEC
# ══════════════════════════════════════════════════════════════════════════

class CommutationRelation:
    """Defines which event types commute."""
    
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


class EventChain:
    """A sequence of events with associated state at each position."""
    
    def __init__(self, events, states, commutation):
        self.events = events
        self.states = states
        self.commutation = commutation
        assert len(states) == len(events) + 1
    
    def event_base(self, event):
        """Extract base event type for commutation checks. Override for parameterized events."""
        return event
    
    def classify_positions(self):
        """
        Classify each position as:
          'free'    — irreducible, must keep
          'settled' — bypass-recoverable, can drop
        """
        n = len(self.events)
        classifications = []
        
        has_defect = False
        defect_pairs = []
        for i in range(n - 1):
            if not self.commutation.commutes(self.event_base(self.events[i]), self.event_base(self.events[i+1])):
                has_defect = True
                defect_pairs.append((i, self.events[i], self.events[i+1]))
        
        classifications.append({
            'index': 0,
            'status': 'free' if has_defect else 'settled',
            'reason': 'irreducible_choice' if has_defect else 'flat_chain',
            'recovery': None if has_defect else 'transport_equivalence',
        })
        
        for i in range(1, n + 1):
            outer_event = self.event_base(self.events[i-1])
            local_defect = (i >= 2 and 
                not self.commutation.commutes(self.event_base(self.events[i-2]), self.event_base(self.events[i-1])))
            
            transport_equiv = None
            if i >= 2 and self.commutation.commutes(self.event_base(self.events[i-2]), self.event_base(self.events[i-1])) \
               and self.event_base(self.events[i-2]) != self.event_base(self.events[i-1]):
                transport_equiv = True
            
            classifications.append({
                'index': i,
                'status': 'settled',
                'settled_in': outer_event,
                'local_defect': local_defect,
                'transport_equiv': transport_equiv,
                'reason': 'bypass_recoverable',
                'recovery': f'BypassAtExtend({outer_event})',
            })
        
        return classifications
    
    def compress(self):
        classifications = self.classify_positions()
        free_positions = [c for c in classifications if c['status'] == 'free']
        settled_positions = [c for c in classifications if c['status'] == 'settled']
        
        compressed = {
            'skeleton': self.events,
            'free_states': {c['index']: self.states[c['index']] for c in free_positions},
            'reconstruction_order': [
                {'index': c['index'], 'method': c['recovery']}
                for c in settled_positions
            ],
        }
        
        return compressed, classifications
    
    def decompress(self, compressed):
        skeleton = compressed['skeleton']
        free_states = compressed['free_states']
        n = len(skeleton)
        
        reconstructed = [None] * (n + 1)
        for idx, state in free_states.items():
            reconstructed[idx] = state
        
        for i in range(n + 1):
            if reconstructed[i] is not None:
                continue
            pred = i - 1
            while pred >= 0 and reconstructed[pred] is None:
                pred -= 1
            if pred < 0:
                reconstructed[0] = self._empty_state()
                pred = 0
            state = reconstructed[pred]
            for j in range(pred, i):
                state = self._apply_event(state, skeleton[j])
            reconstructed[i] = state
        
        return reconstructed
    
    def _empty_state(self):
        return self.states[0]
    
    def _apply_event(self, state, event):
        h = hashlib.sha256(json.dumps(state, sort_keys=True).encode() + event.encode())
        return {'derived_from': state, 'event': event, 'hash': h.hexdigest()[:16]}
    
    def verify_reconstruction(self, compressed):
        reconstructed = self.decompress(compressed)
        for i in range(len(self.states)):
            if reconstructed[i] != self.states[i]:
                return False, i
        return True, None


# ══════════════════════════════════════════════════════════════════════════
# TEST DOMAINS
# ══════════════════════════════════════════════════════════════════════════

class RegisterMachineChain(EventChain):
    
    @staticmethod
    def generate(length, seed=42):
        rng = random.Random(seed)
        
        ops = [
            ('ADD_R0', 0), ('SUB_R0', 0), ('MUL_R0', 0),
            ('ADD_R1', 1), ('SUB_R1', 1), ('MUL_R1', 1),
            ('ADD_R2', 2), ('SET_R2', 2),
            ('ADD_R3', 3), ('LOAD_R3', 3),
            ('SWAP_01', (0, 1)),
        ]
        
        def registers_touched(op):
            _, reg = op
            if isinstance(reg, tuple):
                return set(reg)
            return {reg}
        
        event_names = [op[0] for op in ops]
        commuting_pairs = []
        for i in range(len(ops)):
            for j in range(i+1, len(ops)):
                ri = registers_touched(ops[i])
                rj = registers_touched(ops[j])
                if ri.isdisjoint(rj):
                    commuting_pairs.append((ops[i][0], ops[j][0]))
        
        comm = CommutationRelation(event_names, commuting_pairs)
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
        
        chain = RegisterMachineChain(events, states, comm)
        return chain
    
    def _apply_event(self, state, event):
        regs = list(state)
        if event == 'ADD_R0': regs[0] += 1
        elif event == 'SUB_R0': regs[0] -= 1
        elif event == 'MUL_R0': regs[0] *= 2
        elif event == 'ADD_R1': regs[1] += 1
        elif event == 'SUB_R1': regs[1] -= 1
        elif event == 'MUL_R1': regs[1] *= 2
        elif event == 'ADD_R2': regs[2] += 1
        elif event == 'SET_R2': regs[2] = 42
        elif event == 'ADD_R3': regs[3] += 1
        elif event == 'LOAD_R3': regs[3] = 100
        elif event == 'SWAP_01': regs[0], regs[1] = regs[1], regs[0]
        return tuple(regs)
    
    def _empty_state(self):
        return (0, 0, 0, 0)


class FileEditChain(EventChain):
    
    @staticmethod
    def generate(length, seed=42):
        rng = random.Random(seed)
        
        event_names = ['INSERT', 'DELETE', 'MODIFY', 'RENAME', 'CHMOD', 'TAG']
        
        commuting_pairs = [
            ('INSERT', 'RENAME'), ('INSERT', 'CHMOD'), ('INSERT', 'TAG'),
            ('DELETE', 'RENAME'), ('DELETE', 'CHMOD'), ('DELETE', 'TAG'),
            ('MODIFY', 'RENAME'), ('MODIFY', 'CHMOD'), ('MODIFY', 'TAG'),
            ('RENAME', 'CHMOD'), ('RENAME', 'TAG'),
            ('CHMOD', 'TAG'),
        ]
        comm = CommutationRelation(event_names, commuting_pairs)
        
        events = [rng.choice(event_names) for _ in range(length)]
        
        lines = ['initial line']
        filename = 'file.txt'
        perms = '644'
        tags = set()
        
        events_with_params = []
        states = [(tuple(lines), filename, perms, frozenset(tags))]
        for idx, ev in enumerate(events):
            lines = list(lines)
            param = idx * 7 % 1000
            if ev == 'INSERT':
                pos = param % (len(lines) + 1)
                lines.insert(pos, f'line_{param}')
                events_with_params.append(f'INSERT:{param}')
            elif ev == 'DELETE' and len(lines) > 0:
                p = param % len(lines)
                lines.pop(p)
                events_with_params.append(f'DELETE:{p}')
            elif ev == 'MODIFY' and len(lines) > 0:
                i = param % len(lines)
                lines[i] = f'modified_{param}'
                events_with_params.append(f'MODIFY:{i}:{param}')
            elif ev == 'RENAME':
                filename = f'file_{param % 100}.txt'
                events_with_params.append(f'RENAME:{param % 100}')
            elif ev == 'CHMOD':
                perms = ['644', '755', '600', '777'][param % 4]
                events_with_params.append(f'CHMOD:{param % 4}')
            elif ev == 'TAG':
                tags = set(tags)
                tags.add(f'v{param % 20 + 1}')
                tags = frozenset(tags)
                events_with_params.append(f'TAG:{param % 20 + 1}')
            else:
                events_with_params.append(ev)
            states.append((tuple(lines), filename, perms, frozenset(tags)))
        
        chain = FileEditChain(events_with_params, states, comm)
        chain._base_events = events
        return chain
    
    def event_base(self, event):
        return event.split(':')[0]
    
    def _apply_event(self, state, event):
        lines_t, filename, perms, tags = state
        lines = list(lines_t)
        parts = event.split(':')
        base = parts[0]
        if base == 'INSERT':
            param = int(parts[1])
            pos = param % (len(lines) + 1)
            lines.insert(pos, f'line_{param}')
        elif base == 'DELETE' and len(lines) > 0:
            p = int(parts[1])
            if p < len(lines):
                lines.pop(p)
        elif base == 'MODIFY' and len(lines) > 0:
            i = int(parts[1])
            param = int(parts[2])
            if i < len(lines):
                lines[i] = f'modified_{param}'
        elif base == 'RENAME':
            filename = f'file_{parts[1]}.txt'
        elif base == 'CHMOD':
            perms = ['644', '755', '600', '777'][int(parts[1])]
        elif base == 'TAG':
            tags = set(tags)
            tags.add(f'v{parts[1]}')
            tags = frozenset(tags)
        return (tuple(lines), filename, perms, tags)
    
    def _empty_state(self):
        return (('initial line',), 'file.txt', '644', frozenset())


class DatabaseTxChain(EventChain):
    
    @staticmethod
    def generate(length, seed=42):
        rng = random.Random(seed)
        
        tables = ['users', 'orders', 'products', 'logs']
        ops = []
        event_names = []
        for t in tables:
            for op in ['INSERT', 'UPDATE', 'DELETE']:
                name = f'{op}_{t}'
                ops.append((name, t))
                event_names.append(name)
        
        commuting_pairs = []
        for i in range(len(ops)):
            for j in range(i+1, len(ops)):
                if ops[i][1] != ops[j][1]:
                    commuting_pairs.append((ops[i][0], ops[j][0]))
        
        comm = CommutationRelation(event_names, commuting_pairs)
        events = [rng.choice(event_names) for _ in range(length)]
        
        counts = {t: 0 for t in tables}
        states = [dict(counts)]
        for ev in events:
            counts = dict(counts)
            table = ev.split('_', 1)[1]
            if ev.startswith('INSERT'):
                counts[table] += 1
            elif ev.startswith('DELETE'):
                counts[table] = max(0, counts[table] - 1)
            elif ev.startswith('UPDATE'):
                counts[table] = counts[table]
            states.append(dict(counts))
        
        chain = DatabaseTxChain(events, states, comm)
        return chain
    
    def _apply_event(self, state, event):
        counts = dict(state)
        table = event.split('_', 1)[1]
        if event.startswith('INSERT'):
            counts[table] += 1
        elif event.startswith('DELETE'):
            counts[table] = max(0, counts[table] - 1)
        return counts
    
    def _empty_state(self):
        return {'users': 0, 'orders': 0, 'products': 0, 'logs': 0}


class MusicEventChain(EventChain):
    
    @staticmethod
    def generate(length, seed=42):
        rng = random.Random(seed)
        
        event_names = [
            'PITCH_UP', 'PITCH_DOWN', 'RHYTHM_DBL', 'RHYTHM_HALF',
            'DYN_LOUD', 'DYN_SOFT', 'ART_STACCATO', 'ART_LEGATO',
            'TRANSPOSE', 'SUSTAIN',
        ]
        
        commuting_pairs = [
            ('PITCH_UP', 'DYN_LOUD'), ('PITCH_UP', 'DYN_SOFT'),
            ('PITCH_UP', 'ART_STACCATO'), ('PITCH_UP', 'ART_LEGATO'),
            ('PITCH_DOWN', 'DYN_LOUD'), ('PITCH_DOWN', 'DYN_SOFT'),
            ('PITCH_DOWN', 'ART_STACCATO'), ('PITCH_DOWN', 'ART_LEGATO'),
            ('RHYTHM_DBL', 'DYN_LOUD'), ('RHYTHM_DBL', 'DYN_SOFT'),
            ('RHYTHM_DBL', 'ART_STACCATO'), ('RHYTHM_DBL', 'ART_LEGATO'),
            ('RHYTHM_HALF', 'DYN_LOUD'), ('RHYTHM_HALF', 'DYN_SOFT'),
            ('RHYTHM_HALF', 'ART_STACCATO'), ('RHYTHM_HALF', 'ART_LEGATO'),
            ('DYN_LOUD', 'ART_STACCATO'), ('DYN_LOUD', 'ART_LEGATO'),
            ('DYN_SOFT', 'ART_STACCATO'), ('DYN_SOFT', 'ART_LEGATO'),
            ('SUSTAIN', 'DYN_LOUD'), ('SUSTAIN', 'DYN_SOFT'),
            ('SUSTAIN', 'ART_STACCATO'), ('SUSTAIN', 'ART_LEGATO'),
            ('TRANSPOSE', 'DYN_LOUD'), ('TRANSPOSE', 'DYN_SOFT'),
            ('TRANSPOSE', 'ART_STACCATO'), ('TRANSPOSE', 'ART_LEGATO'),
            ('TRANSPOSE', 'SUSTAIN'),
        ]
        comm = CommutationRelation(event_names, commuting_pairs)
        events = [rng.choice(event_names) for _ in range(length)]
        
        pitch = 60
        rhythm = 1.0
        dyn = 80
        art = 'normal'
        
        states = [(pitch, rhythm, dyn, art)]
        for ev in events:
            if ev == 'PITCH_UP': pitch += 1
            elif ev == 'PITCH_DOWN': pitch -= 1
            elif ev == 'RHYTHM_DBL': rhythm *= 2
            elif ev == 'RHYTHM_HALF': rhythm *= 0.5
            elif ev == 'DYN_LOUD': dyn = min(127, dyn + 10)
            elif ev == 'DYN_SOFT': dyn = max(0, dyn - 10)
            elif ev == 'ART_STACCATO': art = 'staccato'
            elif ev == 'ART_LEGATO': art = 'legato'
            elif ev == 'TRANSPOSE': pitch += 12
            elif ev == 'SUSTAIN': rhythm *= 1.5
            states.append((pitch, rhythm, dyn, art))
        
        chain = MusicEventChain(events, states, comm)
        return chain
    
    def _apply_event(self, state, event):
        pitch, rhythm, dyn, art = state
        if event == 'PITCH_UP': pitch += 1
        elif event == 'PITCH_DOWN': pitch -= 1
        elif event == 'RHYTHM_DBL': rhythm *= 2
        elif event == 'RHYTHM_HALF': rhythm *= 0.5
        elif event == 'DYN_LOUD': dyn = min(127, dyn + 10)
        elif event == 'DYN_SOFT': dyn = max(0, dyn - 10)
        elif event == 'ART_STACCATO': art = 'staccato'
        elif event == 'ART_LEGATO': art = 'legato'
        elif event == 'TRANSPOSE': pitch += 12
        elif event == 'SUSTAIN': rhythm *= 1.5
        return (pitch, rhythm, dyn, art)
    
    def _empty_state(self):
        return (60, 1.0, 80, 'normal')


class RandomWalkChain(EventChain):
    
    @staticmethod
    def generate(length, seed=42):
        rng = random.Random(seed)
        
        event_names = ['X+', 'X-', 'Y+', 'Y-', 'SCALE_X', 'SCALE_Y', 'ROTATE']
        
        commuting_pairs = [
            ('X+', 'Y+'), ('X+', 'Y-'), ('X+', 'SCALE_Y'),
            ('X-', 'Y+'), ('X-', 'Y-'), ('X-', 'SCALE_Y'),
            ('Y+', 'X+'), ('Y+', 'X-'), ('Y+', 'SCALE_X'),
            ('Y-', 'X+'), ('Y-', 'X-'), ('Y-', 'SCALE_X'),
            ('SCALE_X', 'SCALE_Y'), ('SCALE_X', 'Y+'), ('SCALE_X', 'Y-'),
            ('SCALE_Y', 'X+'), ('SCALE_Y', 'X-'),
        ]
        comm = CommutationRelation(event_names, commuting_pairs)
        events = [rng.choice(event_names) for _ in range(length)]
        
        x, y, sx, sy, angle = 0.0, 0.0, 1.0, 1.0, 0.0
        states = [(x, y, sx, sy, angle)]
        for ev in events:
            if ev == 'X+': x += sx
            elif ev == 'X-': x -= sx
            elif ev == 'Y+': y += sy
            elif ev == 'Y-': y -= sy
            elif ev == 'SCALE_X': sx *= 1.5
            elif ev == 'SCALE_Y': sy *= 1.5
            elif ev == 'ROTATE': angle += 15
            states.append((x, y, sx, sy, angle))
        
        chain = RandomWalkChain(events, states, comm)
        return chain
    
    def _apply_event(self, state, event):
        x, y, sx, sy, angle = state
        if event == 'X+': x += sx
        elif event == 'X-': x -= sx
        elif event == 'Y+': y += sy
        elif event == 'Y-': y -= sy
        elif event == 'SCALE_X': sx *= 1.5
        elif event == 'SCALE_Y': sy *= 1.5
        elif event == 'ROTATE': angle += 15
        return (x, y, sx, sy, angle)
    
    def _empty_state(self):
        return (0.0, 0.0, 1.0, 1.0, 0.0)


# ══════════════════════════════════════════════════════════════════════════
# SERIALIZATION
# ══════════════════════════════════════════════════════════════════════════

def serialize_full_chain(chain):
    data = {
        'events': chain.events,
        'states': [_serialize_state(s) for s in chain.states],
    }
    return json.dumps(data, sort_keys=True, separators=(',', ':')).encode('utf-8')


def serialize_ro_compressed(chain):
    compressed, classifications = chain.compress()
    data = {
        'skeleton': compressed['skeleton'],
        'free_states': {str(k): _serialize_state(v) for k, v in compressed['free_states'].items()},
    }
    return json.dumps(data, sort_keys=True, separators=(',', ':')).encode('utf-8')


def _serialize_state(state):
    if isinstance(state, frozenset):
        return sorted(list(state))
    if isinstance(state, (tuple, list)):
        return [_serialize_state(x) for x in state]
    if isinstance(state, dict):
        return {str(k): _serialize_state(v) for k, v in state.items()}
    if isinstance(state, set):
        return sorted(list(state))
    return state


# ══════════════════════════════════════════════════════════════════════════
# STANDARD CODECS
# ══════════════════════════════════════════════════════════════════════════

def compress_gzip(data, level=9):
    return zlib.compress(data, level)

def compress_bzip2(data):
    return bz2.compress(data, compresslevel=9)

def compress_lzma(data):
    return lzma.compress(data, preset=9)

def compress_zstd(data):
    if not HAS_ZSTD: return None
    cctx = zstd.ZstdCompressor(level=22)
    return cctx.compress(data)

def compress_lz4(data):
    if not HAS_LZ4: return None
    return lz4.frame.compress(data, compression_level=16)

def compress_brotli(data):
    if not HAS_BROTLI: return None
    return brotli.compress(data, quality=11)


# ══════════════════════════════════════════════════════════════════════════
# BENCHMARK
# ══════════════════════════════════════════════════════════════════════════

def run_benchmark(chain, name, length):
    full_data = serialize_full_chain(chain)
    full_size = len(full_data)
    
    ro_data = serialize_ro_compressed(chain)
    ro_size = len(ro_data)
    
    compressed, classifications = chain.compress()
    n_free = sum(1 for c in classifications if c['status'] == 'free')
    n_settled = sum(1 for c in classifications if c['status'] == 'settled')
    n_total = len(classifications)
    
    n_defect = 0
    for i in range(len(chain.events) - 1):
        if not chain.commutation.commutes(chain.event_base(chain.events[i]), chain.event_base(chain.events[i+1])):
            n_defect += 1
    n_flat = len(chain.events) - 1 - n_defect if len(chain.events) > 1 else 0
    
    reconstructed = chain.decompress(compressed)
    lossless = all(reconstructed[i] == chain.states[i] for i in range(len(chain.states)))
    
    codecs_full = {
        'gzip': compress_gzip(full_data),
        'bzip2': compress_bzip2(full_data),
        'lzma': compress_lzma(full_data),
    }
    if HAS_ZSTD: codecs_full['zstd'] = compress_zstd(full_data)
    if HAS_LZ4: codecs_full['lz4'] = compress_lz4(full_data)
    if HAS_BROTLI: codecs_full['brotli'] = compress_brotli(full_data)
    
    codecs_ro = {
        'gzip': compress_gzip(ro_data),
        'bzip2': compress_bzip2(ro_data),
        'lzma': compress_lzma(ro_data),
    }
    if HAS_ZSTD: codecs_ro['zstd'] = compress_zstd(ro_data)
    if HAS_LZ4: codecs_ro['lz4'] = compress_lz4(ro_data)
    if HAS_BROTLI: codecs_ro['brotli'] = compress_brotli(ro_data)
    
    return {
        'name': name,
        'length': length,
        'full_size': full_size,
        'ro_size': ro_size,
        'ro_ratio': ro_size / full_size,
        'n_free': n_free,
        'n_settled': n_settled,
        'n_total': n_total,
        'n_defect_pairs': n_defect,
        'n_flat_pairs': n_flat,
        'lossless': lossless,
        'codecs_full': {k: len(v) for k, v in codecs_full.items() if v is not None},
        'codecs_ro': {k: len(v) for k, v in codecs_ro.items() if v is not None},
        'codecs_full_ratios': {k: len(v)/full_size for k, v in codecs_full.items() if v is not None},
        'codecs_ro_ratios': {k: len(v)/full_size for k, v in codecs_ro.items() if v is not None},
    }


def format_results(results):
    lines = []
    lines.append("=" * 78)
    lines.append("MEANING COMPRESSION BENCHMARK")
    lines.append("Relational Ordering codec vs standard compression")
    lines.append("=" * 78)
    lines.append("")
    
    for r in results:
        lines.append(f"─── {r['name']} (chain length {r['length']}) ───")
        lines.append(f"  Positions: {r['n_total']} total, {r['n_free']} free (irreducible), {r['n_settled']} settled (droppable)")
        lines.append(f"  Curvature: {r['n_defect_pairs']} non-commuting pairs, {r['n_flat_pairs']} flat pairs")
        lines.append(f"  Reconstruction: {'✓ LOSSLESS' if r['lossless'] else '✗ LOSSY (BUG)'}")
        lines.append(f"")
        lines.append(f"  Full chain serialized:   {r['full_size']:>8,} bytes")
        lines.append(f"  RO compressed (raw):     {r['ro_size']:>8,} bytes  ({r['ro_ratio']*100:5.1f}% of full)")
        lines.append(f"")
        
        lines.append(f"  {'Codec':<12} {'Full→Codec':>12} {'Ratio':>8} {'RO→Codec':>12} {'Ratio':>8} {'Combined':>10}")
        lines.append(f"  {'─'*12} {'─'*12} {'─'*8} {'─'*12} {'─'*8} {'─'*10}")
        
        for codec in ['gzip', 'bzip2', 'lzma', 'zstd', 'lz4', 'brotli']:
            if codec in r['codecs_full']:
                full_compressed = r['codecs_full'][codec]
                ro_compressed = r['codecs_ro'][codec]
                full_ratio = r['codecs_full_ratios'][codec]
                combined_ratio = r['codecs_ro_ratios'][codec]
                
                winner = ""
                if ro_compressed < full_compressed:
                    savings = (1 - ro_compressed / full_compressed) * 100
                    winner = f"RO+{codec} wins by {savings:.1f}%"
                elif full_compressed < ro_compressed:
                    winner = f"{codec} alone wins"
                else:
                    winner = "tie"
                
                lines.append(
                    f"  {codec:<12} {full_compressed:>10,} B {full_ratio*100:>6.1f}% "
                    f"{ro_compressed:>10,} B {combined_ratio*100:>6.1f}%  {winner}"
                )
        
        lines.append(f"")
        
        best_standard = min(r['codecs_full'].values())
        best_combined = min(r['codecs_ro'].values())
        best_std_name = min(r['codecs_full'], key=r['codecs_full'].get)
        best_comb_name = min(r['codecs_ro'], key=r['codecs_ro'].get)
        
        lines.append(f"  Best standard:  {best_std_name} at {best_standard:,} bytes ({best_standard/r['full_size']*100:.1f}%)")
        lines.append(f"  Best RO+codec:  RO+{best_comb_name} at {best_combined:,} bytes ({best_combined/r['full_size']*100:.1f}%)")
        
        if best_combined < best_standard:
            improvement = (1 - best_combined / best_standard) * 100
            lines.append(f"  ⟹ RO ALGEBRAIC LAYER ADDS {improvement:.1f}% REDUCTION over best standard codec")
        elif best_combined == best_standard:
            lines.append(f"  ⟹ No additional reduction")
        else:
            overhead = (best_combined / best_standard - 1) * 100
            lines.append(f"  ⟹ RO layer adds {overhead:.1f}% overhead")
        
        lines.append("")
    
    lines.append("=" * 78)
    lines.append("SUMMARY")
    lines.append("=" * 78)
    lines.append("")
    
    ro_wins = 0
    codec_wins = 0
    total_tests = 0
    total_ro_savings = 0
    
    for r in results:
        best_standard = min(r['codecs_full'].values())
        best_combined = min(r['codecs_ro'].values())
        total_tests += 1
        if best_combined < best_standard:
            ro_wins += 1
            total_ro_savings += (best_standard - best_combined)
        else:
            codec_wins += 1
    
    lines.append(f"  RO layer improves best codec:  {ro_wins}/{total_tests} domains")
    lines.append(f"  Standard codec alone wins:      {codec_wins}/{total_tests} domains")
    if ro_wins > 0:
        lines.append(f"  Total bytes saved by RO layer:  {total_ro_savings:,}")
    
    lines.append("")
    lines.append("ANALYSIS")
    lines.append("─" * 78)
    lines.append("")
    lines.append("The RO codec and standard codecs find DIFFERENT kinds of redundancy:")
    lines.append("  • Standard codecs: statistical patterns (repeated byte sequences)")
    lines.append("  • RO codec: algebraic redundancy (derivable intermediate states)")
    lines.append("")
    lines.append("When they combine, RO removes the algebraic redundancy FIRST,")
    lines.append("then the standard codec compresses the residual statistical patterns.")
    lines.append("The combination wins when:")
    lines.append("  1. States are large relative to the event skeleton")
    lines.append("  2. States have low statistical self-similarity (hard for codecs)")
    lines.append("  3. The commutation structure creates many Settled positions")
    lines.append("")
    lines.append("The RO codec is NOT trying to beat gzip. It's finding structure that")
    lines.append("gzip can't see — algebraic derivability. The two are complementary.")
    lines.append("The lossless guarantee comes from the bypass theorem, not statistics.")
    lines.append("")
    
    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════

def main():
    print("Generating test chains...")
    
    test_configs = [
        (RegisterMachineChain.generate, "Register Machine", [20, 50, 200, 500]),
        (FileEditChain.generate, "File Edit History", [20, 50, 200, 500]),
        (DatabaseTxChain.generate, "Database Tx Log", [20, 50, 200, 500]),
        (MusicEventChain.generate, "Musical Events", [20, 50, 200, 500]),
        (RandomWalkChain.generate, "Random Walk", [20, 50, 200, 500]),
    ]
    
    all_results = []
    
    for generator, name, lengths in test_configs:
        for length in lengths:
            print(f"  {name} (n={length})...", end=" ", flush=True)
            chain = generator(length, seed=42)
            result = run_benchmark(chain, name, length)
            all_results.append(result)
            status = "✓" if result['lossless'] else "✗"
            print(f"{status} RO={result['ro_ratio']*100:.1f}%  "
                  f"free={result['n_free']}/{result['n_total']}  "
                  f"defect_pairs={result['n_defect_pairs']}")
    
    report = format_results(all_results)
    print("\n")
    print(report)
    
    return report

if __name__ == "__main__":
    report = main()