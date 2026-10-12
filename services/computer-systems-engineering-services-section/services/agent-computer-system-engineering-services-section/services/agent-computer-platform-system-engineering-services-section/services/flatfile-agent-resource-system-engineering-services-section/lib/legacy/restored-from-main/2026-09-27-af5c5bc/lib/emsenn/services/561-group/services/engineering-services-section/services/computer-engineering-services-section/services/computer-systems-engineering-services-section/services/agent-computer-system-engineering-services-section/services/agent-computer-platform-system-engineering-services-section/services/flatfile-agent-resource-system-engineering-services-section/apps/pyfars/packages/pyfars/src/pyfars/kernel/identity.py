"""A record's content-derived ``id``: NFC-normalize, sort keys, reject
unsafe numbers, compact-serialize, and name the SHA-256 digest as an
RFC 6920 ``ni:///sha-256;...`` URI. Byte-identical to JSFARS's
``kernel/identity.mjs`` on the vectors in ``lib/conformance/identity-vectors.json``.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
import re
import unicodedata
from typing import Any

__all__ = [
    "NI_URI_PATTERN",
    "canonicalize",
    "identity",
    "identity_of_record",
    "is_ni_uri",
]

_NI_PREFIX = "ni:///sha-256;"
_SAFE_INT_MAX = 2**53 - 1

# RFC 6920 base64url digests of a 32-byte SHA-256 hash are exactly 43
# characters without padding; only every fourth trailing character is
# canonical (the last sextet carries four digest bits and two zero pad
# bits). Byte-identical to ni-services-section's own NI_URI_PATTERN.
NI_URI_PATTERN = re.compile(r"^ni:///sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$")


def is_ni_uri(value: Any) -> bool:
    """Whether ``value`` is a well-formed, canonically-encoded sha-256
    ``ni:`` URI: the RFC 6920 shape, and its digest round-trips back to
    the same base64url spelling (rejects non-canonical encodings of the
    same bytes)."""
    if not isinstance(value, str) or not NI_URI_PATTERN.match(value):
        return False
    encoded = value[len(_NI_PREFIX) :]
    try:
        digest = base64.urlsafe_b64decode(encoded + "==")
    except (binascii.Error, ValueError):
        return False
    if len(digest) != 32:
        return False
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=") == encoded


def _safe_integer(value: float) -> int:
    if isinstance(value, float):
        if not value.is_integer():
            raise ValueError(f"identity: {value!r} is not a safe integer")
        value = int(value)
    if abs(value) > _SAFE_INT_MAX:
        raise ValueError(f"identity: {value!r} is not a safe integer")
    return value


def canonicalize(value: Any) -> Any:
    """Steps 1-3 of the identity law: NFC-normalize, sort keys, reject
    unsafe numbers. Pure — raises on the first violation found, never
    silently drops or coerces a value outside its stated range."""
    if isinstance(value, str):
        return unicodedata.normalize("NFC", value)
    if isinstance(value, bool) or value is None:
        return value
    if isinstance(value, (int, float)):
        return _safe_integer(value)
    if isinstance(value, list):
        return [canonicalize(item) for item in value]
    if isinstance(value, dict):
        canonical: dict[str, Any] = {}
        for key, member in value.items():
            if not isinstance(key, str):
                raise TypeError(f"identity: object keys must be strings, got {key!r}")
            canonical_key = unicodedata.normalize("NFC", key)
            if canonical_key in canonical:
                raise ValueError(
                    f"identity: keys collide after NFC normalization: {canonical_key!r}"
                )
            canonical[canonical_key] = canonicalize(member)
        return dict(sorted(canonical.items()))
    raise TypeError(f"identity: unsupported value {value!r}")


def identity(value: Any) -> str:
    """Steps 4-5: compact-serialize the canonical form and name its UTF-8
    bytes as an ``ni:///sha-256;...`` URI."""
    encoded = json.dumps(
        canonicalize(value), ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")
    digest = hashlib.sha256(encoded).digest()
    return _NI_PREFIX + base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def identity_of_record(body: dict[str, Any]) -> str:
    """A Tier B record's id: the identity of its body with any top-level
    ``id`` field excluded, so a record never hashes itself."""
    return identity({key: value for key, value in body.items() if key != "id"})
