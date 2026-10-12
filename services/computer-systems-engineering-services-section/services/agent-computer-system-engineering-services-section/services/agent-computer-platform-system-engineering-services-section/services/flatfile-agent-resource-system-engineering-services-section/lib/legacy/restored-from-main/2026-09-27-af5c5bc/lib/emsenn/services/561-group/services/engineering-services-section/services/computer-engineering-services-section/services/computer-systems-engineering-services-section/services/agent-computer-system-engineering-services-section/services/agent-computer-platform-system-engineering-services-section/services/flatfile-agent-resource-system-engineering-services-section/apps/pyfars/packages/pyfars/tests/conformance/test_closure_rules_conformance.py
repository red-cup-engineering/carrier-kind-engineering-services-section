"""Cross-language conformance vector #4 (design spec section 11): running
the generic closure rules over ``lib/conformance/fixture-corpus/`` must
produce the diagnostics list recorded in
``lib/conformance/diagnostics-expected.json``, identically in pyfars and
jsfars.

``pyfars.substrate.types.diagnostic.Diagnostic`` carries more than
jsfars's ``makeDiagnostic`` does (a ``severity`` field, rule-specific keys
folded into a free-form ``extra`` dict rather than a fixed ``target``
field) — the two shapes are not directly comparable. ``_normalize`` maps
a ``Diagnostic`` down to jsfars's fixed shape (``rule``, ``path``,
``slug``, ``target``, ``message``); the JS side needs no such mapping
since ``makeDiagnostic`` already emits that shape.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pyfars.closure.rule.compose_rules import run as run_rules
from pyfars.substrate.load.notes import load as load_notes
from pyfars.substrate.types.diagnostic import Diagnostic

_SECTION_ROOT = Path(__file__).resolve().parents[6]
_FIXTURE_CORPUS = _SECTION_ROOT / "lib" / "conformance" / "fixture-corpus"
_EXPECTED_PATH = _SECTION_ROOT / "lib" / "conformance" / "diagnostics-expected.json"


def _load_expected() -> dict[str, Any]:
    with _EXPECTED_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


_EXPECTED = _load_expected()


def _normalize(d: Diagnostic) -> dict[str, Any]:
    extra = d.extra
    if d.code == "cycles":
        slugs = extra.get("slugs", [])
        anchor = slugs[0] if len(slugs) == 1 else None
        slug, target = anchor, anchor
    elif d.code == "symbols":
        slug, target = None, extra.get("symbol")
    elif d.code == "status-consistency":
        slug, target = extra.get("slug"), extra.get("dep")
    elif d.code in ("broken-links", "ambiguous-reference"):
        slug, target = extra.get("slug"), extra.get("target")
    else:
        slug, target = extra.get("slug"), None
    return {
        "rule": d.code,
        "path": str(d.path) if d.path is not None else None,
        "slug": slug,
        "target": target,
        "message": d.message,
    }


def test_closure_rule_diagnostics_match_expected_in_order() -> None:
    notes, load_diagnostics = load_notes(_FIXTURE_CORPUS)
    assert load_diagnostics == []
    diagnostics = run_rules(notes, root=_FIXTURE_CORPUS)
    got = [_normalize(d) for d in diagnostics]
    assert got == _EXPECTED["diagnostics"]


def test_expected_diagnostics_use_the_shared_rule_vocabulary() -> None:
    shared_rules = {
        "cycles", "broken-links", "ambiguous-reference", "stubs", "orphans",
        "status-consistency", "missing-status", "missing-proof", "wip-theorem",
        "symbols",
    }
    for want in _EXPECTED["diagnostics"]:
        assert want["rule"] in shared_rules
