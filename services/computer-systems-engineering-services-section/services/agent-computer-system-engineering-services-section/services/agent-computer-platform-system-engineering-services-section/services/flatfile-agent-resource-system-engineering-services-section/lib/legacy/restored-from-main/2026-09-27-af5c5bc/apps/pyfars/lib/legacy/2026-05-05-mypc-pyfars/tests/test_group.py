"""Tests for pyfars.runtime.group — load + validate + command real records."""
from pathlib import Path

import pytest

from pyfars.runtime.channel import EventRuntime, MessageBus
from pyfars.runtime.event_log import EventLog
from pyfars.runtime.group import (
    CommandResult,
    Group,
    OfficeRecord,
    PersonnelRecord,
    PolityRecord,
    ShipRecord,
    command,
)


def _find_repo_group_dir() -> Path | None:
    """Walk upward from this test file looking for the canonical
    on-disk group dir. Marker-based discovery so the integration
    tests don't break if the test file is moved or the repo is
    laid out differently in a fork."""
    here = Path(__file__).resolve()
    for parent in (here, *here.parents):
        candidate = parent / "operations" / "command" / "group" / "561-group.md"
        if candidate.is_file():
            return candidate.parent
    return None


REPO_GROUP_DIR = _find_repo_group_dir()


def _write_group(tmp: Path, *, polity_fm: str, ships=None, offices=None,
                 personnel=None) -> Path:
    """Build a minimal on-disk group dir for testing.

    Mirrors the operations/command/group/ layout with one polity file
    plus the three subdirectories. Each kind takes a list of
    ``(filename_stem, frontmatter_yaml)`` tuples.
    """
    g = tmp / "group"
    g.mkdir()
    (g / "polity.md").write_text(f"---\n{polity_fm}\n---\n# polity\n",
                                 encoding="utf-8")
    for sub, items in (("ships", ships), ("offices", offices),
                       ("personnel", personnel)):
        d = g / sub
        d.mkdir()
        for stem, fm in (items or []):
            (d / f"{stem}.md").write_text(
                f"---\n{fm}\n---\n# {stem}\n", encoding="utf-8"
            )
    return g


# -- record parsing -----------------------------------------------


def test_polity_record_parses_populace_ships_offices():
    fm = {
        "slug": "polity:test",
        "title": "Test Polity",
        "populace": ["personnel:a", "personnel:b"],
        "ships": ["ship:one"],
        "offices": ["office:cmd"],
    }
    p = PolityRecord.from_frontmatter(fm)
    assert p.slug == "polity:test"
    assert p.populace == frozenset({"personnel:a", "personnel:b"})
    assert p.ships == frozenset({"ship:one"})
    assert p.offices == frozenset({"office:cmd"})


def test_office_record_parses_deontic_profile_into_three_sets():
    """The Hohfeldian deontic profile is the load-bearing field; we
    pin its parse so a frontmatter author can rely on may/must/must-not
    being addressable as frozensets."""
    fm = {
        "slug": "office:cmd",
        "held-by": "personnel:emsenn",
        "deontic-profile": {
            "may": ["amend-charter", "select-voyage"],
            "must": ["record-decisions"],
            "must-not": ["bypass-decision-record"],
        },
    }
    o = OfficeRecord.from_frontmatter(fm)
    assert o.may == frozenset({"amend-charter", "select-voyage"})
    assert o.must == frozenset({"record-decisions"})
    assert o.must_not == frozenset({"bypass-decision-record"})
    assert not o.is_vacant()


def test_office_record_handles_missing_or_malformed_deontic_profile():
    """Frontmatter without deontic-profile (or with a non-mapping
    value) must produce empty sets, not crash. The corpus has a few
    sparse offices and they should still load."""
    o1 = OfficeRecord.from_frontmatter({"slug": "office:x"})
    assert o1.may == frozenset() and o1.must == frozenset()
    o2 = OfficeRecord.from_frontmatter({"slug": "office:y",
                                        "deontic-profile": "garbled"})
    assert o2.may == frozenset()


