"""M10 (design spec S12): CLI verb parity, debitum/officium split (S8).

Scope, stated explicitly (never a silent gap): the design spec's module
tree (S4) lists gen-1's full ``cli/*.py`` surface as PORTED VERBATIM
(``search``/``list``/``stats``/``impact``/``ramp``/``context``/
``fm_keys``/``audit``/``plan``/``move``/``rename_fm_key``/``snapshot``/
``undo``, on top of ``validate``/``lint``/``show``), and S9 names the
same "validate, lint, show, search, witness, witness-log, discharge,
replay" set for the JS side. Every one of those extra gen-1 verbs is
built on gen-1's ``analyze/``/``spec.py``/``api.py`` machinery -- and
this tree's M1-M9 kernel replaced gen-1's substrate/store/closure
layer wholesale (design spec S4's own kernel/ section: "NEW -- built on
pymetrologic, never on pypredcalc"). Only ``analyze/inbound_refs.py`` has
been ported onto the new kernel so far; ``bm25_search``/``impact``/
``ramp``/``context_walk``/``question_clusters``/``stats``/``where`` have
not. Porting the rest of gen-1's CLI verbs against a kernel most of them
were never written for is a separate, materially larger undertaking than
this milestone's own brief -- and would hand PyFARS a CLI surface
``apps/fare``'s already-shipped reference realization deliberately does
not have, widening the two languages' CLI surfaces apart instead of
closing M10's actual verify criterion: "every ported gen-1 CLI verb's
existing test passes against the new store; ``pyfars discharge`` and
``jsfars discharge`` on the fixture corpus produce matching four-state
reports."

This module instead implements exactly the verb set
``apps/fare/src/cli/verbs.mjs`` already ships against the new kernel --
the debitum/officium split (S8) and the six other read verbs both
languages need to satisfy that verify criterion. ``search`` is not
implemented here, for the identical, already-precedented reason JS
states in its own module (see this app's README STATUS section).

Every function here is pure: it only reads/computes/returns or raises,
never touches ``sys.argv``/stdout/stderr/exit codes -- the same Family D
split ``__main__.py`` (the only file allowed to touch the process
boundary) draws against ``apps/fare/src/cli/{fars,verbs}.mjs``.
"""

from __future__ import annotations

import dataclasses
import enum
import json
from pathlib import Path
from typing import Any

from pyfars.closure.rule.compose_rules import run as compose_rules
from pyfars.kernel.discharge import discharge as compute_discharge
from pyfars.kernel.event_log import EventLog
from pyfars.kernel.record_store import get_record
from pyfars.kernel.replay import channels_of, replay_event_log, serialize_state
from pyfars.kernel.seavt import decode_srn_atom, log_path_for
from pyfars.kernel.witness import validate_witness
from pyfars.substrate.load.notes import load as load_flatfiles

__all__ = [
    "run_discharge",
    "run_lint",
    "run_replay",
    "run_show",
    "run_validate",
    "run_witness",
    "run_witness_log",
]


def _jsonable(value: Any) -> Any:
    """Recursively reduce a dataclass/``Path``/``Enum``/``Mapping``/
    ``Sequence`` tree to the plain ``dict``/``list``/``str``/``bool``/
    ``None`` shape ``json.dumps`` accepts -- what ``cli/verbs.mjs`` gets
    for free from JS's structural objects, done explicitly here since
    Python's kernel types are real dataclasses, not plain dicts."""
    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        return {
            field.name: _jsonable(getattr(value, field.name))
            for field in dataclasses.fields(value)
        }
    if isinstance(value, enum.Enum):
        return value.value
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(item) for item in value]
    return value


def _witnesses_of(root: Path) -> dict[str, dict[str, Any]]:
    """Every Witness ever appended under ``root``, by its own id -- the
    log holds witnesses only (Addendum ruling 5), so every channel's
    every resolved journal line names one. Kept at the CLI layer rather
    than folded into ``kernel/replay.py``'s ``ReplayState`` (which this
    tree's own M9 scoped to belief + Tier B record registry only, per
    that module's own docstring) so this milestone doesn't widen an
    already-tested kernel module's contract to get a CLI-only readout."""
    event_log = EventLog(root=root)
    witnesses: dict[str, dict[str, Any]] = {}
    for channel in channels_of(root):
        for line in event_log.read_channel(channel):
            record = line.get("record")
            if record is not None:
                witnesses[record["id"]] = record
    return witnesses


