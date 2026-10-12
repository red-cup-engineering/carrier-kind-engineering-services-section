"""Tests for kernel.site — a pymetrologic.site.Site over the corpus
directory structure (design spec section 4)."""

from __future__ import annotations

from pathlib import Path

from pyfars.kernel.site import build_site
from pyfars.substrate.load.notes import load

_SECTION_ROOT = Path(__file__).resolve().parents[6]
_FIXTURE_CORPUS = _SECTION_ROOT / "lib" / "conformance" / "fixture-corpus"


def test_every_note_is_a_face_of_its_directory() -> None:
    notes, _ = load(_FIXTURE_CORPUS)
    site = build_site(notes)
    for note in notes:
        assert note.slug in site.cells
        assert note.dir in site.cells
        assert site.leq(note.slug, note.dir)


def test_notes_in_different_directories_are_incomparable() -> None:
    notes, _ = load(_FIXTURE_CORPUS)
    site = build_site(notes)
    assert site.leq("alpha", "theorems") is False
    assert site.leq("alpha-property", "concepts") is False


def test_faces_of_a_directory_are_its_notes() -> None:
    notes, _ = load(_FIXTURE_CORPUS)
    site = build_site(notes)
    concept_slugs = {n.slug for n in notes if n.dir == "concepts"}
    assert set(site.faces_of("concepts")) == concept_slugs


def test_a_note_sharing_its_slug_across_directories_is_one_site_cell() -> None:
    from pyfars.substrate.flatfile import Flatfile

    shared = [
        Flatfile(
            slug="dup",
            dir="a",
            kind="x",
            fm={},
            body="",
            path=Path("a/dup.md"),
            mtime=0.0,
        ),
        Flatfile(
            slug="dup",
            dir="b",
            kind="x",
            fm={},
            body="",
            path=Path("b/dup.md"),
            mtime=0.0,
        ),
    ]
    site = build_site(shared)
    assert site.cells.count("dup") == 1
    assert site.leq("dup", "a")
    assert site.leq("dup", "b")
