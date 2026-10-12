from pathlib import Path

from pyfars.operator.edit.rewrite_body_link import render, rewrite


def test_render_replaces_matching_target():
    text = "See [alpha](alpha.md) for details."
    new_text, count = render(text, "alpha.md", "objects/alpha.md")
    assert new_text == "See [alpha](objects/alpha.md) for details."
    assert count == 1


def test_render_counts_multiple_occurrences():
    text = "[a](x.md) and again [b](x.md)"
    new_text, count = render(text, "x.md", "y.md")
    assert count == 2
    assert new_text == "[a](y.md) and again [b](y.md)"


def test_render_no_op_when_target_absent():
    text = "no links here"
    new_text, count = render(text, "x.md", "y.md")
    assert count == 0
    assert new_text == text


def test_rewrite_writes_the_file(tmp_path: Path):
    path = tmp_path / "note.md"
    path.write_text("[alpha](alpha.md)", encoding="utf-8")
    count = rewrite(path, "alpha.md", "objects/alpha.md")
    assert count == 1
    assert path.read_text(encoding="utf-8") == "[alpha](objects/alpha.md)"


def test_rewrite_leaves_file_untouched_when_no_match(tmp_path: Path):
    path = tmp_path / "note.md"
    original = "[alpha](alpha.md)"
    path.write_text(original, encoding="utf-8")
    count = rewrite(path, "beta.md", "gamma.md")
    assert count == 0
    assert path.read_text(encoding="utf-8") == original
