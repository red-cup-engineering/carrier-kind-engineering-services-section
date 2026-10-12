"""Per-provider rate-limit header parsers.

Each LLM provider exposes its rate-limit budget via different headers (or
not at all). This module normalizes provider responses into a single
shape so downstream observation emission and dispatch budget-folding can
work uniformly.

Output shape:

  {
    "exposed": bool,                    # provider returned actual telemetry
    "remaining-requests": str | None,   # OpenAI-style fields (if exposed)
    "remaining-tokens":   str | None,
    "limit-requests":     str | None,
    "limit-tokens":       str | None,
    "reset-requests":     str | None,
    "reset-tokens":       str | None,
    "retry-after":        str | None,
    "note":               str | None,   # provider-specific commentary
    "raw":                dict[str,str] # the captured headers themselves
  }

A parser is a callable `(headers: dict[str,str]) -> dict`. Headers come
in lowercased per `_endpoint_call.call`.

Resolution order in `parse(provider, headers)`:
  1. Exact-match against `_PARSERS` keys.
  2. Prefix-match (so `mistral-la-plateforme` resolves via `mistral`).
  3. Fallback to OpenAI-compatible parser.
"""
from __future__ import annotations

from typing import Callable

Parser = Callable[[dict[str, str]], dict]


_OPENAI_KEYS = (
    "x-ratelimit-limit-requests",
    "x-ratelimit-remaining-requests",
    "x-ratelimit-limit-tokens",
    "x-ratelimit-remaining-tokens",
    "x-ratelimit-reset-requests",
    "x-ratelimit-reset-tokens",
)


def _parse_openai_compatible(headers: dict[str, str]) -> dict:
    """Standard OpenAI-style x-ratelimit-* family.

    Used by Groq, NVIDIA NIM, Mistral, HuggingFace Router (when the
    underlying provider exposes them), and other OpenAI-compatible
    endpoints. Considered "exposed" when at least one x-ratelimit-*
    header is present.
    """
    raw = {k: v for k, v in headers.items() if k.startswith("x-ratelimit") or k == "retry-after"}
    exposed = any(k.startswith("x-ratelimit") for k in raw)
    return {
        "exposed": exposed,
        "remaining-requests": headers.get("x-ratelimit-remaining-requests"),
        "remaining-tokens":   headers.get("x-ratelimit-remaining-tokens"),
        "limit-requests":     headers.get("x-ratelimit-limit-requests"),
        "limit-tokens":       headers.get("x-ratelimit-limit-tokens"),
        "reset-requests":     headers.get("x-ratelimit-reset-requests"),
        "reset-tokens":       headers.get("x-ratelimit-reset-tokens"),
        "retry-after":        headers.get("retry-after"),
        "note": None if exposed else
                "no x-ratelimit-* headers present in provider response",
        "raw": raw,
    }


def _parse_cerebras(headers: dict[str, str]) -> dict:
    """Cerebras does not expose per-response rate-limit telemetry.

    Empirically (2026-05-04), `chat/completions` responses carry only the
    standard caching/transport headers — no x-ratelimit-* family. Track
    budget client-side via cumulative token-counts vs. tier limits.
    """
    return {
        "exposed": False,
        "remaining-requests": None,
        "remaining-tokens":   None,
        "limit-requests":     None,
        "limit-tokens":       None,
        "reset-requests":     None,
        "reset-tokens":       None,
        "retry-after":        headers.get("retry-after"),
        "note": "Cerebras does not return rate-limit headers per response. "
                "Track budget client-side via pyfars work budget against tier "
                "limits documented at inference-docs.cerebras.ai.",
        "raw": {k: v for k, v in headers.items() if k == "retry-after"},
    }


# Exact-match registry (provider field → parser).
_PARSERS: dict[str, Parser] = {
    "cerebras":              _parse_cerebras,
    "groq":                  _parse_openai_compatible,
    "nvidia-nim":            _parse_openai_compatible,
    "mistral-la-plateforme": _parse_openai_compatible,
    "huggingface-router":    _parse_openai_compatible,
}


# Prefix-match for variants (e.g. `mistral-la-plateforme-v2`).
_PARSER_PREFIXES: tuple[tuple[str, Parser], ...] = (
    ("cerebras",    _parse_cerebras),
    ("groq",        _parse_openai_compatible),
    ("nvidia",      _parse_openai_compatible),
    ("mistral",     _parse_openai_compatible),
    ("huggingface", _parse_openai_compatible),
)


def parse(provider: str | None, headers: dict[str, str]) -> dict:
    """Parse rate-limit telemetry from `headers` per `provider`'s scheme."""
    if provider:
        parser = _PARSERS.get(provider)
        if parser is None:
            for prefix, fn in _PARSER_PREFIXES:
                if provider.startswith(prefix):
                    parser = fn
                    break
        if parser is not None:
            return parser(headers)
    return _parse_openai_compatible(headers)
