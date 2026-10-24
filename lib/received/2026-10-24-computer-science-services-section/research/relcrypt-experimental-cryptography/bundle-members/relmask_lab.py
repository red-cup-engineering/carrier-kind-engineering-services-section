#!/usr/bin/env python3
"""
relmask_lab.py — RelMath-flavored crypto toy harness.

This is experimental mathematics code, not production cryptography.

Design:
- F₂ core: Galois LFSR bank + nonlinear Boolean filter.
- FOUR layer: pairs of bits as charges (pos, neg).
- K₄ outer gauge: id / neg / conf / negConf as self-inverse masks.
- Closure/cohomology toy layer: local settling over FOUR cells; extract H0-like truth
  and inconsistency counts; diffuse back into F₂ keystream bytes.
- Cipher mode: XOR keystream. K₄ masks internal semantic state rather than serving
  directly as the ciphertext mask, avoiding the zero-plaintext degeneracy.
"""

import os, math, time, hashlib, collections, statistics
from typing import Callable
MASK64 = (1 << 64) - 1
TAPS = [
    0xD800000000000000,
    0x800000000000000D,
    0xA300000000000000,
    0xC00000000000001B,
    0xE100000000000000,
    0x90000000000000E1,
]

def lfsr_step(s: int, mask: int) -> tuple[int, int]:
    out = s & 1
    s >>= 1
    if out:
        s ^= mask
    return s & MASK64, out

def splitmix64(x: int) -> tuple[int, int]:
    x = (x + 0x9E3779B97F4A7C15) & MASK64
    z = x
    z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & MASK64
    z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & MASK64
    return (z ^ (z >> 31)) & MASK64, x

def seed_states(key: bytes, nonce: bytes, n: int) -> list[int]:
    seed = int.from_bytes(hashlib.blake2s(key + nonce, digest_size=32).digest(), "little")
    x = seed & MASK64
    states = []
    for i in range(n):
        z, x = splitmix64(x ^ (i * 0xA5A5A5A5A5A5A5A5))
        states.append(z or (i + 1))
    return states

def bool_filter(bits: list[int], kind: int = 3) -> int:
    b = bits
    if kind == 0:
        return b[0] ^ b[1] ^ b[3] ^ (b[0] & b[2]) ^ (b[1] & b[2]) ^ (b[2] & b[3])
    if kind == 1:
        return b[0] ^ b[2] ^ b[4 % len(b)] ^ (b[1] & b[3]) ^ (b[0] & b[1] & b[2])
    if kind == 3:
        return b[0] ^ ((b[1] | b[2]) & 1) ^ (b[3] & b[4 % len(b)]) ^ (b[0] & b[2] & b[3])
    raise ValueError(kind)

def k4_act(mask: int, cell: int) -> int:
    # cell = pos | (neg << 1)
    p = cell & 1
    n = (cell >> 1) & 1
    if mask == 0:        # id
        q, r = p, n
    elif mask == 1:      # neg: slot swap
        q, r = n, p
    elif mask == 2:      # conf: complemented slot swap
        q, r = n ^ 1, p ^ 1
    elif mask == 3:      # negConf: coordinatewise complement
        q, r = p ^ 1, n ^ 1
    else:
        raise ValueError(mask)
    return q | (r << 1)

K4_TABLE = [[k4_act(m, x) for x in range(4)] for m in range(4)]

def settle_four(cells: list[int], rounds: int = 3) -> list[int]:
    c = cells[:]
    n = len(c)
    for _ in range(rounds):
        old = c[:]
        for i, x in enumerate(old):
            left = old[(i - 1) % n]
            right = old[(i + 1) % n]
            p = x & 1
            q = (x >> 1) & 1
            # local contradiction closure: adjacent t/f conflict raises to top
            if (left, right) in [(1, 2), (2, 1)] or ((left ^ right) == 3 and left in (0, 1, 2, 3)):
                p, q = 1, 1
            # conflation trigger on bottom/top boundary
            if (left == 0 and right == 3) or (left == 3 and right == 0):
                p, q = q ^ 1, p ^ 1
            # aperiodic-ish perturbation
            if ((left + 2 * x + 3 * right + i) % 5) == 0:
                p ^= (right >> 1) & 1
            c[i] = p | (q << 1)
        if c == old:
            break
    return c