def test_office_record_vacant_when_held_by_absent():
    o = OfficeRecord.from_frontmatter({"slug": "office:vacant"})
    assert o.is_vacant() is True
    assert o.held_by is None


def test_personnel_record_synthesizes_slug_from_filename(tmp_path):
    """Real personnel records in the corpus omit ``slug:`` and rely
    on the filename. The loader must synthesize ``personnel:<stem>``
    rather than crash."""
    p = tmp_path / "emsenn.md"
    p.write_text("# x", encoding="utf-8")
    rec = PersonnelRecord.from_frontmatter({"title": "emsenn"},
                                           source_path=p)
    assert rec.slug == "personnel:emsenn"


def test_personnel_record_without_slug_or_path_raises():
    with pytest.raises(ValueError, match="slug or source_path"):
        PersonnelRecord.from_frontmatter({"title": "x"})


def test_ship_record_parses_crew_and_captain():
    fm = {
        "slug": "ship:rsc",
        "of-polity": "polity:test",
        "captain": "personnel:emsenn",
        "home-office": "office:cmd",
        "current-voyage": "voyage 1",
        "crewed-by-offices": ["office:cmd", "office:eng"],
    }
    s = ShipRecord.from_frontmatter(fm)
    assert s.captain == "personnel:emsenn"
    assert s.crewed_by_offices == frozenset({"office:cmd", "office:eng"})


# -- Group load + validate ----------------------------------------


def _make_valid_group(tmp_path: Path) -> Path:
    """Build a tiny but referentially-complete group on disk."""
    return _write_group(
        tmp_path,
        polity_fm=('kind: polity\n'
                   'slug: "polity:test"\n'
                   'title: Test\n'
                   'populace: ["personnel:em"]\n'
                   'ships: ["ship:rsc"]\n'
                   'offices: ["office:cmd"]\n'),
        ships=[("rsc", 'kind: ship\n'
                       'slug: "ship:rsc"\n'
                       'of-polity: "polity:test"\n'
                       'captain: "personnel:em"\n'
                       'home-office: "office:cmd"\n'
                       'crewed-by-offices: ["office:cmd"]\n')],
        offices=[("cmd", 'kind: office\n'
                         'slug: "office:cmd"\n'
                         'of-polity: "polity:test"\n'
                         'held-by: "personnel:em"\n'
                         'deontic-profile:\n'
                         '  may: [amend-charter]\n')],
        personnel=[("em", 'kind: personnel\n'
                          'title: em\n'
                          'of-polity: "polity:test"\n'
                          'holds-offices: ["office:cmd"]\n')],
    )


def test_group_load_indexes_all_four_kinds(tmp_path):
    g = Group.load(_make_valid_group(tmp_path))
    assert g.polity.slug == "polity:test"
    assert "ship:rsc" in g.ships
    assert "office:cmd" in g.offices
    assert "personnel:em" in g.personnel


def test_group_load_skips_index_files(tmp_path):
    """``_index.md`` files in offices/ etc. are landing pages, not
    records — they must not be loaded as half-typed records (which
    would otherwise crash at the missing slug)."""
    g_dir = _make_valid_group(tmp_path)
    (g_dir / "offices" / "_index.md").write_text(
        "# Index\n\nNo frontmatter here.\n", encoding="utf-8"
    )
    (g_dir / "personnel" / "_index.md").write_text(
        "---\nkind: index\n---\n# Index\n", encoding="utf-8"
    )
    g = Group.load(g_dir)  # must not raise
    assert "office:cmd" in g.offices
    assert "personnel:em" in g.personnel


def test_group_load_demands_exactly_one_polity_file(tmp_path):
    g = tmp_path / "group"
    g.mkdir()
    (g / "ships").mkdir()
    (g / "offices").mkdir()
    (g / "personnel").mkdir()
    with pytest.raises(FileNotFoundError, match="no kind: polity"):
        Group.load(g)
    # Two polities → also a hard error
    (g / "a.md").write_text('---\nkind: polity\nslug: "p:a"\n---\n',
                            encoding="utf-8")
    (g / "b.md").write_text('---\nkind: polity\nslug: "p:b"\n---\n',
                            encoding="utf-8")
    with pytest.raises(ValueError, match="multiple polity"):
        Group.load(g)


