"""Tests for pyfars.runtime.match — fiber-composition office matching."""
from pathlib import Path

import pytest

from pyfars.runtime.group import Group, OfficeRecord
from pyfars.runtime.match import (
    MatchScore,
    TaskQuery,
    best_office,
    enrich_for_redispatch,
    match_offices,
    match_offices_in_group,
    score_office,
)


def _office(slug: str, *, may=(), must=(), must_not=()) -> OfficeRecord:
    return OfficeRecord(slug=slug, may=frozenset(may),
                        must=frozenset(must),
                        must_not=frozenset(must_not))


# -- score_office: per-bucket arithmetic --------------------------


def test_score_counts_agreement_on_may_and_must():
    """Both ``may`` and ``must`` count as agreement — the office is
    *willing* to do the action either way; the duty/permission
    distinction is captured separately by duty_boost on prefers."""
    o = _office("o", may=["a"], must=["b"])
    s = score_office(o, TaskQuery(requires=frozenset({"a", "b"})))
    assert s.agreement == 2
    assert s.agreement_predicates == frozenset({"a", "b"})
    assert s.conflict == 0


def test_score_counts_conflict_on_required_must_not():
    """A task requires X; an office must-not X. Hard conflict —
    SWE-agent's 'the constraint IS the dispatch' principle."""
    o = _office("o", may=["a"], must_not=["x"])
    s = score_office(o, TaskQuery(requires=frozenset({"a", "x"})))
    assert s.conflict == 1
    assert "x" in s.conflict_predicates
    assert s.is_eligible is False


def test_score_counts_conflict_on_forbidden_permitted():
    """The other conflict mode: task forbids Y, office may/must Y.
    The doer would do something the task said not to."""
    o = _office("o", may=["leak-secrets"], must=["report-status"])
    s = score_office(o, TaskQuery(
        requires=frozenset({"report-status"}),
        forbids=frozenset({"leak-secrets"}),
    ))
    assert s.conflict == 1
    assert "leak-secrets" in s.conflict_predicates
    assert s.is_eligible is False


def test_forbids_against_contradictory_office_is_not_a_conflict():
    """The other side of must_not-authoritative: if the task FORBIDS
    X and the office lists X in both ``may`` and ``must_not``, the
    prohibition wins — so the office isn't actually offering X, so
    there's no conflict to register against the forbids set. Pinned
    to keep dispatch's reading of must_not aligned with the
    authorization gate's reading."""
    o = _office("o", may=["x"], must_not=["x"])
    s = score_office(o, TaskQuery(forbids=frozenset({"x"})))
    assert s.conflict == 0
    assert s.is_eligible is True


def test_score_must_not_overrides_may_when_office_is_self_contradictory():
    """An office record listing X in both ``may`` and ``must_not`` is
    internally contradictory; we treat must_not as authoritative
    (forbid > permit). This is a property a future validator should
    surface, but the matcher must not crash on it."""
    o = _office("o", may=["x"], must_not=["x"])
    s = score_office(o, TaskQuery(requires=frozenset({"x"})))
    # The predicate isn't agreed (must_not wins) AND it's a conflict
    # (required + must_not). silent stays 0 because must_not still
    # counts as "the office has an opinion".
    assert s.agreement == 0
    assert s.conflict == 1
    assert s.silent == 0


def test_score_counts_duty_boost_only_on_must():
    """Per the analysis: prefers ∩ must boosts (RimWorld duty
    priority); prefers ∩ may does NOT — a permission isn't a
    declared priority."""
    o = _office("o", may=["a"], must=["b"])
    s = score_office(o, TaskQuery(
        requires=frozenset({"a", "b"}),
        prefers=frozenset({"a", "b"}),
    ))
    assert s.duty_boost == 1
    assert s.duty_boost_predicates == frozenset({"b"})


def test_score_silent_counts_required_predicates_with_no_opinion():
    """silent = predicates the task requires that the office has
    NO position on at all — the ⊥ ⊙ ⊤ region of the composition."""
    o = _office("o", may=["a"])
    s = score_office(o, TaskQuery(requires=frozenset({"a", "b", "c"})))
    assert s.agreement == 1  # a
    assert s.silent == 2  # b, c — office has no opinion


# -- match_offices: ranking discipline ----------------------------