def relstream_v4(key: bytes, nonce: bytes, nbytes: int) -> bytes:
    """F₂ LFSR core + K₄ outer semantic mask + closure/cohomology extraction."""
    states = seed_states(hashlib.blake2s(key + b"F2core").digest(), nonce, 6)
    mask_states = seed_states(hashlib.blake2s(key + b"K4mask").digest(), nonce + b"M", 4)
    out = bytearray()
    while len(out) < nbytes:
        cells = []
        for idx in range(16):
            val = 0
            for bit in range(2):
                bs = []
                for i in range(6):
                    states[i], b = lfsr_step(states[i], TAPS[i])
                    bs.append(b)
                y = bool_filter(bs, 3) ^ (bs[0] & bs[2]) ^ (bs[1] & bs[4]) ^ (bs[3] & bs[5])
                val |= (y & 1) << bit
            m = 0
            for bit in range(2):
                bs = []
                for i in range(4):
                    mask_states[i], b = lfsr_step(mask_states[i], TAPS[(i + 2) % len(TAPS)])
                    bs.append(b)
                m |= (bool_filter(bs, 0) & 1) << bit
            cells.append(K4_TABLE[m][val])

        settled = settle_four(cells, rounds=3)
        h0 = sum(x == 1 for x in settled)    # truth-row observable
        htop = sum(x == 3 for x in settled)  # inconsistency-row observable

        lanes = [0, 0]
        for idx, x in enumerate(settled):
            for lane in range(2):
                lanes[lane] ^= ((x + 1 + h0 * 3 + htop * 5 + lane)
                                * ((0x9E3779B97F4A7C15 + idx * 0xBF58476D1CE4E5B9) & MASK64)) & MASK64
                lanes[lane] = ((lanes[lane] << 17) | (lanes[lane] >> (64 - 17))) & MASK64
                lanes[lane] ^= lanes[lane] >> 11

        for lane in range(2):
            for _ in range(32):
                bs = []
                for i in range(6):
                    states[i], b = lfsr_step(states[i], TAPS[i])
                    bs.append(b)
                y = bool_filter(bs, 1) ^ (bs[2] & bs[5])
                lanes[lane] = ((lanes[lane] << 1) & MASK64) ^ y ^ ((lanes[lane] >> 63) & 1)
            z = lanes[lane]
            z ^= z >> 30; z = (z * 0xBF58476D1CE4E5B9) & MASK64
            z ^= z >> 27; z = (z * 0x94D049BB133111EB) & MASK64
            z ^= z >> 31
            for k in range(8):
                out.append((z >> (8 * k)) & 0xFF)
                if len(out) >= nbytes:
                    break
            if len(out) >= nbytes:
                break
    return bytes(out)

def encrypt(key: bytes, nonce: bytes, data: bytes) -> bytes:
    ks = relstream_v4(key, nonce, len(data))
    return bytes(a ^ b for a, b in zip(data, ks))

decrypt = encrypt

def hamming(a: bytes, b: bytes) -> int:
    return sum((x ^ y).bit_count() for x, y in zip(a, b))

def quick_stats(bs: bytes) -> dict:
    nbits = len(bs) * 8
    ones = sum(x.bit_count() for x in bs)
    monobit_z = (ones - nbits / 2) / math.sqrt(nbits / 4)
    cnt = collections.Counter(bs)
    exp = len(bs) / 256
    byte_chi = sum((cnt.get(i, 0) - exp) ** 2 / exp for i in range(256))
    entropy = -sum((cnt.get(i, 0) / len(bs)) * math.log2(cnt.get(i, 0) / len(bs))
                   for i in range(256) if cnt.get(i, 0))
    return {"nbytes": len(bs), "monobit_z": monobit_z, "byte_chi": byte_chi, "entropy": entropy}

def key_avalanche(gen: Callable[[bytes, bytes, int], bytes], key: bytes, nonce: bytes,
                  n: int = 8192, trials: int = 64) -> tuple[float, float, float]:
    base = gen(key, nonce, n)
    dists = []
    for t in range(trials):
        k2 = bytearray(key)
        bit = t % (len(k2) * 8)
        k2[bit // 8] ^= 1 << (bit % 8)
        dists.append(hamming(base, gen(bytes(k2), nonce, n)) / (n * 8))
    return statistics.mean(dists), min(dists), max(dists)

def main():
    key, nonce = os.urandom(32), os.urandom(16)
    msg = os.urandom(4096)
    ct = encrypt(key, nonce, msg)
    print("roundtrip:", decrypt(key, nonce, ct) == msg)
    sample = relstream_v4(key, nonce, 1 << 18)
    print("stats:", quick_stats(sample))
    print("key avalanche:", key_avalanche(relstream_v4, key, nonce))
    t0 = time.perf_counter()
    relstream_v4(key, nonce, 1 << 18)
    dt = time.perf_counter() - t0
    print("python speed MB/s:", (1 << 18) / dt / 1e6)

if __name__ == "__main__":
    main()
