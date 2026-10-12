"""Cross-language conformance vector #2 (design spec section 11): the shared
fixture corpus at ``lib/conformance/fixture-corpus/`` must parse to the
slug/kind/edge structure recorded in ``lib/conformance/fixture-corpus-expected.json``,
identically in pyfars and jsfars.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pyfars.substrate.index.edges import build as build_edges
from pyfars.substrate.load.notes import load

_SECTION_ROOT = Path(__file__).resolve().parents[6]
_FIXTURE_CORPUS = _SECTION_ROOT / "lib" / "conformance" / "fixture-corpus"
_EXPECTED_PATH = _SECTION_ROOT / "lib" / "conformance" / "fixture-corpus-expected.json"


def _load_expected() -> dict[str, Any]:
    with _EXPECTED_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


_EXPECTED = _load_expected()


def test_fixture_corpus_parses_with_no_diagnostics() -> None:
    _, diagnostics = load(_FIXTURE_CORPUS)
    assert diagnostics == []


def test_fixture_corpus_slugs_and_kinds_match_expected() -> None:
    notes, _ = load(_FIXTURE_CORPUS)
    assert len(notes) == len(_EXPECTED["notes_by_file"])
    by_slug = {n.slug: n for n in notes}
    for want in _EXPECTED["notes_by_file"]:
        got = by_slug.get(want["slug"])
        assert got is not None, f"missing note for slug {want['slug']!r}"
        assert got.dir == want["dir"]
        assert got.kind == want["kind"]
        assert str(got.path) == want["path"]


def test_fixture_corpus_frontmatter_and_body_match_expected() -> None:
    notes, _ = load(_FIXTURE_CORPUS)
    by_slug = {n.slug: n for n in notes}
    for want in _EXPECTED["notes_by_file"]:
        got = by_slug[want["slug"]]
        assert got.fm == want["fm"]
        assert got.body == want["body"]


def test_fixture_corpus_edges_match_expected_in_order() -> None:
    notes, _ = load(_FIXTURE_CORPUS)
    edges = build_edges(notes)
    got = [
        {"src": e.src, "dst": e.dst, "kind": e.kind, "source": e.source, "line": e.line}
        for e in edges
    ]
    assert got == _EXPECTED["edges"]


def test_fixture_corpus_has_at_least_one_body_link() -> None:
    assert any(e["source"] == "body" for e in _EXPECTED["edges"])
