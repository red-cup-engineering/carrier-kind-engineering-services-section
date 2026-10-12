from pyfars.substrate.parse._slug_target import slug_of


def test_bare_slug_passes_through():
    assert slug_of("foo") == "foo"


def test_md_suffix_stripped():
    assert slug_of("foo.md") == "foo"


def test_path_extracted_to_basename():
    assert slug_of("../bar/foo.md") == "foo"


def test_anchor_dropped():
    assert slug_of("foo.md#section") == "foo"


def test_query_dropped():
    assert slug_of("foo.md?x=1") == "foo"


def test_require_md_returns_none_for_non_md():
    assert slug_of("foo", require_md=True) is None
    assert slug_of("foo.png", require_md=True) is None


def test_require_md_accepts_md():
    assert slug_of("foo.md", require_md=True) == "foo"


def test_empty_target_returns_none():
    assert slug_of("") is None


def test_index_md_combines_with_parent():
    assert slug_of("skills/_index.md") == "skills-index"
    assert slug_of("../foo/_index.md") == "foo-index"


def test_skill_md_combines_with_parent():
    assert slug_of("skills/persona/draft-from-framework/SKILL.md") == "draft-from-framework-skill"


def test_directory_link_resolves_to_section_index():
    assert slug_of("skills/") == "skills-index"
    assert slug_of("../foo/") == "foo-index"


def test_directory_link_admitted_under_require_md():
    """Trailing-slash dir links address a note (the section index) so
    ``require_md`` callers (broken-link checker) must still see them."""
    assert slug_of("skills/", require_md=True) == "skills-index"
    assert slug_of("foo/SKILL.md", require_md=True) == "foo-skill"


def test_bare_index_or_skill_without_parent_returns_none():
    assert slug_of("_index.md") is None
    assert slug_of("SKILL.md") is None


def test_readme_md_returns_none():
    """README.md is never loaded as a note, so links to it aren't broken refs."""
    assert slug_of("README.md") is None
    assert slug_of("../README.md") is None


def test_dot_segments_stripped():
    assert slug_of("../../foo.md") == "foo"
    assert slug_of("./foo.md") == "foo"
