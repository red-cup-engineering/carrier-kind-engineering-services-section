"""Group / polity / ship / office / personnel records loaded from disk.

Implements the runtime side of the on-disk governance entities the
561 Group already maintains under ``operations/command/group/``.
The records there (``561-group.md``, ``ships/rsc-quiescent.md``,
``offices/*.md``, ``personnel/*.md``) carry typed YAML frontmatter
that names the polity, its populace, its constituted offices, the
ships it operates, and the personnel that hold those offices.

This module gives FARS a typed view of those records:

  - ``PolityRecord`` — the polity itself (id, populace, ships, offices)
  - ``ShipRecord``   — a sovereign operational unit of the polity
  - ``OfficeRecord`` — one of the polity's constituted offices
  - ``PersonnelRecord`` — a member of the polity, holding zero+ offices
  - ``Group``        — aggregator: load all four kinds from a directory
                       and verify the cross-reference graph closes

And one operational verb, the thing the captain asked for:

  - ``command(group, ship_slug, action, *, by, payload, runtime)`` —
    emit a witness on the ``"command"`` channel with the ship as
    target. The ship-slug is resolved against the loaded ``Group`` so
    a typo doesn't silently command a non-existent ship; the issuing
    personnel is resolved against the loaded personnel index and must
    actually hold an office on the ship's polity (otherwise the command
    is recorded as ``denied``, not executed).

The records here are *read-only views* of the underlying markdown.
Mutating them in-memory does not write back to disk; the substrate
edit operators in ``pyfars.operator.*`` remain the only path that
changes the on-disk records. ``Group.load`` re-reads from disk on
each call.
"""
from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

from pyfars.operator.witness import Witness, make_witness
from pyfars.runtime.channel import EventRuntime
from pyfars.substrate.parse.frontmatter import parse as parse_frontmatter


# -- record types --------------------------------------------------


def _frozen_strs(value: Any) -> frozenset[str]:
    """Coerce a YAML scalar/list into a frozenset of strings.

    Frontmatter authors are inconsistent (``[]`` vs absent vs single
    string vs YAML list); this collapses everything to one shape so
    downstream code never has to ``isinstance`` a frontmatter value.
    """
    if value is None:
        return frozenset()
    if isinstance(value, str):
        return frozenset((value,)) if value else frozenset()
    return frozenset(str(v) for v in value if v)


def _opt_str(value: Any) -> Optional[str]:
    if value is None or value == "":
        return None
    return str(value)


@dataclass(frozen=True)
class PolityRecord:
    """A polity — the institution-with-populace-with-autarkeia.

    Fields mirror the frontmatter of ``operations/command/group/561-group.md``.
    Slugs in ``populace``/``ships``/``offices`` are stable identifiers
    (e.g. ``personnel:emsenn``), resolved by ``Group`` against its
    loaded indexes.
    """
    slug: str
    title: str = ""
    status: str = "active"
    populace: frozenset[str] = field(default_factory=frozenset)
    ships: frozenset[str] = field(default_factory=frozenset)
    offices: frozenset[str] = field(default_factory=frozenset)
    source_path: Optional[Path] = None

    @classmethod
    def from_frontmatter(cls, fm: Mapping[str, Any], *,
                         source_path: Optional[Path] = None) -> "PolityRecord":
        # Per substrate convention, the filename is the slug. Honor any
        # legacy fm['slug'] when present (existing records carry the
        # `polity:<stem>` prefix-form), otherwise synthesize from the
        # file stem so a well-formed slug-less record parses cleanly.
        raw_slug = fm.get("slug")
        if raw_slug:
            slug = str(raw_slug)
        elif source_path is not None:
            slug = f"polity:{source_path.stem}"
        else:
            raise ValueError("polity record needs slug or source_path")
        return cls(
            slug=slug,
            title=str(fm.get("title", "")),
            status=str(fm.get("status", "active")),
            populace=_frozen_strs(fm.get("populace")),
            ships=_frozen_strs(fm.get("ships")),
            offices=_frozen_strs(fm.get("offices")),
            source_path=source_path,
        )


