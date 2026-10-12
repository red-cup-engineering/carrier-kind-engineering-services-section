"""Generate the full FOUR/Charge algebra tables from the defining Lean.

**Route taken: parsing the defining Lean directly** (not the exhaustive
corner-status fallback the task description allows). All eight operations
this generator tables — ``joinK``/``meetK``/``joinT``/``meetT``/``negate``/
``conflate``/``leK``/``leT`` — are, in the live Lean, one-line Boolean-slot
formulas over ``a.pos``/``a.neg``/``b.pos``/``b.neg`` (see
``Obsmetrologia/Language/Positing/Charge.lean`` and, for ``conflate``,
``Obsmetrologia/Language/Positing/Four.lean``). That is small and regular
enough to parse with a dedicated recursive-descent Boolean-expression parser
(``!``/``&&``/``||``/parens over four atoms) rather than falling back to
re-deriving the algebra from the informal ``(token, claim)`` convention by
hand.

The one extra ingredient needed to *instantiate* those formulas at the four
named corners — which ``(pos, neg)`` pair each of ``absurd``/``potential``/
``active``/``stable`` denotes, and their canonical order — is read the same
way, from ``Articulating.Corner.toStatus``'s pattern match and
``Articulating.Corner.all``'s literal list in
``Obsmetrologia/Articulation/Articulating/Cell.lean``. So the *entire* table
is derived from parsing three Lean files, not retyped from the
``docs/history/corner-naming-convention.md`` prose (though the result must,
and does, agree with it).

Output: ``packages/pymetrologic/src/pymetrologic/_generated_charge.py``, a
data-only module (dicts/tuples plus the three source sha256s and a DO-NOT-EDIT
header naming this generator). ``test_generated_charge.py`` is the independent
witness: it asserts the *hand-written* implementations in ``positing.py`` /
``bilattice.py`` agree with these generated tables on every one of the 16 (or
4, for unary ops) entries. The hand-written code stays canonical for now —
this generated module exists to catch the two silently disagreeing, the same
class of bug a human transcription of the Lean already let through once
(the ``predicating.py`` rotation-drift bug).
"""

from __future__ import annotations

import argparse
import hashlib
import re
from datetime import UTC, datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
APP_ROOT = SCRIPT_DIR.parent
LEAN_ROOT = (APP_ROOT / ".." / ".." / "lib" / "obsmetrologia").resolve()
CELL_LEAN = LEAN_ROOT / "Obsmetrologia" / "Articulation" / "Articulating" / "Cell.lean"
CHARGE_LEAN = LEAN_ROOT / "Obsmetrologia" / "Language" / "Positing" / "Charge.lean"
FOUR_LEAN = LEAN_ROOT / "Obsmetrologia" / "Language" / "Positing" / "Four.lean"
DEFAULT_OUT = (
    APP_ROOT / "packages" / "pymetrologic" / "src" / "pymetrologic" / "_generated_charge.py"
)

Status = tuple[bool, bool]


class GenerationError(Exception):
    """The defining Lean did not have the exact shape this generator expects."""


# --------------------------------------------------------------------------- #
# The corner <-> (pos, neg) bijection and canonical order, read from Cell.lean.
# --------------------------------------------------------------------------- #

_ALL_RE = re.compile(r"def\s+all\s*:\s*List\s+Articulating\.Corner\s*:=\s*\[(?P<names>[^\]]+)\]")
_TO_STATUS_CLAUSE_RE = re.compile(
    r"\|\s*(?P<corner>absurd|potential|active|stable)\s*=>\s*"
    r"\(\s*(?P<pos>true|false)\s*,\s*(?P<neg>true|false)\s*\)"
)


def parse_corner_order_and_status(cell_lean_text: str) -> tuple[tuple[str, ...], dict[str, Status]]:
    all_match = _ALL_RE.search(cell_lean_text)
    if all_match is None:
        raise GenerationError("could not find 'Corner.all' in Cell.lean")
    order = tuple(name.strip() for name in all_match.group("names").split(","))

    status: dict[str, Status] = {}
    for clause in _TO_STATUS_CLAUSE_RE.finditer(cell_lean_text):
        pos = clause.group("pos") == "true"
        neg = clause.group("neg") == "true"
        status[clause.group("corner")] = (pos, neg)
    missing = set(order) - set(status)
    if missing:
        raise GenerationError(f"Corner.toStatus in Cell.lean is missing clauses for {missing}")
    return order, status


# --------------------------------------------------------------------------- #
# A tiny recursive-descent parser for the Boolean-slot formulas in Charge.lean
# / Four.lean: atoms `a.pos`/`a.neg`/`b.pos`/`b.neg`, `!`, `&&`, `||`, parens.
# --------------------------------------------------------------------------- #

