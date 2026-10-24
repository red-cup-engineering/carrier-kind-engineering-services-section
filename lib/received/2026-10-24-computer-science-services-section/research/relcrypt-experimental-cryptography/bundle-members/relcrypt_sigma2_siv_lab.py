#!/usr/bin/env python3
"""RelCrypt-Sigma2-SIV: nonce-misuse-resistant experimental AEAD mode.

This mode sits over relcrypt_sigma2_512_lab.py. It is experimental research code,
not production cryptography.

Shape:
  tag = Sigma2-Duplex-MAC(key, nonce, AD, plaintext)
  ciphertext = plaintext xor Sigma2-stream(key, synthetic_iv=tag, AD)
  output = ciphertext, tag

Decryption regenerates stream from tag, decrypts, recomputes MAC, and rejects unless
constant-time tag comparison succeeds. Nonce reuse leaks equality of identical
(nonce, AD, plaintext) triples but avoids the ordinary stream-cipher XOR-of-plaintexts
catastrophe for distinct plaintexts.
"""
from __future__ import annotations
import hmac, os, random, time, math, collections, sys, importlib.util
from pathlib import Path
from typing import List, Tuple

# Load adjacent Sigma2 lab.
_here = Path(__file__).resolve().parent
_sigma_path = _here / 'relcrypt_sigma2_512_lab.py'
if not _sigma_path.exists():
    _sigma_path = Path('/mnt/data/relcrypt_sigma2_512_lab.py')
spec = importlib.util.spec_from_file_location('relcrypt_sigma2_512_lab', _sigma_path)
sig2 = importlib.util.module_from_spec(spec)
sys.modules['relcrypt_sigma2_512_lab'] = sig2
spec.loader.exec_module(sig2)

MASK = sig2.MASK

def _absorb_bytes(st: List[int], data: bytes, domain_full: int, domain_final: int, rounds: int, rate: int = 32) -> List[int]:
    data = bytes(data)
    if not data:
        return sig2.absorb_block(st, sig2.pad_block(b'', rate), domain_final, rounds, rate)
    for off in range(0, len(data), rate):
        block = data[off:off+rate]
        if len(block) == rate:
            st = sig2.absorb_block(st, block, domain_full, rounds, rate)
        else:
            st = sig2.absorb_block(st, sig2.pad_block(block, rate), domain_final, rounds, rate)
    return st

def sigma2_mac(key: bytes, nonce: bytes, ad: bytes, msg: bytes, rounds: int = 24, tag_len: int = 16, rate: int = 32) -> bytes:
    """Duplex MAC used as synthetic-IV generator."""
    st = sig2.init_state(key, b'Sigma2-SIV-MAC|' + bytes(nonce), rounds)
    st[0] ^= 0x5349564D41430001  # SIVMAC domain
    st[1] ^= len(ad) & MASK
    st[2] ^= len(msg) & MASK
    st = _absorb_bytes(st, ad, 0xB0, 0xB1, rounds, rate)
    st = _absorb_bytes(st, msg, 0xB2, 0xB3, rounds, rate)
    st[0] ^= 0xF5
    st[1] ^= len(nonce) & MASK
    st[2] ^= len(ad) & MASK
    st[3] ^= len(msg) & MASK
    st = sig2.sigma_perm(st, rounds)
    return sig2.words_bytes(st)[:tag_len]

def _stream_xor(key: bytes, synthetic_iv: bytes, ad: bytes, data: bytes, rounds: int = 24, rate: int = 32) -> bytes:
    """Generate a Sigma2 stream keyed by the synthetic IV and XOR data."""
    st = sig2.init_state(key, b'Sigma2-SIV-STREAM|' + bytes(synthetic_iv), rounds)
    st[0] ^= 0x53545245414D0002  # STREAM domain
    st[1] ^= len(ad) & MASK
    st = _absorb_bytes(st, ad, 0xD0, 0xD1, rounds, rate)
    out = bytearray()
    data = bytes(data)
    counter = 0
    for off in range(0, len(data), rate):
        st[0] ^= 0xE0
        st[1] ^= counter & MASK
        st = sig2.sigma_perm(st, rounds)
        ks = sig2.words_bytes(st[:rate//8])
        block = data[off:off+rate]
        out += sig2.xor_bytes(block, ks[:len(block)])
        counter += 1
    return bytes(out)

def encrypt_siv(key: bytes, nonce: bytes, ad: bytes, plaintext: bytes, rounds: int = 24, tag_len: int = 16) -> Tuple[bytes, bytes]:
    plaintext = bytes(plaintext)
    tag = sigma2_mac(key, nonce, ad, plaintext, rounds, tag_len)
    ciphertext = _stream_xor(key, tag, ad, plaintext, rounds)
    return ciphertext, tag

def decrypt_siv(key: bytes, nonce: bytes, ad: bytes, ciphertext: bytes, tag: bytes, rounds: int = 24, tag_len: int = 16) -> bytes:
    ciphertext = bytes(ciphertext)
    tag = bytes(tag)
    plaintext = _stream_xor(key, tag, ad, ciphertext, rounds)
    good = sigma2_mac(key, nonce, ad, plaintext, rounds, tag_len)
    if not hmac.compare_digest(good, tag):
        raise ValueError('authentication failed')
    return plaintext

# Diagnostics used for the report.
def entropy(data: bytes) -> float:
    n=len(data); cnt=collections.Counter(data)
    return -sum((c/n)*math.log2(c/n) for c in cnt.values()) if n else 0.0

def chi_square(data: bytes) -> float:
    n=len(data); exp=n/256; cnt=collections.Counter(data)
    return sum(((cnt.get(i,0)-exp)**2)/exp for i in range(256))

def monobit_z(data: bytes) -> float:
    bits=sum(b.bit_count() for b in data); nbits=8*len(data)
    return (bits-nbits/2)/math.sqrt(nbits/4)

def serial_corr(data: bytes) -> float:
    if len(data)<2: return 0.0
    xs=list(data[:-1]); ys=list(data[1:]); n=len(xs); mx=sum(xs)/n; my=sum(ys)/n
    vx=sum((x-mx)**2 for x in xs); vy=sum((y-my)**2 for y in ys)
    if vx==0 or vy==0: return 0.0
    return sum((x-mx)*(y-my) for x,y in zip(xs,ys))/math.sqrt(vx*vy)

def bitdiff(a: bytes, b: bytes) -> int:
    return sum((x^y).bit_count() for x,y in zip(a,b))

def self_test() -> None:
    for rounds in [16, 20, 24]:
        key=os.urandom(32); nonce=os.urandom(16); ad=os.urandom(23); pt=os.urandom(777)
        ct,tag=encrypt_siv(key,nonce,ad,pt,rounds)
        assert decrypt_siv(key,nonce,ad,ct,tag,rounds)==pt
        try:
            bad=bytearray(ct); bad[0]^=1; decrypt_siv(key,nonce,ad,bytes(bad),tag,rounds); raise AssertionError('tamper accepted')
        except ValueError:
            pass
        try:
            decrypt_siv(key,nonce,ad+b'x',ct,tag,rounds); raise AssertionError('wrong AD accepted')
        except ValueError:
            pass
        try:
            decrypt_siv(key,bytes([nonce[0]^1])+nonce[1:],ad,ct,tag,rounds); raise AssertionError('wrong nonce accepted')
        except ValueError:
            pass
    print('RelCrypt-Sigma2-SIV self-test passed')

if __name__ == '__main__':
    self_test()