@dataclass(frozen=True)
class ShipRecord:
    """A ship — sovereign operational unit of a polity.

    ``crewed_by_offices`` lists the offices embarked on the ship; in
    practice a polity-wide ship lists all of its polity's offices,
    but a sub-ship (a working group, an excursion) lists only those
    actually embarked. ``captain`` is the personnel slug of the
    holder of ``home_office`` on the ship (almost always the polity's
    command office).
    """
    slug: str
    title: str = ""
    status: str = "active"
    of_polity: Optional[str] = None
    captain: Optional[str] = None
    home_office: Optional[str] = None
    current_voyage: Optional[str] = None
    crewed_by_offices: frozenset[str] = field(default_factory=frozenset)
    source_path: Optional[Path] = None

    @classmethod
    def from_frontmatter(cls, fm: Mapping[str, Any], *,
                         source_path: Optional[Path] = None) -> "ShipRecord":
        raw_slug = fm.get("slug")
        if raw_slug:
            slug = str(raw_slug)
        elif source_path is not None:
            slug = f"ship:{source_path.stem}"
        else:
            raise ValueError("ship record needs slug or source_path")
        return cls(
            slug=slug,
            title=str(fm.get("title", "")),
            status=str(fm.get("status", "active")),
            of_polity=_opt_str(fm.get("of-polity")),
            captain=_opt_str(fm.get("captain")),
            home_office=_opt_str(fm.get("home-office")),
            current_voyage=_opt_str(fm.get("current-voyage")),
            crewed_by_offices=_frozen_strs(fm.get("crewed-by-offices")),
            source_path=source_path,
        )


@dataclass(frozen=True)
class OfficeRecord:
    """An office — a constituted role of the polity.

    Carries the deontic profile parsed out of the office's
    ``deontic-profile`` frontmatter block (``may``/``must``/
    ``must-not``). ``held_by`` is the personnel slug currently
    invested with the office, or ``None`` if vacant.

    This is the on-disk *record* shape. The runtime ``Office``
    dataclass in ``pyfars.runtime.office`` is the same conceptual
    entity but adds the Hohfeldian queries; convert via
    ``to_runtime_office`` when those queries are wanted.
    """
    slug: str
    title: str = ""
    status: str = "active"
    of_polity: Optional[str] = None
    held_by: Optional[str] = None
    remit: str = ""
    may: frozenset[str] = field(default_factory=frozenset)
    must: frozenset[str] = field(default_factory=frozenset)
    must_not: frozenset[str] = field(default_factory=frozenset)
    source_path: Optional[Path] = None

    @classmethod
    def from_frontmatter(cls, fm: Mapping[str, Any], *,
                         source_path: Optional[Path] = None) -> "OfficeRecord":
        deontic = fm.get("deontic-profile") or {}
        if not isinstance(deontic, Mapping):
            deontic = {}
        raw_slug = fm.get("slug")
        if raw_slug:
            slug = str(raw_slug)
        elif source_path is not None:
            slug = f"office:{source_path.stem}"
        else:
            raise ValueError("office record needs slug or source_path")
        return cls(
            slug=slug,
            title=str(fm.get("title", "")),
            status=str(fm.get("status", "active")),
            of_polity=_opt_str(fm.get("of-polity")),
            held_by=_opt_str(fm.get("held-by")),
            remit=str(fm.get("remit", "")),
            may=_frozen_strs(deontic.get("may")),
            must=_frozen_strs(deontic.get("must")),
            must_not=_frozen_strs(deontic.get("must-not")),
            source_path=source_path,
        )

    def is_vacant(self) -> bool:
        return self.held_by is None