BoolAst = tuple  # ("atom", "a.pos") | ("not", ast) | ("and", ast, ast) | ("or", ast, ast)

_BOOL_TOKEN_RE = re.compile(
    r"\s*(?:(?P<ATOM>[ab]\.(?:pos|neg))|(?P<NOT>!)|(?P<AND>&&)|(?P<OR>\|\|)"
    r"|(?P<LPAREN>\()|(?P<RPAREN>\)))"
)


def _tokenize_bool(text: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    pos = 0
    n = len(text)
    while pos < n:
        if text[pos].isspace():
            pos += 1
            continue
        m = _BOOL_TOKEN_RE.match(text, pos)
        if m is None or m.end() == pos:
            raise GenerationError(f"unexpected character {text[pos]!r} at offset {pos} in {text!r}")
        kind = m.lastgroup
        assert kind is not None
        tokens.append((kind, m.group()))
        pos = m.end()
    return tokens


def _parse_primary(tokens: list[tuple[str, str]], i: int) -> tuple[BoolAst, int]:
    if i >= len(tokens):
        raise GenerationError("unexpected end of Boolean expression")
    kind, value = tokens[i]
    if kind == "LPAREN":
        node, i = _parse_or(tokens, i + 1)
        if i >= len(tokens) or tokens[i][0] != "RPAREN":
            raise GenerationError("unbalanced parentheses in Boolean expression")
        return node, i + 1
    if kind == "NOT":
        node, i = _parse_unary(tokens, i + 1)
        return ("not", node), i
    if kind == "ATOM":
        return ("atom", value), i + 1
    raise GenerationError(f"unexpected token {kind}={value!r} in Boolean expression")


def _parse_unary(tokens: list[tuple[str, str]], i: int) -> tuple[BoolAst, int]:
    if i < len(tokens) and tokens[i][0] == "NOT":
        node, i = _parse_unary(tokens, i + 1)
        return ("not", node), i
    return _parse_primary(tokens, i)


def _parse_and(tokens: list[tuple[str, str]], i: int) -> tuple[BoolAst, int]:
    node, i = _parse_unary(tokens, i)
    while i < len(tokens) and tokens[i][0] == "AND":
        rhs, i = _parse_unary(tokens, i + 1)
        node = ("and", node, rhs)
    return node, i


def _parse_or(tokens: list[tuple[str, str]], i: int) -> tuple[BoolAst, int]:
    node, i = _parse_and(tokens, i)
    while i < len(tokens) and tokens[i][0] == "OR":
        rhs, i = _parse_and(tokens, i + 1)
        node = ("or", node, rhs)
    return node, i


def parse_bool_expr(text: str) -> BoolAst:
    tokens = _tokenize_bool(text)
    node, i = _parse_or(tokens, 0)
    if i != len(tokens):
        raise GenerationError(f"trailing tokens after Boolean expression: {tokens[i:]}")
    return node


def eval_bool_ast(ast: BoolAst, env: dict[str, bool]) -> bool:
    tag = ast[0]
    if tag == "atom":
        return env[ast[1]]
    if tag == "not":
        return not eval_bool_ast(ast[1], env)
    if tag == "and":
        return eval_bool_ast(ast[1], env) and eval_bool_ast(ast[2], env)
    if tag == "or":
        return eval_bool_ast(ast[1], env) or eval_bool_ast(ast[2], env)
    raise GenerationError(f"unknown Boolean AST tag {tag!r}")


def parse_ofslots_pair(body: str) -> tuple[BoolAst, BoolAst]:
    """Parse `ofSlots ARG1 ARG2`'s two juxtaposed arguments (atom or parenthesized)."""

    prefix = "ofSlots"
    if not body.startswith(prefix):
        raise GenerationError(f"expected an 'ofSlots ...' body, got {body!r}")
    tokens = _tokenize_bool(body[len(prefix) :])
    arg1, i = _parse_primary(tokens, 0)
    arg2, i = _parse_primary(tokens, i)
    if i != len(tokens):
        raise GenerationError(f"trailing tokens after 'ofSlots' pair: {tokens[i:]}")
    return arg1, arg2


# --------------------------------------------------------------------------- #
# Extracting the single-line `def` operations from Charge.lean / Four.lean.
# --------------------------------------------------------------------------- #

_OP_DEF_RE = re.compile(
    r"^def\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*\((?P<params>[^:()]+):\s*Charge\)\s*:\s*"
    r"(?P<rettype>Charge|Bool)\s*:=\s*(?P<body>.+)$",
    re.MULTILINE,
)
_CONST_DEF_RE = re.compile(
    r"^def\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*:\s*Charge\s*:=\s*"
    r"Articulating\.Corner\.(?P<corner>absurd|potential|active|stable)\s*$",
    re.MULTILINE,
)


def parse_charge_ops(text: str) -> dict[str, tuple[tuple[str, ...], str, str]]:
    """Return {op_name: (param_names, rettype, body_text)} for every `Charge`-typed def."""

    ops: dict[str, tuple[tuple[str, ...], str, str]] = {}
    for m in _OP_DEF_RE.finditer(text):
        params = tuple(m.group("params").split())
        ops[m.group("name")] = (params, m.group("rettype"), m.group("body").strip())
    return ops


def parse_charge_constants(text: str) -> dict[str, str]:
    return {m.group("name"): m.group("corner") for m in _CONST_DEF_RE.finditer(text)}


# --------------------------------------------------------------------------- #
# Building the tables.
# --------------------------------------------------------------------------- #

_TABLED_CHARGE_BINARY = ("joinK", "meetK", "joinT", "meetT")
_TABLED_CHARGE_UNARY = ("negate", "conflate")
_TABLED_BOOL_BINARY = ("leK", "leT")


def build_tables(
    order: tuple[str, ...],
    status: dict[str, Status],
    ops: dict[str, tuple[tuple[str, ...], str, str]],
) -> tuple[
    dict[str, dict[tuple[str, str], str]],
    dict[str, dict[str, str]],
    dict[str, dict[tuple[str, str], bool]],
]:
    status_to_corner = {v: k for k, v in status.items()}

    charge_binary: dict[str, dict[tuple[str, str], str]] = {}
    for name in _TABLED_CHARGE_BINARY:
        if name not in ops:
            raise GenerationError(f"Charge.lean is missing the '{name}' definition")
        params, rettype, body = ops[name]
        if params != ("a", "b") or rettype != "Charge":
            raise GenerationError(f"'{name}' does not have the expected binary Charge shape")
        pos_ast, neg_ast = parse_ofslots_pair(body)
        table: dict[tuple[str, str], str] = {}
        for ca in order:
            for cb in order:
                env = {
                    "a.pos": status[ca][0],
                    "a.neg": status[ca][1],
                    "b.pos": status[cb][0],
                    "b.neg": status[cb][1],
                }
                result_status = (eval_bool_ast(pos_ast, env), eval_bool_ast(neg_ast, env))
                table[(ca, cb)] = status_to_corner[result_status]
        charge_binary[name] = table

    charge_unary: dict[str, dict[str, str]] = {}
    for name in _TABLED_CHARGE_UNARY:
        if name not in ops:
            raise GenerationError(f"missing the '{name}' definition")
        params, rettype, body = ops[name]
        if params != ("a",) or rettype != "Charge":
            raise GenerationError(f"'{name}' does not have the expected unary Charge shape")
        pos_ast, neg_ast = parse_ofslots_pair(body)
        table_u: dict[str, str] = {}
        for ca in order:
            env = {"a.pos": status[ca][0], "a.neg": status[ca][1]}
            result_status = (eval_bool_ast(pos_ast, env), eval_bool_ast(neg_ast, env))
            table_u[ca] = status_to_corner[result_status]
        charge_unary[name] = table_u

    bool_binary: dict[str, dict[tuple[str, str], bool]] = {}
    for name in _TABLED_BOOL_BINARY:
        if name not in ops:
            raise GenerationError(f"missing the '{name}' definition")
        params, rettype, body = ops[name]
        if params != ("a", "b") or rettype != "Bool":
            raise GenerationError(f"'{name}' does not have the expected binary Bool shape")
        ast = parse_bool_expr(body)
        table_b: dict[tuple[str, str], bool] = {}
        for ca in order:
            for cb in order:
                env = {
                    "a.pos": status[ca][0],
                    "a.neg": status[ca][1],
                    "b.pos": status[cb][0],
                    "b.neg": status[cb][1],
                }
                table_b[(ca, cb)] = eval_bool_ast(ast, env)
        bool_binary[name] = table_b

    return charge_binary, charge_unary, bool_binary


# --------------------------------------------------------------------------- #
# Rendering the DO-NOT-EDIT Python module.
# --------------------------------------------------------------------------- #


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _render_binary_table(name: str, table: dict[tuple[str, str], str]) -> str:
    lines = [f"{name}: dict[tuple[str, str], str] = {{"]
    for (ca, cb), result in table.items():
        lines.append(f'    ("{ca}", "{cb}"): "{result}",')
    lines.append("}")
    return "\n".join(lines)


def _render_binary_bool_table(name: str, table: dict[tuple[str, str], bool]) -> str:
    lines = [f"{name}: dict[tuple[str, str], bool] = {{"]
    for (ca, cb), result in table.items():
        lines.append(f'    ("{ca}", "{cb}"): {result!r},')
    lines.append("}")
    return "\n".join(lines)


def _render_unary_table(name: str, table: dict[str, str]) -> str:
    lines = [f"{name}: dict[str, str] = {{"]
    for ca, result in table.items():
        lines.append(f'    "{ca}": "{result}",')
    lines.append("}")
    return "\n".join(lines)


def render_module(
    order: tuple[str, ...],
    status: dict[str, Status],
    charge_binary: dict[str, dict[tuple[str, str], str]],
    charge_unary: dict[str, dict[str, str]],
    bool_binary: dict[str, dict[tuple[str, str], bool]],
    source_sha256: dict[str, str],
    generated_at: str,
) -> str:
    order_repr = ", ".join(f'"{c}"' for c in order)
    status_lines = "\n".join(f'    "{c}": ({status[c][0]!r}, {status[c][1]!r}),' for c in order)
    sha_lines = "\n".join(f'    "{name}": "{digest}",' for name, digest in source_sha256.items())

    tables = "\n\n".join(
        [
            *(_render_binary_table(name, charge_binary[name]) for name in _TABLED_CHARGE_BINARY),
            *(_render_unary_table(name, charge_unary[name]) for name in _TABLED_CHARGE_UNARY),
            *(_render_binary_bool_table(name, bool_binary[name]) for name in _TABLED_BOOL_BINARY),
        ]
    )

    return f'''"""DO NOT EDIT — generated by ``tools/generate_charge_tables.py``.

Route taken: **parsed the defining Lean directly.** ``joinK``/``meetK``/
``joinT``/``meetT``/``negate``/``leK``/``leT`` come from
``Obsmetrologia/Language/Positing/Charge.lean``; ``conflate`` comes from
``Obsmetrologia/Language/Positing/Four.lean`` (the Klein-four gauge). The
corner/status bijection and canonical corner order come from
``Articulating.Corner.toStatus``/``.all`` in
``Obsmetrologia/Articulation/Articulating/Cell.lean``. See the generator's
module docstring for why parsing was preferred over the exhaustive-evaluation
fallback (the formulas are one-line Boolean-slot expressions, well within a
small recursive-descent parser's reach).

This module is data only — dicts and tuples, no behavior. It exists as an
*independent witness*: ``test_generated_charge.py`` asserts the hand-written
implementations in ``positing.py``/``bilattice.py`` (which stay canonical)
agree with every entry generated here. Regenerate with::

    uv run python tools/generate_charge_tables.py

Generated at: {generated_at}

Source sha256 (the exact Lean bytes these tables were derived from):
{{
{sha_lines}
}}
"""

from __future__ import annotations

#: The four corners in the canonical order `Articulating.Corner.all` declares.
CORNERS: tuple[str, ...] = ({order_repr})

#: Each corner's `(pos, neg)` status pair, per `Articulating.Corner.toStatus`.
STATUS: dict[str, tuple[bool, bool]] = {{
{status_lines}
}}

SOURCE_SHA256: dict[str, str] = {{
{sha_lines}
}}

GENERATED_AT: str = "{generated_at}"

{tables}
'''


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cell-lean", type=Path, default=CELL_LEAN)
    parser.add_argument("--charge-lean", type=Path, default=CHARGE_LEAN)
    parser.add_argument("--four-lean", type=Path, default=FOUR_LEAN)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--timestamp", default=None)
    args = parser.parse_args()

    cell_text = args.cell_lean.read_text(encoding="utf-8")
    charge_text = args.charge_lean.read_text(encoding="utf-8")
    four_text = args.four_lean.read_text(encoding="utf-8")

    order, status = parse_corner_order_and_status(cell_text)
    ops = parse_charge_ops(charge_text)
    ops.update(parse_charge_ops(four_text))

    charge_binary, charge_unary, bool_binary = build_tables(order, status, ops)

    source_sha256 = {
        "Cell.lean": _sha256(args.cell_lean),
        "Charge.lean": _sha256(args.charge_lean),
        "Four.lean": _sha256(args.four_lean),
    }
    generated_at = args.timestamp or datetime.now(UTC).isoformat()

    module_text = render_module(
        order, status, charge_binary, charge_unary, bool_binary, source_sha256, generated_at
    )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(module_text, encoding="utf-8")

    total_entries = sum(len(t) for t in charge_binary.values())
    total_entries += sum(len(t) for t in charge_unary.values())
    total_entries += sum(len(t) for t in bool_binary.values())
    print(
        f"generated {len(charge_binary)} binary Charge ops, {len(charge_unary)} unary Charge ops, "
        f"{len(bool_binary)} binary Bool ops ({total_entries} table entries total) -> {args.out}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