def test_match_eligible_offices_rank_before_ineligible():
    """The four-tier sort: conflict-free first, regardless of how
    high a conflicting office scores on agreement."""
    eligible_low = _office("low", may=["a"])
    conflicting_high = _office("conf", may=["a", "b", "c", "d"],
                               must_not=["x"])
    task = TaskQuery(requires=frozenset({"a", "b", "c", "d", "x"}))
    ranked = match_offices(task, [conflicting_high, eligible_low])
    assert [s.office.slug for s in ranked] == ["low", "conf"]


def test_match_ranks_by_descending_positive_score_within_eligible():
    a = _office("a", may=["x"])
    b = _office("b", may=["x", "y"])
    c = _office("c", may=["x", "y", "z"])
    task = TaskQuery(requires=frozenset({"x", "y", "z"}))
    ranked = match_offices(task, [a, b, c])
    assert [s.office.slug for s in ranked] == ["c", "b", "a"]


def test_match_tiebreak_by_ascending_silent_then_slug():
    """Same agreement, different silent: less silent wins. Same
    silent: alphabetical by slug for determinism."""
    # both score 1 agreement; b has 1 silent ('y'), a has 1 silent
    # ('z'); alphabetical tiebreak applies → a before b.
    a = _office("a", may=["x"])
    b = _office("b", may=["x"])
    task = TaskQuery(requires=frozenset({"x", "y"}))
    ranked = match_offices(task, [b, a])
    assert [s.office.slug for s in ranked] == ["a", "b"]


def test_match_duty_boost_breaks_agreement_tie():
    """Two offices with same agreement; one bears the prefers
    predicate as a *duty* — RimWorld priority lifts it."""
    a = _office("a", may=["x"])
    b = _office("b", may=["x"], must=["x"])  # x in both may and must
    task = TaskQuery(requires=frozenset({"x"}),
                     prefers=frozenset({"x"}))
    ranked = match_offices(task, [a, b])
    assert ranked[0].office.slug == "b"
    assert ranked[0].duty_boost == 1


def test_match_can_drop_conflicting_offices():
    o1 = _office("ok", may=["a"])
    o2 = _office("blocked", may=["a"], must_not=["b"])
    task = TaskQuery(requires=frozenset({"a", "b"}))
    full = match_offices(task, [o1, o2])
    assert len(full) == 2
    filtered = match_offices(task, [o1, o2], include_conflicts=False)
    assert [s.office.slug for s in filtered] == ["ok"]


def test_match_can_drop_silent_offices():
    """An office with no opinion at all on any of the task's
    predicates is noise in the report — include_silent=False
    drops it."""
    relevant = _office("rel", may=["a"])
    silent = _office("sil", may=["unrelated"])
    task = TaskQuery(requires=frozenset({"a"}))
    ranked = match_offices(task, [relevant, silent], include_silent=False)
    assert [s.office.slug for s in ranked] == ["rel"]


# -- best_office ----------------------------------------------------


def test_best_office_returns_top_eligible_when_one_scores():
    o = _office("ok", may=["a"])
    other = _office("nope", may=["irrelevant"])
    task = TaskQuery(requires=frozenset({"a"}))
    assert best_office(task, [o, other]) is o


def test_best_office_returns_none_when_all_offices_eliminable_or_silent():
    """Voyager re-dispatch trigger: nothing positive matched → None,
    so the caller knows to enrich the task and re-match."""
    blocked = _office("blocked", must_not=["a"])
    silent = _office("silent", may=["unrelated"])
    task = TaskQuery(requires=frozenset({"a"}))
    assert best_office(task, [blocked, silent]) is None


# -- group integration --------------------------------------------


def _write_group_with_ship_crew(tmp_path: Path) -> Path:
    """A small group: polity has 3 offices, ship is crewed by 2 of
    them — used to prove ship-narrowing actually narrows."""
    g = tmp_path / "group"
    g.mkdir()
    (g / "polity.md").write_text(
        '---\nkind: polity\nslug: "polity:t"\n'
        'populace: ["personnel:em"]\n'
        'ships: ["ship:expedition"]\n'
        'offices: ["office:cmd", "office:eng", "office:archive"]\n'
        '---\n', encoding="utf-8")
    (g / "ships").mkdir()
    (g / "ships" / "expedition.md").write_text(
        '---\nkind: ship\nslug: "ship:expedition"\n'
        'of-polity: "polity:t"\ncaptain: "personnel:em"\n'
        'home-office: "office:cmd"\n'
        'crewed-by-offices: ["office:cmd", "office:eng"]\n'
        '---\n', encoding="utf-8")
    (g / "offices").mkdir()
    (g / "offices" / "cmd.md").write_text(
        '---\nkind: office\nslug: "office:cmd"\nheld-by: "personnel:em"\n'
        'deontic-profile:\n  may: [decide, command]\n---\n',
        encoding="utf-8")
    (g / "offices" / "eng.md").write_text(
        '---\nkind: office\nslug: "office:eng"\nheld-by: "personnel:em"\n'
        'deontic-profile:\n  may: [build, refactor]\n  must: [test]\n---\n',
        encoding="utf-8")
    (g / "offices" / "archive.md").write_text(
        '---\nkind: office\nslug: "office:archive"\n'
        'deontic-profile:\n  may: [build]\n---\n',
        encoding="utf-8")
    (g / "personnel").mkdir()
    (g / "personnel" / "em.md").write_text(
        '---\nkind: personnel\nholds-offices: ["office:cmd", "office:eng"]\n'
        '---\n', encoding="utf-8")
    return g