@dataclass(frozen=True)
class PersonnelRecord:
    """A personnel record — a member of the polity.

    ``holds_offices`` is the set of office slugs this personnel is
    invested with. ``constitutive_member`` flags whether the
    personnel's recognition is part of the polity's $\\mathrm{Pop}$
    cell (founders / standing members) versus serving but not
    recognition-bearing.
    """
    slug: str  # synthesized as "personnel:<filename-stem>" if absent
    title: str = ""
    type: str = ""
    status: str = "active"
    of_polity: Optional[str] = None
    holds_offices: frozenset[str] = field(default_factory=frozenset)
    constitutive_member: bool = False
    source_path: Optional[Path] = None

    @classmethod
    def from_frontmatter(cls, fm: Mapping[str, Any], *,
                         source_path: Optional[Path] = None) -> "PersonnelRecord":
        # Personnel records in the corpus omit `slug` and rely on the
        # filename stem; synthesize the slug rather than crash so a
        # well-formed file (per existing convention) parses cleanly.
        raw_slug = fm.get("slug")
        if raw_slug:
            slug = str(raw_slug)
        elif source_path is not None:
            slug = f"personnel:{source_path.stem}"
        else:
            raise ValueError("personnel record needs slug or source_path")
        return cls(
            slug=slug,
            title=str(fm.get("title", "")),
            type=str(fm.get("type", "")),
            status=str(fm.get("status", "active")),
            of_polity=_opt_str(fm.get("of-polity")),
            holds_offices=_frozen_strs(fm.get("holds-offices")),
            constitutive_member=bool(fm.get("constitutive-member", False)),
            source_path=source_path,
        )


# -- aggregator ----------------------------------------------------


@dataclass(frozen=True)
class GroupValidation:
    """Result of cross-referencing all loaded records.

    ``ok`` is True iff every relational invariant holds; the issue
    lists carry the slugs (or pairs) that broke each invariant so
    the caller can present a precise repair list to the captain.

    Existence invariants (entity referenced has a record on disk):
      missing_populace, missing_offices, missing_ships,
      held_by_unknown_personnel, holds_unknown_office,
      captain_not_in_personnel, crewed_by_unknown_office,
      home_office_unknown

    Consistency invariants (referenced entity is the *right* one):
      home_office_not_in_crew     — ship's home_office must be
                                     embarked on the ship
      captain_not_in_home_office  — ship.captain must hold the
                                     ship's home_office
      held_by_holds_mismatch      — office.held-by ↔ personnel.
                                     holds-offices reciprocity
      of_polity_mismatch          — ship/office/personnel of-polity
                                     must equal this group's polity
    """
    missing_populace: tuple[str, ...] = ()
    missing_offices: tuple[str, ...] = ()
    missing_ships: tuple[str, ...] = ()
    held_by_unknown_personnel: tuple[tuple[str, str], ...] = ()
    holds_unknown_office: tuple[tuple[str, str], ...] = ()
    captain_not_in_personnel: tuple[tuple[str, str], ...] = ()
    crewed_by_unknown_office: tuple[tuple[str, str], ...] = ()
    home_office_unknown: tuple[tuple[str, str], ...] = ()
    home_office_not_in_crew: tuple[tuple[str, str], ...] = ()
    captain_not_in_home_office: tuple[tuple[str, str, str], ...] = ()
    held_by_holds_mismatch: tuple[tuple[str, str], ...] = ()
    of_polity_mismatch: tuple[tuple[str, str, str], ...] = ()

    @property
    def ok(self) -> bool:
        return not (self.missing_populace or self.missing_offices
                    or self.missing_ships
                    or self.held_by_unknown_personnel
                    or self.holds_unknown_office
                    or self.captain_not_in_personnel
                    or self.crewed_by_unknown_office
                    or self.home_office_unknown
                    or self.home_office_not_in_crew
                    or self.captain_not_in_home_office
                    or self.held_by_holds_mismatch
                    or self.of_polity_mismatch)

    def summary(self) -> str:
        if self.ok:
            return "ok"
        parts = []
        if self.missing_populace:
            parts.append(f"populace missing files: {sorted(self.missing_populace)}")
        if self.missing_offices:
            parts.append(f"offices missing files: {sorted(self.missing_offices)}")
        if self.missing_ships:
            parts.append(f"ships missing files: {sorted(self.missing_ships)}")
        if self.held_by_unknown_personnel:
            parts.append(f"office.held-by → unknown personnel: "
                         f"{sorted(self.held_by_unknown_personnel)}")
        if self.holds_unknown_office:
            parts.append(f"personnel.holds-offices → unknown office: "
                         f"{sorted(self.holds_unknown_office)}")
        if self.captain_not_in_personnel:
            parts.append(f"ship.captain → unknown personnel: "
                         f"{sorted(self.captain_not_in_personnel)}")
        if self.crewed_by_unknown_office:
            parts.append(f"ship.crewed-by → unknown office: "
                         f"{sorted(self.crewed_by_unknown_office)}")
        if self.home_office_unknown:
            parts.append(f"ship.home-office → unknown office: "
                         f"{sorted(self.home_office_unknown)}")
        if self.home_office_not_in_crew:
            parts.append(f"ship.home-office not in crewed-by-offices: "
                         f"{sorted(self.home_office_not_in_crew)}")
        if self.captain_not_in_home_office:
            parts.append(f"ship.captain does not hold ship.home-office: "
                         f"{sorted(self.captain_not_in_home_office)}")
        if self.held_by_holds_mismatch:
            parts.append(f"office.held-by ↔ personnel.holds-offices "
                         f"mismatch: {sorted(self.held_by_holds_mismatch)}")
        if self.of_polity_mismatch:
            parts.append(f"of-polity mismatch with loaded polity: "
                         f"{sorted(self.of_polity_mismatch)}")
        return "; ".join(parts)