def test_group_validate_passes_on_well_formed_group(tmp_path):
    g = Group.load(_make_valid_group(tmp_path))
    v = g.validate()
    assert v.ok, v.summary()


def test_group_validate_flags_home_office_unknown(tmp_path):
    """A ship may declare home_office; if that office has no record,
    the validator must catch it (added per architect review)."""
    g_dir = _write_group(
        tmp_path,
        polity_fm=('kind: polity\nslug: "polity:test"\n'
                   'populace: ["personnel:em"]\nships: ["ship:rsc"]\n'
                   'offices: ["office:cmd"]\n'),
        ships=[("rsc", 'kind: ship\nslug: "ship:rsc"\n'
                       'of-polity: "polity:test"\n'
                       'home-office: "office:phantom"\n'
                       'crewed-by-offices: ["office:cmd"]\n')],
        offices=[("cmd", 'kind: office\nslug: "office:cmd"\n'
                         'held-by: "personnel:em"\n')],
        personnel=[("em", 'kind: personnel\nholds-offices: ["office:cmd"]\n')],
    )
    v = Group.load(g_dir).validate()
    assert ("ship:rsc", "office:phantom") in v.home_office_unknown


def test_group_validate_flags_home_office_not_in_crew(tmp_path):
    """If the captain's home office is not embarked on the ship, the
    captain has no operational standing — the validator must surface
    the inconsistency."""
    g_dir = _write_group(
        tmp_path,
        polity_fm=('kind: polity\nslug: "polity:test"\n'
                   'populace: ["personnel:em"]\nships: ["ship:rsc"]\n'
                   'offices: ["office:cmd", "office:eng"]\n'),
        ships=[("rsc", 'kind: ship\nslug: "ship:rsc"\n'
                       'of-polity: "polity:test"\n'
                       'home-office: "office:eng"\n'  # not in crew
                       'crewed-by-offices: ["office:cmd"]\n')],
        offices=[("cmd", 'kind: office\nslug: "office:cmd"\n'),
                 ("eng", 'kind: office\nslug: "office:eng"\n')],
        personnel=[("em", 'kind: personnel\n')],
    )
    v = Group.load(g_dir).validate()
    assert ("ship:rsc", "office:eng") in v.home_office_not_in_crew


def test_group_validate_flags_captain_not_holding_home_office(tmp_path):
    """ship.captain must hold ship.home-office (per the office's own
    held-by). Both sides existing isn't enough — they have to agree."""
    g_dir = _write_group(
        tmp_path,
        polity_fm=('kind: polity\nslug: "polity:test"\n'
                   'populace: ["personnel:em", "personnel:other"]\n'
                   'ships: ["ship:rsc"]\noffices: ["office:cmd"]\n'),
        ships=[("rsc", 'kind: ship\nslug: "ship:rsc"\n'
                       'of-polity: "polity:test"\n'
                       'captain: "personnel:em"\n'
                       'home-office: "office:cmd"\n'
                       'crewed-by-offices: ["office:cmd"]\n')],
        # office held by someone OTHER than the declared captain
        offices=[("cmd", 'kind: office\nslug: "office:cmd"\n'
                         'held-by: "personnel:other"\n')],
        personnel=[("em", 'kind: personnel\n'),
                   ("other", 'kind: personnel\nholds-offices: ["office:cmd"]\n')],
    )
    v = Group.load(g_dir).validate()
    assert ("ship:rsc", "personnel:em", "office:cmd") in v.captain_not_in_home_office