def test_match_in_group_unrestricted_considers_all_polity_offices(tmp_path):
    g = Group.load(_write_group_with_ship_crew(tmp_path))
    # 'build' is offered by office:eng AND office:archive
    task = TaskQuery(slug="task:t", requires=frozenset({"build"}))
    ranked = match_offices_in_group(task, g, include_silent=False)
    slugs = {s.office.slug for s in ranked}
    assert slugs == {"office:eng", "office:archive"}


def test_match_in_group_narrowed_to_ship_excludes_landside_offices(tmp_path):
    """The composition with governance: matching against a ship's
    crew must not surface offices that aren't embarked. 'office:archive'
    can build but isn't on the expedition's crew, so it must not
    appear when the ship is specified."""
    g = Group.load(_write_group_with_ship_crew(tmp_path))
    task = TaskQuery(slug="task:t", requires=frozenset({"build"}))
    ranked = match_offices_in_group(task, g, ship_slug="ship:expedition",
                                    include_silent=False)
    slugs = {s.office.slug for s in ranked}
    # archive is NOT on the ship; eng IS
    assert "office:eng" in slugs
    assert "office:archive" not in slugs


def test_match_in_group_unknown_ship_raises(tmp_path):
    g = Group.load(_write_group_with_ship_crew(tmp_path))
    task = TaskQuery(slug="task:t", requires=frozenset({"build"}))
    with pytest.raises(KeyError, match="ship:typo"):
        match_offices_in_group(task, g, ship_slug="ship:typo")


# -- Voyager re-dispatch enrichment -------------------------------


def test_enrich_returns_new_query_with_fields_combined():
    base = TaskQuery(slug="t", requires=frozenset({"a", "b"}),
                     forbids=frozenset({"x"}),
                     prefers=frozenset({"p1"}))
    enriched = enrich_for_redispatch(base, drop_requires=["b"],
                                     add_requires=["c"],
                                     add_prefers=["p2"])
    assert enriched is not base
    assert enriched.requires == frozenset({"a", "c"})
    assert enriched.prefers == frozenset({"p1", "p2"})
    assert enriched.forbids == frozenset({"x"})  # untouched
    # Original is untouched (frozen)
    assert base.requires == frozenset({"a", "b"})


def test_enrich_then_rematch_finds_office_first_pass_missed():
    """End-to-end Voyager pattern: first match misses (no office can
    'invent-syntax'); enriching with 'design-syntax' instead finds
    the language office. Proves the loop closes."""
    language_office = _office("language",
                              may=["design-syntax", "review-syntax"])
    task = TaskQuery(slug="t",
                     requires=frozenset({"invent-syntax"}))
    assert best_office(task, [language_office]) is None  # first pass: miss

    enriched = enrich_for_redispatch(task,
                                     drop_requires=["invent-syntax"],
                                     add_requires=["design-syntax"])
    assert best_office(enriched, [language_office]) is language_office


# -- score formatter (debug aid) ----------------------------------


def test_match_score_explain_renders_eligible_and_conflict():
    o = _office("o", may=["a"])
    eligible = score_office(o, TaskQuery(requires=frozenset({"a"})))
    assert "eligible" in eligible.explain()
    blocked = _office("b", must_not=["x"])
    conflicted = score_office(blocked, TaskQuery(requires=frozenset({"x"})))
    assert "CONFLICT" in conflicted.explain()


def test_match_score_is_a_dataclass_carrying_the_office_back():
    o = _office("o", may=["a"])
    s = score_office(o, TaskQuery(slug="t",
                                  requires=frozenset({"a"})))
    assert isinstance(s, MatchScore)
    assert s.office is o
    assert s.task_slug == "t"