@dataclass(frozen=True)
class Group:
    """Loaded view of one polity's records.

    Construct via ``Group.load(group_dir)`` rather than directly so
    the four indexes stay consistent. ``polity`` is the single
    polity record loaded from the group directory's polity file
    (the one ``kind: polity`` markdown at the top of the dir).
    """
    polity: PolityRecord
    ships: Mapping[str, ShipRecord] = field(default_factory=dict)
    offices: Mapping[str, OfficeRecord] = field(default_factory=dict)
    personnel: Mapping[str, PersonnelRecord] = field(default_factory=dict)
    root: Optional[Path] = None

    # -- loaders ---------------------------------------------------

    @classmethod
    def load(cls, group_dir: Path) -> "Group":
        """Load the polity + all ships/offices/personnel under
        ``group_dir``.

        Expects the standard layout:
          <group_dir>/<polity-slug>.md   (kind: polity)
          <group_dir>/ships/*.md         (kind: ship)
          <group_dir>/offices/*.md       (kind: office)
          <group_dir>/personnel/*.md     (kind: personnel)

        ``_index.md`` files are skipped — they're directory landing
        pages, not entity records.
        """
        polity = _load_polity(group_dir)
        ships = _load_kind(group_dir / "ships", ShipRecord)
        offices = _load_kind(group_dir / "offices", OfficeRecord)
        personnel = _load_kind(group_dir / "personnel", PersonnelRecord)
        return cls(polity=polity, ships=ships, offices=offices,
                   personnel=personnel, root=group_dir)

    # -- queries ---------------------------------------------------

    def ship(self, slug: str) -> ShipRecord:
        """Get a ship by slug, raising KeyError with a helpful list
        of available ships if not found — typos in command lines
        should fail loudly, not at use site."""
        if slug not in self.ships:
            raise KeyError(
                f"unknown ship {slug!r}; loaded: {sorted(self.ships)}"
            )
        return self.ships[slug]

    def office(self, slug: str) -> OfficeRecord:
        if slug not in self.offices:
            raise KeyError(
                f"unknown office {slug!r}; loaded: {sorted(self.offices)}"
            )
        return self.offices[slug]

    def person(self, slug: str) -> PersonnelRecord:
        if slug not in self.personnel:
            raise KeyError(
                f"unknown personnel {slug!r}; loaded: {sorted(self.personnel)}"
            )
        return self.personnel[slug]

    def offices_held_by(self, personnel_slug: str) -> list[OfficeRecord]:
        """All non-vacant offices currently held by this personnel."""
        return [o for o in self.offices.values()
                if o.held_by == personnel_slug]

    def vacant_offices(self) -> list[OfficeRecord]:
        return [o for o in self.offices.values() if o.is_vacant()]

    # -- validation -----------------------------------------------

    def validate(self) -> GroupValidation:
        """Cross-reference every relational invariant declared in the
        polity / ship / office / personnel records.

        Existence invariants — referenced entity has a record on disk:
          1. populace entries map to a personnel file
          2. polity.offices map to an office file
          3. polity.ships map to a ship file
          4. office.held-by maps to a personnel file
          5. personnel.holds-offices map to office files
          6. ship.captain maps to a personnel file
          7. ship.crewed-by-offices map to office files
          8. ship.home-office maps to an office file

        Consistency invariants — referenced entity is the *right* one:
          9. ship.home-office is in ship.crewed-by-offices
         10. ship.captain holds ship.home-office (per office.held-by)
         11. office.held-by ↔ personnel.holds-offices reciprocity
         12. of-polity on ship/office/personnel matches loaded polity

        Per architect review: existence checks alone don't prevent
        downstream auth from trusting torn relations (e.g. captain
        unknown to home-office, of-polity drift between sub-files
        and the polity record). The four added invariants close
        those gaps so ``command()``'s authorization gate can rely
        on the loaded structure being internally consistent.
        """
        miss_pop = tuple(s for s in self.polity.populace
                         if s not in self.personnel)
        miss_off = tuple(s for s in self.polity.offices
                         if s not in self.offices)
        miss_ship = tuple(s for s in self.polity.ships
                          if s not in self.ships)
        held_unknown = tuple((o.slug, o.held_by) for o in self.offices.values()
                             if o.held_by and o.held_by not in self.personnel)
        holds_unknown = tuple(
            (p.slug, off) for p in self.personnel.values()
            for off in p.holds_offices if off not in self.offices
        )
        cap_unknown = tuple(
            (s.slug, s.captain) for s in self.ships.values()
            if s.captain and s.captain not in self.personnel
        )
        crew_unknown = tuple(
            (s.slug, off) for s in self.ships.values()
            for off in s.crewed_by_offices if off not in self.offices
        )
        home_unknown = tuple(
            (s.slug, s.home_office) for s in self.ships.values()
            if s.home_office and s.home_office not in self.offices
        )
        # Home office must be embarked on the ship — guards against a
        # captain whose office isn't actually crewed on this voyage.
        home_not_in_crew = tuple(
            (s.slug, s.home_office) for s in self.ships.values()
            if (s.home_office and s.crewed_by_offices
                and s.home_office not in s.crewed_by_offices)
        )
        # Captain must actually hold the home office (per the office's
        # own held-by). Both sides existing is necessary; this checks
        # they agree. Skipped when either is unset.
        cap_not_home = tuple(
            (s.slug, s.captain, s.home_office)
            for s in self.ships.values()
            if (s.captain and s.home_office
                and s.home_office in self.offices
                and self.offices[s.home_office].held_by != s.captain)
        )
        # Reciprocity: office.held-by==P ↔ P.holds-offices contains
        # office. Auth gates currently use the office-side truth; if
        # the personnel side disagrees, the captain's view of "who
        # holds what" is lying somewhere. Surface it.
        recip_breaks: list[tuple[str, str]] = []
        for o in self.offices.values():
            if not o.held_by or o.held_by not in self.personnel:
                continue  # caught by held_by_unknown_personnel
            holder = self.personnel[o.held_by]
            if o.slug not in holder.holds_offices:
                recip_breaks.append((o.slug, o.held_by))
        for p in self.personnel.values():
            for off_slug in p.holds_offices:
                if off_slug not in self.offices:
                    continue  # caught by holds_unknown_office
                if self.offices[off_slug].held_by != p.slug:
                    if (off_slug, p.slug) not in recip_breaks:
                        recip_breaks.append((off_slug, p.slug))
        # Drift detection: any sub-record claiming a different polity
        # than the one we loaded. (None on a sub-record is fine.)
        polity_mismatch: list[tuple[str, str, str]] = []
        for kind, items in (("ship", self.ships.values()),
                            ("office", self.offices.values()),
                            ("personnel", self.personnel.values())):
            for r in items:
                op = getattr(r, "of_polity", None)
                if op is not None and op != self.polity.slug:
                    polity_mismatch.append((kind, r.slug, op))
        return GroupValidation(
            missing_populace=miss_pop,
            missing_offices=miss_off,
            missing_ships=miss_ship,
            held_by_unknown_personnel=held_unknown,
            holds_unknown_office=holds_unknown,
            captain_not_in_personnel=cap_unknown,
            crewed_by_unknown_office=crew_unknown,
            home_office_unknown=home_unknown,
            home_office_not_in_crew=home_not_in_crew,
            captain_not_in_home_office=cap_not_home,
            held_by_holds_mismatch=tuple(recip_breaks),
            of_polity_mismatch=tuple(polity_mismatch),
        )