def test_group_validate_flags_held_by_holds_offices_mismatch(tmp_path):
    """office.held-by ↔ personnel.holds-offices reciprocity. The
    auth gate trusts the office side; if the personnel side disagrees
    the validator must surface it so the captain can reconcile."""
    g_dir = _write_group(
        tmp_path,
        polity_fm=('kind: polity\nslug: "polity:test"\n'
                   'populace: ["personnel:em"]\noffices: ["office:cmd"]\n'),
        offices=[("cmd", 'kind: office\nslug: "office:cmd"\n'
                         'held-by: "personnel:em"\n')],
        # personnel does NOT list office:cmd in holds-offices — the
        # two sides disagree about whether em holds cmd
        personnel=[("em", 'kind: personnel\nholds-offices: []\n')],
    )
    v = Group.load(g_dir).validate()
    assert ("office:cmd", "personnel:em") in v.held_by_holds_mismatch


def test_group_validate_flags_of_polity_drift(tmp_path):
    """A sub-record claiming a different polity than the loaded one
    is institutional drift — the records on disk are claiming to be
    governed by something other than what we just loaded."""
    g_dir = _write_group(
        tmp_path,
        polity_fm=('kind: polity\nslug: "polity:test"\n'
                   'offices: ["office:cmd"]\npopulace: ["personnel:em"]\n'),
        offices=[("cmd", 'kind: office\nslug: "office:cmd"\n'
                         'of-polity: "polity:elsewhere"\n')],
        personnel=[("em", 'kind: personnel\nof-polity: "polity:elsewhere"\n')],
    )
    v = Group.load(g_dir).validate()
    polities_drifting = {(kind, slug) for kind, slug, _ in v.of_polity_mismatch}
    assert ("office", "office:cmd") in polities_drifting
    assert ("personnel", "personnel:em") in polities_drifting


def test_group_validate_flags_each_class_of_break(tmp_path):
    """One torn graph hits *every* validator at once. Pin all seven
    classes here so a future refactor can't silently drop one."""
    g_dir = _write_group(
        tmp_path,
        # populace points at someone who doesn't exist
        # offices/ships point at things that don't exist
        polity_fm=('kind: polity\n'
                   'slug: "polity:test"\n'
                   'populace: ["personnel:ghost"]\n'
                   'ships: ["ship:phantom"]\n'
                   'offices: ["office:imaginary"]\n'),
        ships=[("rsc", 'kind: ship\n'
                       'slug: "ship:rsc"\n'
                       'of-polity: "polity:test"\n'
                       'captain: "personnel:nobody"\n'
                       'crewed-by-offices: ["office:nowhere"]\n')],
        offices=[("cmd", 'kind: office\n'
                         'slug: "office:cmd"\n'
                         'held-by: "personnel:nobody"\n')],
        personnel=[("em", 'kind: personnel\n'
                          'holds-offices: ["office:nowhere"]\n')],
    )
    v = Group.load(g_dir).validate()
    assert not v.ok
    assert "personnel:ghost" in v.missing_populace
    assert "office:imaginary" in v.missing_offices
    assert "ship:phantom" in v.missing_ships
    assert ("office:cmd", "personnel:nobody") in v.held_by_unknown_personnel
    assert ("personnel:em", "office:nowhere") in v.holds_unknown_office
    assert ("ship:rsc", "personnel:nobody") in v.captain_not_in_personnel
    assert ("ship:rsc", "office:nowhere") in v.crewed_by_unknown_office
    # And summary surfaces all of them
    s = v.summary()
    for piece in ("populace", "offices", "ships", "held-by", "holds-offices",
                  "captain", "crewed-by"):
        assert piece in s


def test_group_queries_offices_held_by_and_vacant(tmp_path):
    g = Group.load(_make_valid_group(tmp_path))
    held = g.offices_held_by("personnel:em")
    assert [o.slug for o in held] == ["office:cmd"]
    assert g.vacant_offices() == []


def test_group_lookup_typos_fail_loudly(tmp_path):
    """Command lines fat-finger ship slugs all the time; the error
    must list available slugs so the captain can correct it."""
    g = Group.load(_make_valid_group(tmp_path))
    with pytest.raises(KeyError, match="unknown ship"):
        g.ship("ship:typo")
    with pytest.raises(KeyError, match="unknown office"):
        g.office("office:typo")
    with pytest.raises(KeyError, match="unknown personnel"):
        g.person("personnel:typo")


# -- command verb -------------------------------------------------