# Debitum (design spec S8): the sigma battery alone, a MUST-constraint
# pass over a corpus root -- gen-1's closure/rule/* minus the two dropped
# ad hoc rules (design spec S4/S6), composed by closure/rule/
# compose_rules.py. Python carries exactly one rule set today, the same
# as JS (no separate MUST-only vs. style-only split either language's
# closure/rule package draws), so validate and lint are the same
# debitum battery under two names -- a documented scope decision
# (README STATUS), mirrored from cli/verbs.mjs's identical one, not a
# hidden gap: officium.md's warning is about conflating debitum with
# officium (discharge), not about splitting debitum into finer
# sub-batteries.
def run_validate(root: Path | str, **options: Any) -> dict[str, Any]:
    root_path = Path(root)
    notes, parse_diagnostics = load_flatfiles(root_path)
    rule_diagnostics = compose_rules(notes, root=root_path, **options)
    return {
        "notes": len(notes),
        "diagnostics": [_jsonable(d) for d in (*parse_diagnostics, *rule_diagnostics)],
    }


run_lint = run_validate


def run_show(root: Path | str, target: str) -> dict[str, Any] | None:
    """One flatfile's parsed Tier A record, by slug or by its
    corpus-relative path -- ``None`` when no such note exists under
    ``root``."""
    notes, _ = load_flatfiles(Path(root))
    for note in notes:
        if note.slug == target or str(note.path) == target:
            return _jsonable(note)
    return None


def run_witness(root: Path | str, witness_id: str) -> dict[str, Any] | None:
    """One Witness, by its own content-identity id, re-validated on read
    (the same shape/id-round-trip check ``kernel/replay.py``'s fold
    already runs per witness) -- ``None`` when the record store has
    nothing at that id, and a raised validation error when it does but
    fails ``validate_witness``."""
    record = get_record(Path(root), witness_id)
    if record is None:
        return None
    return dict(validate_witness(record))


def run_witness_log(root: Path | str, channel: str, at: str) -> list[dict[str, Any]]:
    """The raw SEAVT rows for one channel/day partition
    (``kernel/seavt.py``'s physical layout, unchanged), each row's ``v``
    resolved to its full witness body from the content-addressed record
    store when locally readable -- a lower-level view than
    ``run_replay``'s folded belief/record state, one journal partition
    file at a time rather than the whole log. Shaped flat
    (``{e, a, v, t, record}``), matching ``kernel/seavt.py``'s own
    ``journal_line`` shape, rather than JS's ``{entry: {...}}`` nesting
    -- an artifact of the real, installed
    ``witness-journal-log-service``'s ``readSeavt`` return shape that
    Python's kernel never composes (S2.2: PyFARS ports the physical
    layout, not the npm package)."""
    root_path = Path(root)
    path = log_path_for(root_path, channel, at)
    if not path.is_file():
        return []
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for raw in handle:
            raw = raw.strip()
            if not raw:
                continue
            line = json.loads(raw)
            decoded = {
                "e": decode_srn_atom(line["e"]),
                "a": decode_srn_atom(line["a"]),
                "v": decode_srn_atom(line["v"]),
                "t": line["t"],
            }
            decoded["record"] = get_record(root_path, decoded["v"])
            rows.append(decoded)
    return rows


def run_replay(root: Path | str) -> dict[str, Any]:
    """Deterministic replay (``kernel/replay.py``) of ``root``'s whole
    event log, reshaped for CLI/JSON output: FOUR belief values as their
    ``[positive, negative]`` evidence-bit pairs, the Tier B record
    registry, a witness index built at this layer (see
    ``_witnesses_of``), plus the canonical replay digest
    (``serialize_state``'s bytes, hex-encoded) two independent replays of
    the same log agree on."""
    root_path = Path(root)
    event_log = EventLog(root=root_path)
    state = replay_event_log(event_log)
    return {
        "belief": {
            target: [value.pos, value.neg] for target, value in state.belief.items()
        },
        "records": _jsonable(state.records),
        "witnesses": _jsonable(_witnesses_of(root_path)),
        "digest": serialize_state(state).hex(),
    }


def run_discharge(root: Path | str, record_id: str) -> dict[str, Any]:
    """Officium (design spec S8): the full sigma_t/Delta_t double-
    settlement for one record -- ``{operative, sat_shadow, tr_shadow,
    free_shadow}``, never coerced to a boolean -- folded from ``root``'s
    whole event log via ``kernel/discharge.py``. Strictly stronger than a
    clean ``run_validate``/``run_lint`` pass; ``record_id`` may name
    either a Tier B record or a Witness (``discharge.py``'s
    ``sigma_holds``/``delta_holds`` accept both). ``{"found": False}``
    when ``record_id`` resolves to neither."""
    root_path = Path(root)
    event_log = EventLog(root=root_path)
    state = replay_event_log(event_log)
    witnesses = _witnesses_of(root_path)
    record = state.records.get(record_id) or witnesses.get(record_id)
    if record is None:
        return {"found": False, "recordId": record_id, "state": None}
    records = list(state.records.values())
    result = compute_discharge(record, records, list(witnesses.values()))
    return {"found": True, "recordId": record_id, "state": result.value}