def _load_polity(group_dir: Path) -> PolityRecord:
    """Find the ``kind: polity`` record at the top of ``group_dir``.

    There must be exactly one (per the polity-per-group convention);
    we fail loudly on zero or multiple so a misshapen directory
    surfaces at load time rather than as a confusing query failure
    later.
    """
    candidates = []
    for p in sorted(group_dir.glob("*.md")):
        if p.name.startswith("_"):
            continue
        fm, _body = parse_frontmatter(p.read_text(encoding="utf-8"))
        if fm and fm.get("kind") == "polity":
            candidates.append((p, fm))
    if not candidates:
        raise FileNotFoundError(
            f"no kind: polity markdown record in {group_dir}"
        )
    if len(candidates) > 1:
        names = [str(p) for p, _ in candidates]
        raise ValueError(f"multiple polity records in {group_dir}: {names}")
    p, fm = candidates[0]
    return PolityRecord.from_frontmatter(fm, source_path=p)


def _load_kind(subdir: Path, record_cls: type) -> dict[str, Any]:
    """Load every non-``_*`` markdown record under ``subdir``,
    instantiating ``record_cls.from_frontmatter`` for each, and
    returning a slug-keyed dict.

    Records without frontmatter are skipped silently (per the
    parse module's convention that "no frontmatter" means "not a
    note"); records whose frontmatter is malformed propagate the
    ``FrontmatterError`` so the caller knows which file is bad.
    """
    out: dict[str, Any] = {}
    if not subdir.exists():
        return out
    for p in sorted(subdir.glob("*.md")):
        if p.name.startswith("_"):
            continue
        fm, _body = parse_frontmatter(p.read_text(encoding="utf-8"))
        if not fm:
            continue
        rec = record_cls.from_frontmatter(fm, source_path=p)
        out[rec.slug] = rec
    return out