def test_command_authorized_issuer_emits_witness(tmp_path):
    """Captain commanding the ship: ship resolves, issuer holds an
    office on the polity, witness lands on the command channel."""
    g = Group.load(_make_valid_group(tmp_path))
    runtime = EventRuntime(log=EventLog(root=tmp_path), bus=MessageBus())
    seen = []
    runtime.bus.subscribe("command", seen.append)

    result = command(g, "ship:rsc", "set-voyage", by="personnel:em",
                     payload={"voyage": "the-relationality-pass"},
                     runtime=runtime)

    assert isinstance(result, CommandResult)
    assert result.status == "issued"
    assert result.reason is None
    w = result.witness
    assert w.channel == "command"
    assert w.origin == "personnel:em"
    assert w.operator == "command_ship"
    assert w.details["action"] == "set-voyage"
    assert w.details["ship"] == "ship:rsc"
    assert w.details["payload"] == {"voyage": "the-relationality-pass"}
    # Bus subscriber received it AND the durable log has it
    assert len(seen) == 1 and seen[0] is w
    assert len(list(runtime.log.read_all(channel="command"))) == 1


def test_command_unknown_ship_raises_with_available_slugs(tmp_path):
    g = Group.load(_make_valid_group(tmp_path))
    with pytest.raises(KeyError, match="ship:typo"):
        command(g, "ship:typo", "noop", by="personnel:em")


def test_command_unknown_issuer_raises(tmp_path):
    g = Group.load(_make_valid_group(tmp_path))
    with pytest.raises(KeyError, match="personnel:nobody"):
        command(g, "ship:rsc", "noop", by="personnel:nobody")


def test_command_issuer_in_polity_but_not_in_ship_crew_is_denied(tmp_path):
    """Architect review: the prior gate ('any office on the polity')
    let out-of-crew personnel command sub-ships. The crew-membership
    gate must deny when the issuer holds a polity office that isn't
    embarked on this particular ship."""
    g_dir = _write_group(
        tmp_path,
        polity_fm=('kind: polity\nslug: "polity:test"\n'
                   'populace: ["personnel:em", "personnel:landside"]\n'
                   'ships: ["ship:expedition"]\n'
                   'offices: ["office:cmd", "office:archive"]\n'),
        # ship is crewed only by office:cmd (a sub-ship / excursion)
        ships=[("expedition", 'kind: ship\nslug: "ship:expedition"\n'
                              'of-polity: "polity:test"\n'
                              'captain: "personnel:em"\n'
                              'home-office: "office:cmd"\n'
                              'crewed-by-offices: ["office:cmd"]\n')],
        offices=[("cmd", 'kind: office\nslug: "office:cmd"\n'
                         'held-by: "personnel:em"\n'),
                 # archive office exists in polity but is NOT embarked
                 ("archive", 'kind: office\nslug: "office:archive"\n'
                             'held-by: "personnel:landside"\n')],
        personnel=[("em", 'kind: personnel\nholds-offices: ["office:cmd"]\n'),
                   ("landside", 'kind: personnel\n'
                                'holds-offices: ["office:archive"]\n')],
    )
    g = Group.load(g_dir)
    # landside holds a real polity office but isn't embarked → denied
    result = command(g, "ship:expedition", "do-thing", by="personnel:landside")
    assert result.status == "denied"
    assert "embarked" in (result.reason or "")
    # captain (whose office IS embarked) succeeds
    ok = command(g, "ship:expedition", "do-thing", by="personnel:em")
    assert ok.status == "issued"


