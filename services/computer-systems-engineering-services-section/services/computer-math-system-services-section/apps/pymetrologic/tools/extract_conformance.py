"""Extract the golden vectors of ``conformance/ConformanceVectors.lean`` into JSON.

This is a *targeted* parser, not a general Lean parser. It only understands the
handful of term shapes ``ConformanceVectors.lean`` actually uses:

* ``example : <lhs> = <rhs> := rfl`` / ``example : <lhs> = <rhs> := by decide``
  / ``example : <lhs> ≠ <rhs> := by decide``;
* top-level ``def <name> : <type> := <term>`` constant declarations the
  examples reference (``markAlpha``, ``utteranceOne``, ``potentialCellOne``, ...);
* the concrete term grammar built from: dotted identifiers (``Charge.joinK``,
  ``Articulating.Corner.absurd.toStatus``), function application by
  juxtaposition, string literals, boolean literals, tuples ``(a, b)``,
  anonymous constructors ``⟨a, b, c⟩``, list literals ``[(a, b), (c, d)]``,
  postfix field-projection chains after a parenthesized term
  (``(...).meme.charge``), and ``by decide`` used as an opaque proof-term
  argument.

Why a hand-rolled parser instead of a real Lean frontend: the point of this
tool is to make the *machine* transcribe the golden vectors instead of a human
eyeballing the ``.lean`` file and typing Python by hand (the exact failure
mode that let a rotation-drift bug survive in ``predicating.py``). A full Lean
elaborator is unnecessary firepower for one file with an extremely regular,
closed grammar; what matters is that this parser never *silently* drops a
vector it cannot confidently handle -- anything it cannot parse lands in the
``unparsed`` section of the output with its raw source line, not on the
cutting-room floor.

Output: a JSON artifact (default
``packages/pymetrologic/tests/data/conformance_vectors.json``) with:

* ``source_relative_path`` / ``source_sha256`` -- the exact bytes this
  extraction was pinned against (``test_conformance_generated.py`` re-hashes
  the live file on every run and fails loudly on drift);
* ``extracted_at`` -- an ISO-8601 timestamp (passed in via ``--timestamp`` for
  reproducible runs, or the wall clock by default -- this is a one-shot
  extraction script, not a long-running workflow, so an ordinary
  ``datetime.now()`` read here is fine);
* ``definitions`` -- the top-level ``def`` constants the vectors are built
  from, each with its own parsed term (so ``markAlpha``'s literal surface
  string, for instance, is *read* out of the Lean, not retyped by hand);
* ``vectors`` -- one entry per ``example``, each an ``{lhs, rhs, relation,
  proof}`` expression-tree record;
* ``unparsed`` / ``unparsed_definitions`` -- anything matching the coarse
  ``example`` / ``def`` keyword that the grammar above could not confidently
  parse, recorded with its raw source line rather than dropped.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
APP_ROOT = SCRIPT_DIR.parent
DEFAULT_LEAN_FILE = (
    APP_ROOT / ".." / ".." / "lib" / "obsmetrologia" / "conformance" / "ConformanceVectors.lean"
).resolve()
DEFAULT_OUT = APP_ROOT / "packages" / "pymetrologic" / "tests" / "data" / "conformance_vectors.json"

# --------------------------------------------------------------------------- #
# Comment stripping (Lean nested block comments `/- ... -/` and `-- ...`),
# preserving both string length and newline positions so downstream regex
# match offsets and line numbers still index into the *original* text.
# --------------------------------------------------------------------------- #


def strip_comments(text: str) -> str:
    """Blank out Lean comments, keeping length and newlines intact."""

    out: list[str] = []
    i = 0
    n = len(text)
    depth = 0
    while i < n:
        if text[i : i + 2] == "/-":
            depth += 1
            out.append("  ")
            i += 2
            while i < n and depth > 0:
                if text[i : i + 2] == "/-":
                    depth += 1
                    out.append("  ")
                    i += 2
                elif text[i : i + 2] == "-/":
                    depth -= 1
                    out.append("  ")
                    i += 2
                else:
                    out.append(text[i] if text[i] == "\n" else " ")
                    i += 1
        elif text[i : i + 2] == "--":
            while i < n and text[i] != "\n":
                out.append(" ")
                i += 1
        else:
            out.append(text[i])
            i += 1
    return "".join(out)


# --------------------------------------------------------------------------- #
# Tokenizer for the concrete term grammar.
# --------------------------------------------------------------------------- #


class ParseError(Exception):
    """A term/prop/example this tool could not confidently parse."""


@dataclass(frozen=True)
class Token:
    kind: str
    value: str
    pos: int


_TOKEN_SPECS: tuple[tuple[str, str], ...] = (
    ("WS", r"\s+"),
    ("STRING", r'"[^"]*"'),
    ("FIELDCHAIN", r"(?:\.[A-Za-z_][A-Za-z0-9_]*)+"),
    ("IDENT", r"[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*"),
    ("LPAREN", r"\("),
    ("RPAREN", r"\)"),
    ("LANGLE", "⟨"),
    ("RANGLE", "⟩"),
    ("LBRACKET", r"\["),
    ("RBRACKET", r"\]"),
    ("COMMA", r","),
    ("NE", "≠"),
    ("EQ", r"="),
)
_TOKEN_RE = re.compile("|".join(f"(?P<{name}>{pat})" for name, pat in _TOKEN_SPECS))


def tokenize(text: str) -> list[Token]:
    tokens: list[Token] = []
    pos = 0
    n = len(text)
    while pos < n:
        m = _TOKEN_RE.match(text, pos)
        if m is None:
            raise ParseError(f"unexpected character {text[pos]!r} at offset {pos} in {text!r}")
        kind = m.lastgroup
        assert kind is not None
        if kind != "WS":
            tokens.append(Token(kind, m.group(), pos))
        pos = m.end()
    return tokens


# --------------------------------------------------------------------------- #
# Recursive-descent term parser.
#
# Node shapes (plain JSON-able dicts, matching the grammar this file uses):
#   {"kind": "app", "fn": "<dotted.name>", "args": [<node>, ...]}   (args=[] for a bare constant)
#   {"kind": "tuple", "items": [<node>, ...]}                        (a, b, ...)
#   {"kind": "struct", "items": [<node>, ...]}                       ⟨a, b, ...⟩
#   {"kind": "list", "items": [<node>, ...]}                         [a, b, ...]
#   {"kind": "bool", "value": true|false}
#   {"kind": "string", "value": "..."}
#   {"kind": "field", "base": <node>, "path": ["meme", "charge"]}    (base).meme.charge
#   {"kind": "proof", "text": "decide"}                              `by decide` as a term
#   {"kind": "apply", "head": <node>, "args": [<node>, ...]}         fallback: juxtaposition
#                                                                     applied to a non-ident head
# --------------------------------------------------------------------------- #

Node = dict[str, Any]

_PRIMARY_START = {"IDENT", "LPAREN", "LANGLE", "LBRACKET", "STRING"}


def _expect(tokens: list[Token], i: int, kind: str) -> int:
    if i >= len(tokens) or tokens[i].kind != kind:
        got = tokens[i].kind if i < len(tokens) else "EOF"
        raise ParseError(f"expected {kind}, got {got} at token {i}")
    return i + 1


def _parse_delimited(tokens: list[Token], i: int, close: str) -> tuple[list[Node], int]:
    items: list[Node] = []
    if i < len(tokens) and tokens[i].kind == close:
        return items, i
    item, i = parse_term(tokens, i)
    items.append(item)
    while i < len(tokens) and tokens[i].kind == "COMMA":
        i += 1
        item, i = parse_term(tokens, i)
        items.append(item)
    return items, i


def parse_primary(tokens: list[Token], i: int) -> tuple[Node, int]:
    if i >= len(tokens):
        raise ParseError("unexpected end of tokens while parsing a primary term")
    tok = tokens[i]
    node: Node
    if tok.kind == "LPAREN":
        items, i = _parse_delimited(tokens, i + 1, "RPAREN")
        i = _expect(tokens, i, "RPAREN")
        node = items[0] if len(items) == 1 else {"kind": "tuple", "items": items}
    elif tok.kind == "LANGLE":
        items, i = _parse_delimited(tokens, i + 1, "RANGLE")
        i = _expect(tokens, i, "RANGLE")
        node = {"kind": "struct", "items": items}
    elif tok.kind == "LBRACKET":
        items, i = _parse_delimited(tokens, i + 1, "RBRACKET")
        i = _expect(tokens, i, "RBRACKET")
        node = {"kind": "list", "items": items}
    elif tok.kind == "STRING":
        node = {"kind": "string", "value": tok.value[1:-1]}
        i += 1
    elif tok.kind == "IDENT":
        name = tok.value
        i += 1
        if name == "true":
            node = {"kind": "bool", "value": True}
        elif name == "false":
            node = {"kind": "bool", "value": False}
        elif name == "by":
            if i < len(tokens) and tokens[i].kind == "IDENT" and tokens[i].value == "decide":
                i += 1
                node = {"kind": "proof", "text": "decide"}
            else:
                raise ParseError("expected 'decide' after 'by'")
        else:
            node = {"kind": "app", "fn": name, "args": []}
    else:
        raise ParseError(f"unexpected token {tok.kind}={tok.value!r} at primary position")

    while i < len(tokens) and tokens[i].kind == "FIELDCHAIN":
        path = tokens[i].value.lstrip(".").split(".")
        node = {"kind": "field", "base": node, "path": path}
        i += 1
    return node, i


def parse_application(tokens: list[Token], i: int) -> tuple[Node, int]:
    head, i = parse_primary(tokens, i)
    args: list[Node] = []
    while i < len(tokens) and tokens[i].kind in _PRIMARY_START:
        arg, i = parse_primary(tokens, i)
        args.append(arg)
    if not args:
        return head, i
    if head.get("kind") == "app" and head.get("args") == []:
        return {"kind": "app", "fn": head["fn"], "args": args}, i
    return {"kind": "apply", "head": head, "args": args}, i


def parse_term(tokens: list[Token], i: int) -> tuple[Node, int]:
    return parse_application(tokens, i)


def parse_full_term(text: str) -> Node:
    tokens = tokenize(text)
    if not tokens:
        raise ParseError("empty term")
    node, i = parse_term(tokens, 0)
    if i != len(tokens):
        raise ParseError(f"trailing tokens after term: {[t.value for t in tokens[i:]]}")
    return node


def parse_prop(text: str) -> tuple[str, Node, Node]:
    """Split ``<lhs> = <rhs>`` / ``<lhs> ≠ <rhs>`` at the top-level relation."""

    tokens = tokenize(text)
    depth = 0
    split_idx: int | None = None
    relation: str | None = None
    for idx, tok in enumerate(tokens):
        if tok.kind in ("LPAREN", "LANGLE", "LBRACKET"):
            depth += 1
        elif tok.kind in ("RPAREN", "RANGLE", "RBRACKET"):
            depth -= 1
        elif depth == 0 and tok.kind in ("EQ", "NE"):
            split_idx = idx
            relation = "eq" if tok.kind == "EQ" else "ne"
            break
    if split_idx is None or relation is None:
        raise ParseError("no top-level '=' or '≠' found in proposition")
    lhs_tokens = tokens[:split_idx]
    rhs_tokens = tokens[split_idx + 1 :]
    if not lhs_tokens or not rhs_tokens:
        raise ParseError("empty side of a top-level relation")
    lhs, i = parse_term(lhs_tokens, 0)
    if i != len(lhs_tokens):
        raise ParseError("trailing tokens on the left of the relation")
    rhs, j = parse_term(rhs_tokens, 0)
    if j != len(rhs_tokens):
        raise ParseError("trailing tokens on the right of the relation")
    return relation, lhs, rhs


# --------------------------------------------------------------------------- #
# Extraction over the whole file.
# --------------------------------------------------------------------------- #

_EXAMPLE_RE = re.compile(
    r"\bexample\b\s*:(?P<prop>.*?):=\s*(?P<proof>rfl|by\s+decide)\b", re.DOTALL
)
_BARE_EXAMPLE_RE = re.compile(r"\bexample\b")
_DEF_RE = re.compile(
    r"^def\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*:\s*(?P<type>[^\n]*?)\s*:=\s*(?P<term>[^\n]*)$",
    re.MULTILINE,
)
_BARE_DEF_RE = re.compile(r"^def\s+[A-Za-z_][A-Za-z0-9_]*\b", re.MULTILINE)
_DOC_COMMENT_RE = re.compile(r"/--(?P<body>.*?)-/", re.DOTALL)


def _line_of(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def _slugify(text: str, limit: int = 6) -> str:
    words = re.findall(r"[A-Za-z0-9]+", text.lower())
    slug = "_".join(words[:limit])
    return slug or "vector"


def _nearest_doc_comment(
    original: str, doc_spans: list[tuple[int, int, str]], start: int
) -> str | None:
    best: str | None = None
    best_end = -1
    for _doc_start, doc_end, body in doc_spans:
        if doc_end <= start and original[doc_end:start].strip() == "" and doc_end > best_end:
            best_end = doc_end
            best = body
    if best is None:
        return None
    first_sentence = best.strip().split(".")[0]
    return " ".join(first_sentence.split())


@dataclass
class ExtractionResult:
    definitions: list[dict[str, Any]] = field(default_factory=list)
    unparsed_definitions: list[dict[str, Any]] = field(default_factory=list)
    vectors: list[dict[str, Any]] = field(default_factory=list)
    unparsed: list[dict[str, Any]] = field(default_factory=list)


def extract(original: str) -> ExtractionResult:
    masked = strip_comments(original)
    result = ExtractionResult()

    doc_spans = [(m.start(), m.end(), m.group("body")) for m in _DOC_COMMENT_RE.finditer(original)]

    # -- top-level `def` constants -------------------------------------- #
    matched_def_spans: list[tuple[int, int]] = []
    for m in _DEF_RE.finditer(masked):
        matched_def_spans.append((m.start(), m.end()))
        name = m.group("name")
        type_text = m.group("type").strip()
        term_text = m.group("term").strip()
        raw = original[m.start() : m.end()].strip()
        if not term_text:
            result.unparsed_definitions.append(
                {
                    "line": _line_of(original, m.start()),
                    "raw": raw,
                    "error": (
                        "no same-line term after ':=' (multi-line def body, out of grammar scope)"
                    ),
                }
            )
            continue
        try:
            term_ast = parse_full_term(term_text)
        except ParseError as exc:
            result.unparsed_definitions.append(
                {"line": _line_of(original, m.start()), "raw": raw, "error": str(exc)}
            )
            continue
        result.definitions.append(
            {
                "name": name,
                "type": type_text,
                "line": _line_of(original, m.start()),
                "term": term_ast,
                "raw": raw,
            }
        )
    for m in _BARE_DEF_RE.finditer(masked):
        if not any(start <= m.start() < end for start, end in matched_def_spans):
            line_end = original.find("\n", m.start())
            line_end = len(original) if line_end == -1 else line_end
            result.unparsed_definitions.append(
                {
                    "line": _line_of(original, m.start()),
                    "raw": original[m.start() : line_end].strip(),
                    "error": "matched bare 'def' keyword but not the single-line def grammar",
                }
            )

    # -- `example` golden vectors ----------------------------------------- #
    matched_example_spans: list[tuple[int, int]] = []
    idx = 0
    for m in _EXAMPLE_RE.finditer(masked):
        matched_example_spans.append((m.start(), m.end()))
        prop_start, prop_end = m.span("prop")
        prop_text = original[prop_start:prop_end]
        proof_text = " ".join(m.group("proof").split())
        raw = original[m.start() : m.end()].strip()
        line = _line_of(original, m.start())
        doc = _nearest_doc_comment(original, doc_spans, m.start())
        idx += 1
        try:
            relation, lhs, rhs = parse_prop(prop_text)
        except ParseError as exc:
            result.unparsed.append({"line": line, "raw": raw, "error": str(exc)})
            continue
        proof_kind = "decide" if "decide" in proof_text else "rfl"
        vector_id = f"v{idx:02d}_{_slugify(doc or lhs.get('fn', 'vector'))}"
        result.vectors.append(
            {
                "id": vector_id,
                "line": line,
                "doc": doc,
                "relation": relation,
                "proof": proof_kind,
                "lhs": lhs,
                "rhs": rhs,
                "raw": raw,
            }
        )
    for m in _BARE_EXAMPLE_RE.finditer(masked):
        if not any(start <= m.start() < end for start, end in matched_example_spans):
            tail = original.find("\n\n", m.start())
            tail = min(m.start() + 400, len(original)) if tail == -1 else tail
            result.unparsed.append(
                {
                    "line": _line_of(original, m.start()),
                    "raw": original[m.start() : tail].strip(),
                    "error": "matched bare 'example' keyword but not the example grammar",
                }
            )

    return result


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_artifact(
    lean_file: Path,
    repo_relative: str,
    timestamp: str,
) -> dict[str, Any]:
    data = lean_file.read_bytes()
    text = data.decode("utf-8")
    result = extract(text)
    return {
        "extractor": "tools/extract_conformance.py",
        "grammar_version": "1.0",
        "source_relative_path": repo_relative,
        "source_sha256": sha256_bytes(data),
        "extracted_at": timestamp,
        "vector_count": len(result.vectors),
        "unparsed_count": len(result.unparsed),
        "definition_count": len(result.definitions),
        "unparsed_definition_count": len(result.unparsed_definitions),
        "definitions": result.definitions,
        "vectors": result.vectors,
        "unparsed": result.unparsed,
        "unparsed_definitions": result.unparsed_definitions,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lean-file", type=Path, default=DEFAULT_LEAN_FILE)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument(
        "--timestamp",
        default=None,
        help="ISO-8601 extraction timestamp; defaults to the current UTC time.",
    )
    parser.add_argument(
        "--repo-relative-path",
        default="../../lib/obsmetrologia/conformance/ConformanceVectors.lean",
        help="Source path recorded in the artifact, relative to the app root.",
    )
    args = parser.parse_args()

    lean_file: Path = args.lean_file.resolve()
    timestamp = args.timestamp or datetime.now(UTC).isoformat()
    artifact = build_artifact(lean_file, args.repo_relative_path, timestamp)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(artifact, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(
        f"extracted {artifact['vector_count']} vectors "
        f"({artifact['unparsed_count']} unparsed), "
        f"{artifact['definition_count']} definitions "
        f"({artifact['unparsed_definition_count']} unparsed) "
        f"from {lean_file} -> {args.out}"
    )
    if artifact["unparsed_count"] or artifact["unparsed_definition_count"]:
        print("WARNING: some source lines could not be parsed; see the 'unparsed*' sections.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