# -- operational verb ---------------------------------------------


@dataclass(frozen=True)
class CommandResult:
    """Outcome of ``command(...)``.

    ``status`` is one of:
      ``"issued"`` — the command was authorized and the witness emitted
      ``"denied"`` — the issuer is not authorized; a witness with
                     ``denied=True`` in details is still emitted (the
                     attempt itself is auditable) but the command did
                     not "happen" in the operational sense.
    """
    status: str
    witness: Witness
    reason: Optional[str] = None


def command(group: Group, ship_slug: str, action: str, *,
            by: str, payload: Optional[Mapping[str, Any]] = None,
            runtime: Optional[EventRuntime] = None,
            agent: Optional[str] = None) -> CommandResult:
    """Command a ship to perform an action.

    Resolves ``ship_slug`` against the loaded group (KeyError if
    unknown). Authorizes by checking that ``by`` (a personnel slug)
    holds at least one office *embarked on this ship* — i.e., one
    of ``ship.crewed_by_offices``. The check is deliberately
    *coarse* at the action level: per-action authorization (e.g.
    "only office:command may amend the charter") belongs in
    office-level deontic-profile checks, not here. This is the
    substrate-level "are you a crew member of this ship?" gate.

    Per architect review of the prior 'any office on the polity'
    gate: that was too broad for sub-ships whose crew is narrower
    than the polity's full office register, allowing out-of-crew
    personnel to issue ship commands. The crew-membership gate
    closes that gap. If a ship declares no crewed_by_offices
    (a bootstrap state — e.g. a freshly-registered ship awaiting
    crew assignment), the check falls back to polity-office
    membership so commissioning isn't blocked by chicken-and-egg.

    Emits a witness on the ``"command"`` channel with:
      operator    = "command_ship"
      target      = the ship's source path (or its slug if no path)
      origin      = the issuing personnel slug
      details     = {action, ship, by, offices_held, payload, denied}

    If a ``runtime: EventRuntime`` is supplied the witness goes
    through it (durable log + bus fan-out). Otherwise the witness
    is returned for the caller to log/publish however they want —
    keeps this verb usable in tests and from contexts that don't
    have a runtime wired.
    """
    ship = group.ship(ship_slug)
    if by not in group.personnel:
        # Unknown issuer is a hard error — we can't even record a
        # meaningful "denied" witness for someone we don't recognize.
        raise KeyError(
            f"unknown personnel {by!r}; loaded: {sorted(group.personnel)}"
        )

    issuer_offices = group.offices_held_by(by)
    issuer_office_slugs = sorted(o.slug for o in issuer_offices)

    # Ship without a polity binding is treated as authorizable by any
    # crew member (the substrate's bootstrap state); once of-polity is
    # set, the issuer must hold an office in ship.crewed_by_offices
    # (or, for a ship that hasn't yet enumerated a crew, any office on
    # the polity — the bootstrap fallback).
    authorized = True
    reason: Optional[str] = None
    if ship.of_polity is not None:
        if ship.of_polity != group.polity.slug:
            authorized = False
            reason = (f"ship is of {ship.of_polity!r}, this group is "
                      f"{group.polity.slug!r}")
        elif not issuer_offices:
            authorized = False
            reason = (f"{by} holds no office on {group.polity.slug}; "
                      f"command-channel acts require crew membership")
        elif ship.crewed_by_offices:
            crew_held = {o.slug for o in issuer_offices
                         } & set(ship.crewed_by_offices)
            if not crew_held:
                authorized = False
                reason = (f"{by} holds {issuer_office_slugs} but ship "
                          f"{ship.slug} is crewed by "
                          f"{sorted(ship.crewed_by_offices)}; "
                          f"command-channel acts require holding an "
                          f"office embarked on the ship")

    target = (str(ship.source_path) if ship.source_path is not None
              else ship.slug)
    details: dict[str, Any] = {
        "action": action,
        "ship": ship.slug,
        "by": by,
        "offices_held": issuer_office_slugs,
    }
    if payload:
        details["payload"] = dict(payload)
    if not authorized:
        details["denied"] = True
        details["reason"] = reason

    witness = make_witness(
        operator="command_ship",
        target=target,
        before_hash=None,
        after_hash=None,
        details=details,
        agent=agent,
        channel="command",
        origin=by,
    )

    if runtime is not None:
        runtime.emit(witness)

    return CommandResult(
        status="issued" if authorized else "denied",
        witness=witness,
        reason=reason,
    )