def test_command_falls_back_to_polity_when_ship_has_no_crew_yet(tmp_path):
    """Bootstrap state: a freshly-registered ship hasn't yet
    enumerated its crew. We allow any polity-office holder to
    command it (commissioning), so chicken-and-egg doesn't block
    the very first crew assignment."""
    g_dir = _write_group(
        tmp_path,
        polity_fm=('kind: polity\nslug: "polity:test"\n'
                   'populace: ["personnel:em"]\nships: ["ship:fresh"]\n'
                   'offices: ["office:cmd"]\n'),
        ships=[("fresh", 'kind: ship\nslug: "ship:fresh"\n'
                         'of-polity: "polity:test"\n')],  # no crew yet
        offices=[("cmd", 'kind: office\nslug: "office:cmd"\n'
                         'held-by: "personnel:em"\n')],
        personnel=[("em", 'kind: personnel\nholds-offices: ["office:cmd"]\n')],
    )
    g = Group.load(g_dir)
    result = command(g, "ship:fresh", "commission", by="personnel:em")
    assert result.status == "issued"


def test_command_issuer_without_polity_office_is_denied(tmp_path):
    """A personnel record that exists but holds no office on the
    polity must be denied — the witness still emits (the attempt is
    auditable) but with status=denied and a reason."""
    g_dir = _write_group(
        tmp_path,
        polity_fm=('kind: polity\n'
                   'slug: "polity:test"\n'
                   'populace: ["personnel:em", "personnel:visitor"]\n'
                   'ships: ["ship:rsc"]\n'
                   'offices: ["office:cmd"]\n'),
        ships=[("rsc", 'kind: ship\n'
                       'slug: "ship:rsc"\n'
                       'of-polity: "polity:test"\n'
                       'captain: "personnel:em"\n')],
        offices=[("cmd", 'kind: office\n'
                         'slug: "office:cmd"\n'
                         'held-by: "personnel:em"\n')],
        personnel=[
            ("em", 'kind: personnel\nholds-offices: ["office:cmd"]\n'),
            ("visitor", 'kind: personnel\nholds-offices: []\n'),
        ],
    )
    g = Group.load(g_dir)
    runtime = EventRuntime(log=EventLog(root=tmp_path), bus=MessageBus())

    result = command(g, "ship:rsc", "do-thing", by="personnel:visitor",
                     runtime=runtime)
    assert result.status == "denied"
    assert "no office" in (result.reason or "")
    # Denial is itself an auditable witness (not silently swallowed)
    w = result.witness
    assert w.details.get("denied") is True
    assert len(list(runtime.log.read_all(channel="command"))) == 1


def test_command_returns_witness_when_no_runtime_supplied(tmp_path):
    """Allowing runtime to be None lets tests + scripts use this
    verb without wiring a log; caller can publish however they want."""
    g = Group.load(_make_valid_group(tmp_path))
    result = command(g, "ship:rsc", "noop", by="personnel:em")
    assert result.status == "issued"
    assert result.witness.channel == "command"


# -- integration with the real on-disk 561 group ------------------


@pytest.mark.skipif(REPO_GROUP_DIR is None,
                    reason="real group dir not present")
def test_real_561_group_loads_and_resolves_rsc_quiescent():
    """Pin the actual on-disk records: the 561 group must load,
    rsc-quiescent must resolve, emsenn must hold three offices.
    This is the test that proves 'commanding the rsc-quiescent by
    real files with frontmatter FARS can parse' actually works."""
    g = Group.load(REPO_GROUP_DIR)
    assert g.polity.slug == "polity:561-group"
    assert "ship:rsc-quiescent" in g.ships
    rsc = g.ship("ship:rsc-quiescent")
    assert rsc.captain == "personnel:emsenn"
    assert rsc.of_polity == "polity:561-group"
    em_offices = {o.slug for o in g.offices_held_by("personnel:emsenn")}
    assert {"office:command", "office:engineering",
            "office:science"}.issubset(em_offices)


@pytest.mark.skipif(REPO_GROUP_DIR is None,
                    reason="real group dir not present")
def test_real_561_group_command_issues_for_emsenn(tmp_path):
    """The captain's verb against the real ship: emsenn holds
    office:command on polity:561-group, so commanding rsc-quiescent
    must be authorized."""
    g = Group.load(REPO_GROUP_DIR)
    result = command(g, "ship:rsc-quiescent", "begin-voyage",
                     by="personnel:emsenn",
                     payload={"voyage": "relationality-pass"})
    assert result.status == "issued"
    assert result.witness.origin == "personnel:emsenn"
