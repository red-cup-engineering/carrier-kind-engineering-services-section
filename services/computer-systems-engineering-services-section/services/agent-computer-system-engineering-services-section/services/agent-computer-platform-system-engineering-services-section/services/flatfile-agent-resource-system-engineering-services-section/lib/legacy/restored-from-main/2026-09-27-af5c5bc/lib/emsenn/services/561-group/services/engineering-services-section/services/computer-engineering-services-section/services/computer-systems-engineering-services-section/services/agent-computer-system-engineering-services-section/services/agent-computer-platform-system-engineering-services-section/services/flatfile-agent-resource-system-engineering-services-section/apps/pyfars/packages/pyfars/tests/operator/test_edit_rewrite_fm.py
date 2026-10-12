from pathlib import Path

from pyfars.operator.edit.rewrite_fm import apply, render


def test_render_preserves_body_and_rewrites_fm():
    old_text = "---\ntitle: Alpha\n---\n\nBody text.\n"
    new_text = render(old_text, {"title": "Beta"})
    assert new_text == "---\ntitle: Beta\n---\n\nBody text.\n"


def test_render_is_pure_and_does_not_touch_disk(tmp_path: Path):
    path = tmp_path / "note.md"
    path.write_text("---\ntitle: Alpha\n---\n\nBody.\n", encoding="utf-8")
    old_text = path.read_text(encoding="utf-8")
    render(old_text, {"title": "Beta"})
    assert path.read_text(encoding="utf-8") == old_text


def test_apply_writes_the_file_and_returns_old_and_new_text(tmp_path: Path):
    path = tmp_path / "note.md"
    path.write_text("---\ntitle: Alpha\n---\n\nBody.\n", encoding="utf-8")
    old_text, new_text = apply(path, {"title": "Beta"})
    assert old_text == "---\ntitle: Alpha\n---\n\nBody.\n"
    assert new_text == "---\ntitle: Beta\n---\n\nBody.\n"
    assert path.read_text(encoding="utf-8") == new_text
